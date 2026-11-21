import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { tr } from '@/i18n';
import { toLocalDisplay } from '@/lib/phone';
import { isThreePartName, MyProfile, updateMyName, uploadAvatar } from '@/lib/profile';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, rgba } from '@/theme';

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

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
      <View style={styles.wrap}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.isDark ? '#151A24' : '#FFFFFF', borderColor: rgba(c.accent, 0.3), shadowColor: c.accent },
          ]}
        >
          <Text style={[styles.title, { color: c.text }]}>{tr('تعديل البيانات', 'Edit profile')}</Text>

          {/* الصورة: اضغط لتغييرها */}
          <Pressable
            onPress={pickPhoto}
            disabled={busyPhoto}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel={tr('تغيير الصورة', 'Change photo')}
          >
            <Avatar uri={me.avatar_url} size={100} />
            <View style={[styles.camBadge, { backgroundColor: c.accent, borderColor: c.isDark ? '#151A24' : '#FFFFFF' }]}>
              {busyPhoto ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={16} color="#FFFFFF" />}
            </View>
          </Pressable>
          <Text style={[styles.hint, { color: c.textSecondary }]}>{tr('اضغط على الصورة لتغييرها', 'Tap the photo to change it')}</Text>

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
                { backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,31,58,0.06)' },
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(5,15,35,0.5)' },
  // النافذة فوق شوية عشان الكيبورد ميغطيش خانة الاسم
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: 20, pointerEvents: 'box-none' },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'center', marginBottom: 16 },
  avatarBtn: { alignSelf: 'center' },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
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
