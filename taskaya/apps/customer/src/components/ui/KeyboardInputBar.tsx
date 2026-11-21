import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tr } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, rgba } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: IconName;
  onClose: () => void;
  actionIcon?: IconName;
  onAction?: () => void;
};

/**
 * شريط إدخال بيظهر لازق فوق الكيبورد.
 * الشاشة اللي وراه بتفضل ثابتة — الشريط بس هو اللي بيطلع مع الكيبورد.
 * بيقفل لوحده لما الكيبورد يقفل (Back أو ضغطة برّه).
 */
export function KeyboardInputBar({ label, icon, onClose, actionIcon = 'checkmark', onAction, secureTextEntry, ...inputProps }: Props) {
  const { c } = useTheme();
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;

  const inputRef = useRef<TextInput>(null);
  // أثناء تبديل إظهار/إخفاء الباسورد: أندرويد بيقفل الكيبورد ويفتحه لحظة — منقفلش الشريط بسببها
  const toggling = useRef(false);
  const [sel, setSel] = useState<{ start: number; end: number } | undefined>();

  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  // تأخير بسيط: عشان لو بننقل من خانة لخانة الشريط ميقفلش بالغلط
  const scheduleClose = () => {
    if (!alive.current || toggling.current) return;
    cancelClose();
    timer.current = setTimeout(() => {
      if (alive.current && !toggling.current) closeRef.current();
    }, 250);
  };

  const toggleHidden = () => {
    toggling.current = true;
    cancelClose();
    setHidden((v) => !v);
    // المؤشر يفضل في آخر الكلام (أندرويد بيرجّعه للأول لما نوع الخانة يتغير)
    const len = String(inputProps.value ?? '').length;
    setSel({ start: len, end: len });
    setTimeout(() => {
      if (!alive.current) return;
      inputRef.current?.focus();
      setSel(undefined);
    }, 60);
    setTimeout(() => {
      toggling.current = false;
    }, 700);
  };

  useEffect(() => {
    alive.current = true;
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const h = Keyboard.addListener(hideEvt, scheduleClose);
    const s = Keyboard.addListener(showEvt, cancelClose);
    return () => {
      alive.current = false;
      h.remove();
      s.remove();
      cancelClose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      {/* ضغطة على الخلفية تقفل الكيبورد */}
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: c.isDark ? 'rgba(0,0,0,0.45)' : 'rgba(8,24,56,0.22)' }]}
        onPress={() => Keyboard.dismiss()}
        accessibilityLabel={tr('إغلاق', 'Close')}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.kav}>
        <View
          style={[
            styles.bar,
            { backgroundColor: c.isDark ? '#151A24' : '#FFFFFF', borderColor: rgba(c.accent, 0.35), shadowColor: c.accent },
          ]}
        >
          <Text style={[styles.label, { color: c.accentText }]}>{label}</Text>
          <View style={styles.row}>
            <Ionicons name={icon} size={20} color={c.accentText} />
            <TextInput
              ref={inputRef}
              autoFocus
              placeholderTextColor={c.placeholder}
              selectionColor={c.accent}
              accessibilityLabel={label}
              secureTextEntry={isPassword ? hidden : false}
              onFocus={cancelClose}
              onBlur={scheduleClose}
              style={[styles.input, { color: c.ink }]}
              {...inputProps}
              {...(sel ? { selection: sel } : null)}
            />
            {isPassword ? (
              <Pressable
                onPressIn={toggleHidden}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={hidden ? tr('إظهار كلمة المرور', 'Show password') : tr('إخفاء كلمة المرور', 'Hide password')}
              >
                <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={hidden ? c.iconMuted : c.accentText} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onAction ?? (() => Keyboard.dismiss())}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, { backgroundColor: c.accent }, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name={actionIcon} size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 50, pointerEvents: 'box-none' },
  kav: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  bar: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  label: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: 4, letterSpacing: 0.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 48, fontFamily: fonts.regular, fontSize: 18, backgroundColor: 'transparent' },
  action: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
