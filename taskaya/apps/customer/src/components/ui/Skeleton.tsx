import { useEffect } from 'react';
import { Animated, DimensionValue, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { TileGrid } from '@/components/ui/TileGrid';
import { useTheme } from '@/providers/ThemeProvider';
import { rgba } from '@/theme';

// ===== نبضة واحدة مشتركة لكل الهياكل: أنيميشن واحد بس مهما كان عددهم =====
const pulse = new Animated.Value(0);
const native = Platform.OS !== 'web';
let users = 0;
let loop: Animated.CompositeAnimation | null = null;

function useSharedPulse() {
  useEffect(() => {
    users += 1;
    if (!loop) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
          Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        ])
      );
      loop.start();
    }
    return () => {
      users -= 1;
      if (users === 0 && loop) {
        loop.stop();
        loop = null;
      }
    };
  }, []);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
}

// ===== القطعة الأساسية =====
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const opacity = useSharedPulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: c.isDark ? 'rgba(255,255,255,0.09)' : rgba(c.accent, 0.12), opacity },
        style,
      ]}
    />
  );
}

// ===== أشكال جاهزة =====

// دواير الأقسام في الرئيسية
export function CategoriesSkeleton() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 76, alignItems: 'center', gap: 8 }}>
          <Skeleton width={64} height={64} radius={32} />
          <Skeleton width={54} height={10} />
        </View>
      ))}
    </View>
  );
}

// كروت مقدمي الخدمة (نفس مقاسات الكروت الحقيقية)
export function TilesSkeleton({ count = 6, columns = 3, aspect = 1.4 }: { count?: number; columns?: number; aspect?: number }) {
  const { c } = useTheme();
  const data = Array.from({ length: count }, (_, i) => i);
  return (
    <TileGrid
      data={data}
      keyOf={(i) => String(i)}
      columns={columns}
      aspect={aspect}
      render={(_, size, h) => (
        <View
          style={{
            width: size,
            height: h,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: c.card,
            borderWidth: 1.5,
            borderColor: c.cardBorder,
          }}
        >
          <Skeleton height={Math.round(h * 0.5)} radius={0} />
          <View style={{ padding: 10, gap: 7 }}>
            <Skeleton width="80%" height={12} />
            <Skeleton width="60%" height={10} />
            <Skeleton width="45%" height={11} />
          </View>
        </View>
      )}
    />
  );
}

// قايمة أسطر (خدمات، طلبات...)
export function ListSkeleton({ rows = 3, height = 58 }: { rows?: number; height?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} radius={16} />
      ))}
    </View>
  );
}

// صفحة كاملة: صورة + اسم + وصف + قايمة
export function PageSkeleton() {
  return (
    <View style={{ alignSelf: 'stretch', gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
        <Skeleton width={92} height={92} radius={28} />
        <Skeleton width={180} height={20} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton height={70} radius={18} />
      <ListSkeleton rows={3} />
    </View>
  );
}
