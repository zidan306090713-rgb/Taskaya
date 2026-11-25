import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoleChooser, type Role } from '@/components/RoleChooser';
import { AuthHero } from '@/components/ui/AuthHero';
import { KeyboardInputBar } from '@/components/ui/KeyboardInputBar';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { t, tr } from '@/i18n';
import { signUpWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

const MIN_PASSWORD = 8;
// على الموبايل: الكتابة في شريط فوق الكيبورد والشاشة ثابتة. على الويب: خانات عادية.
const USE_BAR = Platform.OS !== 'web';

type Field = 'name' | 'phone' | 'password' | 'confirm';
type BarCfg = Omit<ComponentProps<typeof KeyboardInputBar>, 'onClose' | 'onAction' | 'actionIcon' | 'onSubmitEditing' | 'returnKeyType'> & {
  next: Field | null;
};

// على الموبايل: الخانة في الكارت بتبقى "زرار" يفتح الشريط
function TapField({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  if (!USE_BAR) return <>{children}</>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ pointerEvents: 'none' }}>{children}</View>
    </Pressable>
  );
}

export default function Register() {
  const { c } = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [active, setActive] = useState<Field | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [choosing, setChoosing] = useState(true);

  const hide = useFocusHide();
  const cardAnim = useEntrance(60);
  const footAnim = useEntrance(120);

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
    const { error } = await signUpWithPhone({ phone: e164, password, fullName: fullName.trim().replace(/\s+/g, ' '), role: role ?? 'customer' });
    setLoading(false);
    if (error) return setError(`${t('sendFailed')} (${error.message})`);
    router.push({ pathname: '/verify', params: { phone: e164 } });
  };

  const submitFromBar = () => {
    setActive(null);
    Keyboard.dismiss();
    onRegister();
  };

  const onName = (v: string) => {
    setFullName(v);
    setNameError('');
  };

  // إعدادات كل خانة — نفس الإعدادات بتتستخدم في الكارت وفي الشريط
  const fields: Record<Field, BarCfg> = {
    name: { label: t('fullName'), icon: 'person-outline', value: fullName, onChangeText: onName, placeholder: tr('الاسم الثلاثي', 'First Middle Last'), autoComplete: 'name', textContentType: 'name', autoCapitalize: 'words', next: 'phone' },
    phone: { label: t('phone'), icon: 'call-outline', value: phone, onChangeText: setPhone, placeholder: '01XXXXXXXXX', keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber', next: 'password' },
    password: { label: t('password'), icon: 'lock-closed-outline', value: password, onChangeText: setPassword, placeholder: '••••••••', secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword', next: 'confirm' },
    confirm: { label: t('confirmPassword'), icon: 'shield-checkmark-outline', value: confirm, onChangeText: setConfirm, placeholder: '••••••••', secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword', next: null },
  };
  const order: Field[] = ['name', 'phone', 'password', 'confirm'];
  const bar = active ? fields[active] : null;
  const goNext = bar?.next ? () => setActive(bar.next) : submitFromBar;

  return (
    <View style={[{ flex: 1, backgroundColor: 'transparent' }, hide]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero compact />

        <View style={styles.inner}>
          <Animated.View style={cardAnim}>
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.accentBorder, shadowColor: c.accent }]}>
              <Text style={[styles.welcome, { color: c.text }]}>{t('register')}</Text>
              <Text style={[styles.welcomeSub, { color: c.textSecondary }]}>{tr('أنشئ حسابك في دقيقة واحدة', 'Create your account in a minute')}</Text>

              {/* نوع الحساب (مكانه محجوز دايمًا عشان الصفحة متتحركش) */}
              <Pressable
                onPress={() => setChoosing(true)}
                disabled={!role}
                style={[styles.roleChip, { backgroundColor: c.accentSoft, opacity: role ? 1 : 0 }]}
                accessibilityRole="button"
              >
                <Ionicons name={role === 'provider' ? 'construct' : 'home'} size={15} color={c.accentText} />
                <Text style={[styles.roleText, { color: c.accentText }]}>
                  {role === 'provider' ? tr('حساب مقدم خدمة', 'Provider account') : tr('حساب عميل', 'Customer account')}
                </Text>
                <Text style={[styles.roleChange, { color: c.textSecondary }]}>{tr('· تغيير', '· Change')}</Text>
              </Pressable>

              {order.map((key) => {
                const { next, ...cfg } = fields[key];
                return (
                  <TapField key={key} onPress={() => setActive(key)} label={cfg.label}>
                    <PremiumInput
                      labelInside
                      {...cfg}
                      error={key === 'name' ? nameError : undefined}
                      highlighted={active === key}
                      returnKeyType={next ? 'next' : 'go'}
                      onSubmitEditing={next ? undefined : onRegister}
                    />
                  </TapField>
                );
              })}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: c.dangerBg, borderColor: c.dangerBorder }]}>
                  <Ionicons name="alert-circle" size={18} color={c.dangerText} />
                  <Text style={[styles.errorText, { color: c.dangerText }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={onRegister}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={t('sendCode')}
                style={({ pressed }) => [styles.ctaShadow, { shadowColor: c.accent }, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
              >
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
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
          </Animated.View>

          <Animated.View style={[styles.footerWrap, footAnim]}>
            <View style={styles.footer}>
              <Text style={[styles.muted, { color: c.textSecondary }]}>{t('haveAccount')} </Text>
              <Link href="/login" dismissTo style={[styles.link, { color: c.accentText }]}>{t('login')}</Link>
            </View>
            <View style={styles.secure}>
              <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
              <Text style={[styles.secureText, { color: c.textSecondary }]}>{tr('بياناتك محمية ومشفّرة', 'Your data is protected & encrypted')}</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ===== شريط الكتابة فوق الكيبورد ===== */}
      {USE_BAR && active && bar ? (
        <KeyboardInputBar
          key={active}
          {...(({ next, ...rest }) => rest)(bar)}
          returnKeyType={bar.next ? 'next' : 'go'}
          submitBehavior={bar.next ? 'submit' : undefined}
          onSubmitEditing={goNext}
          actionIcon={bar.next ? 'arrow-forward' : 'checkmark'}
          onAction={goNext}
          onClose={() => setActive(null)}
        />
      ) : null}
      <RoleChooser
        visible={choosing}
        onPick={(r) => {
          setRole(r);
          setChoosing(false);
        }}
        onLogin={() => router.replace('/login')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 30 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 18 },
  card: {
    marginTop: -60,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 0,
  },
  welcome: { fontFamily: fonts.bold, fontSize: 23 },
  welcomeSub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4, marginBottom: 14 },
  roleChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16 },
  roleText: { fontFamily: fonts.bold, fontSize: 13 },
  roleChange: { fontFamily: fonts.regular, fontSize: 12.5 },
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
