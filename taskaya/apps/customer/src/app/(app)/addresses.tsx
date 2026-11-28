import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addrNav, KINDS } from '@/components/AddressesSheet';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { isRTL, layoutRTL, lang, tr } from '@/i18n';
import { Address, Area, deleteAddress, getAreas, getMyAddresses, peekAreas, saveAddress } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' } as any) : null;

// صفحة إضافة / تعديل عنوان واحد (القايمة نفسها بقت في نافذة AddressesSheet)
export default function AddressPage() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [areas, setAreas] = useState<Area[]>(() => peekAreas() ?? []);
  const [initial, setInitial] = useState<Address | null | undefined>(id ? undefined : null);
  const [headH, setHeadH] = useState(150);

  useEffect(() => {
    getAreas()
      .then(setAreas)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || !uid) return;
    getMyAddresses(uid)
      .then((l) => setInitial(l.find((a) => a.id === id) ?? null))
      .catch(() => setInitial(null));
  }, [id, uid]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile' as any));
  const done = () => {
    if (from === 'sheet') addrNav.reopen = true;
    goBack();
  };

  const align = layoutRTL() ? 'right' : 'left';
  const title = id ? tr('تعديل العنوان', 'Edit address') : tr('عنوان جديد', 'New address');

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: headH + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        >
          {initial === undefined ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : (
            <AddressForm uid={uid} areas={areas} initial={initial} onDone={done} onCancel={goBack} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* الهيدر الزجاجي العائم */}
      <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={[styles.head, WEB_FROST, { paddingTop: insets.top + 12 }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.74 }]} />
        <View style={styles.glow} />
        <View style={styles.glow2} />
        <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
        <View style={styles.headRow}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={tr('رجوع', 'Back')} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headSmall, { textAlign: align }]}>{tr('عناويني', 'My addresses')}</Text>
            <Text style={[styles.headTitle, { textAlign: align }]}>{title}</Text>
          </View>
          <View style={styles.iconRing}>
            <View style={styles.iconIn}>
              <Ionicons name="location" size={24} color={c.accent} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View
      style={[
        styles.glass,
        WEB_FROST,
        {
          backgroundColor: c.isDark
            ? Platform.OS === 'android' ? 'rgba(21,26,36,0.88)' : 'rgba(21,26,36,0.55)'
            : Platform.OS === 'android' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
          borderColor: c.isDark ? 'rgba(255,255,255,0.12)' : Platform.OS === 'android' ? c.accentBorder : 'rgba(255,255,255,0.9)',
        },
      ]}
    >
      {Platform.OS === 'ios' ? <BlurView intensity={30} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.secHead}>
        <View style={styles.secIcon}>
          <Ionicons name={icon} size={16} color={c.accentText} />
        </View>
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function AddressForm({
  uid,
  areas,
  initial,
  onDone,
  onCancel,
}: {
  uid: string;
  areas: Area[];
  initial: Address | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [kind, setKind] = useState(initial?.label ?? 'home');
  const [areaId, setAreaId] = useState<string | null>(initial?.area_id ?? null);
  const [street, setStreet] = useState(initial?.street ?? '');
  const [building, setBuilding] = useState(initial?.building ?? '');
  const [floor, setFloor] = useState(initial?.floor ?? '');
  const [apartment, setApartment] = useState(initial?.apartment ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');

  const clean = (v: string) => v.trim() || null;

  const save = async () => {
    setError('');
    if (!areaId) return setError(tr('اختار المنطقة', 'Choose your area'));
    if (!street.trim()) return setError(tr('اكتب اسم الشارع', 'Enter the street'));
    setBusy('save');
    const { error: e } = await saveAddress(
      uid,
      {
        label: kind,
        area_id: areaId,
        street: street.trim(),
        building: clean(building),
        floor: clean(floor),
        apartment: clean(apartment),
        notes: clean(notes),
      },
      initial?.id
    );
    setBusy(null);
    if (e) return setError(tr('تعذّر الحفظ، حاول تاني', 'Could not save, please try again'));
    onDone();
  };

  const remove = async () => {
    if (!initial) return;
    setError('');
    setBusy('delete');
    const { error: e } = await deleteAddress(uid, initial.id);
    setBusy(null);
    if (e) {
      // 23503 = العنوان مرتبط بطلبات قديمة
      return setError(
        e.code === '23503'
          ? tr('العنوان ده مستخدم في طلبات، مينفعش يتمسح', 'This address is used in orders and cannot be deleted')
          : tr('تعذّر المسح، حاول تاني', 'Could not delete, please try again')
      );
    }
    onDone();
  };

  return (
    <>
      <Section icon="pricetag-outline" title={tr('نوع العنوان', 'Address type')}>
        <View style={styles.chips}>
          {KINDS.map((k) => {
            const on = kind === k.key;
            return (
              <Pressable key={k.key} onPress={() => setKind(k.key)} style={[styles.chip, on && styles.chipOn]}>
                <Ionicons name={k.icon} size={16} color={on ? '#FFFFFF' : c.accentText} />
                <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{tr(k.ar, k.en)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section icon="map-outline" title={tr('المنطقة', 'Area')}>
        <View style={styles.chips}>
          {areas.length === 0 ? <ActivityIndicator color={c.accent} /> : null}
          {areas.map((a) => {
            const on = areaId === a.id;
            return (
              <Pressable key={a.id} onPress={() => setAreaId(a.id)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{lang === 'ar' ? a.name_ar : a.name_en}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section icon="home-outline" title={tr('تفاصيل العنوان', 'Address details')}>
        <PremiumInput labelInside label={tr('الشارع', 'Street')} icon="trail-sign-outline" value={street} onChangeText={setStreet} />
        <PremiumInput labelInside label={tr('رقم العمارة', 'Building')} icon="business-outline" value={building} onChangeText={setBuilding} />
        <View style={styles.twoCols}>
          <View style={styles.flex}>
            <PremiumInput labelInside label={tr('الدور', 'Floor')} icon="layers-outline" value={floor} onChangeText={setFloor} keyboardType="number-pad" />
          </View>
          <View style={styles.flex}>
            <PremiumInput labelInside label={tr('الشقة', 'Apt')} icon="key-outline" value={apartment} onChangeText={setApartment} />
          </View>
        </View>
        <PremiumInput
          labelInside
          label={tr('علامة مميزة / ملاحظات للفني', 'Landmark / notes for the technician')}
          icon="chatbox-ellipses-outline"
          value={notes}
          onChangeText={setNotes}
        />
      </Section>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={!!busy} style={({ pressed }) => [styles.btn, styles.flex, styles.btnGhost, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.btnText, { color: c.ink }]}>{tr('إلغاء', 'Cancel')}</Text>
        </Pressable>
        <Pressable onPress={save} disabled={!!busy} style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            {busy === 'save' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('حفظ', 'Save')}</Text>}
          </LinearGradient>
        </Pressable>
      </View>

      {initial ? (
        <Pressable onPress={remove} disabled={!!busy} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}>
          {busy === 'delete' ? (
            <ActivityIndicator color={c.dangerText} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={c.dangerText} />
              <Text style={[styles.btnText, { color: c.dangerText }]}>{tr('مسح العنوان', 'Delete address')}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    head: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden', paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', pointerEvents: 'none' },
    glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, top: -120, left: -80, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
    glow2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: -90, right: -50, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
    headSmall: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
    headTitle: { fontFamily: fonts.bold, fontSize: 21, color: '#FFFFFF' },
    iconRing: { padding: 2, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
    iconIn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

    glass: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12, overflow: 'hidden' },
    secHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    secIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    secTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: c.text },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)',
      borderWidth: 1.5,
      borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : c.accentBorder,
    },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.ink },
    twoCols: { flexDirection: 'row', gap: 10 },
    error: { fontFamily: fonts.regular, fontSize: 13, color: c.dangerText, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    btn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnGhost: {
      backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
      borderWidth: 1,
      borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : c.accentBorder,
    },
    btnText: { fontFamily: fonts.bold, fontSize: 15 },
    deleteBtn: {
      height: 48,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.dangerBg,
      borderWidth: 1.5,
      borderColor: c.dangerBorder,
    },
  });
