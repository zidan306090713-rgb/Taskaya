import { useState as useLangState } from 'react';
import { LanguageSheet } from '@/components/LanguageSheet';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarViewer } from '@/components/AvatarViewer';
import { Avatar, EditProfileSheet } from '@/components/EditProfileSheet';
import { GlowBg } from '@/components/home/GlowBg';
import { useThemeReveal } from '@/components/ThemeReveal';
import { AccentPickerRow } from '@/components/ui/AccentPicker';
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

const WEB_GLASS =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)' } as any)
    : null;
const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)' } as any) : null;

function useStyles() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return { c, styles };
}

/** كارت زجاجي (نفس كروت الرئيسية وطلباتي) */
function Glass({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, styles } = useStyles();
  const sheen = c.isDark ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] as const) : (['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as const);
  return (
    <View style={[styles.glass, WEB_GLASS, style]}>
      {Platform.OS === 'ios' ? <BlurView intensity={28} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={sheen} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.glassSheen} />
      {children}
    </View>
  );
}

function Row({ icon, tint, label, value, onPress, right, last }: { icon: IconName; tint: [string, string]; label: string; value?: string; onPress?: () => void; right?: ReactNode; last?: boolean }) {
  const { c, styles } = useStyles();
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

/** حسابي: هيدر زجاجي عائم (صورة + اسم + أرقام) + مجموعات زجاجية + خروج */
export default function Profile() {
  const { c, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [langOpen, setLangOpen] = useLangState(false);
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const me = useMyProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [headH, setHeadH] = useState(200);
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

  return (
    <View style={styles.page}>
      <GlowBg />
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[styles.listContent, { paddingTop: headH + 6, paddingBottom: Math.max(insets.bottom, 12) + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* ===== كل الخانات في قائمة واحدة ===== */}
          <Glass style={{ marginTop: 12 }}>
            {langOpen ? <LanguageSheet onClose={() => setLangOpen(false)} /> : null}
            <Row icon="language-outline" tint={['rgba(15,118,110,0.12)', '#0F766E']} label={tr('اللغة', 'Language')} value={lang === 'ar' ? 'العربية' : 'English'} onPress={() => setLangOpen(true)} />
            <Row icon="location-outline" tint={['rgba(31,91,255,0.12)', '#1F5BFF']} label={tr('عناويني', 'My addresses')} onPress={() => router.push('/addresses')} />
            <Row icon="headset-outline" tint={['rgba(219,39,119,0.12)', '#DB2777']} label={tr('الدعم الفني', 'Support')} value={tr('قريبًا', 'Soon')} />
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
                last
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
          </Glass>

          {/* ===== الخروج ===== */}
          <Pressable
            onPress={async () => {
              await unregisterPush();
              await supabase.auth.signOut();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('logout')}
            style={({ pressed }) => [styles.glass, WEB_GLASS, styles.logout, pressed && { opacity: 0.85 }]}
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

      {/* ===== الهيدر الزجاجي العائم ===== */}
      <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={[styles.header, WEB_FROST, { paddingTop: insets.top + 12 }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.74 }]} />
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
        <View style={styles.headInner}>
          <View style={styles.headRow}>
            <Pressable
              onPress={() => me && setViewing(true)}
              disabled={!me}
              accessibilityRole="button"
              accessibilityLabel={tr('عرض الصورة', 'View photo')}
              style={({ pressed }) => [styles.avatarRing, pressed && { opacity: 0.85 }]}
            >
              <Avatar uri={me?.avatar_url} size={60} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={styles.hSmall}>{tr('حسابي', 'Profile')}</Text>
              {name ? <Text style={styles.hName} numberOfLines={1}>{name}</Text> : null}
              {secondary ? (
                <View style={styles.phoneRow}>
                  <Ionicons name={phone ? 'call-outline' : 'mail-outline'} size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.phone} numberOfLines={1}>{secondary}</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => me && setEditing(true)}
              disabled={!me}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tr('تعديل البيانات', 'Edit profile')}
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.editText}>{tr('تعديل', 'Edit')}</Text>
            </Pressable>
          </View>
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
      </View>

      {editing && me ? <EditProfileSheet me={me} onClose={() => setEditing(false)} /> : null}
      {viewing && me ? <AvatarViewer me={me} onClose={() => setViewing(false)} /> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1 },
    listContent: { paddingHorizontal: 16 },
    inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },

    // الهيدر (نفس طلباتي)
    header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 16, zIndex: 1, overflow: 'hidden', borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.28)', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
    glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -120, left: -80, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
    glow2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: -90, right: -50, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
    headInner: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 14 },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarRing: { padding: 2, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
    hSmall: { fontFamily: fonts.regular, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
    hName: { fontFamily: fonts.bold, fontSize: 20, color: '#FFFFFF', marginTop: 1 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    phone: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.8 },
    editBtn: {
      flexDirection: 'row',
      gap: 5,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    editText: { fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF' },
    stats: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    statNum: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF' },
    statLabel: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)' },

    // الكروت الزجاجية (نفس كروت طلباتي)
    glass: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.isDark ? 'rgba(30,36,52,0.55)' : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
      borderWidth: 1,
      borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
    },
    glassSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', pointerEvents: 'none' },
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
      borderColor: c.dangerBorder,
    },
    logoutText: { fontFamily: fonts.bold, fontSize: 15, color: c.dangerText },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.85 },
    secureText: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
  });
