import { useOnPush } from '@/lib/push';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { isRTL, lang, tr } from '@/i18n';
import { answerQuote, Booking, getMyBookings } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STATUS: Record<string, { ar: string; en: string; color: string; icon: IconName }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', color: '#D97706', icon: 'time-outline' },
  accepted: { ar: 'تم القبول', en: 'Accepted', color: '#2563EB', icon: 'checkmark-circle-outline' },
  quotation_submitted: { ar: 'بانتظار عرض السعر', en: 'Preparing quote', color: '#7C3AED', icon: 'document-text-outline' },
  awaiting_customer_approval: { ar: 'بانتظار موافقتك', en: 'Awaiting your approval', color: '#7C3AED', icon: 'hourglass-outline' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', color: '#16A34A', icon: 'shield-checkmark-outline' },
  in_progress: { ar: 'جاري التنفيذ', en: 'In progress', color: '#2563EB', icon: 'construct-outline' },
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
const locale = () => (lang === 'ar' ? 'ar-EG' : 'en-US');
const EGP = () => tr('ج.م', 'EGP');
const L = (x: { ar: string; en: string }) => (lang === 'ar' ? x.ar : x.en);
const statusOf = (s: string, fallback: string) => STATUS[s] ?? { ar: s, en: s, color: fallback, icon: 'ellipse-outline' as IconName };
const whenOf = (b: Booking) =>
  b.scheduled_at
    ? new Date(b.scheduled_at).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;
const titleOf = (b: Booking) => (b.services ? (lang === 'ar' ? b.services.name_ar : b.services.name_en) : '-');
const providerOf = (b: Booking) => b.provider_profiles?.business_name ?? tr('بانتظار ترشيح مقدم خدمة', 'Awaiting provider match');

function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return {
    opacity: Platform.OS === 'android' ? 1 : v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };
}

function Badge({ status }: { status: string }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const st = statusOf(status, c.textSecondary);
  return (
    <View style={[styles.badge, { backgroundColor: st.color + '1A', borderColor: st.color + '55' }]}>
      <Ionicons name={st.icon} size={13} color={st.color} />
      <Text style={[styles.badgeText, { color: st.color }]} numberOfLines={1}>{L(st)}</Text>
    </View>
  );
}

// ===== الكارت في القايمة (بيفتح النافذة) =====
function OrderCard({ b, index, onOpen }: { b: Booking; index: number; onOpen: () => void }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const anim = useEntrance(Math.min(index, 6) * 80);
  const awaiting = b.status === AWAITING;
  const price = b.final_price ?? b.quoted_price;
  const when = whenOf(b);

  return (
    <Animated.View style={[styles.card, awaiting && styles.cardHot, anim]}>
      <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
              <Ionicons name="construct" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.title} numberOfLines={2}>{titleOf(b)}</Text>
            <Badge status={b.status} />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={c.iconMuted} />
            <Text style={styles.infoText} numberOfLines={1}>{providerOf(b)}</Text>
          </View>
          {when ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={c.iconMuted} />
              <Text style={styles.infoText}>{when}</Text>
            </View>
          ) : null}

          {awaiting ? (
            <View style={styles.hint}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.accentText} />
              <Text style={styles.hintText}>{tr('عرض سعر جديد مستني ردك', 'A new price quote needs your reply')}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={c.accentText} />
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.bottomRow}>
            <View style={styles.numPill}>
              <Text style={styles.numText}>#{b.booking_number}</Text>
            </View>
            <Text style={[styles.price, price == null && styles.priceMuted]}>
              {price != null ? `${price} ${EGP()}` : tr('السعر لم يحدد بعد', 'Price not set yet')}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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
                <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
                  <Ionicons name="construct" size={20} color="#FFFFFF" />
                </LinearGradient>
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
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.accentText} />
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

export default function Orders() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Booking[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // الحجوزات اللي مستنية ردك تظهر الأول
  const load = useCallback((force = false) => {
    if (!uid) return;
    getMyBookings(uid, force).then((l) =>
      setList([...l].sort((a, b) => Number(b.status === AWAITING) - Number(a.status === AWAITING))),
    );
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = list?.find((b) => b.id === openId) ?? null;
  // إشعار عن حجز وصل والتطبيق مفتوح → "طلباتي" تتحدث على طول
  useOnPush(useCallback(() => load(true), [load]));

  return (
    <Screen title={tr('طلباتي', 'My Orders')}>
      {list === null ? <ListSkeleton rows={3} height={160} /> : list.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={30} color={c.accentText} />
          </View>
          <Text style={styles.emptyTitle}>{tr('لا توجد طلبات بعد', 'No orders yet')}</Text>
          <Text style={styles.emptySub}>{tr('ابدأ بحجز خدمتك الأولى من الرئيسية', 'Book your first service from Home')}</Text>
        </View>
      ) : null}
      {(list ?? []).map((b, i) => (
        <OrderCard key={b.id} b={b} index={i} onOpen={() => setOpenId(b.id)} />
      ))}
      {open ? <OrderSheet b={open} onClose={() => setOpenId(null)} onChanged={load} /> : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderRadius: 22,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.24 : 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 0,
    },
    cardHot: { borderWidth: 2, borderColor: c.accent },
    accent: { height: 4 },
    body: { padding: 16, gap: 10 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.55)',
    },
    title: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: c.text },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      maxWidth: 170,
    },
    badgeText: { fontFamily: fonts.semibold, fontSize: 11.5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    hintText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: c.accentText },
    divider: { height: 1, backgroundColor: c.accentLine, marginVertical: 2 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    numPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    numText: { fontFamily: fonts.bold, fontSize: 12.5, color: c.accentText, letterSpacing: 0.5 },
    price: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
    priceMuted: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary },

    // ===== النافذة =====
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
    sheetBody: { padding: 18, gap: 14 },
    sheetTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: c.text },
    close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    details: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.fieldBg, borderWidth: 1, borderColor: c.fieldBorder },
    dRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    dLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, minWidth: 80 },
    dValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.ink, textAlign: isRTL ? 'left' : 'right' },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.dangerBg,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    reasonText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: c.dangerText },

    quoteBox: { padding: 14, borderRadius: 16, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder, gap: 10 },
    quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    quoteTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: c.accentText },
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

    emptyWrap: { alignItems: 'center', marginTop: 56, gap: 10 },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
    },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    emptySub: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary, textAlign: 'center' },
  });
