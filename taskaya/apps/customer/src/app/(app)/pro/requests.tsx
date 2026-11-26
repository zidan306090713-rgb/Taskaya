import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn, custOf, IconName, L, money, NEW_STATUSES, ProCard, StatusBadge, svcOf, toNum, useProStyles, whenOf, addrOf } from '@/components/pro/ProUI';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { isRTL, tr } from '@/i18n';
import { getProBookings, ProBooking, sendProQuote, setProStatus } from '@/lib/provider';
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

function Row({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  const { c } = useTheme();
  const s = useProStyles();
  return (
    <View style={s.dRow}>
      <View style={s.dIcon}>
        <Ionicons name={icon} size={17} color={c.accentText} />
      </View>
      <Text style={s.dLabel}>{label}</Text>
      <Text style={s.dValue} numberOfLines={3}>{children}</Text>
    </View>
  );
}

type Mode = null | 'quote' | 'reject' | 'cancel' | 'finish';

function RequestSheet({ b, onClose, onDone }: { b: ProBooking; onClose: () => void; onDone: () => void }) {
  const { c } = useTheme();
  const s = useProStyles();
  const [mode, setMode] = useState<Mode>(null);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isNew = NEW_STATUSES.includes(b.status);
  const custom = b.pricing_model === 'custom_quote';
  const cur = b.final_price ?? b.quoted_price;
  const when = whenOf(b.scheduled_at);
  const addr = addrOf(b);
  const phone = b.customer?.phone;

  const go = (m: Mode) => {
    setErr('');
    setMode(m);
  };
  const run = async (fn: () => Promise<string | null>) => {
    setErr('');
    setBusy(true);
    const e = await fn();
    setBusy(false);
    if (e) setErr(e);
    else onDone();
  };
  const submitQuote = () => {
    const n = toNum(price);
    if (!(n > 0)) return setErr(tr('اكتب سعر صحيح', 'Enter a valid price'));
    void run(() => sendProQuote(b.id, n, note));
  };
  const submitReason = (st: 'rejected' | 'cancelled') => {
    if (!reason.trim()) return setErr(tr('اكتب السبب', 'Please write the reason'));
    void run(() => setProStatus(b.id, st, reason));
  };
  const REASONS = [
    tr('مش متاح في الميعاد ده', 'Not available at this time'),
    tr('خارج منطقة شغلي', 'Outside my area'),
    tr('الخدمة مش متاحة حاليًا', 'Service unavailable now'),
  ];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
        <View style={s.wrap}>
          <View style={[s.sheet, { backgroundColor: c.isDark ? '#151A24' : '#FFFFFF', borderColor: c.accentBorder, shadowColor: c.accent }]}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accent} />
            <ScrollView contentContainerStyle={s.sheetBody} bounces={false} keyboardShouldPersistTaps="handled">
              <View style={s.topRow}>
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
                  <Ionicons name="construct" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={s.sheetTitle} numberOfLines={2}>{svcOf(b)}</Text>
                <Pressable onPress={onClose} hitSlop={10} style={s.close} accessibilityLabel={tr('إغلاق', 'Close')}>
                  <Ionicons name="close" size={20} color={c.accentText} />
                </Pressable>
              </View>

              <View style={s.badgeRow}>
                <StatusBadge status={b.status} />
                <View style={s.numPill}>
                  <Text style={s.numText}>#{b.booking_number}</Text>
                </View>
              </View>

              <View style={s.details}>
                <Row icon="person-outline" label={tr('العميل', 'Customer')}>{custOf(b)}</Row>
                {when ? <Row icon="calendar-outline" label={tr('الميعاد', 'Date')}>{when}</Row> : null}
                {addr ? <Row icon="location-outline" label={tr('العنوان', 'Address')}>{addr}</Row> : null}
                {b.address?.notes ? <Row icon="navigate-outline" label={tr('علامة مميزة', 'Landmark')}>{b.address.notes}</Row> : null}
                <Row icon="cash-outline" label={tr('السعر', 'Price')}>{cur != null ? money(cur) : tr('محتاج عرض سعر', 'Needs a quote')}</Row>
                {b.details ? <Row icon="document-text-outline" label={tr('التفاصيل', 'Details')}>{b.details}</Row> : null}
              </View>

              {phone ? (
                <Btn title={tr('اتصل بالعميل', 'Call customer')} icon="call" kind="ghost" onPress={() => void Linking.openURL(`tel:+${phone}`)} />
              ) : null}

              {b.cancel_reason && (b.status === 'cancelled' || b.status === 'rejected') ? (
                <View style={s.reason}>
                  <Ionicons name="information-circle-outline" size={18} color={c.dangerText} />
                  <Text style={s.reasonText}>{b.cancel_reason}</Text>
                </View>
              ) : null}

              {b.status === 'awaiting_customer_approval' ? (
                <View style={s.box}>
                  <View style={s.boxHead}>
                    <Ionicons name="hourglass-outline" size={18} color={c.accentText} />
                    <Text style={s.boxTitle}>{tr('مستني موافقة العميل', 'Waiting for the customer')}</Text>
                  </View>
                  <Text style={s.boxText}>
                    {tr(`عرضك: ${money(b.quoted_price)}`, `Your quote: ${money(b.quoted_price)}`)}
                    {b.quote_note ? ` — «${b.quote_note}»` : ''}
                  </Text>
                </View>
              ) : null}

              {b.status === 'completed' ? (
                <View style={s.details}>
                  <Row icon="cash-outline" label={tr('سعر الخدمة', 'Service price')}>{money(b.final_price)}</Row>
                  <Row icon="pie-chart-outline" label={tr('عمولة تاسكاية', 'TASKAYA fee')}>{money(b.commission_amount)}</Row>
                  <Row icon="wallet-outline" label={tr('صافي ليك', 'Your earning')}>{money(b.provider_earning)}</Row>
                </View>
              ) : null}

              {mode === null ? (
                <View style={s.actions}>
                  {isNew && !custom ? (
                    <Btn title={tr('قبول وتأكيد', 'Accept & confirm')} icon="checkmark-circle" busy={busy} onPress={() => void run(() => setProStatus(b.id, 'confirmed'))} />
                  ) : null}
                  {isNew ? (
                    <Btn
                      title={custom ? tr('إرسال عرض سعر', 'Send a quote') : tr('اقتراح سعر مختلف', 'Suggest a different price')}
                      icon="pricetag"
                      kind={custom ? 'primary' : 'ghost'}
                      onPress={() => go('quote')}
                    />
                  ) : null}
                  {isNew ? <Btn title={tr('رفض الطلب', 'Decline')} icon="close-circle" kind="danger" onPress={() => go('reject')} /> : null}
                  {b.status === 'confirmed' ? (
                    <Btn title={tr('بدأت الشغل', 'Start work')} icon="construct" busy={busy} onPress={() => void run(() => setProStatus(b.id, 'in_progress'))} />
                  ) : null}
                  {b.status === 'in_progress' ? <Btn title={tr('خلصت الشغل', 'Mark as done')} icon="checkmark-done" onPress={() => go('finish')} /> : null}
                  {b.status === 'confirmed' || b.status === 'in_progress' ? (
                    <Btn title={tr('عرض سعر جديد', 'New quote')} icon="pricetag" kind="ghost" onPress={() => go('quote')} />
                  ) : null}
                  {b.status === 'confirmed' || b.status === 'awaiting_customer_approval' ? (
                    <Btn title={tr('إلغاء الحجز', 'Cancel booking')} icon="close-circle" kind="danger" onPress={() => go('cancel')} />
                  ) : null}
                </View>
              ) : null}

              {mode === 'quote' ? (
                <View style={s.box}>
                  <View style={s.boxHead}>
                    <Ionicons name="pricetag-outline" size={18} color={c.accentText} />
                    <Text style={s.boxTitle}>{tr('عرض سعر', 'Price quote')}</Text>
                  </View>
                  <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder={tr('السعر بالجنيه', 'Price in EGP')} placeholderTextColor={c.textSecondary} />
                  <TextInput style={s.input} value={note} onChangeText={setNote} placeholder={tr('ملاحظة للعميل (اختياري)', 'Note for the customer (optional)')} placeholderTextColor={c.textSecondary} />
                  <Text style={s.boxText}>{tr('العميل هيوصله العرض ويوافق أو يرفض.', 'The customer will approve or decline it.')}</Text>
                  <View style={s.btnRow}>
                    <Btn title={tr('رجوع', 'Back')} kind="ghost" onPress={() => go(null)} />
                    <Btn title={tr('إرسال', 'Send')} icon="send" busy={busy} onPress={submitQuote} />
                  </View>
                </View>
              ) : null}

              {mode === 'reject' || mode === 'cancel' ? (
                <View style={s.box}>
                  <View style={s.boxHead}>
                    <Ionicons name="alert-circle-outline" size={18} color={c.dangerText} />
                    <Text style={[s.boxTitle, { color: c.dangerText }]}>
                      {mode === 'reject' ? tr('سبب الرفض', 'Reason for declining') : tr('سبب الإلغاء', 'Reason for cancelling')}
                    </Text>
                  </View>
                  <View style={s.chips}>
                    {REASONS.map((r) => (
                      <Pressable key={r} style={s.chip} onPress={() => setReason(r)}>
                        <Text style={s.chipText}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput style={s.input} value={reason} onChangeText={setReason} placeholder={tr('اكتب السبب', 'Write the reason')} placeholderTextColor={c.textSecondary} />
                  <Text style={s.boxText}>{tr('العميل هيشوف السبب ده.', 'The customer will see this reason.')}</Text>
                  <View style={s.btnRow}>
                    <Btn title={tr('رجوع', 'Back')} kind="ghost" onPress={() => go(null)} />
                    <Btn
                      title={mode === 'reject' ? tr('تأكيد الرفض', 'Confirm decline') : tr('تأكيد الإلغاء', 'Confirm cancel')}
                      kind="danger"
                      busy={busy}
                      onPress={() => submitReason(mode === 'reject' ? 'rejected' : 'cancelled')}
                    />
                  </View>
                </View>
              ) : null}

              {mode === 'finish' ? (
                <View style={s.box}>
                  <View style={s.boxHead}>
                    <Ionicons name="checkmark-done-outline" size={18} color={c.accentText} />
                    <Text style={s.boxTitle}>{tr('تأكيد إنهاء الشغل', 'Confirm the job is done')}</Text>
                  </View>
                  <Text style={s.boxText}>
                    {tr(`الطلب هيتسجل إنه اتنفذ بسعر ${money(cur)}.`, `The job will be recorded as done at ${money(cur)}.`)}
                  </Text>
                  <View style={s.btnRow}>
                    <Btn title={tr('رجوع', 'Back')} kind="ghost" onPress={() => go(null)} />
                    <Btn title={tr('تأكيد', 'Confirm')} icon="checkmark" busy={busy} onPress={() => void run(() => setProStatus(b.id, 'completed'))} />
                  </View>
                </View>
              ) : null}

              {err ? <Text style={s.err}>{err}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProRequests() {
  const { c } = useTheme();
  const s = useProStyles();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<ProBooking[] | null>(null);
  const [filter, setFilter] = useState<Filter>('new');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    (force = false) => {
      if (!uid) return;
      getProBookings(uid, force).then(setList);
    },
    [uid],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useOnPush(useCallback(() => load(true), [load]));

  // جاي من إشعار (?open=<رقم الحجز>) → افتح الطلب ده على طول
  const { open: openParam } = useLocalSearchParams<{ open?: string }>();
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!openParam || !list) return;
    if (list.some((b) => b.id === openParam)) {
      setOpenId(openParam);
      router.setParams({ open: undefined });
      return;
    }
    // مش في القايمة المتخزنة (حجز جديد) → نحدّث مرة واحدة
    if (tried.current !== openParam) {
      tried.current = openParam;
      load(true);
      return;
    }
    router.setParams({ open: undefined });
  }, [openParam, list, load]);

  const cur = FILTERS.find((f) => f.k === filter) ?? FILTERS[0];
  const shown = (list ?? []).filter((b) => cur.statuses.includes(b.status));
  const open = list?.find((b) => b.id === openId) ?? null;

  return (
    <Screen hero title={tr('الطلبات', 'Requests')}>
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

      {list === null ? <ListSkeleton rows={3} height={150} /> : null}
      {list !== null && shown.length === 0 ? (
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
            load(true);
          }}
        />
      ) : null}
    </Screen>
  );
}
