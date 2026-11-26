import { Ago } from '@/components/pro/Ago';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { isRTL, lang, tr } from '@/i18n';
import type { ProBooking } from '@/lib/provider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// حالات الطلب من وجهة نظر مقدم الخدمة
export const PRO_STATUS: Record<string, { ar: string; en: string; color: string; icon: IconName }> = {
  pending: { ar: 'طلب جديد', en: 'New request', color: '#D97706', icon: 'flash-outline' },
  accepted: { ar: 'مقبول', en: 'Accepted', color: '#2563EB', icon: 'checkmark-circle-outline' },
  quotation_submitted: { ar: 'بيتجهز العرض', en: 'Preparing quote', color: '#7C3AED', icon: 'document-text-outline' },
  awaiting_customer_approval: { ar: 'مستني موافقة العميل', en: 'Waiting for customer', color: '#7C3AED', icon: 'hourglass-outline' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', color: '#16A34A', icon: 'shield-checkmark-outline' },
  in_progress: { ar: 'جاري التنفيذ', en: 'In progress', color: '#2563EB', icon: 'construct-outline' },
  completed: { ar: 'تم', en: 'Done', color: '#16A34A', icon: 'checkmark-done-outline' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#64748B', icon: 'close-circle-outline' },
  rejected: { ar: 'مرفوض', en: 'Declined', color: '#DC2626', icon: 'ban-outline' },
};
export const NEW_STATUSES = ['pending', 'accepted', 'quotation_submitted'];

export const L = (x: { ar: string; en: string }) => (lang === 'ar' ? x.ar : x.en);
const locale = () => (lang === 'ar' ? 'ar-EG' : 'en-US');
export const money = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString(locale())} ${tr('ج.م', 'EGP')}`;
export const whenOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null;
// أرقام عربي → رقم
export const toNum = (s: string) =>
  Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.').trim());
export const svcOf = (b: ProBooking) => (b.services ? (lang === 'ar' ? b.services.name_ar : b.services.name_en) : '-');
export const custOf = (b: ProBooking) => b.customer?.full_name || tr('عميل', 'Customer');
export const areaOf = (b: ProBooking) => (b.address?.area ? (lang === 'ar' ? b.address.area.name_ar : b.address.area.name_en) : null);
export function addrOf(b: ProBooking) {
  const a = b.address;
  if (!a) return null;
  return [
    areaOf(b),
    a.street,
    a.building && tr(`عمارة ${a.building}`, `Bldg ${a.building}`),
    a.floor && tr(`دور ${a.floor}`, `Floor ${a.floor}`),
    a.apartment && tr(`شقة ${a.apartment}`, `Apt ${a.apartment}`),
  ]
    .filter(Boolean)
    .join(tr('، ', ', '));
}

export function useProStyles() {
  const { c } = useTheme();
  return useMemo(() => makeProStyles(c), [c]);
}

export function StatusBadge({ status }: { status: string }) {
  const s = useProStyles();
  const st = PRO_STATUS[status] ?? { ar: status, en: status, color: '#64748B', icon: 'ellipse-outline' as IconName };
  return (
    <View style={[s.badge, { backgroundColor: st.color + '1A', borderColor: st.color + '55' }]}>
      <Ionicons name={st.icon} size={13} color={st.color} />
      <Text style={[s.badgeText, { color: st.color }]} numberOfLines={1}>{L(st)}</Text>
    </View>
  );
}

export function Btn({
  title,
  icon,
  onPress,
  kind = 'primary',
  busy,
  disabled,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const s = useProStyles();
  const fg = kind === 'ghost' ? c.ink : '#FFFFFF';
  const inner = busy ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={s.btnInner}>
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </View>
  );
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} style={({ pressed }) => [s.btnWrap, (pressed || disabled) && { opacity: 0.8 }]}>
      {kind === 'primary' ? (
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[s.btn, kind === 'ghost' ? s.btnGhost : { backgroundColor: c.dangerText }]}>{inner}</View>
      )}
    </Pressable>
  );
}

// كارت الطلب في القوايم
export function ProCard({ b, onOpen }: { b: ProBooking; onOpen: () => void }) {
  const { c } = useTheme();
  const s = useProStyles();
  const hot = NEW_STATUSES.includes(b.status);
  const when = whenOf(b.scheduled_at);
  const area = areaOf(b);
  const price = b.final_price ?? b.quoted_price;
  return (
    <View style={[s.card, hot && s.cardHot]}>
      <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accent} />
        <View style={s.body}>
          <View style={s.topRow}>
            <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
              <Ionicons name="construct" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={s.title} numberOfLines={2}>{svcOf(b)}</Text>
            <StatusBadge status={b.status} />
          </View>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={16} color={c.iconMuted} />
            <Text style={s.infoText} numberOfLines={1}>{custOf(b)}{area ? ` · ${area}` : ''}</Text>
          </View>
          {when ? (
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={c.iconMuted} />
              <Text style={s.infoText}>{when}</Text>
            </View>
          ) : null}
          {hot ? (
            <View style={s.infoRow}>
              <Ionicons name="time-outline" size={16} color="#D97706" />
              <Text style={[s.infoText, { color: '#D97706' }]}><Ago iso={b.created_at} /></Text>
            </View>
          ) : null}
          <View style={s.divider} />
          <View style={s.bottomRow}>
            <View style={s.numPill}>
              <Text style={s.numText}>#{b.booking_number}</Text>
            </View>
            <Text style={[s.price, price == null && s.priceMuted]}>
              {price != null ? money(price) : tr('محتاج عرض سعر', 'Needs a quote')}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export const makeProStyles = (c: Palette) =>
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
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, maxWidth: 170 },
    badgeText: { fontFamily: fonts.semibold, fontSize: 11.5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
    divider: { height: 1, backgroundColor: c.accentLine, marginVertical: 2 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    numPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder },
    numText: { fontFamily: fonts.bold, fontSize: 12.5, color: c.accentText, letterSpacing: 0.5 },
    price: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText },
    priceMuted: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary },

    // النافذة
    backdrop: { backgroundColor: 'rgba(5,15,35,0.5)' },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
    sheet: {
      width: '100%',
      maxWidth: 440,
      maxHeight: '88%',
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
    dLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, minWidth: 74 },
    dValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.ink, textAlign: isRTL ? 'left' : 'right' },
    reason: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: c.dangerBg, borderWidth: 1, borderColor: c.dangerBorder },
    reasonText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: c.dangerText },
    box: { padding: 14, borderRadius: 16, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder, gap: 10 },
    boxHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    boxTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: c.accentText },
    boxText: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
    input: {
      backgroundColor: c.fieldBg,
      borderWidth: 1,
      borderColor: c.fieldBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      minHeight: 48,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: c.ink,
      textAlign: isRTL ? 'right' : 'left',
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder },
    chipText: { fontFamily: fonts.semibold, fontSize: 12.5, color: c.ink },
    err: { fontFamily: fonts.semibold, fontSize: 13, color: c.dangerText },
    actions: { gap: 10 },
    btnRow: { flexDirection: 'row', gap: 10 },
    btnWrap: { flex: 1 },
    btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    btnGhost: { backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnText: { fontFamily: fonts.bold, fontSize: 14.5 },

    // فلاتر + فاضي
    filters: { gap: 8, paddingBottom: 12 },
    filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.chipBorder },
    filterOn: { backgroundColor: c.accent, borderColor: c.accent },
    filterText: { fontFamily: fonts.semibold, fontSize: 13, color: c.ink },
    filterTextOn: { color: '#FFFFFF' },
    emptyWrap: { alignItems: 'center', marginTop: 48, gap: 10 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft, borderWidth: 1.5, borderColor: c.accentBorder },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 17, color: c.text },
    emptySub: { fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary, textAlign: 'center' },

    // الرئيسية + المحفظة
    panel: { padding: 16, borderRadius: 20, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.accentBorder, marginBottom: spacing.md, gap: 8 },
    panelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    panelTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, color: c.text },
    panelSub: { fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
    stats: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
    stat: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.accentBorder, gap: 6 },
    statNum: { fontFamily: fonts.bold, fontSize: 22, color: c.text },
    statLabel: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
    section: { fontFamily: fonts.bold, fontSize: 16, color: c.text, marginBottom: 10, marginTop: 4 },
    hero: { borderRadius: 24, padding: 20, gap: 6, marginBottom: spacing.md, overflow: 'hidden' },
    heroLabel: { fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
    heroNum: { fontFamily: fonts.bold, fontSize: 32, color: '#FFFFFF' },
    heroSub: { fontFamily: fonts.regular, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
    lRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.accentLine },
    lTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.ink },
    lSub: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
    plus: { fontFamily: fonts.bold, fontSize: 14.5, color: '#DC2626' },
    minus: { fontFamily: fonts.bold, fontSize: 14.5, color: '#16A34A' },
  });
