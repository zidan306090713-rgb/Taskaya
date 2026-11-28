import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { ComponentProps, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Screen } from '@/components/ui/Screen';
import { isRTL, layoutRTL, Lang, lang, setLanguage, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function Settings() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader title={tr('الإعدادات', 'Settings')} padBottom={22} />
      <Screen padTop={18}>
        <Text style={styles.group}>{tr('عام', 'General')}</Text>
        <View style={styles.card}>
          <Row
            icon="language-outline"
            label={tr('اللغة', 'Language')}
            value={lang === 'ar' ? 'العربية' : 'English'}
            onPress={() => setLangOpen(true)}
          />
          <View style={styles.sep} />
          <Row icon="location-outline" label={tr('عناويني', 'My addresses')} onPress={() => router.push('/addresses')} />
        </View>
        <Text style={styles.soon}>{tr('إعدادات تانية هتتضاف قريب', 'More settings coming soon')}</Text>
      </Screen>
      {langOpen ? <LanguageSheet onClose={() => setLangOpen(false)} /> : null}
    </>
  );
}

// سطر في قايمة الإعدادات (نستخدمه لأي إعداد جديد بعدين)
function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={c.accentText} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name={layoutRTL() ? 'chevron-back' : 'chevron-forward'} size={18} color={c.iconMuted} />
    </Pressable>
  );
}

const LANGS: { key: Lang; label: string; sub: string }[] = [
  { key: 'ar', label: 'العربية', sub: 'Arabic' },
  { key: 'en', label: 'English', sub: 'الإنجليزية' },
];

export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [pick, setPick] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);

  const save = async () => {
    if (pick === lang) return onClose();
    setBusy(true);
    // لو التطبيق ما اتقفلش لوحده بعد ثانية ونص: نقول للمستخدم يقفله ويفتحه
    setTimeout(() => setHint(true), 1500);
    await setLanguage(pick);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={busy ? undefined : onClose} />
      <View style={styles.center}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{tr('اللغة', 'Language')}</Text>
          {LANGS.map((l) => {
            const on = pick === l.key;
            return (
              <Pressable
                key={l.key}
                onPress={() => setPick(l.key)}
                disabled={busy}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionOn]}
              >
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.accentText : c.iconMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{l.label}</Text>
                  <Text style={styles.optionSub}>{l.sub}</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.note}>
            {hint
              ? tr('لو اللغة ما اتغيرتش، اقفل التطبيق وافتحه تاني', "If it didn't change, close and reopen the app")
              : tr('اللغة والاتجاه هيتغيروا فورًا', 'Language and direction will change instantly')}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.btn, styles.flex, styles.btnGhost, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.btnText, { color: c.ink }]}>{tr('إلغاء', 'Cancel')}</Text>
            </Pressable>
            <Pressable onPress={save} disabled={busy} style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حفظ', 'Save')}</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    group: { fontFamily: fonts.bold, fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm, paddingHorizontal: 4 },
    card: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: c.panelBg,
      borderWidth: 1,
      borderColor: c.panelBorder,
      paddingHorizontal: 16,
      paddingVertical: 6,
      elevation: 0,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 },
    rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: c.ink },
    rowValue: { fontFamily: fonts.semibold, fontSize: 13, color: c.accentText },
    sep: { height: 1, backgroundColor: c.accentLine },
    soon: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary, textAlign: 'center', marginTop: spacing.lg },

    backdrop: { backgroundColor: 'rgba(5,15,35,0.5)' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'box-none' },
    sheet: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: rgba(c.accent, 0.3),
      backgroundColor: c.isDark ? '#151A24' : '#FFFFFF',
      padding: 20,
      gap: 10,
      shadowColor: c.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: c.text, textAlign: 'center', marginBottom: 6 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      backgroundColor: c.chipBg,
    },
    optionOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    optionLabel: { fontFamily: fonts.bold, fontSize: 16, color: c.ink },
    optionSub: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
    note: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary, textAlign: 'center', marginVertical: 4 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    flex: { flex: 1 },
    btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,31,58,0.06)' },
    btnText: { fontFamily: fonts.bold, fontSize: 15 },
  });
