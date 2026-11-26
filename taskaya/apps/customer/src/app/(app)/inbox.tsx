import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { InboxItem, loadInbox, markAllRead, markRead, setPendingNav, textOf, useInbox } from '@/lib/inbox';
import { isProvider } from '@/lib/provider';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function look(i: InboxItem, accent: string): { icon: IconName; color: string } {
  if (i.kind === 'broadcast') return { icon: 'megaphone', color: '#D97706' };
  if (i.kind === 'service_review')
    return i.title.startsWith('تم قبول') ? { icon: 'checkmark-circle', color: '#16A34A' } : { icon: 'alert-circle', color: '#DC2626' };
  if (i.quote === 'accepted') return { icon: 'pricetag', color: '#16A34A' };
  if (i.quote === 'rejected' && i.status !== 'cancelled') return { icon: 'pricetag', color: '#DC2626' };
  switch (i.status) {
    case 'accepted':
    case 'confirmed':
      return { icon: 'shield-checkmark', color: '#16A34A' };
    case 'awaiting_customer_approval':
      return { icon: 'pricetag', color: '#7C3AED' };
    case 'in_progress':
      return { icon: 'construct', color: '#2563EB' };
    case 'completed':
      return { icon: 'checkmark-done', color: '#16A34A' };
    case 'cancelled':
    case 'rejected':
      return { icon: 'close-circle', color: '#DC2626' };
    case 'pending':
      return { icon: 'flash', color: '#D97706' };
    default:
      return { icon: 'notifications', color: accent };
  }
}

function timeOf(iso: string) {
  const d = new Date(iso);
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return tr(`من ${mins} دقيقة`, `${mins} min ago`);
  const h = Math.round(mins / 60);
  if (h < 24) return tr(`من ${h} ساعة`, `${h} h ago`);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function Inbox() {
  const { c } = useTheme();
  const st = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const pro = isProvider(session);
  const { items, unread, isUnread } = useInbox();
  const [only, setOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (uid) void loadInbox(uid);
  }, [uid]);

  async function refresh() {
    setRefreshing(true);
    await loadInbox(uid, true);
    setRefreshing(false);
  }

  // نقفل الإشعارات (back) ونسيب "ملاحظة" بالتاب المطلوب — التابات الموجودة هي اللي تتنقّل أول ما تظهر
  // (لو اتنقلنا من هنا مباشرة، Expo Router بيبني تابات جديدة فوق القديمة)
  function goTab(tab: string, params?: Record<string, string>) {
    if (router.canGoBack()) {
      setPendingNav({ tab, params });
      router.back();
      return;
    }
    router.replace({ pathname: pro ? `/pro/${tab}` : `/${tab}`, params } as never);
  }

  function press(i: InboxItem) {
    markRead(i.id);
    if (i.kind === 'booking') return goTab(pro ? 'requests' : 'orders', i.booking_id ? { open: i.booking_id } : undefined);
    if (i.url && i.url !== '/inbox' && i.url !== '/') {
      const tab = i.url.split('/').filter(Boolean).pop();
      if (tab) return goTab(tab);
    }
    setOpen(open === i.id ? null : i.id);
  }

  const list = (items ?? []).filter((i) => !only || isUnread(i));
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const today = list.filter((i) => Date.parse(i.created_at) >= dayStart.getTime());
  const older = list.filter((i) => Date.parse(i.created_at) < dayStart.getTime());

  const row = (i: InboxItem) => {
    const lk = look(i, c.accent);
    const t = textOf(i);
    const un = isUnread(i);
    const meta = [timeOf(i.created_at), i.kind === 'broadcast' ? tr('من TASKAYA', 'From TASKAYA') : i.booking_number ? `#${i.booking_number}` : null]
      .filter(Boolean)
      .join(' · ');
    return (
      <Pressable key={i.id} onPress={() => press(i)} accessibilityRole="button" style={({ pressed }) => [st.item, un && st.itemUnread, pressed && { opacity: 0.85 }]}>
        <View style={[st.icon, { backgroundColor: lk.color + '1F' }]}>
          <Ionicons name={lk.icon} size={20} color={lk.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={st.title} numberOfLines={2}>{t.title}</Text>
          {t.body ? <Text style={st.body} numberOfLines={open === i.id ? undefined : 2}>{t.body}</Text> : null}
          <Text style={st.meta}>{meta}</Text>
        </View>
        {un ? <View style={[st.dot, { backgroundColor: c.accent }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader
        title={tr('الإشعارات', 'Notifications')}
        subtitle={unread ? tr(`${unread} غير مقروءة`, `${unread} unread`) : tr('كله مقروء', 'All caught up')}
        right={
          unread ? (
            <Pressable onPress={markAllRead} style={st.readAll} accessibilityRole="button">
              <Text style={st.readAllText}>{tr('قراءة الكل', 'Mark all read')}</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={[st.wrap, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <View style={st.chips}>
          {[false, true].map((v) => (
            <Pressable key={String(v)} onPress={() => setOnly(v)} style={[st.chip, only === v && { backgroundColor: c.accent, borderColor: c.accent }]}>
              <Text style={[st.chipText, only === v && { color: '#FFFFFF' }]}>
                {v ? tr(`غير مقروء${unread ? ` · ${unread}` : ''}`, `Unread${unread ? ` · ${unread}` : ''}`) : tr('الكل', 'All')}
              </Text>
            </Pressable>
          ))}
        </View>

        {items === null ? <ListSkeleton rows={4} height={76} /> : null}
        {items !== null && list.length === 0 ? (
          <View style={st.empty}>
            <View style={[st.emptyIcon, { backgroundColor: c.accentSoft, borderColor: c.accentBorder }]}>
              <Ionicons name="notifications-off-outline" size={30} color={c.accent} />
            </View>
            <Text style={st.emptyTitle}>{only ? tr('مفيش حاجة جديدة', 'Nothing new') : tr('لسه مفيش إشعارات', 'No notifications yet')}</Text>
            <Text style={st.emptySub}>{tr('أي تحديث على حجوزاتك أو رسالة من TASKAYA هتلاقيها هنا.', 'Booking updates and messages from TASKAYA show up here.')}</Text>
          </View>
        ) : null}

        {today.length ? <Text style={st.group}>{tr('النهارده', 'Today')}</Text> : null}
        {today.map(row)}
        {older.length ? <Text style={st.group}>{tr('قبل كده', 'Earlier')}</Text> : null}
        {older.map(row)}
        {items && items.length ? (
          <Text style={st.foot}>{tr('بنحتفظ بآخر 30 يوم للحجوزات و90 يوم للرسايل', 'We keep 30 days of bookings and 90 days of messages')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 10 },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 2 },
    chip: { paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: 999, backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder },
    chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.ink },
    group: { fontFamily: fonts.bold, fontSize: 13, color: c.textSecondary, marginTop: 6 },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.18 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 0,
    },
    itemUnread: { borderColor: c.accent, backgroundColor: c.accentSoft },
    icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.bold, fontSize: 14.5, color: c.text },
    body: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, lineHeight: 20 },
    meta: { fontFamily: fonts.regular, fontSize: 11.5, color: c.textSecondary, opacity: 0.8 },
    dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
    readAll: { paddingHorizontal: 12, height: 32, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
    readAllText: { fontFamily: fonts.semibold, fontSize: 12.5, color: '#FFFFFF' },
    empty: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 20 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    emptySub: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary, textAlign: 'center' },
    foot: { fontFamily: fonts.regular, fontSize: 11.5, color: c.textSecondary, textAlign: 'center', marginTop: 8 },
  });
