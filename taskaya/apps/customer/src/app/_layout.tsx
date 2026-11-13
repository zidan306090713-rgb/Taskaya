import { Stack } from 'expo-router';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { AuthProvider } from '@/providers/AuthProvider';
import '@/i18n';

export default function RootLayout() {
  const [loaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  if (!loaded) return null;
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
