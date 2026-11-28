import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { isRTL, tr } from '@/i18n';
import { toLocalDisplay } from '@/lib/phone';
import { isThreePartName, MyProfile, updateMyName, uploadAvatar } from '@/lib/profile';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, rgba } from '@/theme';

const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' } as any) : null;
const WEB_DIM = Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any) : null;

// صورة البروفايل: الصورة لو موجودة، أو أيقونة شخص
export function Avatar({ uri, size }: { uri: string | null | undefined; size: number }) {
  const { c } = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: rgba(c.accent, 0.55) }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.accentSoft,
        borderWidth: 2.5,
        borderColor: c.accentBorder,
      }}
    >
      <Ionicons name="person" size={Math.round(size * 0.45)} color={c.accentText} />
    </View>
  );
}

export function EditProfileSheet({ me, onClose }: { me: MyProfile; onClose: () => void }) {
  const { c } = useTheme();
  const [name, setName] = useState(me.full_name ?? '');
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // دخول النافذة: spring (حركة + تكبير، من غير شفافية) والخلفية تظهر متغبّشة فورًا
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [anim]);

  const pickPhoto = async () => {
    setError('');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusyPhoto(true);
      const a = res.assets[0];
      const { error: e } = await uploadAvatar(me.id, a.uri, a.mimeType, a.base64);
      if (e) console.warn('🔴 avatar upload:', e.message ?? String(e));
      if (e) setError(tr('تعذّر رفع الصورة، حاول تاني', 'Could not upload the photo, please try again'));
    } catch (err) {
      console.warn('🔴 avatar upload crash:', String(err));
      setError(tr('تعذّر رفع الصورة، حاول تاني', 'Could not upload the photo, please try again'));
    } finally {
      setBusyPhoto(false);
    }
  };

  const save = async () => {
    setError('');
    const n = name.trim().replace(/\s+/g, ' ');
    if (!isThreePartName(n)) {
      return setError(tr('من فضلك اكتب اسمك ثلاثي (الاسم الأول واسم الأب واسم الجد)', 'Please enter your full name (first, middle and last name)'));
    }
    if (n === (me.full_name ?? '')) return onClose();
    setSaving(true);
    const { error: e } = await updateMyName(me.id, n);
    setSaving(false);
    if (e) return setError(tr('تعذّر الحفظ، حاول تاني', 'Could not save, please try again'));
    onClose();
  };

  // زجاج: شفاف على الويب و iOS، شبه مصمت على أندرويد (من غير elevation)
  const sheetBg = c.isDark
    ? Platform.OS === 'android' ? 'rgba(21,26,36,0.97)' : 'rgba(21,26,36,0.78)'
    : Platform.OS === 'android' ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.78)';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop, WEB_DIM]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
      <View style={styles.wrap}>
        <Animated.View style={[styles.sheet, WEB_FROST, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }, { backgroundColor: sheetBg, borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)', shadowColor: c.accent }]}>
          {Platform.OS === 'ios' ? <BlurView intensity={40} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}

          {/* ===== الشريط الملوّن (نفس هيدر حسابي) ===== */}
          <View style={styles.band}>
            <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.85 }]} />
            <View style={styles.glow} />
            <View style={styles.glow2} />
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />

            <Text style={styles.title}>{tr('تعديل البيانات', 'Edit profile')}</Text>

            {/* الصورة: اضغط لتغييرها */}
            <Pressable
              onPress={pickPhoto}
              disabled={busyPhoto}
              style={({ pressed }) => [styles.avatarRing, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={tr('تغيير الصورة', 'Change photo')}
            >
              <Avatar uri={me.avatar_url} size={92} />
              <View style={styles.camBadge}>
                {busyPhoto ? <ActivityIndicator size="small" color={c.accent} /> : <Ionicons name="camera" size={16} color={c.accent} />}
              </View>
            </Pressable>
            <Text style={styles.bandHint}>{tr('اضغط على الصورة لتغييرها', 'Tap the photo to change it')}</Text>
          </View>

          {/* ===== البيانات ===== */}
          <View style={styles.body}>
            <PremiumInput
              label={tr('الاسم الثلاثي', 'Full name')}
              labelInside
              icon="person-outline"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError('');
              }}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />

            {/* الرقم: مقفول لحد ما نعمل تغييره بكود تحقق */}
            <View style={[styles.phoneRow, { backgroundColor: c.fieldBg, borderColor: c.fieldBorder }]}>
              <Ionicons name="call-outline" size={20} color={c.iconMuted} />
              <Text style={[styles.phoneText, { color: c.ink }]}>{me.phone ? toLocalDisplay(me.phone) : '-'}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={c.iconMuted} />
            </View>
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {tr('تغيير الرقم محتاج كود تحقق — قريبًا', 'Changing your number needs a verification code — coming soon')}
            </Text>

            {error ? <Text style={[styles.error, { color: c.dangerText }]}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  styles.flex,
                  {
                    backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
                    borderWidth: 1,
                    borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : c.accentBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.btnText, { color: c.ink }]}>{tr('إلغاء', 'Cancel')}</Text>
              </Pressable>
              <Pressable onPress={save} disabled={saving || busyPhoto} accessibilityRole="button" style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حفظ', 'Save')}</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(5,15,35,0.45)' },
  // النافذة فوق شوية عشان الكيبورد ميغطيش خانة الاسم
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: 20, pointerEvents: 'box-none' },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  band: { alignItems: 'center', paddingTop: 18, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, left: -70, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: -80, right: -40, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  title: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF', textAlign: 'center', marginBottom: 14 },
  avatarRing: { padding: 3, borderRadius: 34, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
  camBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bandHint: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 12 },
  body: { padding: 20, paddingTop: 18 },
  hint: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    opacity: 0.75,
  },
  phoneText: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 1 },
  error: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
});
