import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chips } from '@/components/ui/Chips';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { isRTL, lang, tr } from '@/i18n';
import { answerQuote, Booking, getMyBookings } from '@/lib/api';
import { useOnPush } from '@/lib/push';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STATUS: Record<string, { ar: string; en: string; color: string; icon: IconName }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', color: '#D97706', icon: 'time-outline' },
  accepted: { ar: 'تم القبول', en: 'Accepted', color: '#2563EB', icon: 'checkmark-circle-outline' },
  quotation_submitted: { ar: 'بانتظار عرض السعر', en: 'Preparing quote', color: '#7C3AED', icon: 'document-text-outline' },
  awaiting_customer_approval: { ar: 'مستني موافقتك', en: 'Awaiting you', color: '#7C3AED', icon: 'hourglass-outline' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', color: '#2563EB', icon: 'shield-checkmark-outline' },
  in_progress: { ar: 'جاري التنفيذ', en: 'In progress', color: '#0EA5E9', icon: 'construct-outline' },
  completed: { ar: 'مكتمل', en: 'Completed', color: '#16A34A', icon: 'checkmark-done-outline' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#64748B', icon: 'close-circle-outline' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: '#DC2626', icon: 'ban-outline' },
};
const PRICING: Record<string, { ar: string; en: string }> = {
  fixed: { ar: 'سعر ثابت', en: 'Fixed price' },
  starting_from: { ar: 'يبدأ من', en: 'Starting from' },
  custom_quote: { ar: 'بعرض سعر', en: 'By quote' },
};
const AWAITING = 'awaiting_customer_approval';
const CURRENT = ['pending', 'accepted', 'quotation_submitted', AWAITING, 'confirmed', 'in_progress'];
// خطوات شريط التقدّم: اتطلب ← مؤكد ← جاري ← تم
const STEP: Record<string, number> = { pending: 0, accepted: 0, quotation_submitted: 0, confirmed: 1, in_progress: 2 };
const STEPS = [
  { ar: 'اتطلب', en: 'Requested' },
  { ar: 'مؤكد', en: 'Confirmed' },
  { ar: 'جاري', en: 'Ongoing' },
  { ar: 'تم', en: 'Done' },
];

const locale = () => (lang === 'ar' ? 'ar-EG' : 'en-US');
const EGP = () => tr('ج.م', 'EGP');
const L = (x: { ar: string; en: string }) => (lang === 'ar' ? x.ar : x.en);
const statusOf = (s: string) => STATUS[s] ?? { ar: s, en: s, color: '#64748B', icon: 'ellipse-outline' as IconName };
const whenOf = (b: Booking) =>
  b.scheduled_at
    ? new Date(b.scheduled_at).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;
const titleOf = (b: Booking) => (b.services ? (lang === 'ar' ? b.services.name_ar : b.services.name_en) : '-');
const providerOf = (b: Booking) => b.provider_profiles?.business_name ?? tr('بانتظار ترشيح مقدم خدمة', 'Awaiting provider match');

const WEB_FADE =
  Platform.OS === 'web'
    ? ({
        maskImage: 'linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 18px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 18px), transparent 100%)',
      } as any)
    : null;

function useStyles() {
  const { c } = useTheme();
  return { c, styles: useMemo(() => makeStyles(c), [c]) };
}

function Badge({ status }: { status: string }) {
  const { styles } = useStyles();
  const st = statusOf(status);
  return (
    <View style={[styles.badge, { backgroundColor: st.color + '1A' }]}>
      <Ionicons name={st.icon} size={12} color={st.color} />
      <Text style={[styles.badgeText, { color: st.color }]} numberOfLines={1}>{L(st)}</Text>
    </View>
  );
}

function Thumb({ b, size = 46 }: { b: Booking; size?: number }) {
  const { c, styles } = useStyles();
  const uri = b.provider_profiles?.logo_url ?? b.provider_profiles?.cover_url ?? null;
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: size * 0.3 }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name="construct" size={size * 0.45} color="#FFFFFF" />
        </LinearGradient>
      )}
    </View>
  );
}

// شريط التقدّم: 4 نقط
function Tracker({ step }: { step: number }) {
  const { styles } = useStyles();
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.trk}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.trkItem, i === STEPS.length - 1 && { flex: 0 }]}>
            <View style={[styles.dot, i <= step && styles.dotOn]} />
            {i < STEPS.length - 1 ? <View style={[styles.line, i < step && styles.lineOn]} /> : null}
          </View>
        ))}
      </View>
      <View style={styles.trkLabels}>
        {STEPS.map((s, i) => (
          <Text key={i} style={[styles.trkLabel, i <= step && styles.trkLabelOn]}>{L(s)}</Text>
        ))}
      </View>
    </View>
  );
}

