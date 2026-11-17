import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { t, tr } from '@/i18n';
import { signUpWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';

const MIN_PASSWORD = 8;
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

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  const brandAnim = useEntrance(0);
  const cardAnim = useEntrance(150);
  const footAnim = useEntrance(300);

  const onRegister = async () => {
    setError('');
    setNameError('');
    if (!fullName.trim() || !phone.trim() || !password || !confirm) return setError(t('requiredFields'));
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 3) return setNameError(tr('من فضلك اكتب اسمك ثلاثي (الاسم الأول واسم الأب واسم الجد)', 'Please enter your full name (first, middle and last name)'));
    const e164 = normalizeEgyptPhone(phone);
    if (!e164) return setError(t('invalidPhone'));
    if (password.length < MIN_PASSWORD) return setError(t('passwordTooShort'));
    if (password !== confirm) return setError(t('passwordMismatch'));

    setLoading(true);
    setError('');
    const { error } = await signUpWithPhone({ phone: e164, password, fullName: fullName.trim().replace(/\s+/g, ' ') });
    setLoading(false);
    if (error) return setError(`${t('sendFailed')} (${error.message})`);

    router.push({ pathname: '/verify', params: { phone: e164 } });
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
          <LinearGradient colors={['#4AA3FF', '#1D6FE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Text style={styles.logoLetter}>T</Text>
          </LinearGradient>
          <Text style={styles.brand}>TASKAYA</Text>
        </Animated.View>

        {/* ===== Card ===== */}
        <Animated.View style={cardAnim}>
          <View style={[styles.card, webGlass]}>
            <LinearGradient colors={['#4AA3FF', '#1D6FE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
            <View style={styles.cardBody}>
              <Text style={styles.welcome}>{t('register')}</Text>
              <Text style={styles.welcomeSub}>{tr('أنشئ حسابك في دقيقة واحدة', 'Create your account in a minute')}</Text>

              <PremiumInput
                label={t('fullName')}
                placeholder={tr('الاسم الثلاثي', 'First Middle Last')}
                icon="person-outline"
                error={nameError}
                value={fullName}
                onChangeText={(v) => { setFullName(v); setNameError(''); }}
                autoComplete="name"
                textContentType="name"
              />
              <PremiumInput
                label={t('phone')}
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                placeholder="01XXXXXXXXX"
              />
              <PremiumInput
                label={t('password')}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="••••••••"
              />
              <PremiumInput
                label={t('confirmPassword')}
                icon="shield-checkmark-outline"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={onRegister}
                placeholder="••••••••"
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={onRegister}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t('sendCode')}
                style={({ pressed }) => [styles.ctaShadow, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
              >
                <LinearGradient colors={['#3B8DF5', '#1F66D6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>{t('sendCode')}</Text>
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
            <Text style={styles.muted}>{t('haveAccount')} </Text>
            <Link href="/login" style={styles.link}>{t('login')}</Link>
          </View>
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.secureText}>{tr('بياناتك محمية ومشفّرة', 'Your data is protected & encrypted')}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },

  brandWrap: { alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 10,
  },
  logoLetter: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 48, color: '#FFFFFF', textShadowColor: 'rgba(8,36,100,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  brand: { fontFamily: fonts.bold, fontSize: 24, color: BLUE, textAlign: 'center', letterSpacing: 6 },

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
  welcomeSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 22 },

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

  footerWrap: { alignItems: 'center', marginTop: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: BLUE },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, opacity: 0.85 },
  secureText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
