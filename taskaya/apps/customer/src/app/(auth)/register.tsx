import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { t } from '@/i18n';
import { signUpWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';

const MIN_PASSWORD = 8;

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !password || !confirm) return setError(t('requiredFields'));
    const e164 = normalizeEgyptPhone(phone);
    if (!e164) return setError(t('invalidPhone'));
    if (password.length < MIN_PASSWORD) return setError(t('passwordTooShort'));
    if (password !== confirm) return setError(t('passwordMismatch'));

    setLoading(true);
    setError('');
    const { error } = await signUpWithPhone({ phone: e164, password, fullName });
    setLoading(false);
    if (error) return setError(`${t('sendFailed')} (${error.message})`);

    router.push({ pathname: '/verify', params: { phone: e164 } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('register')}</Text>
        <View style={{ height: spacing.lg }} />
        <GlassCard strong style={styles.panel}>
          <Input label={t('fullName')} value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
          <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
          <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <Input label={t('confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={t('sendCode')} onPress={onRegister} loading={loading} />
        </GlassCard>
        <View style={styles.footer}>
          <Text style={styles.muted}>{t('haveAccount')} </Text>
          <Link href="/login" style={styles.link}>{t('login')}</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  panel: { padding: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, textAlign: 'center' },
  error: { fontFamily: fonts.regular, color: colors.danger, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: colors.primaryLight },
});
