import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { startTransition, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { ACCENTS, AccentKey, fonts, rgba } from '@/theme';

/**
 * سطر "لون التطبيق" + نافذة صغيرة لاختيار اللون.
 * الاختيار بيلوّن النافذة بس (فوري). الحفظ بيقفل النافذة ويلوّن التطبيق في الخلفية.
 */
export function AccentPickerRow() {
  const { c, accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AccentKey>(accent);

  const current = ACCENTS.find((a) => a.key === accent) ?? ACCENTS[0];
  const chosen = ACCENTS.find((a) => a.key === draft) ?? ACCENTS[0];

  const openSheet = () => {
    setDraft(accent);
    setOpen(true);
  };
  const save = () => {
    setOpen(false);
    if (draft !== accent) startTransition(() => setAccent(draft));
  };

  return (
    <>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={tr('لون التطبيق', 'App color')}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.rowIcon, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="color-palette" size={20} color={c.accentText} />
        </View>
        <Text style={[styles.rowLabel, { color: c.ink }]}>{tr('لون التطبيق', 'App color')}</Text>
        <LinearGradient colors={[current.light, current.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dot} />
        <Text style={[styles.rowValue, { color: c.accentText }]}>{tr(current.ar, current.en)}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.iconMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => setOpen(false)} accessibilityLabel={tr('إغلاق', 'Close')} />
        <View style={styles.center}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.isDark ? '#151A24' : '#FFFFFF', borderColor: rgba(chosen.main, 0.35), shadowColor: chosen.main },
            ]}
          >
            <Text style={[styles.title, { color: c.text }]}>{tr('لون التطبيق', 'App color')}</Text>

            {/* معاينة اللون المختار */}
            <LinearGradient colors={[chosen.light, chosen.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
              <Ionicons name="color-palette" size={20} color="#FFFFFF" />
              <Text style={styles.previewText}>{tr(chosen.ar, chosen.en)}</Text>
            </LinearGradient>

            <View style={styles.swatches}>
              {ACCENTS.map((a) => {
                const on = a.key === draft;
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => setDraft(a.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={tr(a.ar, a.en)}
                    style={[styles.swatchWrap, on && { borderColor: a.main }]}
                  >
                    <LinearGradient colors={[a.light, a.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch}>
                      {on ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => setOpen(false)}
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
              <Pressable onPress={save} accessibilityRole="button" style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
                <LinearGradient colors={[chosen.light, chosen.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                  <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حفظ', 'Save')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  rowValue: { fontFamily: fonts.semibold, fontSize: 13 },
  dot: { width: 18, height: 18, borderRadius: 9 },

  backdrop: { backgroundColor: 'rgba(5,15,35,0.45)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, pointerEvents: 'box-none' },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    gap: 16,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  preview: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  previewText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  swatchWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
});
