import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { oldestFirst } from '@/components/pro/Ago';
import { Btn, L, NEW_STATUSES, ProCard, useProStyles } from '@/components/pro/ProUI';
import { RequestSheet } from '@/components/pro/RequestSheet';
import { usePullRefresh } from '@/components/ui/Refresh';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { tr } from '@/i18n';
import { getProBookings, ProBooking } from '@/lib/provider';
import { useOnPush } from '@/lib/push';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Filter = 'new' | 'waiting' | 'confirmed' | 'active' | 'done';
const FILTERS: { k: Filter; ar: string; en: string; statuses: string[] }[] = [
  { k: 'new', ar: 'جديدة', en: 'New', statuses: NEW_STATUSES },
  { k: 'waiting', ar: 'مستني العميل', en: 'Waiting', statuses: ['awaiting_customer_approval'] },
  { k: 'confirmed', ar: 'مؤكدة', en: 'Confirmed', statuses: ['confirmed'] },
  { k: 'active', ar: 'شغالة', en: 'In progress', statuses: ['in_progress'] },
  { k: 'done', ar: 'منتهية', en: 'Done', statuses: ['completed', 'cancelled', 'rejected'] },
];

const tm = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
// الترتيب: الجديدة الأقدم فوق (مستنية من بدري) · المؤكدة والشغالة الأقرب ميعاد فوق · الباقي الأحدث فوق
function sortFor(k: Filter) {
  if (k === 'new') return oldestFirst;
  if (k === 'confirmed' || k === 'active') return (a: ProBooking, b: ProBooking) => tm(a.scheduled_at) - tm(b.scheduled_at);
  return undefined;
}

export default function ProRequests() {
  const { c } = useTheme();
  const s = useProStyles();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<ProBooking[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [filter, setFilter] = useState<Filter>('new');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    (force = false) => {
      if (!uid) return Promise.resolve();
      return getProBookings(uid, force).then(
        (l) => {
          setList(l);
          setLoadErr(false);
        },
        () => setLoadErr(true), // خطأ في النت/السيرفر ≠ "مفيش طلبات"
      );
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

  // جاي من إشعار أو من كارت الرئيسية (?open=<رقم الحجز>) → افتح الطلب ده على طول
  const { open: openParam } = useLocalSearchParams<{ open?: string }>();
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!openParam || !list) return;
    const hit = list.find((b) => b.id === openParam);
    if (hit) {
      const f = FILTERS.find((x) => x.statuses.includes(hit.status));
      if (f) setFilter(f.k); // ورا الشيت تبان القايمة اللي فيها الطلب
      setOpenId(openParam);
      router.setParams({ open: undefined });
      return;
    }
    // مش في القايمة المتخزنة (حجز جديد) → نحدّث مرة واحدة
    if (tried.current !== openParam) {
      tried.current = openParam;
      void load(true);
      return;
    }
    router.setParams({ open: undefined });
  }, [openParam, list, load]);

  const cur = FILTERS.find((f) => f.k === filter) ?? FILTERS[0];
  const sorter = sortFor(filter);
  const filtered = (list ?? []).filter((b) => cur.statuses.includes(b.status));
  const shown = sorter ? filtered.sort(sorter) : filtered;
  const open = list?.find((b) => b.id === openId) ?? null;

  return (
    <Screen hero title={tr('الطلبات', 'Requests')} refreshControl={refreshControl}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {FILTERS.map((f) => {
          const on = f.k === filter;
          const n = (list ?? []).filter((b) => f.statuses.includes(b.status)).length;
          return (
            <Pressable key={f.k} style={[s.filter, on && s.filterOn]} onPress={() => setFilter(f.k)}>
              <Text style={[s.filterText, on && s.filterTextOn]}>
                {L(f)}
                {n ? ` · ${n}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loadErr ? (
        <View style={s.panel}>
          <Text style={s.err}>{tr('مقدرناش نجيب الطلبات — اتأكد من النت وحاول تاني.', "Couldn't load requests — check your connection.")}</Text>
          <Btn title={tr('حاول تاني', 'Try again')} icon="refresh" kind="ghost" onPress={() => void load(true)} />
        </View>
      ) : null}
      {list === null && !loadErr ? <ListSkeleton rows={3} height={150} /> : null}
      {list !== null && !loadErr && shown.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="clipboard-outline" size={30} color={c.accentText} />
          </View>
          <Text style={s.emptyTitle}>{tr('مفيش طلبات هنا', 'Nothing here')}</Text>
          <Text style={s.emptySub}>{tr('أول ما يجيلك طلب هيظهر هنا ويوصلك إشعار', 'New requests show up here with a notification')}</Text>
        </View>
      ) : null}
      {shown.map((b) => (
        <ProCard key={b.id} b={b} onOpen={() => setOpenId(b.id)} />
      ))}
      {open ? (
        <RequestSheet
          b={open}
          onClose={() => setOpenId(null)}
          onDone={() => {
            setOpenId(null);
            void load(true);
          }}
        />
      ) : null}
    </Screen>
  );
}
