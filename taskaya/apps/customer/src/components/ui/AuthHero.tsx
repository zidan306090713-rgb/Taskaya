import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { t } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

/** الجزء الملوّن فوق صفحات الدخول والتسجيل: اللوجو في كارت أبيض + TASKAYA + الجملة */
export function AuthHero({ compact }: { compact?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={c.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + (compact ? 22 : 40), paddingBottom: compact ? 80 : 96 }]}
    >
      <View style={[styles.ring, { width: 280, height: 280, borderRadius: 140, top: -110, left: -100 }]} />
      <View style={[styles.ring, { width: 200, height: 200, borderRadius: 100, bottom: -80, right: -60 }]} />
      <View style={[styles.chip, compact && styles.chipSm]}>
        <OrbitLogo size={compact ? 60 : 76} />
      </View>
      <Text style={[styles.word, compact && styles.wordSm]}>TASKAYA</Text>
      {!compact ? <Text style={styles.tag}>{t('tagline')}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', overflow: 'hidden', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chip: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  chipSm: { width: 76, height: 76, borderRadius: 24 },
  word: { marginTop: 14, fontFamily: fonts.bold, fontSize: 26, letterSpacing: 7, color: '#FFFFFF' },
  wordSm: { marginTop: 10, fontSize: 20, letterSpacing: 6 },
  tag: { marginTop: 4, fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.82)' },
});
