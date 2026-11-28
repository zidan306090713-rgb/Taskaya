import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { t } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' } as any) : null;

/** هيدر صفحات الدخول والتسجيل: زجاج بنفس هوية الرئيسية + اللوجو في حلقة بيضا + TASKAYA + الجملة */
export function AuthHero({ compact }: { compact?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, WEB_FROST, { paddingTop: insets.top + (compact ? 22 : 40), paddingBottom: compact ? 80 : 96 }]}>
      {Platform.OS === 'ios' ? <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={c.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.74 }]}
      />
      <View style={styles.glow} />
      <View style={styles.glow2} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />

      <View style={[styles.ring, compact && styles.ringSm]}>
        <View style={[styles.chip, compact && styles.chipSm]}>
          <OrbitLogo size={compact ? 56 : 70} />
        </View>
      </View>
      <Text style={[styles.word, compact && styles.wordSm]}>TASKAYA</Text>
      {!compact ? <Text style={styles.tag}>{t('tagline')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', overflow: 'hidden', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -120, left: -80, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: -90, right: -50, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  ring: {
    padding: 4,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  ringSm: { borderRadius: 26, padding: 3 },
  chip: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  chipSm: { width: 70, height: 70, borderRadius: 22 },
  word: { marginTop: 14, fontFamily: fonts.bold, fontSize: 26, letterSpacing: 7, color: '#FFFFFF' },
  wordSm: { marginTop: 10, fontSize: 20, letterSpacing: 6 },
  tag: { marginTop: 4, fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.86)' },
});
