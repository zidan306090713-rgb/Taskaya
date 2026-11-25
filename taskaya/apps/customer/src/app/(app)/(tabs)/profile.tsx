import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarViewer } from '@/components/AvatarViewer';
import { Avatar, EditProfileSheet } from '@/components/EditProfileSheet';
import { useThemeReveal } from '@/components/ThemeReveal';
import { AccentPickerRow } from '@/components/ui/AccentPicker';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { lang, layoutRTL, t, tr } from '@/i18n';
import { getMyBookings } from '@/lib/api';
import { toLocalDisplay } from '@/lib/phone';
import { useMyProfile } from '@/lib/profile';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const CURRENT = ['pending', 'accepted', 'quotation_submitted', 'awaiting_customer_approval', 'confirmed', 'in_progress'];

function Row({ icon, tint, label, value, onPress, right, last }: { icon: IconName; tint: [string, string]; label: string; value?: string; onPress?: () => void; right?: ReactNode; last?: boolean }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const inner = (
    <>
      <View style={[styles.ic, { backgroundColor: tint[0] }]}>
        <Ionicons name={icon} size={18} color={tint[1]} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name={layoutRTL() ? 'chevron-back' : 'chevron-forward'} size={18} color={c.iconMuted} /> : null)}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowSep, pressed && { opacity: 0.75 }]} accessibilityRole="button">
      {inner}
    </Pressable>
  ) : (
    <View style={[styles.row, !last && styles.rowSep]}>{inner}</View>
  );
}

