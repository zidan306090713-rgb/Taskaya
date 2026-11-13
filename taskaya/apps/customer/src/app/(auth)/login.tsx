import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { t } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing } from '@/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    if (!email || !password) return setError(t('requiredFields'));
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>TASKAYA</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
        <View style={{ height: spacing.xl }} />
        <Input label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t('login')} onPress={onLogin} loading={loading} />
        <View style={styles.footer}>
          <Text style={styles.muted}>{t('noAccount')} </Text>
          <Link href="/register" style={styles.link}>{t('register')}</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brand: { fontFamily: fonts.bold, fontSize: 36, color: colors.primary, textAlign: 'center' },
  tagline: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  error: { fontFamily: fonts.regular, color: colors.danger, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: colors.primary },
});
