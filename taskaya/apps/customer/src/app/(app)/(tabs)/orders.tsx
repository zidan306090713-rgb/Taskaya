import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { Booking, getMyBookings } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

const STATUS: Record<string, { ar: string; en: string; color: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', color: '#F59E0B' },
  accepted: { ar: 'تم القبول', en: 'Accepted', color: '#60A5FA' },
  quotation_submitted: { ar: 'تم إرسال عرض السعر', en: 'Quote sent', color: '#A78BFA' },
  awaiting_customer_approval: { ar: 'بانتظار موافقتك', en: 'Awaiting your approval', color: '#A78BFA' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed', color: '#4ADE80' },
  in_progress: { ar: 'جاري التنفيذ', en: 'In progress', color: '#60A5FA' },
  completed: { ar: 'مكتمل', en: 'Completed', color: '#4ADE80' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#94A3B8' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: '#F87171' },
};

const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

export default function Orders() {
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (uid) getMyBookings(uid).then(setList);
    }, [uid])
  );

  return (
    <Screen title={tr('طلباتي', 'My Orders')}>
      {list.length === 0 ? <Text style={styles.empty}>{tr('لا توجد طلبات بعد', 'No orders yet')}</Text> : null}
      {list.map((b) => {
        const st = STATUS[b.status] ?? { ar: b.status, en: b.status, color: colors.textSecondary };
        const price = b.final_price ?? b.quoted_price;
        return (
          <GlassCard key={b.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{b.services ? (lang === 'ar' ? b.services.name_ar : b.services.name_en) : '-'}</Text>
              <View style={[styles.badge, { backgroundColor: st.color + '22' }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{lang === 'ar' ? st.ar : st.en}</Text>
              </View>
            </View>
            <Text style={styles.muted}>{b.provider_profiles?.business_name ?? tr('بانتظار ترشيح مقدم خدمة', 'Awaiting provider match')}</Text>
            {b.scheduled_at ? (
              <Text style={styles.muted}>
                {new Date(b.scheduled_at).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.muted}>#{b.booking_number}</Text>
              <Text style={styles.price}>{price != null ? `${price} ${tr('ج.م', 'EGP')}` : tr('السعر لم يحدد بعد', 'Price not set yet')}</Text>
            </View>
          </GlassCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: 48 },
  card: { padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flexShrink: 1 },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary, fontSize: 13 },
  price: { fontFamily: fonts.bold, color: colors.primaryLight, fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
});
