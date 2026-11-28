import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { isRTL, Lang, lang, setLanguage, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' } as any) : null;
const WEB_DIM = Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any) : null;

const LANGS: { key: Lang; label: string; sub: string }[] = [
  { key: 'ar', label: 'العربية', sub: 'Arabic' },
  { key: 'en', label: 'English', sub: 'الإنجليزية' },
];

export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const [pick, setPick] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [anim]);

  const save = async () => {
    if (pick === lang) return onClose();
    setBusy(true);
    setTimeout(() => setHint(true), 1500);
    await setLanguage(pick);
  };

  const sheetBg = c.isDark
    ? Platform.OS === 'android' ? 'rgba(21,26,36,0.97)' : 'rgba(21,26,36,0.78)'
    : Platform.OS === 'android' ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.78)';
  const ghostBg = c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';
  const ghostBorder = c.isDark ? 'rgba(255,255,255,0.14)' : c.accentBorder;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={busy ? undefined : onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop, WEB_DIM]} onPress={busy ? undefined : onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
      <View style={styles.wrap}>
        <Animated.View style={[styles.sheet, WEB_FROST, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }, { backgroundColor: sheetBg, borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)', shadowColor: c.accent }]}>
          {Platform.OS === 'ios' ? <BlurView intensity={40} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          <View style={styles.band}>
            <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.85 }]} />
            <View style={styles.glow} />
            <View style={styles.glow2} />
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
            <Text style={styles.title}>{tr('اللغة', 'Language')}</Text>
            <View style={styles.iconRing}>
              <View style={styles.iconIn}>
                <Ionicons name="language" size={34} color={c.accent} />
              </View>
            </View>
            <Text style={styles.bandHint}>{tr('اختار لغة التطبيق', 'Choose the app language')}</Text>
          </View>
          <View style={styles.body}>
            {LANGS.map((l) => {
              const on = pick === l.key;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => setPick(l.key)}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.option, { backgroundColor: on ? c.accentSoft : ghostBg, borderColor: on ? c.accent : ghostBorder }, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.accent : c.iconMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: c.ink }]}>{l.label}</Text>
                    <Text style={[styles.optionSub, { color: c.textSecondary }]}>{l.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {hint
                ? tr('لو اللغة ما اتغيرتش، اقفل التطبيق وافتحه تاني', "If it didn't change, close and reopen the app")
                : tr('اللغة والاتجاه هيتغيروا فورًا', 'Language and direction will change instantly')}
            </Text>
            <View style={styles.actions}>
              <Pressable onPress={onClose} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.flex, { backgroundColor: ghostBg, borderWidth: 1, borderColor: ghostBorder }, pressed && { opacity: 0.8 }]}>
                <Text style={[styles.btnText, { color: c.ink }]}>{tr('إلغاء', 'Cancel')}</Text>
              </Pressable>
              <Pressable onPress={save} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حفظ', 'Save')}</Text>}
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
  sheet: { width: '100%', maxWidth: 400, borderRadius: 26, borderWidth: 1, overflow: 'hidden', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  band: { alignItems: 'center', paddingTop: 18, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, left: -70, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: -80, right: -40, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  title: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF', textAlign: 'center', marginBottom: 14 },
  iconRing: { padding: 3, borderRadius: 34, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
  iconIn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  bandHint: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 12 },
  body: { padding: 20, paddingTop: 18, gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 64, borderRadius: 16, borderWidth: 1.5 },
  optionLabel: { fontFamily: fonts.bold, fontSize: 16 },
  optionSub: { fontFamily: fonts.regular, fontSize: 12 },
  hint: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 2, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
});
