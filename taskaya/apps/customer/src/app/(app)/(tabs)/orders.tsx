import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { Booking, getMyBookings } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const STATUS: Record<string, { ar: string; en: string; color: string; icon: IconName }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', color: '#D97706', icon: 'time-outline' },
  accepted: { ar: 'تم القبول', en: 'Accepted', color: '#2563EB', icon: 'checkmark-circle-outline' },
  quotation_submitted: { ar: 'تم إرسال عرض السعر', en: 'Quote sent', color: '#7C3AED', icon: 'document-text-outline' },
  awaiting_customer_approval: { ar: 'بانتظار موافقتك', en: 'Awaiting your approval', color: '#7C3AED', icon: 'hourglass-outline' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', color: '#16A34A', icon: 'shield-checkmark-outline' },
  in_progress: { ar: 'جاري التنفيذ', en: 'In progress', color: '#2563EB', icon: 'construct-outline' },
  completed: { ar: 'مكتمل', en: 'Completed', color: '#16A34A', icon: 'checkmark-done-outline' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#64748B', icon: 'close-circle-outline' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: '#DC2626', icon: 'ban-outline' },
};

const locale = () => (lang === 'ar' ? 'ar-EG' : 'en-US');

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

function OrderCard({ b, index }: { b: Booking; index: number }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const anim = useEntrance(Math.min(index, 6) * 80);
  const st = STATUS[b.status] ?? { ar: b.status, en: b.status, color: c.textSecondary, icon: 'ellipse-outline' as IconName };
  const price = b.final_price ?? b.quoted_price;
  const title = b.services ? (lang === 'ar' ? b.services.name_ar : b.services.name_en) : '-';
  const provider = b.provider_profiles?.business_name ?? tr('بانتظار ترشيح مقدم خدمة', 'Awaiting provider match');
  const when = b.scheduled_at
    ? new Date(b.scheduled_at).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <Animated.View style={[styles.card, anim]}>
      <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
            <Ionicons name="construct" size={20} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: st.color + '1A', borderColor: st.color + '55' }]}>
            <Ionicons name={st.icon} size={13} color={st.color} />
            <Text style={[styles.badgeText, { color: st.color }]} numberOfLines={1}>{lang === 'ar' ? st.ar : st.en}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color={c.iconMuted} />
          <Text style={styles.infoText} numberOfLines={1}>{provider}</Text>
        </View>
        {when ? (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={c.iconMuted} />
            <Text style={styles.infoText}>{when}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.numPill}>
            <Text style={styles.numText}>#{b.booking_number}</Text>
          </View>
          <Text style={[styles.price, price == null && styles.priceMuted]}>
            {price != null ? `${price} ${tr('ج.م', 'EGP')}` : tr('السعر لم يحدد بعد', 'Price not set yet')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function Orders() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Booking[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (uid) getMyBookings(uid).then(setList);
    }, [uid])
  );

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
        <OrderCard key={b.id} b={b} index={i} />
      ))}
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
      maxWidth: 150,
    },
    badgeText: { fontFamily: fonts.semibold, fontSize: 11.5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: c.textSecondary },
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
