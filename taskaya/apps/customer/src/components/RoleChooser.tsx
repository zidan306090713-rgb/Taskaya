import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
const ANDROID = Platform.OS === 'android';
const IN_MS = 100;
const WEB_DIM = Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any) : null;
const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)' } as any) : null;
const WEB_CARD = Platform.OS === 'web' ? ({ outlineStyle: 'none', transition: 'border-color .2s ease, box-shadow .2s ease' } as any) : null;

/**
 * نافذة "أنا عميل / أنا مقدم خدمة" — فوق صفحة إنشاء الحساب.
 * هوية زجاجية: شريط متدرّج فوق (لوجو في حلقة بيضا) + كروت زجاجية.
 */
export function RoleChooser({ visible, onPick, onLogin }: { visible: boolean; onPick: (r: Role) => void; onLogin: () => void }) {
  const { c } = useTheme();
  const [v] = useState(() => new Animated.Value(0));
  // أندرويد: نستنى حركة دخول الصفحة تخلص قبل ما الـ Modal يتفتح (كان بيرمش)
  const [ready, setReady] = useState(!ANDROID);
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(id);
  }, [ready]);
  useEffect(() => {
    if (!visible || !ready) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [visible, ready, v]);

  if (!visible || !ready) return null;

  const cards: { k: Role; icon: IconName; title: string; sub: string }[] = [
    { k: 'customer', icon: 'home', title: tr('أنا عميل', 'I need services'), sub: tr('عايز أطلب خدمات لبيتي بسهولة', 'Book trusted services for your home') },
    { k: 'provider', icon: 'construct', title: tr('أنا مقدم خدمة', 'I provide services'), sub: tr('عايز أعرض خدماتي وأستقبل طلبات', 'Offer your services and get booked') },
  ];
  const cardSheen = c.isDark ? (['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'] as const);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.root, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <View style={[StyleSheet.absoluteFill, styles.dim, WEB_DIM]} />
        <Animated.View
          style={[
            styles.sheet,
            WEB_FROST,
            {
              backgroundColor: c.isDark ? (ANDROID ? '#141A28' : 'rgba(20,26,40,0.86)') : ANDROID ? '#FFFFFF' : 'rgba(255,255,255,0.84)',
              borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)',
              shadowColor: c.accent,
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          {Platform.OS === 'ios' ? <BlurView intensity={40} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}

          {/* ===== الشريط المتدرّج فوق ===== */}
          <View style={styles.band}>
            <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.glow} />
            <View style={styles.glow2} />
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
            <View style={styles.ring}>
              <View style={styles.chip}>
                <OrbitLogo size={50} animated={false} />
              </View>
            </View>
            <Text style={styles.title}>{tr('أهلاً بيك في TASKAYA', 'Welcome to TASKAYA')}</Text>
            <Text style={styles.sub}>{tr('هتستخدم التطبيق إزاي؟', 'How will you use the app?')}</Text>
          </View>

          <View style={styles.body}>
            {cards.map((card) => (
              <Pressable
                key={card.k}
                onPress={() => onPick(card.k)}
                accessibilityRole="button"
                style={(state) => {
                  const on = state.pressed || (state as { hovered?: boolean }).hovered;
                  return [
                    styles.card,
                    WEB_CARD,
                    {
                      backgroundColor: c.isDark ? 'rgba(255,255,255,0.05)' : ANDROID ? '#F7F9FD' : 'rgba(244,246,250,0.75)',
                      borderColor: on ? c.accent : c.isDark ? 'rgba(255,255,255,0.12)' : ANDROID ? c.accentBorder : 'rgba(255,255,255,0.95)',
                      shadowColor: c.accent,
                      shadowOpacity: on ? 0.2 : c.isDark ? 0.18 : 0.08,
                      transform: [{ scale: state.pressed ? 0.98 : 1 }],
                    },
                  ];
                }}
              >
                <View style={styles.cardClip}>
                  <LinearGradient colors={cardSheen} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cardSheen} />
                </View>
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
  dim: { backgroundColor: 'rgba(5,15,35,0.45)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 0,
  },
  band: { alignItems: 'center', paddingTop: 22, paddingBottom: 20, paddingHorizontal: 18, overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, left: -70, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -80, right: -40, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  ring: { padding: 3, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  chip: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { marginTop: 12, fontFamily: fonts.bold, fontSize: 21, color: '#FFFFFF', textAlign: 'center' },
  sub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.86)', textAlign: 'center' },
  body: { padding: 18, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
  },
  cardClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' },
  cardSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  cardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16.5 },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  loginRow: { alignItems: 'center', marginTop: 4 },
  loginText: { fontFamily: fonts.regular, fontSize: 13.5 },
});
