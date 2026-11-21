import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '@/theme';

export type OtpStatus = 'idle' | 'checking' | 'success' | 'error';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  status?: OtpStatus;
  autoFocus?: boolean;
};

const BLUE = '#2F80ED';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const clean = (v: string, max: number) =>
  v.replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c))).replace(/\D/g, '').slice(0, max);
const native = Platform.OS !== 'web';

export function OtpInput({ value, onChange, length = 6, status = 'idle', autoFocus = true }: Props) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const [blink, setBlink] = useState(true);
  const [pulses] = useState(() => Array.from({ length }, () => new Animated.Value(1)));
  const [shake] = useState(() => new Animated.Value(0));
  const active = Math.min(value.length, length - 1);
  const locked = status !== 'idle';

  useEffect(() => {
    if (!focused || locked) return;
    const id = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(id);
  }, [focused, locked]);

  // موجة ضوء أثناء التحقق
  useEffect(() => {
    if (status !== 'checking') {
      pulses.forEach((v) => v.setValue(1));
      return;
    }
    const loop = Animated.loop(
      Animated.stagger(
        90,
        pulses.map((v) =>
          Animated.sequence([
            Animated.timing(v, { toValue: 0.35, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
            Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulses]);

  // اهتزاز عند الخطأ
  useEffect(() => {
    if (status !== 'error') return;
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: native }))
    ).start();
  }, [status, shake]);

  return (
    <Pressable onPress={() => !locked && ref.current?.focus()} style={styles.wrap} accessibilityLabel="OTP">
      <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const ch = value[i] ?? '';
          const isActive = focused && !locked && i === active;
          return (
            <Animated.View
              key={i}
              style={[
                styles.box,
                ch ? styles.boxFilled : null,
                isActive && styles.boxActive,
                status === 'checking' && styles.boxChecking,
                status === 'success' && styles.boxSuccess,
                status === 'error' && styles.boxError,
                { opacity: pulses[i] },
              ]}
            >
              {ch ? (
                <Text style={[styles.digit, status === 'success' && { color: '#16A34A' }, status === 'error' && { color: '#DC2626' }]}>{ch}</Text>
              ) : isActive && value.length < length && blink ? (
                <View style={styles.caret} />
              ) : null}
            </Animated.View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(clean(v, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!locked}
        keyboardType="number-pad"
        maxLength={length * 2}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        selectionColor="transparent"
        style={[styles.hidden, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center', ...(native ? { direction: 'ltr' as const } : {}) },
  box: {
    flex: 1,
    height: 60,
    maxWidth: 56,
    borderRadius: 16,
    backgroundColor: '#F4F8FF',
    borderWidth: 1.5,
    borderColor: '#DCE8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: '#FFFFFF', borderColor: 'rgba(47,128,237,0.55)' },
  boxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  boxChecking: { borderColor: BLUE },
  boxSuccess: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.08)',
    shadowColor: '#16A34A',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  boxError: { borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.06)' },
  digit: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: BLUE },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
});
