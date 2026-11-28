import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { isRTL, lang, layoutRTL, tr } from '@/i18n';
import { Address, Area, getAreas, getMyAddresses, invalidateAddresses, peekAreas } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const WEB_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)' } as any) : null;
const WEB_DIM = Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any) : null;

// نوع العنوان بيتحفظ كمفتاح (home/work/other) وبيتعرض باللغة الحالية
export const KINDS: { key: string; ar: string; en: string; icon: IconName }[] = [
  { key: 'home', ar: 'البيت', en: 'Home', icon: 'home-outline' },
  { key: 'work', ar: 'الشغل', en: 'Work', icon: 'briefcase-outline' },
  { key: 'other', ar: 'تاني', en: 'Other', icon: 'location-outline' },
];
export const kindOf = (label: string | null) => KINDS.find((k) => k.key === label);
export const labelText = (label: string | null) => {
  const k = kindOf(label);
  return k ? tr(k.ar, k.en) : label || tr('عنوان', 'Address');
};
export const addressDetails = (a: Address) =>
  [
    a.street,
    a.building ? tr(`عمارة ${a.building}`, `Bldg ${a.building}`) : null,
    a.floor ? tr(`الدور ${a.floor}`, `Floor ${a.floor}`) : null,
    a.apartment ? tr(`شقة ${a.apartment}`, `Apt ${a.apartment}`) : null,
  ]
    .filter(Boolean)
    .join(' - ');
export const areaLabel = (areas: Area[], id: string | null) => {
  const a = areas.find((x) => x.id === id);
  return a ? (lang === 'ar' ? a.name_ar : a.name_en) : '';
};

// لما نرجع من صفحة العنوان للبروفايل بنفتح النافذة تاني
export const addrNav = { reopen: false };

export function AddressesSheet({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const { height: winH } = useWindowDimensions();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [list, setList] = useState<Address[] | null>(null);
  const [areas, setAreas] = useState<Area[]>(() => peekAreas() ?? []);
  const [bandH, setBandH] = useState(182);
  const anim = useRef(new Animated.Value(0)).current;

  // ارتفاع ثابت للنافذة سواء في التحميل أو بعده
  const sheetH = Math.min(560, Math.round(winH * 0.78));

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [anim]);

  useEffect(() => {
    if (!uid) return;
    invalidateAddresses(uid);
    getMyAddresses(uid)
      .then(setList)
      .catch(() => setList([]));
    getAreas()
      .then(setAreas)
      .catch(() => {});
  }, [uid]);

  const open = (id?: string) => {
    onClose();
    router.push({ pathname: '/addresses', params: id ? { id, from: 'sheet' } : { from: 'sheet' } });
  };

  const align = layoutRTL() ? 'right' : 'left';
  const sheetBg = c.isDark
    ? Platform.OS === 'android' ? 'rgba(21,26,36,0.97)' : 'rgba(21,26,36,0.78)'
    : Platform.OS === 'android' ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.78)';
  const ghostBg = c.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';
  const ghostBorder = c.isDark ? 'rgba(255,255,255,0.14)' : c.accentBorder;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop, WEB_DIM]} onPress={onClose} accessibilityLabel={tr('إغلاق', 'Close')} />
      <View style={styles.wrap}>
        <Animated.View style={[styles.sheet, WEB_FROST, { height: sheetH, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }, { backgroundColor: sheetBg, borderColor: c.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)', shadowColor: c.accent }]}>
          {Platform.OS === 'ios' ? <BlurView intensity={40} tint={c.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}

          {/* القايمة بتتحرك تحت الهيدر العائم */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingTop: bandH + 14, paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {list === null ? (
              <AddrSkeleton ghostBg={ghostBg} ghostBorder={ghostBorder} />
            ) : list.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft, borderColor: ghostBorder }]}>
                  <Ionicons name="location-outline" size={28} color={c.accentText} />
                </View>
                <Text style={[styles.emptyTitle, { color: c.ink }]}>{tr('مفيش عناوين لسه', 'No addresses yet')}</Text>
                <Text style={[styles.emptySub, { color: c.textSecondary }]}>{tr('ضيف عنوانك عشان الحجز يبقى أسرع', 'Add your address to book faster')}</Text>
              </View>
            ) : (
              list.map((a) => {
                const d = addressDetails(a);
                const ar = areaLabel(areas, a.area_id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => open(a.id)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.item, { backgroundColor: ghostBg, borderColor: ghostBorder }, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: c.accentSoft }]}>
                      <Ionicons name={kindOf(a.label)?.icon ?? 'location-outline'} size={20} color={c.accentText} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.itemTitle, { color: c.ink, textAlign: align }]}>{labelText(a.label)}</Text>
                      {d ? <Text numberOfLines={1} style={[styles.itemText, { color: c.textSecondary, textAlign: align }]}>{d}</Text> : null}
                      {ar ? <Text style={[styles.itemArea, { color: c.accentText, textAlign: align }]}>{ar}</Text> : null}
                    </View>
                    <Ionicons name="create-outline" size={19} color={c.iconMuted} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* الأزرار ثابتة تحت */}
          <View style={[styles.footer, { borderTopColor: ghostBorder }]}>
            <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.btn, styles.flex, { backgroundColor: ghostBg, borderWidth: 1, borderColor: ghostBorder }, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: c.ink }]}>{tr('إغلاق', 'Close')}</Text>
            </Pressable>
            <Pressable onPress={() => open()} accessibilityRole="button" style={({ pressed }) => [styles.flex, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, styles.btnRow]}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{tr('عنوان جديد', 'New address')}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* الهيدر العائم (شبه شفاف) فوق القايمة */}
          <View onLayout={(e) => setBandH(e.nativeEvent.layout.height)} style={[styles.band, WEB_FROST]}>
            {Platform.OS === 'ios' ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
            <LinearGradient colors={c.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'android' ? 0.95 : 0.8 }]} />
            <View style={styles.glow} />
            <View style={styles.glow2} />
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} />
            <Text style={styles.title}>{tr('عناويني', 'My addresses')}</Text>
            <View style={styles.iconRing}>
              <View style={styles.iconIn}>
                <Ionicons name="location" size={34} color={c.accent} />
              </View>
            </View>
            <Text style={styles.bandHint}>{tr('دوس على عنوان تعدّله أو ضيف عنوان جديد', 'Tap an address to edit it or add a new one')}</Text>
          </View>
        </Animated.View>
      </View>
      </View>
    </Modal>
  );
}

