import { DefaultTheme, ThemeProvider , Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { NebulaBackground } from '@/components/ui/NebulaBackground';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import '@/i18n';

const GlassNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
    border: 'transparent',
    primary: colors.primaryLight,
    text: colors.text,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NebulaBackground />
      <StatusBar style="dark" />
      <View style={{ flex: 1, zIndex: 1 }}><ThemeProvider value={GlassNavTheme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        </AuthProvider>
      </ThemeProvider></View>
    </View>
  );
}
