import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, IconName, L, money, useProStyles } from '@/components/pro/ProUI';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { tr } from '@/i18n';
import { durOf, getMyServices, MyService, nameOf, PRICING, REVIEW, reviewOf, toggleService } from '@/lib/proServices';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

const priceOf = (r: MyService) => {
  if (r.pricing_model === 'custom_quote') return r.base_price ? tr(`حوالي ${money(r.base_price)}`, `About ${money(r.base_price)}`) : L(PRICING.custom_quote);
  if (r.pricing_model === 'starting_from') return tr(`يبدأ من ${money(r.base_price)}`, `From ${money(r.base_price)}`);
  return money(r.base_price);
};

export default function ProServices() {
  const s = useProStyles();
  const { c } = useTheme();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [rows, setRows] = useState<MyService[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (uid) getMyServices(uid).then(setRows);
    }, [uid]),
  );

  async function toggle(r: MyService) {
    setBusy(r.id);
    setErr(null);
    const e = await toggleService(r.id, !r.is_active);
    if (e) setErr(e);
    setRows(await getMyServices(uid, true));
    setBusy(null);
  }

  const pending = (rows ?? []).filter((r) => r.review_status === 'pending').length;
  const subtitle = rows
    ? tr(`${rows.length} خدمة${pending ? ` · ${pending} في المراجعة` : ''}`, `${rows.length} services${pending ? ` · ${pending} in review` : ''}`)
    : undefined;
  const add = () => router.push('/service-form');

  return (
    <Screen hero title={tr('خدماتي', 'My services')} subtitle={subtitle}>
      <Btn title={tr('إضافة خدمة', 'Add a service')} icon="add-circle-outline" onPress={add} />
      <View style={{ height: 14 }} />
      {err ? <Text style={[s.err, { marginBottom: 10 }]}>{err}</Text> : null}
      {rows === null ? <ListSkeleton rows={3} height={150} /> : null}
      {rows !== null && rows.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="briefcase-outline" size={32} color={c.accent} />
          </View>
          <Text style={s.emptyTitle}>{tr('لسه مضفتش خدمات', 'No services yet')}</Text>
          <Text style={s.emptySub}>
            {tr('ضيف أول خدمة، وبعد ما الإدارة توافق هتظهر للعملاء ويبدأوا يحجزوا.', 'Add your first service. Once approved, customers can book it.')}
          </Text>
        </View>
      ) : null}
      {(rows ?? []).map((r) => (
        <ServiceCard
          key={r.id}
          r={r}
          busy={busy === r.id}
          onEdit={() => router.push({ pathname: '/service-form', params: { id: r.id } })}
          onToggle={() => toggle(r)}
        />
      ))}
    </Screen>
  );
}

function ServiceCard({ r, busy, onEdit, onToggle }: { r: MyService; busy: boolean; onEdit: () => void; onToggle: () => void }) {
  const { c } = useTheme();
  const s = useProStyles();
  const st = useMemo(() => makeStyles(c), [c]);
  const k = reviewOf(r);
  const rv = REVIEW[k];
  const sub = r.service?.sub;
  const dur = durOf(r.estimated_duration_minutes);
  return (
    <View style={[s.card, k === 'pending' && { borderColor: rv.color + '88' }, k === 'paused' && { opacity: 0.85 }]}>
      <View style={s.body}>
        <View style={s.topRow}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
            <Ionicons name="briefcase" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.title} numberOfLines={2}>{nameOf(r.service) || r.title || '—'}</Text>
            {sub ? <Text style={s.lSub} numberOfLines={1}>{[nameOf(sub.cat), nameOf(sub)].filter(Boolean).join(' · ')}</Text> : null}
          </View>
          <View style={[s.badge, { backgroundColor: rv.color + '1A', borderColor: rv.color + '55' }]}>
            <Ionicons name={rv.icon as IconName} size={13} color={rv.color} />
            <Text style={[s.badgeText, { color: rv.color }]}>{L(rv)}</Text>
          </View>
        </View>

        <View style={st.meta}>
          <View style={st.pill}>
            <Ionicons name="pricetag-outline" size={13} color={c.accentText} />
            <Text style={st.pillText}>{priceOf(r)}</Text>
          </View>
          {dur ? (
            <View style={st.pill}>
              <Ionicons name="time-outline" size={13} color={c.accentText} />
              <Text style={st.pillText}>{dur}</Text>
            </View>
          ) : null}
        </View>

        {r.description ? <Text style={s.boxText} numberOfLines={2}>{r.description}</Text> : null}

        {k === 'rejected' ? (
          <View style={s.reason}>
            <Ionicons name="alert-circle-outline" size={18} color={c.dangerText} />
            <Text style={s.reasonText}>
              {r.review_note ? tr(`السبب: ${r.review_note}`, `Reason: ${r.review_note}`) : tr('اترفضت من غير سبب مكتوب', 'Rejected without a written reason')}
            </Text>
          </View>
        ) : null}
        {k === 'pending' ? (
          <View style={st.hint}>
            <Ionicons name="notifications-outline" size={15} color={c.textSecondary} />
            <Text style={st.hintText}>{tr('الإدارة بتراجعها، وهيوصلك إشعار أول ما تتقبل.', "TASKAYA is reviewing it. You'll get a notification.")}</Text>
          </View>
        ) : null}

        <View style={s.btnRow}>
          <Btn kind="ghost" icon="create-outline" title={k === 'rejected' ? tr('تعديل وإعادة إرسال', 'Edit and resubmit') : tr('تعديل', 'Edit')} onPress={onEdit} />
          {k === 'approved' || k === 'paused' ? (
            <Btn
              kind="ghost"
              icon={k === 'paused' ? 'play-outline' : 'pause-outline'}
              title={k === 'paused' ? tr('تشغيل', 'Resume') : tr('إيقاف مؤقت', 'Pause')}
              busy={busy}
              onPress={onToggle}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder },
    pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: c.accentText },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    hintText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: c.textSecondary },
  });
