import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { t, tr } from '@/i18n';
import { signInWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';
import { useTheme } from '@/providers/ThemeProvider';

const BLUE = '#2F80ED';

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
}

export default function Login() {
  const { c } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const brandAnim = useEntrance(0);
  const cardAnim = useEntrance(150);
  const footAnim = useEntrance(300);

  const onLogin = async () => {
    if (!phone.trim() || !password) return setError(t('requiredFields'));
    const e164 = normalizeEgyptPhone(phone);
    if (!e164) return setError(t('invalidPhone'));

    setLoading(true);
    setError('');
    const { error } = await signInWithPhone(e164, password);
    setLoading(false);
    if (error) setError(t('wrongCredentials'));
    // عند النجاح: AuthProvider يلتقط الجلسة و (auth)/_layout يحوّل للرئيسية تلقائيًا
  };

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ===== Brand ===== */}
        <Animated.View style={[styles.brandWrap, brandAnim]}>
          <View style={styles.halo}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.logo, { shadowColor: c.accent }]}>
              <Text style={styles.logoLetter}>T</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.brand, { color: c.accent }]}>TASKAYA</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>{t('tagline')}</Text>
        </Animated.View>

        {/* ===== Card ===== */}
        <Animated.View style={cardAnim}>
          <View style={[styles.card, { backgroundColor: c.glassBg, borderColor: c.panelBorder, shadowColor: c.accent }, webGlass]}>
            <LinearGradient
              colors={c.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accent}
            />
            <View style={styles.cardBody}>
              <Text style={[styles.welcome, { color: c.text }]}>{tr('أهلاً بعودتك', 'Welcome back')}</Text>
              <Text style={[styles.welcomeSub, { color: c.textSecondary }]}>{tr('سجّل دخولك لمتابعة طلباتك', 'Sign in to manage your orders')}</Text>

              <PremiumInput
                label={t('phone')}
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="username"
                textContentType="username"
                placeholder="01XXXXXXXXX"
              />
              <PremiumInput
                label={t('password')}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={onLogin}
                placeholder="••••••••"
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={onLogin}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t('login')}
                style={({ pressed }) => [styles.ctaShadow, { shadowColor: c.accent }, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
              >
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>{t('login')}</Text>
                      <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ===== Footer ===== */}
        <Animated.View style={[styles.footerWrap, footAnim]}>
          <View style={styles.footer}>
            <Text style={[styles.muted, { color: c.textSecondary }]}>{t('noAccount')} </Text>
            <Link href="/register" style={[styles.link, { color: c.accent }]}>{t('register')}</Link>
          </View>
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.secureText, { color: c.textSecondary }]}>{tr('اتصال آمن ومشفّر', 'Secure & encrypted connection')}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },

  brandWrap: { alignItems: 'center', marginBottom: 28 },
  halo: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  logoLetter: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 52, color: '#FFFFFF', textShadowColor: 'rgba(8,36,100,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  brand: { fontFamily: fonts.bold, fontSize: 30, color: BLUE, textAlign: 'center', letterSpacing: 7 },
  tagline: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: 6, fontSize: 14 },

  card: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,237,0.18)',
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 10,
  },
  accent: { height: 4 },
  cardBody: { padding: 26 },
  welcome: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  welcomeSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
  },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: '#B91C1C' },

  ctaShadow: {
    marginTop: 6,
    borderRadius: 16,
    shadowColor: BLUE,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  cta: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 16.5, color: '#FFFFFF', letterSpacing: 0.4 },

  footerWrap: { alignItems: 'center', marginTop: 26 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: BLUE },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, opacity: 0.85 },
  secureText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
