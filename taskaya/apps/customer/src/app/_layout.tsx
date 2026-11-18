import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { NebulaBackground } from '@/components/ui/NebulaBackground';
import { AuthProvider } from '@/providers/AuthProvider';
import { AppThemeProvider, useTheme } from '@/providers/ThemeProvider';
import '@/i18n';

function Blank() {
  const { c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.background }} />;
}

function Shell() {
  const { c } = useTheme();
  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: c.isDark,
      colors: {
        ...DefaultTheme.colors,
        background: 'transparent',
        card: 'transparent',
        border: 'transparent',
        primary: c.accentText,
        text: c.text,
      },
    }),
    [c]
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <NebulaBackground />
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, zIndex: 1 }}>
        <ThemeProvider value={navTheme}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
          </AuthProvider>
        </ThemeProvider>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  return <AppThemeProvider>{loaded ? <Shell /> : <Blank />}</AppThemeProvider>;
}