// ===== كارت الطلب =====
function OrderCard({ b, onOpen }: { b: Booking; onOpen: () => void }) {
  const { c, styles } = useStyles();
  const awaiting = b.status === AWAITING;
  const price = b.final_price ?? b.quoted_price;
  const when = whenOf(b);
  const step = STEP[b.status];

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => [styles.card, awaiting && styles.cardHot, pressed && { opacity: 0.9 }]}>
      <View style={styles.topRow}>
        <Thumb b={b} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{titleOf(b)}</Text>
          <Text style={styles.sub} numberOfLines={1}>{providerOf(b)}</Text>
        </View>
        <Badge status={b.status} />
      </View>

      {awaiting ? (
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{tr('عرض سعر جديد', 'New price quote')}</Text>
          <Text style={styles.quoteVal}>
            {b.quoted_price} {EGP()} {isRTL ? '←' : '→'}
          </Text>
        </View>
      ) : null}

      {when && !awaiting ? (
        <View style={styles.when}>
          <Ionicons name="calendar-outline" size={14} color={c.iconMuted} />
          <Text style={styles.whenText}>{when}</Text>
        </View>
      ) : null}

      {step !== undefined ? <Tracker step={step} /> : null}

      <View style={styles.foot}>
        <View style={styles.numPill}>
          <Text style={styles.numText}>#{b.booking_number}</Text>
        </View>
        <Text style={[styles.price, price == null && styles.priceMuted]}>{price != null ? `${price} ${EGP()}` : tr('السعر لم يحدد بعد', 'Price not set yet')}</Text>
      </View>
    </Pressable>
  );
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  const { c, styles } = useStyles();
  return (
    <View style={styles.dRow}>
      <View style={styles.dIcon}>
        <Ionicons name={icon} size={17} color={c.accentText} />
      </View>
      <Text style={styles.dLabel}>{label}</Text>
      <Text style={styles.dValue} numberOfLines={2}>{children}</Text>
    </View>
  );
}