// سكيلتون بنفس شكل كارت العنوان لحد ما القايمة توصل
function AddrSkeleton({ ghostBg, ghostBorder }: { ghostBg: string; ghostBorder: string }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bar = { backgroundColor: c.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,27,63,0.08)', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) };
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.item, { backgroundColor: ghostBg, borderColor: ghostBorder }]}>
          <Animated.View style={[styles.itemIcon, bar]} />
          <View style={{ flex: 1, gap: 7, alignItems: 'flex-start' }}>
            <Animated.View style={[{ width: '38%', height: 12, borderRadius: 6 }, bar]} />
            <Animated.View style={[{ width: '78%', height: 10, borderRadius: 5 }, bar]} />
            <Animated.View style={[{ width: '26%', height: 9, borderRadius: 5 }, bar]} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(5,15,35,0.45)' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, pointerEvents: 'box-none' },
  sheet: { width: '100%', maxWidth: 400, borderRadius: 26, borderWidth: 1, overflow: 'hidden', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  band: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, alignItems: 'center', paddingTop: 18, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', pointerEvents: 'none' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, left: -70, backgroundColor: 'rgba(255,255,255,0.10)', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: -80, right: -40, backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' },
  title: { fontFamily: fonts.bold, fontSize: 18, color: '#FFFFFF', textAlign: 'center', marginBottom: 14 },
  iconRing: { padding: 3, borderRadius: 34, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.15)' },
  iconIn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  bandHint: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 4 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16 },
  emptySub: { fontFamily: fonts.regular, fontSize: 12.5, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5 },
  itemIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.bold, fontSize: 15 },
  itemText: { fontFamily: fonts.regular, fontSize: 12.5 },
  itemArea: { fontFamily: fonts.semibold, fontSize: 12 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1 },
  flex: { flex: 1 },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: 6 },
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
});
