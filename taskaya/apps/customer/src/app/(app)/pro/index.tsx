import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { oldestFirst } from '@/components/pro/Ago';
import { JobCard } from '@/components/pro/JobCard';
import { Btn, L, money, NEW_STATUSES, useProStyles } from '@/components/pro/ProUI';
import { Mode, RequestSheet } from '@/components/pro/RequestSheet';
import { BellButton } from '@/components/ui/BellButton';
import { usePullRefresh } from '@/components/ui/Refresh';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { tr } from '@/i18n';
import { getMyLedger, getMyProvider, getProBookings, LedgerRow, ProBooking, ProProfile, setAvailable } from '@/lib/provider';
import { useOnPush, usePushSetup } from '@/lib/push';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];
const GREEN = '#16A34A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GREY = '#64748B';

const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const tm = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
const bySched = (a: ProBooking, b: ProBooking) => tm(a.scheduled_at) - tm(b.scheduled_at);
const clock = (iso: string) => new Date(iso).toLocaleTimeString(tr('ar-EG', 'en-US'), { hour: 'numeric', minute: '2-digit' });

// الشغل اللي لسه مخلصش بس (المكتمل/الملغي/المرفوض بيختفي من هنا ويفضل في الطلبات)
const GROUPS: { k: string; ar: string; en: string; icon: IconName; color: string; match: (s: string) => boolean; sort: (a: ProBooking, b: ProBooking) => number }[] = [
  { k: 'new', ar: 'مستنية ردك', en: 'Waiting for your reply', icon: 'flash', color: AMBER, match: (s) => NEW_STATUSES.includes(s), sort: oldestFirst },
  { k: 'active', ar: 'شغالة دلوقتي', en: 'In progress', icon: 'construct', color: '#7C3AED', match: (s) => s === 'in_progress', sort: bySched },
  { k: 'confirmed', ar: 'مؤكدة', en: 'Confirmed', icon: 'checkmark-circle', color: GREEN, match: (s) => s === 'confirmed', sort: bySched },
  { k: 'waiting', ar: 'مستني رد العميل', en: 'Waiting for the customer', icon: 'hourglass', color: GREY, match: (s) => s === 'awaiting_customer_approval', sort: oldestFirst },
];

