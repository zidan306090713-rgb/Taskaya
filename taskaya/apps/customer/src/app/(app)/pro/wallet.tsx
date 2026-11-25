import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { money, useProStyles } from '@/components/pro/ProUI';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { lang, tr } from '@/i18n';
import { getMyLedger, LedgerRow } from '@/lib/provider';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const KIND: Record<string, { ar: string; en: string }> = {
  commission: { ar: 'عمولة حجز كاش', en: 'Cash booking fee' },
  online_earning: { ar: 'مستحقاتك من حجز أونلاين', en: 'Online booking earning' },
  settlement: { ar: 'سدّدت لتاسكاية', en: 'You paid TASKAYA' },
  payout: { ar: 'تاسكاية حوّلتلك', en: 'TASKAYA paid you' },
  adjustment: { ar: 'تسوية', en: 'Adjustment' },
};
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ProWallet() {
  const { c } = useTheme();
  const s = useProStyles();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [rows, setRows] = useState<LedgerRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (uid) getMyLedger(uid).then(setRows);
    }, [uid]),
  );

  const balance = (rows ?? []).reduce((a, r) => a + r.amount, 0);
  const owes = balance > 0.004;
  const credit = balance < -0.004;

  return (
    <Screen hero title={tr('المحفظة', 'Wallet')}>
      <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <Text style={s.heroLabel}>{owes ? tr('عليك لتاسكاية', 'You owe TASKAYA') : credit ? tr('ليك عند تاسكاية', 'TASKAYA owes you') : tr('رصيدك', 'Your balance')}</Text>
        <Text style={s.heroNum}>{rows ? money(Math.abs(balance)) : '…'}</Text>
        <Text style={s.heroSub}>
          {tr(
            'الحجوزات الكاش بتتسجل عليك عمولتها، والأونلاين بيتسجل ليك صافيها — وأي مديونية بتتخصم من مستحقاتك.',
            'Cash bookings add the fee to what you owe; online bookings add your net earning — debts are deducted first.',
          )}
        </Text>
      </LinearGradient>

      <Text style={s.section}>{tr('كشف الحساب', 'Statement')}</Text>
      {rows === null ? <ListSkeleton rows={4} height={58} /> : null}
      {rows !== null && rows.length === 0 ? (
        <View style={s.panel}>
          <Text style={s.panelSub}>{tr('لسه مفيش حركات.', 'No transactions yet.')}</Text>
        </View>
      ) : null}
      {rows && rows.length ? (
        <View style={s.panel}>
          {rows.map((r) => {
            const k = KIND[r.kind] ?? { ar: r.kind, en: r.kind };
            return (
              <View key={r.id} style={s.lRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.lTitle}>{lang === 'ar' ? k.ar : k.en}</Text>
                  <Text style={s.lSub}>
                    {dateOf(r.created_at)}
                    {r.booking ? ` · #${r.booking.booking_number}` : ''}
                    {r.note ? ` · ${r.note}` : ''}
                  </Text>
                </View>
                <Text style={r.amount > 0 ? s.plus : s.minus}>
                  {r.amount > 0 ? '+' : '−'} {money(Math.abs(r.amount))}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
