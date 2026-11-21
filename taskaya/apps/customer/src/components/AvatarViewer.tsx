import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/EditProfileSheet';
import { isRTL, tr } from '@/i18n';
import { MyProfile, removeAvatar, uploadAvatar } from '@/lib/profile';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, rgba } from '@/theme';

// نافذة صغيرة بتعرض صورة البروفايل كبيرة + تغيير / حذف
export function AvatarViewer({ me, onClose }: { me: MyProfile; onClose: () => void }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState<'pick' | 'delete' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const hasPhoto = !!me.avatar_url;
  const panel = c.isDark ? '#151A24' : '#FFFFFF';

  const change = async () => {
    setError('');
    setConfirm(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy('pick');
      const a = res.assets[0];
      const { error: e } = await uploadAvatar(me.id, a.uri, a.mimeType, a.base64);
      if (e) setError(tr('تعذّر رفع الصورة، حاول تاني', 'Could not upload the photo, please try again'));
    } catch {
      setError(tr('تعذّر رفع الصورة، حاول تاني', 'Could not upload the photo, please try again'));
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    setError('');
    setBusy('delete');
    const { error: e } = await removeAvatar(me.id);
    setBusy(null);
    if (e) return setError(tr('تعذّر حذف الصورة، حاول تاني', 'Could not delete the photo, please try again'));
    setConfirm(false);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
        <View style={styles.wrap}>
          <View style={[styles.sheet, { backgroundColor: panel, borderColor: rgba(c.accent, 0.3), shadowColor: c.accent }]}>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={tr('إغلاق', 'Close')}
              style={({ pressed }) => [styles.close, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={20} color={c.accentText} />
            </Pressable>

            <View style={styles.photo}>
              <Avatar uri={me.avatar_url} size={220} />
              {busy === 'pick' ? (
                <View style={[styles.photoBusy, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            {error ? <Text style={[styles.error, { color: c.dangerText }]}>{error}</Text> : null}

            {confirm ? (
              <>
                <Text style={[styles.question, { color: c.text }]}>{tr('متأكد إنك عايز تحذف الصورة؟', 'Delete your photo?')}</Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setConfirm(false)}
                    disabled={!!busy}
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
                  <Pressable
                    onPress={del}
                    disabled={!!busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.btn, styles.flex, styles.danger, { backgroundColor: c.dangerText }, pressed && { opacity: 0.85 }]}
                  >
                    {busy === 'delete' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حذف', 'Delete')}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                <Pressable onPress={change} disabled={!!busy} accessibilityRole="button" style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
                  <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, styles.btnRow]}>
                    <Ionicons name="camera-outline" size={19} color="#FFFFFF" />
                    <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                      {hasPhoto ? tr('تغيير الصورة', 'Change photo') : tr('إضافة صورة', 'Add photo')}
                    </Text>
                  </LinearGradient>
                </Pressable>
                {hasPhoto ? (
                  <Pressable
                    onPress={() => setConfirm(true)}
                    disabled={!!busy}
                    accessibilityRole="button"
                    accessibilityLabel={tr('حذف الصورة', 'Delete photo')}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnRow,
                      styles.flex,
                      { backgroundColor: c.dangerBg, borderWidth: 1.5, borderColor: c.dangerBorder },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={19} color={c.dangerText} />
                    <Text style={[styles.btnText, { color: c.dangerText }]}>{tr('حذف الصورة', 'Delete photo')}</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(5,15,35,0.6)' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { marginBottom: 20 },
  photoBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  question: { fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center', marginBottom: 12 },
  error: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: 8 },
  danger: {},
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
});