/** حسابي: هيدر ملوّن + صورة كبيرة راكبة + أرقام + إعدادات في مجموعات + خروج */
export default function Profile() {
  const { c, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const me = useMyProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [stats, setStats] = useState<{ all: number; current: number; done: number } | null>(null);
  // الزرار يتحرك فورًا، والوضع الجديد يظهر بدايرة من مكان الضغطة
  const [dark, setDark] = useState(c.isDark);
  const { reveal, prepare } = useThemeReveal();
  const touch = useRef({ x: 0, y: 0 });

  // أرقام الطلبات (من الطلبات المحفوظة — من غير طلب زيادة)
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      getMyBookings(uid).then((l) => {
        const current = l.filter((b) => CURRENT.includes(b.status)).length;
        setStats({ all: l.length, current, done: l.length - current });
      });
    }, [uid]),
  );

  const name = me?.full_name || session?.user.user_metadata?.full_name || '';
  const rawPhone = me?.phone || session?.user.phone || '';
  const phone = rawPhone ? toLocalDisplay(rawPhone) : '';
  const secondary = phone || session?.user.email || '';

  const editBtn = (
    <Pressable
      onPress={() => me && setEditing(true)}
      disabled={!me}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={tr('تعديل البيانات', 'Edit profile')}
      style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="pencil" size={17} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 100 }} showsVerticalScrollIndicator={false}>
        <GradientHeader noBack title={tr('حسابي', 'Profile')} padBottom={64} right={editBtn} />

        <View style={styles.inner}>
          {/* ===== الكارت + الصورة الراكبة ===== */}
          <View style={styles.card}>
            <Pressable
              onPress={() => me && setViewing(true)}
              disabled={!me}
              accessibilityRole="button"
              accessibilityLabel={tr('عرض الصورة', 'View photo')}
              style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.9 }]}
            >
              <Avatar uri={me?.avatar_url} size={92} />
            </Pressable>
            {name ? <Text style={styles.name} numberOfLines={2}>{name}</Text> : null}
            {secondary ? (
              <View style={styles.phonePill}>
                <Ionicons name={phone ? 'call-outline' : 'mail-outline'} size={14} color={c.accentText} />
                <Text style={styles.phone} numberOfLines={1}>{secondary}</Text>
              </View>
            ) : null}
            <View style={styles.stats}>
              {[
                { n: stats?.all, l: tr('طلب', 'Orders') },
                { n: stats?.current, l: tr('شغالة', 'Active') },
                { n: stats?.done, l: tr('خلصت', 'Past') },
              ].map((s, i) => (
                <View key={i} style={styles.stat}>
                  <Text style={styles.statNum}>{s.n ?? '…'}</Text>
                  <Text style={styles.statLabel}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ===== المظهر ===== */}
          <Text style={styles.group}>{tr('المظهر', 'Appearance')}</Text>
          <View style={styles.box}>
            <View
              onTouchStart={(e) => {
                touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
                prepare();
              }}
            >
              <Row
                icon={dark ? 'moon' : 'sunny'}
                tint={['rgba(124,58,237,0.12)', '#7C3AED']}
                label={tr('الوضع الغامق', 'Dark mode')}
                right={
                  <View style={{ direction: 'ltr' }}>
                    <Switch
                      value={dark}
                      onValueChange={(v) => {
                        setDark(v);
                        reveal(touch.current.x, touch.current.y, () => setMode(v ? 'dark' : 'light'));
                      }}
                      trackColor={{ false: c.switchOff, true: c.accent }}
                      thumbColor="#FFFFFF"
                      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
                      accessibilityLabel={tr('الوضع الغامق', 'Dark mode')}
                    />
                  </View>
                }
              />
            </View>
            <View style={styles.accentRow}>
              <AccentPickerRow />
            </View>
          </View>

          {/* ===== الحساب ===== */}
          <Text style={styles.group}>{tr('الحساب', 'Account')}</Text>
          <View style={styles.box}>
            <Row icon="location-outline" tint={['rgba(31,91,255,0.12)', '#1F5BFF']} label={tr('عناويني', 'My addresses')} onPress={() => router.push('/addresses')} />
            <Row icon="language-outline" tint={['rgba(15,118,110,0.12)', '#0F766E']} label={tr('اللغة', 'Language')} value={lang === 'ar' ? 'العربية' : 'English'} onPress={() => router.push('/settings')} />
            <Row icon="settings-outline" tint={['rgba(180,83,9,0.12)', '#B45309']} label={tr('الإعدادات', 'Settings')} onPress={() => router.push('/settings')} last />
          </View>

          {/* ===== الخروج ===== */}
          <Pressable
            onPress={async () => {
              await unregisterPush();
              await supabase.auth.signOut();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('logout')}
            style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="log-out-outline" size={19} color={c.dangerText} />
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </Pressable>

          <View style={styles.secure}>
            <Ionicons name="shield-checkmark-outline" size={14} color={c.textSecondary} />
            <Text style={styles.secureText}>{tr('بياناتك محمية ومشفّرة', 'Your data is protected & encrypted')}</Text>
          </View>
        </View>
      </ScrollView>

      {editing && me ? <EditProfileSheet me={me} onClose={() => setEditing(false)} /> : null}
      {viewing && me ? <AvatarViewer me={me} onClose={() => setViewing(false)} /> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    card: {
      marginTop: -50,
      paddingTop: 58,
      paddingBottom: 14,
      paddingHorizontal: 16,
      borderRadius: 24,
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.22 : 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    avatarWrap: {
      position: 'absolute',
      top: -48,
      alignSelf: 'center',
      borderRadius: 30,
      borderWidth: 4,
      borderColor: c.card,
      backgroundColor: c.card,
    },
    name: { fontFamily: fonts.bold, fontSize: 19, color: c.text, textAlign: 'center' },
    phonePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 13,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
    },
    phone: { fontFamily: fonts.bold, fontSize: 13.5, color: c.accentText, letterSpacing: 0.8 },
    stats: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderTopColor: c.accentBorder,
    },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontFamily: fonts.bold, fontSize: 19, color: c.text },
    statLabel: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
    group: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
    box: { borderRadius: 20, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.accentBorder },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14 },
    rowSep: { borderBottomWidth: 1, borderBottomColor: c.accentLine },
    ic: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: c.ink },
    rowValue: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary },
    accentRow: { paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.accentLine },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      marginTop: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    logoutText: { fontFamily: fonts.bold, fontSize: 15, color: c.dangerText },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.85 },
    secureText: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
  });
