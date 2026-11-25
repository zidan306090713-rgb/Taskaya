import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { isRTL, tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

export type Role = 'customer' | 'provider';
type IconName = ComponentProps<typeof Ionicons>['name'];
const ND = Platform.OS !== 'web';
const IN_MS = 200;
const OUT_MS = 140;

/**
 * نافذة "أنا عميل / أنا مقدم خدمة" — فوق صفحة إنشاء الحساب.
 * خفيفة: خلفية غامقة سادة (من غير blur) + حركة دخول/خروج سريعة على معالج الرسم.
 */
export function RoleChooser({ visible, onPick, onLogin }: { visible: boolean; onPick: (r: Role) => void; onLogin: () => void }) {
  const { c } = useTheme();
  const [v] = useState(() => new Animated.Value(0));
  // بنسيب النافذة موجودة لحد ما حركة الخروج تخلص
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(v, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, v]);

  if (!mounted) return null;

  const cards: { k: Role; icon: IconName; title: string; sub: string }[] = [
    { k: 'customer', icon: 'home', title: tr('أنا عميل', 'I need services'), sub: tr('عايز أطلب خدمات لبيتي بسهولة', 'Book trusted services for your home') },
    { k: 'provider', icon: 'construct', title: tr('أنا مقدم خدمة', 'I provide services'), sub: tr('عايز أعرض خدماتي وأستقبل طلبات', 'Offer your services and get booked') },
  ];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.root, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: v }]} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.isDark ? '#121826' : '#FFFFFF',
              borderColor: c.accentBorder,
              shadowColor: c.accent,
              opacity: v,
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
          <View style={styles.body}>
            <View style={styles.logo}>
              <OrbitLogo size={78} animated={false} />
            </View>
            <Text style={[styles.title, { color: c.text }]}>{tr('أهلاً بيك في TASKAYA', 'Welcome to TASKAYA')}</Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>{tr('هتستخدم التطبيق إزاي؟', 'How will you use the app?')}</Text>

            {cards.map((card) => (
              <Pressable
                key={card.k}
                onPress={() => onPick(card.k)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
                  {
                    backgroundColor: c.isDark ? 'rgba(255,255,255,0.04)' : '#F7F9FD',
                    borderColor: pressed ? c.accent : c.accentBorder,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardIcon}>
                  <Ionicons name={card.icon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{card.title}</Text>
                  <Text style={[styles.cardSub, { color: c.textSecondary }]}>{card.sub}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={c.accentText} />
              </Pressable>
            ))}

            <Pressable onPress={onLogin} hitSlop={8} style={styles.loginRow}>
              <Text style={[styles.loginText, { color: c.textSecondary }]}>
                {tr('عندك حساب بالفعل؟ ', 'Already have an account? ')}
                <Text style={{ fontFamily: fonts.bold, color: c.accentText }}>{tr('سجّل دخول', 'Sign in')}</Text>
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dim: { backgroundColor: 'rgba(3,8,23,0.74)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 0,
  },
  accent: { height: 4 },
  body: { padding: 22, gap: 12 },
  logo: { alignItems: 'center', marginBottom: 2 },
  title: { fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16.5 },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  loginRow: { alignItems: 'center', marginTop: 6 },
  loginText: { fontFamily: fonts.regular, fontSize: 13.5 },
});
