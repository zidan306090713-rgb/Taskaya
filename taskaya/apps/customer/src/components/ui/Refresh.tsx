import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

/** السحب لتحت للتحديث: بيشغّل run (اللي بتجيب من السيرفر على طول من غير الكاش) */
export function usePullRefresh(run: () => Promise<unknown>) {
  const { c } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await run();
    } catch {
      // الشاشة نفسها بتعرض الخطأ
    } finally {
      setRefreshing(false);
    }
  }, [run]);
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor="#FFFFFF"
      colors={[c.accent]}
      progressBackgroundColor={c.isDark ? '#151A24' : '#FFFFFF'}
    />
  );
}
