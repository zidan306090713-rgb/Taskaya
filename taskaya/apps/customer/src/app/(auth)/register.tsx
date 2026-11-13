import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { t } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing } from '@/theme';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const onRegister = async () => {
    if (!fullName || !email || !password) return setError(t('requiredFields'));
    setLoading(true);
    setError('');
    setInfo('');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role: 'customer' } },
    });
    if (error) {
      setError(error.message);
    } else if (data.session && phone.trim()) {
      await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', data.session.user.id);
    } else if (!data.session) {
      setInfo(t('checkEmail'));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('register')}</Text>
        <View style={{ height: spacing.lg }} />
        <GlassCard strong style={styles.panel}>
        <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
        <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Button title={t('register')} onPress={onRegister} loading={loading} />
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
  info: { fontFamily: fonts.regular, color: colors.success, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, color: colors.primaryLight },
});
