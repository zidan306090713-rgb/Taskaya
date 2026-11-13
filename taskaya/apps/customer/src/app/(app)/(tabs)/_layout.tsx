import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { tr } from '@/i18n';
import { colors, fonts } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (name: string, title: string, icon: IconName) => (
  <Tabs.Screen
    name={name}
    options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} /> }}
  />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.border },
      }}
    >
      {tab('index', tr('الرئيسية', 'Home'), 'home')}
      {tab('explore', tr('استكشاف', 'Explore'), 'search')}
      {tab('orders', tr('طلباتي', 'My Orders'), 'receipt')}
      {tab('profile', tr('حسابي', 'Profile'), 'person')}
    </Tabs>
  );
}
