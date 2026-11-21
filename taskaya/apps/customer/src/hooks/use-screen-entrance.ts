import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

/**
 * أنيميشن ظهور العناصر — بيشتغل كل مرة الشاشة تظهر (رايح أو راجع)، مش أول مرة بس.
 * على أندرويد: حركة من غير شفافية (أنيميشن الشفافية تقيل وبيبوّظ الكروت الشفافة).
 */
export function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  useFocusEffect(
    useCallback(() => {
      v.setValue(0);
      const anim = Animated.timing(v, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      anim.start();
      return () => anim.stop();
    }, [v, delay])
  );
  return {
    opacity: Platform.OS === 'android' ? 1 : v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
}

/**
 * بيخفي الشاشة فورًا أول ما نتنقل منها.
 * الشاشات شفافة عشان الخلفية تبان، فمن غير ده الشاشة القديمة بتبان ورا الجديدة.
 */
export function useFocusHide() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  return focused ? null : ({ opacity: 0, pointerEvents: 'none' } as const);
}
