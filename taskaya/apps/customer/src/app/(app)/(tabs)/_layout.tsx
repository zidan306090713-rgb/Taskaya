import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { tr } from '@/i18n';
import { colors, fonts } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (name: string, title: string, icon: IconName) => (
  <Tabs.Screen
    name={name}
    options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color ?? colors.textSecondary} /> }}
  />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { position: 'absolute', height: 64, paddingBottom: 8, paddingTop: 6, backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,22,41,0.55)', borderTopWidth: 1, borderTopColor: colors.border }]} />
          </View>
        ),
      }}
    >
      {tab('index', tr('الرئيسية', 'Home'), 'home')}
      {tab('orders', tr('طلباتي', 'My Orders'), 'receipt')}
      {tab('profile', tr('حسابي', 'Profile'), 'person')}
    </Tabs>
  );
}
