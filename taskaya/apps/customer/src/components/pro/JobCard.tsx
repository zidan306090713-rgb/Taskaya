import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ago } from '@/components/pro/Ago';
import { areaOf, custOf, IconName, money, NEW_STATUSES, StatusBadge, svcOf, whenOf } from '@/components/pro/ProUI';
import type { Mode } from '@/components/pro/RequestSheet';
import { tr } from '@/i18n';
import { ProBooking, setProStatus } from '@/lib/provider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type Kind = 'primary' | 'ghost' | 'danger';
const TILE_ICON: Record<string, IconName> = { awaiting_customer_approval: 'hourglass', confirmed: 'calendar', in_progress: 'construct' };

function Action({ icon, label, a11y, kind = 'ghost', grow, busy, onPress }: { icon: IconName; label?: string; a11y?: string; kind?: Kind; grow?: boolean; busy?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const st = useMemo(() => makeStyles(c), [c]);
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? c.dangerText : c.accentText;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label ?? a11y}
      style={({ pressed }) => [st.act, grow && st.grow, !label && st.actIcon, kind === 'ghost' && st.actGhost, kind === 'danger' && st.actDanger, pressed && { opacity: 0.85 }]}
    >
      {kind === 'primary' ? <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Ionicons name={icon} size={17} color={fg} />}
      {label ? <Text style={[st.actText, { color: fg }]} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}

/** كارت طلب في رئيسية مقدم الخدمة: نفس روح كارت العميل + زراير سريعة تحت */
export function JobCard({ b, onOpen, onChanged }: { b: ProBooking; onOpen: (mode: Mode) => void; onChanged: () => void }) {
  const { c } = useTheme();
  const st = useMemo(() => makeStyles(c), [c]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const hot = NEW_STATUSES.includes(b.status);
  const custom = b.pricing_model === 'custom_quote';
  const price = b.final_price ?? b.quoted_price;
  const when = whenOf(b.scheduled_at);
  const area = areaOf(b);
  const phone = b.customer?.phone;

  // قبول / بدء التنفيذ: من غير ما نفتح أي حاجة
  const quick = async (status: 'confirmed' | 'in_progress') => {
    setErr('');
    setBusy(true);
    const e = await setProStatus(b.id, status);
    setBusy(false);
    if (e) setErr(e);
    else onChanged();
  };

  return (
    <View style={st.card}>
      <Pressable onPress={() => onOpen(null)} accessibilityRole="button" accessibilityLabel={svcOf(b)} style={({ pressed }) => [st.row, pressed && { opacity: 0.9 }]}>
        <View style={st.tile}>
          <LinearGradient colors={hot ? c.gradient : c.placeholderGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, st.center]}>
            <Ionicons name={hot ? 'flash' : (TILE_ICON[b.status] ?? 'construct')} size={28} color={hot ? '#FFFFFF' : c.accentText} />
          </LinearGradient>
          <View style={st.num}>
            <Text style={st.numText}>#{b.booking_number}</Text>
          </View>
        </View>
        <View style={st.info}>
          <View>
            <Text style={st.name} numberOfLines={1}>{svcOf(b)}</Text>
            <Text style={st.desc} numberOfLines={1}>{custOf(b)}{area ? ` · ${area}` : ''}</Text>
            {hot ? (
              <Text style={[st.desc, st.ago]} numberOfLines={1}><Ago iso={b.created_at} /></Text>
            ) : when ? (
              <Text style={st.desc} numberOfLines={1}>{when}</Text>
            ) : null}
          </View>
          <View style={st.bottom}>
            <Text style={st.price} numberOfLines={1}>{price != null ? money(price) : tr('محتاج عرض سعر', 'Needs a quote')}</Text>
            <StatusBadge status={b.status} />
          </View>
        </View>
      </Pressable>

      <View style={st.actions}>
        {hot && !custom ? <Action icon="checkmark-circle" label={tr('قبول', 'Accept')} kind="primary" grow busy={busy} onPress={() => void quick('confirmed')} /> : null}
        {hot ? (
          <Action icon="pricetag" label={custom ? tr('إرسال عرض', 'Send quote') : tr('سعر تاني', 'New price')} kind={custom ? 'primary' : 'ghost'} grow={custom} onPress={() => onOpen('quote')} />
        ) : null}
        {hot ? <Action icon="close-circle" label={tr('رفض', 'Decline')} kind="danger" onPress={() => onOpen('reject')} /> : null}
        {b.status === 'confirmed' ? <Action icon="play" label={tr('بدء التنفيذ', 'Start work')} kind="primary" grow busy={busy} onPress={() => void quick('in_progress')} /> : null}
        {b.status === 'in_progress' ? <Action icon="checkmark-done" label={tr('إنهاء التنفيذ', 'Finish job')} kind="primary" grow onPress={() => onOpen('finish')} /> : null}
        {b.status === 'awaiting_customer_approval' ? (
          <Text style={[st.desc, st.grow, { marginTop: 0 }]} numberOfLines={2}>
            {tr(`مستني رد العميل على ${money(b.quoted_price)}`, `Waiting for the customer on ${money(b.quoted_price)}`)}
          </Text>
        ) : null}
        {b.status === 'awaiting_customer_approval' ? <Action icon="close-circle" label={tr('إلغاء', 'Cancel')} kind="danger" onPress={() => onOpen('cancel')} /> : null}
        {phone ? <Action icon="call" a11y={tr('اتصل بالعميل', 'Call customer')} onPress={() => void Linking.openURL(`tel:+${phone}`)} /> : null}
      </View>
      {err ? <Text style={st.err}>{err}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      padding: 10,
      marginBottom: 12,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.accentBorder,
      shadowColor: c.shadow,
      shadowOpacity: c.isDark ? 0.22 : 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 0,
    },
    row: { flexDirection: 'row', gap: 12 },
    tile: { width: 92, height: 104, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fieldBg },
    center: { alignItems: 'center', justifyContent: 'center' },
    num: { position: 'absolute', bottom: 7, end: 7, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.card },
    numText: { fontFamily: fonts.semibold, fontSize: 11.5, color: c.ink },
    info: { flex: 1, paddingVertical: 4, justifyContent: 'space-between' },
    name: { fontFamily: fonts.bold, fontSize: 16, color: c.text },
    desc: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: c.textSecondary, marginTop: 3 },
    ago: { fontFamily: fonts.semibold, color: '#D97706' },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
    price: { fontFamily: fonts.bold, fontSize: 15, color: c.accentText, flexShrink: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.accentBorder },
    act: { height: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
    actGhost: { backgroundColor: c.fieldBg },
    actDanger: { backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2' },
    actIcon: { width: 40, paddingHorizontal: 0 },
    actText: { fontFamily: fonts.semibold, fontSize: 13 },
    grow: { flex: 1 },
    err: { fontFamily: fonts.regular, fontSize: 12.5, color: c.dangerText, marginTop: 8 },
  });
