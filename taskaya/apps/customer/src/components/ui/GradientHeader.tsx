import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const WEB_FROST =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' } as any)
    : null;

/** الهيدر الزجاجي الموحّد (زرار رجوع + أيقونة + عنوان + وصف) — نفس هوية الرئيسية */
export function GradientHeader({
  title,
  subtitle,
  icon,
  right,
  onBack,
  padBottom = 44,
  children,
  noBack,
}: {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  right?: ReactNode;
  onBack?: () => void;
  padBottom?: number;
  children?: ReactNode;
  noBack?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={[styles.wrap, WEB_FROST, { paddingTop: insets.top + 12, paddingBottom: padBottom }]}>
      {Platform.OS === 'ios' ? <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={c.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.74 }]}
      />
      <View style={styles.glow} />
      <View style={styles.glow2} />
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sheen}
      />
      <View style={styles.inner}>
        <View style={styles.row}>
          {noBack ? null : (
            <Pressable onPress={back} style={styles.btn} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('رجوع', 'Back')}>
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#FFFFFF" />
            </Pressable>
          )}
          {icon ? (
            <View style={styles.btn}>
              <Ionicons name={icon} size={18} color="#FFFFFF" />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {right}
        </View>
        {subtitle ? <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF' },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 12 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -120, left: -80, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: -90, right: -50, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
});
