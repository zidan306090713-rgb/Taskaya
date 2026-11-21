import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OtpInput, OtpStatus } from '@/components/ui/OtpInput';
import { t, tr } from '@/i18n';
import { cancelHold, holdAuth, releaseAuth, resendSms, verifyOtp } from '@/lib/auth';
import { toLocalDisplay } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';

const RESEND_SECONDS = 60;
const MIN_THINK_MS = 700; // أقل مدة يظهر فيها "جاري التحقق"
const SUCCESS_MS = 900; // مدة ظهور اللون الأخضر قبل الدخول
const ERROR_MS = 800; // مدة ظهور اللون الأحمر قبل المسح
const BLUE = '#2F80ED';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: Platform.OS === 'android' ? 1 : v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
}

export default function Verify() {
  const router = useRouter();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  const busy = useRef(false);

  const brandAnim = useEntrance(0);
  const cardAnim = useEntrance(150);
  const footAnim = useEntrance(300);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // لو الشاشة اتقفلت أثناء التحقق، نطلق أي جلسة محجوزة
  useEffect(() => () => releaseAuth(), []);

  async function submit(c: string) {
    busy.current = true;
    setError('');
    setStatus('checking');
    holdAuth();
    const [{ error: err }] = await Promise.all([verifyOtp(phone, c), sleep(MIN_THINK_MS)]);
    if (err) {
      cancelHold();
      setStatus('error');
      setError(t('wrongCode'));
      await sleep(ERROR_MS);
      setCode('');
      setStatus('idle');
      busy.current = false;
      return;
    }
    setStatus('success');
    await sleep(SUCCESS_MS);
    releaseAuth(); // التحويل للرئيسية يحصل تلقائيًا من (auth)/_layout
  }

  // تأكيد تلقائي أول ما الكود يكتمل
  useEffect(() => {
    if (code.length === 6 && !busy.current) submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const onResend = async () => {
    if (left > 0 || status !== 'idle') return;
    setError('');
    const { error: err } = await resendSms(phone);
    if (err) setError(`${t('sendFailed')} (${err.message})`);
    else setLeft(RESEND_SECONDS);
  };

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;

  const canResend = left <= 0 && status === 'idle';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior="padding">
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
              <View style={styles.iconRing}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={BLUE} />
              </View>

              <Text style={styles.title}>{t('verifyTitle')}</Text>
              <Text style={styles.sub}>{t('codeSentTo')}</Text>
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={15} color={BLUE} />
                <Text style={styles.phone}>{toLocalDisplay(phone)}</Text>
              </View>

              <View style={{ height: 22 }} />

              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setError('');
                }}
                status={status}
              />

              <View style={styles.statusRow}>
                {status === 'checking' ? (
                  <View style={styles.statusInline}>
                    <Ionicons name="sync-outline" size={16} color={BLUE} />
                    <Text style={[styles.status, { color: BLUE }]}>{t('verifying')}</Text>
                  </View>
                ) : status === 'success' ? (
                  <View style={styles.statusInline}>
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    <Text style={[styles.status, { color: '#16A34A' }]}>{t('verified')}</Text>
                  </View>
                ) : error ? (
                  <View style={styles.statusInline}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={[styles.status, { color: '#DC2626' }]}>{error}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={onResend}
                disabled={!canResend}
                accessibilityRole="button"
                style={({ pressed }) => [styles.resend, canResend && styles.resendActive, pressed && canResend && { opacity: 0.85 }]}
              >
                <Ionicons name={canResend ? 'refresh' : 'time-outline'} size={16} color={canResend ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.resendText, canResend && { color: '#FFFFFF' }]}>
                  {left > 0 ? `${t('resendIn')} ${fmt(left)}` : t('resend')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ===== Footer ===== */}
        <Animated.View style={[styles.footerWrap, footAnim]}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.changeRow}>
            <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
            <Text style={styles.muted}>{t('changeNumber')}</Text>
          </Pressable>
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.secureText}>{tr('لن نشارك رقمك مع أي طرف آخر', 'We never share your number')}</Text>
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
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,237,0.18)',
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 0,
  },
  accent: { height: 4 },
  cardBody: { padding: 26, alignItems: 'center' },

  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,128,237,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(47,128,237,0.28)',
    marginBottom: 16,
  },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(47,128,237,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,237,0.25)',
  },
  phone: { fontFamily: fonts.bold, fontSize: 17, color: BLUE, letterSpacing: 1.5 },

  statusRow: { minHeight: 30, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },

  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(11,31,58,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,237,0.18)',
  },
  resendActive: { backgroundColor: BLUE, borderColor: 'rgba(255,255,255,0.35)', shadowColor: BLUE, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  resendText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },

  footerWrap: { alignItems: 'center', marginTop: 24 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  muted: { fontFamily: fonts.semibold, color: colors.textSecondary },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.85 },
  secureText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
