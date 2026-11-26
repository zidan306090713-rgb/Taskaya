import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
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

const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const tm = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
const bySched = (a: ProBooking, b: ProBooking) => tm(a.scheduled_at) - tm(b.scheduled_at);

// الشغل اللي لسه مخلصش بس (المكتمل/الملغي/المرفوض بيختفي من هنا ويفضل في الطلبات)
const GROUPS: { k: string; ar: string; en: string; match: (s: string) => boolean; sort: (a: ProBooking, b: ProBooking) => number }[] = [
  { k: 'new', ar: 'مستنية ردك', en: 'Waiting for your reply', match: (s) => NEW_STATUSES.includes(s), sort: oldestFirst },
  { k: 'active', ar: 'شغالة دلوقتي', en: 'In progress', match: (s) => s === 'in_progress', sort: bySched },
  { k: 'confirmed', ar: 'مؤكدة', en: 'Confirmed', match: (s) => s === 'confirmed', sort: bySched },
  { k: 'waiting', ar: 'مستني رد العميل', en: 'Waiting for the customer', match: (s) => s === 'awaiting_customer_approval', sort: oldestFirst },
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
  const today = all.filter((b) => (b.status === 'confirmed' || b.status === 'in_progress') && b.scheduled_at && sameDay(b.scheduled_at));
  const sheetB = sheet ? (all.find((b) => b.id === sheet.id) ?? null) : null;
  const balance = (ledger ?? []).reduce((a, r) => a + r.amount, 0);
  const owes = balance > 0.004;
  const credit = balance < -0.004;

  const toggle = async (v: boolean) => {
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

  const goRequests = () => router.push('/pro/requests' as never);

  return (
    <Screen hero title={me?.business_name ?? tr('أهلًا بيك', 'Welcome')} subtitle={tr('لوحة مقدم الخدمة', 'Provider dashboard')} right={<BellButton />} refreshControl={refreshControl}>
      <View style={s.panel}>
        <View style={s.panelRow}>
          <Ionicons name={me?.is_available ? 'radio-button-on' : 'radio-button-off'} size={22} color={me?.is_available ? '#16A34A' : c.iconMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle}>{me?.is_available ? tr('متاح لاستقبال طلبات', 'Accepting requests') : tr('مش متاح دلوقتي', 'Not available now')}</Text>
            <Text style={s.panelSub}>
              {me?.is_available ? tr('العملاء يقدروا يحجزوا معاك', 'Customers can book you') : tr('العملاء هيشوفوك بس مش هيقدروا يحجزوا', "Customers see you but can't book")}
            </Text>
          </View>
          <Switch
            value={!!me?.is_available}
            onValueChange={(v) => void toggle(v)}
            disabled={!me || avBusy}
            trackColor={{ true: c.accent, false: c.chipBorder }}
            thumbColor="#FFFFFF"
          />
        </View>
        {err ? <Text style={s.err}>{err}</Text> : null}
      </View>

      <View style={s.stats}>
        <Pressable style={s.stat} onPress={goRequests}>
          <Ionicons name="flash" size={18} color="#D97706" />
          <Text style={s.statNum}>{list ? fresh.length : '…'}</Text>
          <Text style={s.statLabel}>{tr('طلبات جديدة', 'New requests')}</Text>
        </Pressable>
        <Pressable style={s.stat} onPress={goRequests}>
          <Ionicons name="today" size={18} color={c.accentText} />
          <Text style={s.statNum}>{list ? today.length : '…'}</Text>
          <Text style={s.statLabel}>{tr('شغل النهارده', "Today's jobs")}</Text>
        </Pressable>
        <Pressable style={s.stat} onPress={() => router.push('/pro/wallet' as never)}>
          <Ionicons name="wallet" size={18} color={owes ? '#DC2626' : '#16A34A'} />
          <Text style={[s.statNum, { fontSize: 16 }]} numberOfLines={1}>{ledger ? money(Math.abs(balance)) : '…'}</Text>
          <Text style={s.statLabel}>{owes ? tr('عليك', 'You owe') : credit ? tr('ليك', 'Your credit') : tr('الرصيد', 'Balance')}</Text>
        </Pressable>
      </View>

      {loadErr ? (
        <View style={s.panel}>
          <Text style={s.err}>{tr('مقدرناش نجيب الطلبات — اتأكد من النت وحاول تاني.', "Couldn't load requests — check your connection.")}</Text>
          <Btn title={tr('حاول تاني', 'Try again')} icon="refresh" kind="ghost" onPress={() => void load(true)} />
        </View>
      ) : null}
      {groups.length === 0 ? <Text style={s.section}>{tr('شغلك', 'Your jobs')}</Text> : null}
      {list === null && !loadErr ? <ListSkeleton rows={2} height={150} /> : null}
      {list !== null && !loadErr && groups.length === 0 ? (
        <View style={s.panel}>
          <Text style={s.panelSub}>{tr('مفيش شغل دلوقتي — هيوصلك إشعار أول ما يجي طلب جديد.', "No active jobs — you'll get a notification for new requests.")}</Text>
        </View>
      ) : null}
      {groups.map((g) => (
        <View key={g.k}>
          <Text style={s.section}>{`${L(g)} · ${g.items.length}`}</Text>
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
