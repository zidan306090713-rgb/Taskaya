import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { OtpInput, OtpStatus } from '@/components/ui/OtpInput';
import { t } from '@/i18n';
import { cancelHold, holdAuth, releaseAuth, resendSms, verifyOtp } from '@/lib/auth';
import { toLocalDisplay } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';

const RESEND_SECONDS = 60;
const MIN_THINK_MS = 700; // أقل مدة يظهر فيها "جاري التحقق"
const SUCCESS_MS = 900; // مدة ظهور اللون الأخضر قبل الدخول
const ERROR_MS = 800; // مدة ظهور اللون الأحمر قبل المسح

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Verify() {
  const router = useRouter();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(RESEND_SECONDS);
  const busy = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // لو الشاشة اتقفلت أثناء التحقق، نطلق أي جلسة محجوزة
  useEffect(() => () => releaseAuth(), []);

  // تأكيد تلقائي أول ما الكود يكتمل
  useEffect(() => {
    if (code.length === 6 && !busy.current) submit(code);
  }, [code]);

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

  const onResend = async () => {
    if (left > 0 || status !== 'idle') return;
    setError('');
    const { error: err } = await resendSms(phone);
    if (err) setError(`${t('sendFailed')} (${err.message})`);
    else setLeft(RESEND_SECONDS);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('verifyTitle')}</Text>
        <Text style={styles.sub}>{t('codeSentTo')}</Text>
        <Text style={styles.phone}>{toLocalDisplay(phone)}</Text>
        <View style={{ height: spacing.lg }} />
        <GlassCard strong style={styles.panel}>
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
              <Text style={[styles.status, { color: colors.primaryLight }]}>{t('verifying')}</Text>
            ) : status === 'success' ? (
              <Text style={[styles.status, { color: colors.success }]}>{t('verified')}</Text>
            ) : error ? (
              <Text style={[styles.status, { color: colors.danger }]}>{error}</Text>
            ) : null}
          </View>
        </GlassCard>
        <View style={styles.footer}>
          <Pressable onPress={onResend} disabled={left > 0 || status !== 'idle'} accessibilityRole="button">
            <Text style={[styles.link, left > 0 && styles.disabled]}>
              {left > 0 ? `${t('resendIn')} ${left}` : t('resend')}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ marginTop: spacing.md }}>
            <Text style={styles.muted}>{t('changeNumber')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  panel: { padding: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  phone: { fontFamily: fonts.bold, fontSize: 20, color: colors.primaryLight, textAlign: 'center', marginTop: spacing.xs, letterSpacing: 1 },
  statusRow: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  link: { fontFamily: fonts.bold, color: colors.primaryLight },
  disabled: { color: colors.textSecondary },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
});
