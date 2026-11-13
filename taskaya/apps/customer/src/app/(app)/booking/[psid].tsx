import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { lang, tr } from '@/i18n';
import { Address, Area, getAreas, getMyAddresses, getProviderService, ServiceOption } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

const SLOTS = [9, 11, 13, 15, 17, 19];
const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

export default function Booking() {
  const { psid } = useLocalSearchParams<{ psid: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';

  const [svc, setSvc] = useState<ServiceOption | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [addrId, setAddrId] = useState<string | undefined>();
  const [areaId, setAreaId] = useState<string | undefined>();
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [details, setDetails] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    getProviderService(psid).then(setSvc);
    getAreas().then(setAreas);
    getMyAddresses(uid).then((a) => {
      setAddresses(a);
      setAddrId(a[0]?.id ?? 'new');
    });
  }, [psid, uid]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return d;
      }),
    []
  );
  const isPast = (h: number) => dayIdx === 0 && h <= new Date().getHours();
  const dayLabel = (d: Date) => d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

  if (!svc) return <Screen><Text style={styles.muted}>...</Text></Screen>;

  const svcName = lang === 'ar' ? svc.services.name_ar : svc.services.name_en;
  const priceText =
    svc.pricing_model === 'custom_quote'
      ? tr('حسب العرض', 'Custom quote')
      : `${svc.pricing_model === 'starting_from' ? tr('يبدأ من', 'From') + ' ' : ''}${svc.base_price} ${tr('ج.م', 'EGP')}`;
  const note =
    svc.pricing_model === 'fixed'
      ? tr('السعر ثابت', 'Fixed price')
      : svc.pricing_model === 'starting_from'
      ? tr('السعر النهائي يتحدد بعد المعاينة', 'Final price is confirmed after inspection')
      : tr('سيرسل لك مقدم الخدمة عرض سعر للموافقة عليه', 'The provider will send you a quote to approve');

  const submit = async () => {
    setError('');
    if (hour === undefined) return setError(tr('اختر الموعد المناسب', 'Pick a time slot'));
    if (addrId === 'new' && (!areaId || !street.trim())) return setError(tr('أكمل بيانات العنوان', 'Complete the address'));
    setLoading(true);

    let address_id = addrId;
    if (addrId === 'new') {
      const { data, error: addrErr } = await supabase
        .from('addresses')
        .insert({ customer_id: uid, label: tr('عنوان', 'Address'), area_id: areaId, street: street.trim(), building: building.trim() || null })
        .select('id')
        .single();
      if (addrErr || !data) {
        setLoading(false);
        return setError(addrErr?.message ?? 'Error');
      }
      address_id = data.id;
      setAddrId(data.id);
      setAddresses((a) => [{ id: data.id, label: null, street: street.trim(), building: building.trim() || null, area_id: areaId ?? null }, ...a]);
    }

    const when = new Date(days[dayIdx]);
    when.setHours(hour, 0, 0, 0);
    const { error: bookErr } = await supabase.from('bookings').insert({
      customer_id: uid,
      provider_service_id: psid,
      address_id,
      details: details.trim() || null,
      scheduled_at: when.toISOString(),
      idempotency_key: key.current,
    });
    setLoading(false);
    if (bookErr && bookErr.code !== '23505') return setError(bookErr.message);
    router.replace('/orders');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: tr('حجز خدمة', 'Book a service'), headerTitleStyle: { fontFamily: fonts.bold, color: colors.text } }} />
      <Screen>
        <View style={styles.summary}>
          <Text style={styles.svcName}>{svcName}</Text>
          <Text style={styles.muted}>{svc.provider_profiles.business_name}</Text>
          <Text style={styles.price}>{priceText}</Text>
          <Text style={styles.muted}>{note}</Text>
        </View>

        <Text style={styles.section}>{tr('العنوان', 'Address')}</Text>
        {addresses.map((a) => (
          <Chip key={a.id} label={[a.street, a.building].filter(Boolean).join(' - ') || a.label || '-'} on={addrId === a.id} onPress={() => setAddrId(a.id)} block />
        ))}
        <Chip label={tr('+ عنوان جديد', '+ New address')} on={addrId === 'new'} onPress={() => setAddrId('new')} block />
        {addrId === 'new' ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.label}>{tr('المنطقة', 'Area')}</Text>
            <View style={styles.chips}>
              {areas.map((a) => (
                <Chip key={a.id} label={lang === 'ar' ? a.name_ar : a.name_en} on={areaId === a.id} onPress={() => setAreaId(a.id)} />
              ))}
            </View>
            <Input label={tr('الشارع', 'Street')} value={street} onChangeText={setStreet} />
            <Input label={tr('العمارة / الشقة', 'Building / Apartment')} value={building} onChangeText={setBuilding} />
          </View>
        ) : null}

        <Text style={styles.section}>{tr('تفاصيل الطلب', 'Request details')}</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder={tr('اكتب أي تفاصيل تساعد مقدم الخدمة...', 'Add any details for the provider...')}
          placeholderTextColor={colors.textSecondary}
          style={styles.textarea}
        />

        <Text style={styles.section}>{tr('اليوم', 'Day')}</Text>
        <View style={styles.chips}>
          {days.map((d, i) => (
            <Chip key={i} label={dayLabel(d)} on={dayIdx === i} onPress={() => { setDayIdx(i); setHour(undefined); }} />
          ))}
        </View>

        <Text style={styles.section}>{tr('الوقت', 'Time')}</Text>
        <View style={styles.chips}>
          {SLOTS.map((h) => (
            <Chip key={h} label={hourLabel(h)} on={hour === h} disabled={isPast(h)} onPress={() => setHour(h)} />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: spacing.md }} />
        <Button title={tr('إرسال الطلب', 'Submit request')} onPress={submit} loading={loading} />
      </Screen>
    </>
  );
}

function Chip({ label, on, onPress, disabled, block }: { label: string; on: boolean; onPress: () => void; disabled?: boolean; block?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, block && styles.block, on && styles.chipOn, disabled && { opacity: 0.35 }]}
    >
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  svcName: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  price: { fontFamily: fonts.bold, fontSize: 16, color: colors.primaryLight, marginTop: 4 },
  muted: { fontFamily: fonts.regular, color: colors.textSecondary },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  label: { fontFamily: fonts.semibold, color: colors.text, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border },
  block: { borderRadius: radius.md, marginBottom: spacing.sm },
  chipOn: { backgroundColor: 'rgba(47,140,255,0.55)', borderColor: colors.primaryLight },
  chipText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13 },
  textarea: { minHeight: 100, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(7,22,41,0.55)', padding: spacing.md, fontFamily: fonts.regular, fontSize: 16, color: colors.text, textAlignVertical: 'top' },
  error: { fontFamily: fonts.regular, color: colors.danger, marginTop: spacing.md },
});
