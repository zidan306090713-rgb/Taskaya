import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { KeyboardInputBar } from '@/components/ui/KeyboardInputBar';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { t, tr } from '@/i18n';
import { useEntrance, useFocusHide } from '@/hooks/use-screen-entrance';
import { signUpWithPhone } from '@/lib/auth';
import { normalizeEgyptPhone } from '@/lib/phone';
import { colors, fonts, spacing } from '@/theme';
import { useTheme } from '@/providers/ThemeProvider';

const MIN_PASSWORD = 8;
const BLUE = '#2F80ED';
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

  const hide = useFocusHide();
  const brandAnim = useEntrance(0);
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
    const { error } = await signUpWithPhone({ phone: e164, password, fullName: fullName.trim().replace(/\s+/g, ' ') });
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
    name: {
      label: t('fullName'),
      icon: 'person-outline',
      value: fullName,
      onChangeText: onName,
      placeholder: tr('الاسم الثلاثي', 'First Middle Last'),
      autoComplete: 'name',
      textContentType: 'name',
      autoCapitalize: 'words',
      next: 'phone',
    },
    phone: {
      label: t('phone'),
      icon: 'call-outline',
      value: phone,
      onChangeText: setPhone,
      placeholder: '01XXXXXXXXX',
      keyboardType: 'phone-pad',
      autoComplete: 'tel',
      textContentType: 'telephoneNumber',
      next: 'password',
    },
    password: {
      label: t('password'),
      icon: 'lock-closed-outline',
      value: password,
      onChangeText: setPassword,
      placeholder: '••••••••',
      secureTextEntry: true,
      autoComplete: 'new-password',
      textContentType: 'newPassword',
      next: 'confirm',
    },
    confirm: {
      label: t('confirmPassword'),
      icon: 'shield-checkmark-outline',
      value: confirm,
      onChangeText: setConfirm,
      placeholder: '••••••••',
      secureTextEntry: true,
      autoComplete: 'new-password',
      textContentType: 'newPassword',
      next: null,
    },
  };

  const order: Field[] = ['name', 'phone', 'password', 'confirm'];

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;

  const bar = active ? fields[active] : null;
  const goNext = bar?.next ? () => setActive(bar.next) : submitFromBar;

  return (
    <View style={[{ flex: 1, backgroundColor: 'transparent' }, hide]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ===== Brand ===== */}
        <Animated.View style={[styles.brandWrap, brandAnim]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.logo, { shadowColor: c.accent }]}>
            <Text style={styles.logoLetter}>T</Text>
          </LinearGradient>
          <Text style={[styles.brand, { color: c.accent }]}>TASKAYA</Text>
        </Animated.View>

        {/* ===== Card ===== */}
        <Animated.View style={cardAnim}>
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  Platform.OS === 'android' ? (c.isDark ? 'rgba(28,31,38,0.94)' : 'rgba(255,255,255,0.88)') : c.glassBg,
                borderColor: c.panelBorder,
                shadowColor: c.accent,
              },
              webGlass,
            ]}
          >
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
            <View style={styles.cardBody}>
              <Text style={[styles.welcome, { color: c.text }]}>{t('register')}</Text>
              <Text style={[styles.welcomeSub, { color: c.textSecondary }]}>{tr('أنشئ حسابك في دقيقة واحدة', 'Create your account in a minute')}</Text>

              {order.map((key) => {
                const { next, ...cfg } = fields[key];
                return (
                  <TapField key={key} onPress={() => setActive(key)} label={cfg.label}>
                    <PremiumInput labelInside
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
          </View>
        </Animated.View>

        {/* ===== Footer ===== */}
        <Animated.View style={[styles.footerWrap, footAnim]}>
          <View style={styles.footer}>
            <Text style={[styles.muted, { color: c.textSecondary }]}>{t('haveAccount')} </Text>
            <Link href="/login" dismissTo style={[styles.link, { color: c.accent }]}>{t('login')}</Link>
          </View>
          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.secureText, { color: c.textSecondary }]}>{tr('بياناتك محمية ومشفّرة', 'Your data is protected & encrypted')}</Text>
          </View>
        </Animated.View>
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
    </View>
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
    elevation: 0,
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
