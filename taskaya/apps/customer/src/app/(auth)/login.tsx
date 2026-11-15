import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { t } from '@/i18n';
import { signInWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>TASKAYA</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
        <View style={{ height: spacing.xl }} />
        <GlassCard strong style={styles.panel}>
          <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="username" textContentType="username" />
          <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={t('login')} onPress={onLogin} loading={loading} />
        </GlassCard>
        <View style={styles.footer}>
          <Text style={styles.muted}>{t('noAccount')} </Text>
          <Link href="/register" style={styles.link}>{t('register')}</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  panel: { padding: spacing.lg },
  brand: { fontFamily: fonts.bold, fontSize: 36, color: colors.primaryLight, textAlign: 'center', letterSpacing: 3 },
  tagline: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  error: { fontFamily: fonts.regular, color: colors.danger, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: colors.primaryLight },
});
