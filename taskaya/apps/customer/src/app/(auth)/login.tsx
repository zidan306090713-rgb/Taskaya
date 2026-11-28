import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthCard } from '@/components/ui/AuthCard';
import { AuthHero } from '@/components/ui/AuthHero';
import { GlowBg } from '@/components/home/GlowBg';
import { KeyboardInputBar } from '@/components/ui/KeyboardInputBar';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { t, tr } from '@/i18n';
import { signInWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

// على الموبايل: الكتابة بتحصل في شريط فوق الكيبورد والشاشة ثابتة. على الويب: خانات عادية.
const USE_BAR = Platform.OS !== 'web';
type Field = 'phone' | 'password' | null;

// على الموبايل: الخانة في الكارت بتبقى "زرار" يفتح الشريط، ومش بتاخد المؤشر نفسها
function TapField({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  if (!USE_BAR) return <>{children}</>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ pointerEvents: 'none' }}>{children}</View>
    </Pressable>
  );
}

export default function Login() {
  const { c } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Field>(null);

  const hide = useFocusHide();
  const cardAnim = useEntrance(60);
  const footAnim = useEntrance(120);

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

  const submitFromBar = () => {
    setActive(null);
    Keyboard.dismiss();
    onLogin();
  };

  return (
    <View style={[{ flex: 1, backgroundColor: 'transparent' }, hide]}>
      <GlowBg />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero />

        <View style={styles.inner}>
          <Animated.View style={cardAnim}>
            <AuthCard style={styles.card}>
              <Text style={[styles.welcome, { color: c.text }]}>{tr('أهلاً بعودتك', 'Welcome back')}</Text>
              <Text style={[styles.welcomeSub, { color: c.textSecondary }]}>{tr('سجّل دخولك لمتابعة طلباتك', 'Sign in to manage your orders')}</Text>

              <TapField onPress={() => setActive('phone')} label={t('phone')}>
                <PremiumInput
                  labelInside
                  label={t('phone')}
                  icon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  placeholder="01XXXXXXXXX"
                  highlighted={active === 'phone'}
                />
              </TapField>
              <TapField onPress={() => setActive('password')} label={t('password')}>
                <PremiumInput
                  labelInside
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
                  highlighted={active === 'password'}
                />
              </TapField>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: c.dangerBg, borderColor: c.dangerBorder }]}>
                  <Ionicons name="alert-circle" size={18} color={c.dangerText} />
                  <Text style={[styles.errorText, { color: c.dangerText }]}>{error}</Text>
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
            </AuthCard>
          </Animated.View>

          <Animated.View style={[styles.footerWrap, footAnim]}>
            <View style={styles.footer}>
              <Text style={[styles.muted, { color: c.textSecondary }]}>{t('noAccount')} </Text>
              <Link href="/register" style={[styles.link, { color: c.accentText }]}>{t('register')}</Link>
            </View>
            <View style={styles.secure}>
              <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
              <Text style={[styles.secureText, { color: c.textSecondary }]}>{tr('اتصال آمن ومشفّر', 'Secure & encrypted connection')}</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ===== شريط الكتابة فوق الكيبورد ===== */}
      {USE_BAR && active === 'phone' ? (
        <KeyboardInputBar
          key="phone"
          label={t('phone')}
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="01XXXXXXXXX"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setActive('password')}
          actionIcon="arrow-forward"
          onAction={() => setActive('password')}
          onClose={() => setActive(null)}
        />
      ) : null}
      {USE_BAR && active === 'password' ? (
        <KeyboardInputBar
          key="password"
          label={t('password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          placeholder="••••••••"
          returnKeyType="go"
          onSubmitEditing={submitFromBar}
          actionIcon="checkmark"
          onAction={submitFromBar}
          onClose={() => setActive(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 30 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 18 },
  card: { marginTop: -64, padding: 22 },
  welcome: { fontFamily: fonts.bold, fontSize: 23 },
  welcomeSub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4, marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 14, borderRadius: 14, borderWidth: 1 },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 13 },
  ctaShadow: { marginTop: 6, borderRadius: 16, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  cta: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.3 },
  footerWrap: { alignItems: 'center', marginTop: 22 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  muted: { fontFamily: fonts.regular },
  link: { fontFamily: fonts.bold },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.85 },
  secureText: { fontFamily: fonts.regular, fontSize: 12 },
});
