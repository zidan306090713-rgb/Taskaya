import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { money, NEW_STATUSES, ProCard, useProStyles } from '@/components/pro/ProUI';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { tr } from '@/i18n';
import { getMyLedger, getMyProvider, getProBookings, LedgerRow, ProBooking, ProProfile, setAvailable } from '@/lib/provider';
import { useOnPush, usePushSetup } from '@/lib/push';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function ProHome() {
  const { c } = useTheme();
  const s = useProStyles();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  usePushSetup(uid || undefined);

  const [me, setMe] = useState<ProProfile | null>(null);
  const [list, setList] = useState<ProBooking[] | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [avBusy, setAvBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(
    (force = false) => {
      if (!uid) return;
      getMyProvider(uid, force).then(setMe);
      getProBookings(uid, force).then(setList);
      getMyLedger(uid, force).then(setLedger);
    },
    [uid],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useOnPush(useCallback(() => load(true), [load]));

  const fresh = (list ?? []).filter((b) => NEW_STATUSES.includes(b.status));
  const today = (list ?? []).filter((b) => (b.status === 'confirmed' || b.status === 'in_progress') && b.scheduled_at && sameDay(b.scheduled_at));
  const balance = (ledger ?? []).reduce((a, r) => a + r.amount, 0);
  const owes = balance > 0.004;
  const credit = balance < -0.004;

  const toggle = async (v: boolean) => {
    setErr('');
    setAvBusy(true);
    const e = await setAvailable(uid, v);
    setAvBusy(false);
    if (e) setErr(e);
    else setMe((m) => (m ? { ...m, is_available: v } : m));
  };

  const goRequests = () => router.push('/pro/requests' as never);

  return (
    <Screen hero title={me?.business_name ?? tr('أهلًا بيك', 'Welcome')} subtitle={tr('لوحة مقدم الخدمة', 'Provider dashboard')}>
      <View style={s.panel}>
        <View style={s.panelRow}>
          <Ionicons name={me?.is_available ? 'radio-button-on' : 'radio-button-off'} size={22} color={me?.is_available ? '#16A34A' : c.iconMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle}>{me?.is_available ? tr('متاح لاستقبال طلبات', 'Accepting requests') : tr('مش متاح دلوقتي', 'Not available now')}</Text>
            <Text style={s.panelSub}>
              {me?.is_available ? tr('العملاء يقدروا يحجزوا معاك', 'Customers can book you') : tr('مش هتظهر للعملاء لحد ما تفتحها', "You're hidden from customers")}
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

      <Text style={s.section}>{tr('طلبات مستنية ردك', 'Waiting for your reply')}</Text>
      {list === null ? <ListSkeleton rows={2} height={150} /> : null}
      {list !== null && fresh.length === 0 ? (
        <View style={s.panel}>
          <Text style={s.panelSub}>{tr('مفيش طلبات جديدة دلوقتي — هيوصلك إشعار أول ما يجي طلب.', "No new requests — you'll get a notification.")}</Text>
        </View>
      ) : null}
      {fresh.slice(0, 3).map((b) => (
        <ProCard key={b.id} b={b} onOpen={goRequests} />
      ))}
    </Screen>
  );
}
