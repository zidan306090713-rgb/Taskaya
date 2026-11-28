import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { isRTL, layoutRTL, lang, tr } from '@/i18n';
import { Address, Area, deleteAddress, getAreas, getMyAddresses, invalidateAddresses, peekAreas, saveAddress } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts, Palette, rgba, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// نوع العنوان بيتحفظ كمفتاح (home/work/other) وبيتعرض باللغة الحالية
const KINDS: { key: string; ar: string; en: string; icon: IconName }[] = [
  { key: 'home', ar: 'البيت', en: 'Home', icon: 'home-outline' },
  { key: 'work', ar: 'الشغل', en: 'Work', icon: 'briefcase-outline' },
  { key: 'other', ar: 'تاني', en: 'Other', icon: 'location-outline' },
];
const kindOf = (label: string | null) => KINDS.find((k) => k.key === label);
const labelText = (label: string | null) => {
  const k = kindOf(label);
  return k ? tr(k.ar, k.en) : label || tr('عنوان', 'Address');
};

export default function Addresses() {
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Address[] | null>(null);
  const [areas, setAreas] = useState<Area[]>(() => peekAreas() ?? []);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  // بنجيب العناوين من السيرفر على طول (مش من الكاش) عشان نضمن كل البيانات
  const refresh = useCallback(() => {
    if (!uid) return;
    invalidateAddresses(uid);
    getMyAddresses(uid)
      .then(setList)
      .catch(() => setList([]));
  }, [uid]);

  useEffect(() => {
    refresh();
    getAreas()
      .then(setAreas)
      .catch(() => {});
  }, [refresh]);

  const areaName = (id: string | null) => {
    const a = areas.find((x) => x.id === id);
    return a ? (lang === 'ar' ? a.name_ar : a.name_en) : '';
  };

  const details = (a: Address) =>
    [
      a.street,
      a.building ? tr(`عمارة ${a.building}`, `Bldg ${a.building}`) : null,
      a.floor ? tr(`الدور ${a.floor}`, `Floor ${a.floor}`) : null,
      a.apartment ? tr(`شقة ${a.apartment}`, `Apt ${a.apartment}`) : null,
    ]
      .filter(Boolean)
      .join(' - ');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientHeader title={tr('عناويني', 'My addresses')} padBottom={22} />
      <Screen padTop={18}>
        {list === null ? (
          <ListSkeleton rows={3} height={84} />
        ) : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={30} color={c.accentText} />
            </View>
            <Text style={styles.emptyTitle}>{tr('مفيش عناوين لسه', 'No addresses yet')}</Text>
            <Text style={styles.emptySub}>{tr('ضيف عنوانك عشان الحجز يبقى أسرع', 'Add your address to book faster')}</Text>
          </View>
        ) : (
          list.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setEditing(a)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={kindOf(a.label)?.icon ?? 'location-outline'} size={22} color={c.accentText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>{labelText(a.label)}</Text>
                {details(a) ? <Text style={styles.cardText} numberOfLines={2}>{details(a)}</Text> : null}
                {areaName(a.area_id) ? <Text style={styles.cardArea}>{areaName(a.area_id)}</Text> : null}
              </View>
              <Ionicons name="create-outline" size={20} color={c.iconMuted} />
            </Pressable>
          ))
        )}

        <Pressable onPress={() => setEditing('new')} accessibilityRole="button" style={({ pressed }) => [{ marginTop: spacing.md }, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addText}>{tr('إضافة عنوان', 'Add address')}</Text>
          </LinearGradient>
        </Pressable>
      </Screen>

      {editing ? (
        <AddressForm
          uid={uid}
          areas={areas}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

function AddressForm({
  uid,
  areas,
  initial,
  onClose,
  onSaved,
}: {
  uid: string;
  areas: Area[];
  initial: Address | null;
  onClose: () => void;
  onSaved: () => void;
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
    onSaved();
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
    onSaved();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={busy ? undefined : onClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.formWrap}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <Text style={styles.sheetTitle}>{initial ? tr('تعديل العنوان', 'Edit address') : tr('عنوان جديد', 'New address')}</Text>

            {/* النوع */}
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

            {/* المنطقة */}
            <Text style={styles.label}>{tr('المنطقة', 'Area')}</Text>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable onPress={onClose} disabled={!!busy} style={({ pressed }) => [styles.btn, styles.flex, styles.btnGhost, pressed && { opacity: 0.8 }]}>
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      marginBottom: spacing.sm,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.accentBorder,
      elevation: 0,
    },
    cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    cardTitle: { fontFamily: fonts.bold, fontSize: 15.5, color: c.text },
    cardText: { fontFamily: fonts.regular, fontSize: 13, color: c.ink },
    cardArea: { fontFamily: fonts.semibold, fontSize: 12, color: c.accentText },
    addBtn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addText: { fontFamily: fonts.bold, fontSize: 15.5, color: '#FFFFFF' },

    emptyWrap: { alignItems: 'center', marginTop: 40, marginBottom: 12, gap: 10 },
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

    backdrop: { backgroundColor: 'rgba(5,15,35,0.5)' },
    formWrap: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1.5,
      borderBottomWidth: 0,
      borderColor: rgba(c.accent, 0.3),
      backgroundColor: c.isDark ? '#151A24' : '#FFFFFF',
      padding: 20,
      paddingBottom: 32,
      elevation: 12,
    },
    sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: c.text, textAlign: 'center' },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginBottom: -4, textAlign: layoutRTL() ? 'right' : 'left' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.chipBg,
      borderWidth: 1.5,
      borderColor: c.chipBorder,
    },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.ink },
    twoCols: { flexDirection: 'row', gap: 10 },
    error: { fontFamily: fonts.regular, fontSize: 13, color: c.dangerText, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { backgroundColor: c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,31,58,0.06)' },
    btnText: { fontFamily: fonts.bold, fontSize: 15 },
    deleteBtn: {
      height: 48,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.dangerBg,
      borderWidth: 1.5,
      borderColor: c.dangerBorder,
    },
  });