// ===== نافذة التفاصيل + الموافقة / الرفض =====
function OrderSheet({ b, onClose, onChanged }: { b: Booking; onClose: () => void; onChanged: () => void }) {
  const { c, styles } = useStyles();
  const [confirmNo, setConfirmNo] = useState(false);
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null);
  const [err, setErr] = useState('');
  const awaiting = b.status === AWAITING;
  const keeps = b.quote_prev_status === 'confirmed' || b.quote_prev_status === 'in_progress';
  const price = b.final_price ?? b.quoted_price;
  const when = whenOf(b);

  const answer = async (accept: boolean) => {
    setErr('');
    setBusy(accept ? 'yes' : 'no');
    const { error } = await answerQuote(b.id, accept);
    setBusy(null);
    if (error) {
      setErr(tr('حصلت مشكلة، حاول تاني', 'Something went wrong, please try again'));
      return;
    }
    setConfirmNo(false);
    onChanged();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
        <View style={styles.wrap}>
          <View style={[styles.sheet, { backgroundColor: c.isDark ? '#151A24' : '#FFFFFF', borderColor: rgba(c.accent, 0.3), shadowColor: c.accent }]}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
            <ScrollView contentContainerStyle={styles.sheetBody} bounces={false}>
              <View style={styles.topRow}>
                <Thumb b={b} size={44} />
                <Text style={styles.sheetTitle} numberOfLines={2}>{titleOf(b)}</Text>
                <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel={tr('إغلاق', 'Close')}>
                  <Ionicons name="close" size={20} color={c.accentText} />
                </Pressable>
              </View>

              <View style={styles.badgeRow}>
                <Badge status={b.status} />
                <View style={styles.numPill}>
                  <Text style={styles.numText}>#{b.booking_number}</Text>
                </View>
              </View>

              {STEP[b.status] !== undefined ? <Tracker step={STEP[b.status]} /> : null}

              <View style={styles.details}>
                <Row icon="business-outline" label={tr('مقدم الخدمة', 'Provider')}>{providerOf(b)}</Row>
                {when ? <Row icon="calendar-outline" label={tr('الميعاد', 'Date')}>{when}</Row> : null}
                <Row icon="pricetag-outline" label={tr('نوع السعر', 'Pricing')}>
                  {b.pricing_model && PRICING[b.pricing_model] ? L(PRICING[b.pricing_model]) : '-'}
                </Row>
                {!awaiting ? (
                  <Row icon="cash-outline" label={tr('السعر', 'Price')}>
                    {price != null ? `${price} ${EGP()}` : tr('لم يحدد بعد', 'Not set yet')}
                  </Row>
                ) : null}
              </View>

              {b.cancel_reason && (b.status === 'cancelled' || b.status === 'rejected') ? (
                <View style={styles.reason}>
                  <Ionicons name="information-circle-outline" size={18} color={c.dangerText} />
                  <Text style={styles.reasonText}>{b.cancel_reason}</Text>
                </View>
              ) : null}

              {awaiting ? (
                <View style={styles.quoteBox}>
                  <View style={styles.quoteHead}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#7C3AED" />
                    <Text style={styles.quoteTitle}>{tr('عرض سعر جديد', 'New price quote')}</Text>
                  </View>
                  <View style={styles.quotePrices}>
                    {b.quote_prev_price != null ? (
                      <>
                        <Text style={styles.oldPrice}>
                          {b.quote_prev_price} {EGP()}
                        </Text>
                        <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={c.iconMuted} />
                      </>
                    ) : null}
                    <Text style={styles.newPrice}>
                      {b.quoted_price} {EGP()}
                    </Text>
                  </View>
                  {b.quote_note ? <Text style={styles.quoteNote}>«{b.quote_note}»</Text> : null}

                  {confirmNo ? (
                    <>
                      <Text style={styles.quoteWarn}>
                        {keeps
                          ? tr('لو رفضت، الحجز هيكمّل بالسعر القديم.', 'If you decline, the booking continues at the old price.')
                          : tr('لو رفضت، الحجز هيتلغي.', 'If you decline, the booking will be cancelled.')}
                      </Text>
                      <View style={styles.quoteBtns}>
                        <Pressable style={[styles.qBtn, styles.qGhost]} onPress={() => setConfirmNo(false)} disabled={!!busy}>
                          <Text style={styles.qGhostText}>{tr('رجوع', 'Back')}</Text>
                        </Pressable>
                        <Pressable style={[styles.qBtn, { backgroundColor: c.dangerText }]} onPress={() => answer(false)} disabled={!!busy}>
                          {busy === 'no' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.qText}>{tr('تأكيد الرفض', 'Confirm decline')}</Text>}
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <View style={styles.quoteBtns}>
                      <Pressable style={[styles.qBtn, styles.qGhost]} onPress={() => setConfirmNo(true)} disabled={!!busy}>
                        <Text style={styles.qGhostText}>{tr('رفض', 'Decline')}</Text>
                      </Pressable>
                      <Pressable style={styles.qWrap} onPress={() => answer(true)} disabled={!!busy}>
                        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qBtn}>
                          {busy === 'yes' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.qText}>{tr('موافقة', 'Approve')}</Text>}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                  {err ? <Text style={styles.quoteWarn}>{err}</Text> : null}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type Filter = 'all' | 'current' | 'done';

export default function Orders() {
  const { c, styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Booking[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // الحجوزات اللي مستنية ردك تظهر الأول
  const load = useCallback(
    (force = false) => {
      if (!uid) return;
      getMyBookings(uid, force).then((l) =>
        setList([...l].sort((a, b) => Number(b.status === AWAITING) - Number(a.status === AWAITING))),
      );
    },
    [uid],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useOnPush(useCallback(() => load(true), [load]));

  const all = list ?? [];
  const current = all.filter((b) => CURRENT.includes(b.status));
  const done = all.filter((b) => !CURRENT.includes(b.status));
  const shown = filter === 'current' ? current : filter === 'done' ? done : all;
  const open = list?.find((b) => b.id === openId) ?? null;

  return (
    <View style={[styles.page, { paddingBottom: Math.max(insets.bottom, 12) + 86 }]}>
      <GradientHeader
        noBack
        title={tr('طلباتي', 'My Orders')}
        subtitle={tr('تابع حجوزاتك خطوة بخطوة', 'Track your bookings step by step')}
        padBottom={22}
        right={
          list ? (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{all.length}</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.body}>
        <View>
          <Chips
            items={[
              { key: 'all', label: `${tr('الكل', 'All')} · ${all.length}` },
              { key: 'current', label: `${tr('الحالية', 'Active')} · ${current.length}` },
              { key: 'done', label: `${tr('المنتهية', 'Past')} · ${done.length}` },
            ]}
            value={filter}
            onChange={(k) => setFilter((k as Filter) ?? 'all')}
          />
        </View>

        <ScrollView style={[{ flex: 1, marginHorizontal: -16 }, WEB_FADE]} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {list === null ? <ListSkeleton rows={3} height={150} /> : null}
          {list !== null && shown.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={30} color={c.accentText} />
              </View>
              <Text style={styles.emptyTitle}>{all.length ? tr('مفيش طلبات هنا', 'Nothing here') : tr('لا توجد طلبات بعد', 'No orders yet')}</Text>
              {!all.length ? <Text style={styles.emptySub}>{tr('ابدأ بحجز خدمتك الأولى من الرئيسية', 'Book your first service from Home')}</Text> : null}
            </View>
          ) : null}
          {shown.map((b) => (
            <OrderCard key={b.id} b={b} onOpen={() => setOpenId(b.id)} />
          ))}
        </ScrollView>
      </View>
      {open ? <OrderSheet b={open} onClose={() => setOpenId(null)} onChanged={() => load(true)} /> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1 },
    body: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
    countPill: { paddingHorizontal: 11, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    countText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
    listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, gap: 12 },
    center: { alignItems: 'center', justifyContent: 'center' },

    card: { padding: 13, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.accentBorder },
    cardHot: { borderWidth: 1.5, borderColor: '#7C3AED' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    thumb: { overflow: 'hidden', backgroundColor: c.fieldBg },
    title: { fontFamily: fonts.bold, fontSize: 15.5, color: c.text },
    sub: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary, marginTop: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, maxWidth: 150 },
    badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
    quote: {
      marginTop: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 13,
      backgroundColor: 'rgba(124,58,237,0.1)',
    },
    quoteText: { fontFamily: fonts.semibold, fontSize: 13, color: '#7C3AED' },
    quoteVal: { fontFamily: fonts.bold, fontSize: 14, color: '#7C3AED' },
    when: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    whenText: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
    trk: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
    trkItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.isDark ? 'rgba(255,255,255,0.15)' : '#D5DEEE' },
    dotOn: { backgroundColor: c.accent },
    line: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: c.isDark ? 'rgba(255,255,255,0.12)' : '#D5DEEE' },
    lineOn: { backgroundColor: c.accent },
    trkLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, direction: 'ltr' },
    trkLabel: { fontFamily: fonts.regular, fontSize: 10.5, color: c.textSecondary },
    trkLabelOn: { fontFamily: fonts.semibold, color: c.accentText },
    foot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderTopColor: c.accentBorder,
    },
    numPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: c.accentSoft },
    numText: { fontFamily: fonts.bold, fontSize: 12, color: c.accentText, letterSpacing: 0.5 },
    price: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
    priceMuted: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary },

    // النافذة
    backdrop: { backgroundColor: 'rgba(5,15,35,0.5)' },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
    sheet: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      borderRadius: 24,
      borderWidth: 1.5,
      overflow: 'hidden',
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    accent: { height: 4 },
    sheetBody: { padding: 18, gap: 14 },
    sheetTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: c.text },
    close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    details: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.fieldBg, borderWidth: 1, borderColor: c.fieldBorder },
    dRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    dLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, minWidth: 80 },
    dValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.ink, textAlign: isRTL ? 'left' : 'right' },
    reason: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: c.dangerBg, borderWidth: 1, borderColor: c.dangerBorder },
    reasonText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: c.dangerText },
    quoteBox: { padding: 14, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', gap: 10 },
    quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    quoteTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: '#7C3AED' },
    quotePrices: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    oldPrice: { fontFamily: fonts.semibold, fontSize: 14, color: c.textSecondary, textDecorationLine: 'line-through' },
    newPrice: { fontFamily: fonts.bold, fontSize: 22, color: c.ink },
    quoteNote: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
    quoteWarn: { fontFamily: fonts.semibold, fontSize: 13, color: c.dangerText },
    quoteBtns: { flexDirection: 'row', gap: 10 },
    qWrap: { flex: 1 },
    qBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    qGhost: { backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder },
    qGhostText: { fontFamily: fonts.bold, fontSize: 14, color: c.ink },
    qText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },

    emptyWrap: { alignItems: 'center', marginTop: 48, gap: 10 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft, borderWidth: 1.5, borderColor: c.accentBorder },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    emptySub: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary, textAlign: 'center' },
  });