export default function ProHome() {
  const { c } = useTheme();
  const s = useProStyles();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  usePushSetup(uid || undefined);

  const [me, setMe] = useState<ProProfile | null>(null);
  const [list, setList] = useState<ProBooking[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [avBusy, setAvBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState<{ id: string; mode: Mode } | null>(null);

  const load = useCallback(
    (force = false) => {
      if (!uid) return Promise.resolve();
      return Promise.all([
        getMyProvider(uid, force).then(setMe),
        getProBookings(uid, force).then(
          (l) => {
            setList(l);
            setLoadErr(false);
          },
          () => setLoadErr(true), // خطأ في النت/السيرفر ≠ "مفيش طلبات"
        ),
        getMyLedger(uid, force).then(setLedger),
      ]);
    },
    [uid],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useOnPush(useCallback(() => void load(true), [load]));
  const refreshControl = usePullRefresh(() => load(true)); // السحب لتحت = من السيرفر على طول

  const all = list ?? [];
  const groups = GROUPS.map((g) => ({ ...g, items: all.filter((b) => g.match(b.status)).sort(g.sort) })).filter((g) => g.items.length > 0);
  const fresh = all.filter((b) => NEW_STATUSES.includes(b.status));
  const today = all.filter((b) => (b.status === 'confirmed' || b.status === 'in_progress') && b.scheduled_at && sameDay(b.scheduled_at)).sort(bySched);
  const next = today.find((b) => b.status === 'in_progress') ?? today.find((b) => tm(b.scheduled_at) >= Date.now() - 3600_000);
  const sheetB = sheet ? (all.find((b) => b.id === sheet.id) ?? null) : null;
  const balance = (ledger ?? []).reduce((a, r) => a + r.amount, 0);
  const owes = balance > 0.004;
  const credit = balance < -0.004;
  const on = !!me?.is_available;

  const toggle = async (v: boolean) => {
    if (!me || avBusy || v === on) return;
    setErr('');
    setAvBusy(true);
    setMe((m) => (m ? { ...m, is_available: v } : m)); // يتغيّر على طول
    const e = await setAvailable(uid, v);
    setAvBusy(false);
    if (e) {
      setMe((m) => (m ? { ...m, is_available: !v } : m)); // الحفظ فشل → يرجع زي ما كان
      setErr(e);
    }
  };

  const goRequests = () => router.navigate('/pro/requests' as never);
  const openJob = (id: string) => router.navigate({ pathname: '/pro/requests', params: { open: id } } as never);

  const Stat = ({ icon, color, num, label, onPress, small }: { icon: IconName; color: string; num: string; label: string; onPress: () => void; small?: boolean }) => (
    <Pressable style={({ pressed }) => [s.stat, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={[st.iconDot, { backgroundColor: color + '1F' }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[s.statNum, { color }, small && { fontSize: 16 }]} numberOfLines={1}>{num}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );

  const Seg = ({ v, icon, label, color }: { v: boolean; icon: IconName; label: string; color: string }) => {
    const active = on === v && !!me;
    return (
      <Pressable
        onPress={() => void toggle(v)}
        disabled={!me || avBusy}
        style={[st.seg, active ? { backgroundColor: color } : { borderColor: c.chipBorder, borderWidth: 1 }]}
      >
        <Ionicons name={icon} size={16} color={active ? '#FFFFFF' : c.iconMuted} />
        <Text style={[s.panelTitle, st.segText, { color: active ? '#FFFFFF' : c.iconMuted }]}>{label}</Text>
      </Pressable>
    );
  };

  const initial = (me?.business_name ?? '').trim().charAt(0) || 'T';

  return (
    <Screen hero title={tr('أهلًا بيك 👋', 'Welcome 👋')} subtitle={tr('لوحة مقدم الخدمة', 'Provider dashboard')} right={<BellButton />} refreshControl={refreshControl}>
      {/* هويتك + التوفر */}
      <View style={s.panel}>
        <View style={s.panelRow}>
          {me?.logo_url ? (
            <Image source={{ uri: me.logo_url }} style={st.logo} />
          ) : (
            <View style={[st.logo, { backgroundColor: c.accent }]}>
              <Text style={[s.panelTitle, { color: '#FFFFFF', fontSize: 22 }]}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.panelTitle, { fontSize: 17 }]} numberOfLines={1}>{me?.business_name ?? '…'}</Text>
            <View style={[s.panelRow, { gap: 6 }]}>
              <View style={[st.pill, { backgroundColor: AMBER + '1F' }]}>
                <Ionicons name="star" size={12} color={AMBER} />
                <Text style={[s.panelSub, { color: AMBER, fontSize: 12 }]}>
                  {me && me.rating_count > 0 ? `${me.rating_avg.toFixed(1)} (${me.rating_count})` : tr('جديد', 'New')}
                </Text>
              </View>
              <View style={[st.pill, { backgroundColor: (on ? GREEN : GREY) + '1F' }]}>
                <View style={[st.dot, { backgroundColor: on ? GREEN : GREY }]} />
                <Text style={[s.panelSub, { color: on ? GREEN : GREY, fontSize: 12 }]}>{on ? tr('ظاهر للحجز', 'Bookable') : tr('مقفول', 'Closed')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[s.panelRow, st.segWrap]}>
          <Seg v={true} icon="checkmark-circle" label={tr('متاح', 'Available')} color={GREEN} />
          <Seg v={false} icon="moon" label={tr('مش متاح', 'Away')} color={GREY} />
        </View>
        <Text style={[s.panelSub, { fontSize: 12 }]}>
          {on ? tr('العملاء يقدروا يحجزوا معاك دلوقتي', 'Customers can book you now') : tr('العملاء هيشوفوك بس مش هيقدروا يحجزوا', "Customers see you but can't book")}
        </Text>
        {err ? <Text style={s.err}>{err}</Text> : null}
      </View>

      {/* الشغلانة الجاية النهارده */}
      {next && next.scheduled_at ? (
        <Pressable style={({ pressed }) => [st.next, { backgroundColor: c.accent }, pressed && { opacity: 0.85 }]} onPress={() => openJob(next.id)}>
          <View style={st.nextIcon}>
            <Ionicons name={next.status === 'in_progress' ? 'construct' : 'time'} size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.panelSub, { color: '#FFFFFFCC', fontSize: 12 }]}>
              {next.status === 'in_progress' ? tr('شغال فيها دلوقتي', 'Working on it now') : tr('الشغلانة الجاية النهارده', 'Next job today')}
            </Text>
            <Text style={[s.panelTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
              {`${clock(next.scheduled_at)} · ${next.services ? tr(next.services.name_ar, next.services.name_en) : ''}`}
            </Text>
          </View>
          <Ionicons name={tr('chevron-back', 'chevron-forward') as IconName} size={20} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <View style={s.stats}>
        <Stat icon="flash" color={AMBER} num={list ? String(fresh.length) : '…'} label={tr('طلبات جديدة', 'New requests')} onPress={goRequests} />
        <Stat icon="today" color={c.accent} num={list ? String(today.length) : '…'} label={tr('شغل النهارده', "Today's jobs")} onPress={goRequests} />
        <Stat
          icon="wallet"
          color={owes ? RED : credit ? GREEN : GREY}
          num={ledger ? money(Math.abs(balance)) : '…'}
          label={owes ? tr('عليك', 'You owe') : credit ? tr('ليك', 'Your credit') : tr('الرصيد', 'Balance')}
          onPress={() => router.navigate('/pro/wallet' as never)}
          small
        />
      </View>

      {loadErr ? (
        <View style={s.panel}>
          <Text style={s.err}>{tr('مقدرناش نجيب الطلبات — اتأكد من النت وحاول تاني.', "Couldn't load requests — check your connection.")}</Text>
          <Btn title={tr('حاول تاني', 'Try again')} icon="refresh" kind="ghost" onPress={() => void load(true)} />
        </View>
      ) : null}
      {list === null && !loadErr ? <ListSkeleton rows={2} height={150} /> : null}
      {list !== null && !loadErr && groups.length === 0 ? (
        <View style={[s.panel, st.empty]}>
          <View style={[st.emptyIcon, { backgroundColor: c.accent + '1A' }]}>
            <Ionicons name="cafe" size={34} color={c.accent} />
          </View>
          <Text style={[s.panelTitle, { textAlign: 'center' }]}>{tr('مفيش شغل دلوقتي', 'No active jobs')}</Text>
          <Text style={[s.panelSub, { textAlign: 'center' }]}>{tr('هيوصلك إشعار أول ما يجي طلب جديد. اتأكد إن خدماتك متفعّلة.', "You'll get a notification for new requests. Make sure your services are active.")}</Text>
          <Btn title={tr('خدماتي', 'My services')} icon="briefcase" kind="ghost" onPress={() => router.navigate('/pro/services' as never)} />
        </View>
      ) : null}

      {groups.map((g) => (
        <View key={g.k}>
          <View style={[s.panelRow, st.secRow]}>
            <Ionicons name={g.icon} size={18} color={g.color} />
            <Text style={[s.section, st.secText]}>{L(g)}</Text>
            <View style={[st.count, { backgroundColor: g.color + '1F' }]}>
              <Text style={[s.panelSub, { color: g.color, fontSize: 12 }]}>{g.items.length}</Text>
            </View>
          </View>
          {g.items.map((b) => (
            <JobCard key={b.id} b={b} onOpen={(mode) => setSheet({ id: b.id, mode })} onChanged={() => void load(true)} />
          ))}
        </View>
      ))}

      {sheet && sheetB ? (
        <RequestSheet
          key={`${sheet.id}-${sheet.mode}`}
          b={sheetB}
          initialMode={sheet.mode}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            void load(true);
          }}
        />
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  logo: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  segWrap: { gap: 8, marginTop: 14, marginBottom: 8 },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14 },
  segText: { fontSize: 14 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, marginBottom: 12 },
  nextIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  iconDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  secRow: { gap: 8, alignItems: 'center' },
  secText: { flex: 0 },
  count: { minWidth: 24, height: 22, paddingHorizontal: 7, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
