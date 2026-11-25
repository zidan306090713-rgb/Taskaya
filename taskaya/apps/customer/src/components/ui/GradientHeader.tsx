import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** الهيدر الملوّن الموحّد (زرار رجوع + أيقونة + عنوان + وصف) — بنفس روح الرئيسية */
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
    <LinearGradient
      colors={c.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: padBottom }]}
    >
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
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
});
