import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar, EditProfileSheet } from '@/components/EditProfileSheet';
import { useThemeReveal } from '@/components/ThemeReveal';
import { AccentPickerRow } from '@/components/ui/AccentPicker';
import { Screen } from '@/components/ui/Screen';
import { useEntrance } from '@/hooks/use-screen-entrance';
import { layoutRTL, t, tr } from '@/i18n';
import { toLocalDisplay } from '@/lib/phone';
import { useMyProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

export default function Profile() {
  const { c, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const me = useMyProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  // الزرار يتحرك فورًا، والوضع الجديد يظهر بدايرة من مكان الضغطة
  const [dark, setDark] = useState(c.isDark);
  const { reveal, prepare } = useThemeReveal();
  const touch = useRef({ x: 0, y: 0 });

  const heroAnim = useEntrance(0);
  const setAnim = useEntrance(60);
  const btnAnim = useEntrance(120);

  const name = me?.full_name || session?.user.user_metadata?.full_name || '';
  const rawPhone = me?.phone || session?.user.phone || '';
  const phone = rawPhone ? toLocalDisplay(rawPhone) : '';
  const secondary = phone || session?.user.email || '';

  const webGlass =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px) saturate(160%)', WebkitBackdropFilter: 'blur(8px) saturate(160%)' } as any)
      : null;

  return (
    <Screen title={tr('حسابي', 'Profile')}>
      <Animated.View style={heroAnim}>
        <View style={[styles.hero, webGlass]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />

          {/* زرار التعديل */}
          <Pressable
            onPress={() => me && setEditing(true)}
            disabled={!me}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tr('تعديل البيانات', 'Edit profile')}
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
          >
            <Ionicons name="pencil" size={17} color={c.accentText} />
          </Pressable>

          <View style={styles.heroBody}>
            <Avatar uri={me?.avatar_url} size={96} />
            {name ? <Text style={styles.name} numberOfLines={2}>{name}</Text> : null}
            {secondary ? (
              <View style={styles.phonePill}>
                <Ionicons name={phone ? 'call-outline' : 'mail-outline'} size={15} color={c.accentText} />
                <Text style={styles.phone} numberOfLines={1}>{secondary}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>

      {/* ===== إعدادات المظهر ===== */}
      <Animated.View style={[{ marginTop: spacing.lg }, setAnim]}>
        <View style={[styles.card, webGlass]}>
          <View
            style={styles.row}
            onTouchStart={(e) => {
              touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
              prepare();
            }}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={dark ? 'moon' : 'sunny'} size={20} color={c.accentText} />
            </View>
            <Text style={styles.rowLabel}>{tr('الوضع الغامق', 'Dark mode')}</Text>
            <Switch
              value={dark}
              onValueChange={(v) => {
                setDark(v);
                reveal(touch.current.x, touch.current.y, () => setMode(v ? 'dark' : 'light'));
              }}
              trackColor={{ false: c.switchOff, true: c.accent }}
              thumbColor="#FFFFFF"
              style={Platform.OS === 'web' ? ({ direction: 'ltr' } as any) : undefined}
              accessibilityLabel={tr('الوضع الغامق', 'Dark mode')}
            />
          </View>

          <View style={styles.sep} />

          <AccentPickerRow />
        </View>
      </Animated.View>

      <Animated.View style={[{ marginTop: spacing.lg }, btnAnim]}>
        <Pressable onPress={() => router.push("/settings")} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.row, styles.settingsRow, pressed && { opacity: 0.8 }]}>
          <View style={styles.rowIcon}>
            <Ionicons name="settings-outline" size={20} color={c.accentText} />
          </View>
          <Text style={styles.rowLabel}>{tr("الإعدادات", "Settings")}</Text>
          <Ionicons name={layoutRTL() ? "chevron-back" : "chevron-forward"} size={18} color={c.iconMuted} />
        </Pressable>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
          accessibilityLabel={t('logout')}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}
        >
          <Ionicons name="log-out-outline" size={21} color={c.dangerText} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </Pressable>

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
          <Text style={styles.secureText}>{tr('بياناتك محمية ومشفّرة', 'Your data is protected & encrypted')}</Text>
        </View>
      </Animated.View>

      {editing && me ? <EditProfileSheet me={me} onClose={() => setEditing(false)} /> : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: c.panelBg,
      borderWidth: 1,
      borderColor: c.panelBorder,
      shadowColor: c.accent,
      shadowOpacity: c.isDark ? 0.28 : 0.2,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 18 },
      elevation: 0,
    },
    accent: { height: 4 },
    editBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 2,
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    heroBody: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 12 },
    name: { fontFamily: fonts.bold, fontSize: 22, color: c.text, textAlign: 'center' },
    phonePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    phone: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText, letterSpacing: 1 },

    card: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: c.panelBg,
      borderWidth: 1,
      borderColor: c.panelBorder,
      paddingHorizontal: 16,
      paddingVertical: 6,
      shadowColor: c.accent,
      shadowOpacity: c.isDark ? 0.2 : 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 0,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: c.ink },
    sep: { height: 1, backgroundColor: c.accentLine },
    settingsRow: { marginBottom: spacing.md, paddingVertical: 4 },

    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 54,
      borderRadius: 16,
      backgroundColor: c.dangerBg,
      borderWidth: 1.5,
      borderColor: c.dangerBorder,
    },
    logoutText: { fontFamily: fonts.bold, fontSize: 16, color: c.dangerText },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, opacity: 0.85 },
    secureText: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
  });
