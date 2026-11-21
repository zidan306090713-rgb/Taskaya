import { Redirect, Stack } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme';

/**
 * كل الشاشات شفافة عشان الخلفية تبان، فأي شاشة بتتفتح فوقها شاشة تانية
 * بنخفيها فورًا، عشان متبانش ورا الجديدة. ده بيتطبق على كل شاشات التطبيق مرة واحدة.
 */
function HideWhenBlurred({ navigation, children }: { navigation: any; children: ReactNode }) {
  const [focused, setFocused] = useState<boolean>(() => navigation.isFocused());
  useEffect(() => {
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return <View style={[{ flex: 1 }, !focused && { opacity: 0, pointerEvents: 'none' }]}>{children}</View>;
}

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { c } = useTheme();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  // الهيدر بيبقى موجود من أول لحظة (مش بعد ما الشاشة تترسم) عشان المحتوى ميتنططش
  const withHeader = { headerShown: true, title: '' };

  return (
    <Stack
      screenLayout={({ navigation, children }) => <HideWhenBlurred navigation={navigation}>{children}</HideWhenBlurred>}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: c.headerBg },
        headerTitleStyle: { fontFamily: fonts.bold, color: c.text },
        headerTintColor: c.accentText,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="category/[id]" options={withHeader} />
      <Stack.Screen name="provider/[id]" options={withHeader} />
      <Stack.Screen name="booking/[psid]" options={withHeader} />
    </Stack>
  );
}
