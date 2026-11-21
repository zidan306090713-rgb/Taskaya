import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '@/i18n';
import { colors, fonts } from '@/theme';
import FloatingTabBar from '@/components/FloatingTabBar';

type IconName = keyof typeof Ionicons.glyphMap;

const BAR_HEIGHT = 66;
const BAR_RADIUS = 33;
const BAR_MAX_WIDTH = 440;
const SIDE_GAP = 16;

const tab = (name: string, title: string, icon: string) => (
  <Tabs.Screen
    name={name}
    options={{
      title,
      tabBarIcon: ({ color, size, focused }) => (
        <Ionicons name={(focused ? icon : `${icon}-outline`) as IconName} size={size} color={color as string} />
      ),
    }}
  />
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - SIDE_GAP * 2, BAR_MAX_WIDTH);
  const side = Math.round((width - barWidth) / 2);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: 'rgba(47,140,255,0.2)',
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 0, marginBottom: 4 },
        tabBarItemStyle: { borderRadius: 999, marginVertical: 6, marginHorizontal: 6, overflow: 'hidden' },
        tabBarStyle: {
          position: 'absolute',
          left: side,
          right: side,
          bottom: Math.max(insets.bottom, 12) + 4,
          height: BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: BAR_RADIUS,
          elevation: 0,
          shadowColor: colors.glow,
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.bg]}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />
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

const styles = StyleSheet.create({
  bg: {
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125,190,255,0.25)',
  },
});
