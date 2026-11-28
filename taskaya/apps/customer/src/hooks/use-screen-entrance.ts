import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/**
 * أنيميشن ظهور العناصر — بيشتغل كل مرة الشاشة تظهر (رايح أو راجع)، مش أول مرة بس.
 * على أندرويد: حركة من غير شفافية (أنيميشن الشفافية تقيل وبيبوّظ الكروت الشفافة).
 * على الويب: بعد ما الأنيميشن يخلص بنشيل الـ opacity/transform خالص،
 * لأن Chrome بيوقف تغبيش الزجاج (backdrop-filter) جوه عنصر عليه الستايلات دي.
 */
export function useEntrance(delay: number) {
  const [v] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setDone(false);
      v.setValue(0);
      const anim = Animated.timing(v, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: !IS_WEB,
      });
      anim.start(({ finished }) => {
        if (finished && IS_WEB) setDone(true);
      });
      return () => anim.stop();
    }, [v, delay])
  );
  if (IS_WEB && done) return null;
  return {
    opacity: Platform.OS === 'ios' ? v : 1,
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
