import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlowBg } from '@/components/home/GlowBg';
import { AuthCard } from '@/components/ui/AuthCard';
import { AuthHero } from '@/components/ui/AuthHero';
import { OtpInput, OtpStatus } from '@/components/ui/OtpInput';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { t, tr } from '@/i18n';
import { cancelHold, holdAuth, releaseAuth, resendSms, verifyOtp } from '@/lib/auth';
import { toLocalDisplay } from '@/lib/phone';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

const RESEND_SECONDS = 60;
const MIN_THINK_MS = 700; // أقل مدة يظهر فيها "جاري التحقق"
const SUCCESS_MS = 900; // مدة ظهور اللون الأخضر قبل الدخول
const ERROR_MS = 800; // مدة ظهور اللون الأحمر قبل المسح

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** صفحة كود التأكيد — نفس هوية الدخول: AuthHero + AuthCard زجاج + GlowBg */
export default function Verify() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  const busy = useRef(false);

  const hide = useFocusHide();
  const cardAnim = useEntrance(60);
  const footAnim = useEntrance(120);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // لو الشاشة اتقفلت أثناء التحقق، نطلق أي جلسة محجوزة
  useEffect(() => () => releaseAuth(), []);

  async function submit(value: string) {
    busy.current = true;
    setError('');
    setStatus('checking');
    holdAuth();
    const [{ error: err }] = await Promise.all([verifyOtp(phone, value), sleep(MIN_THINK_MS)]);
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

  const canResend = left <= 0 && status === 'idle';

  return (
    <KeyboardAvoidingView style={[{ flex: 1, backgroundColor: 'transparent' }, hide]} behavior="padding">
      <GlowBg />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero />

        <View style={styles.inner}>
          <Animated.View style={cardAnim}>
            <AuthCard style={styles.card}>
              <View style={styles.iconRing}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconFill}>
                  <Ionicons name="chatbubble-ellipses-outline" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>{t('verifyTitle')}</Text>
              <Text style={styles.sub}>{t('codeSentTo')}</Text>
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={15} color={c.accentText} />
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
                    <Ionicons name="sync-outline" size={16} color={c.accentText} />
                    <Text style={[styles.status, { color: c.accentText }]}>{t('verifying')}</Text>
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
                {canResend ? <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
                <Ionicons name={canResend ? 'refresh' : 'time-outline'} size={16} color={canResend ? '#FFFFFF' : c.textSecondary} />
                <Text style={[styles.resendText, canResend && { color: '#FFFFFF' }]}>
                  {left > 0 ? `${t('resendIn')} ${fmt(left)}` : t('resend')}
                </Text>
              </Pressable>
            </AuthCard>
          </Animated.View>

          <Animated.View style={[styles.footerWrap, footAnim]}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} accessibilityRole="button" style={styles.changeRow}>
              <Ionicons name="arrow-back" size={15} color={c.accentText} />
              <Text style={[styles.muted, { color: c.accentText }]}>{t('changeNumber')}</Text>
            </Pressable>
            <View style={styles.secure}>
              <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
              <Text style={styles.secureText}>{tr('لن نشارك رقمك مع أي طرف آخر', 'We never share your number')}</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingBottom: 30 },
    inner: { paddingHorizontal: 20, width: '100%', maxWidth: 440, alignSelf: 'center' },
    card: { marginTop: -64, padding: 22, alignItems: 'center' },

    iconRing: {
      width: 70,
      height: 70,
      borderRadius: 35,
      padding: 3,
      backgroundColor: '#FFFFFF',
      marginBottom: 14,
      shadowColor: c.accent,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    iconFill: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

    title: { fontFamily: fonts.bold, fontSize: 22, color: c.text, textAlign: 'center' },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: c.textSecondary, textAlign: 'center', marginTop: 6 },
    phonePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: rgba(c.accent, 0.1),
      borderWidth: 1,
      borderColor: rgba(c.accent, 0.25),
    },
    phone: { fontFamily: fonts.bold, fontSize: 17, color: c.accentText, letterSpacing: 1.5 },

    statusRow: { minHeight: 30, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    statusInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    status: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },

    resend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingHorizontal: 22,
      height: 46,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
    },
    resendActive: { borderColor: 'rgba(255,255,255,0.35)' },
    resendText: { fontFamily: fonts.semibold, fontSize: 14, color: c.textSecondary },

    footerWrap: { alignItems: 'center', marginTop: 22 },
    changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
    muted: { fontFamily: fonts.semibold },
    secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.85 },
    secureText: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
  });
