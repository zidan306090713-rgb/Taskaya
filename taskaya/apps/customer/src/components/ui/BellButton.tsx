import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { isRTL, tr } from '@/i18n';
import { loadInbox, useInbox } from '@/lib/inbox';
import { useOnPush } from '@/lib/push';
import { useAuth } from '@/providers/AuthProvider';
import { fonts } from '@/theme';

// جرس الهيدر: بيفتح صندوق الإشعارات وعليه عدد غير المقروء
export function BellButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const { unread } = useInbox();

  useFocusEffect(
    useCallback(() => {
      if (uid) void loadInbox(uid);
    }, [uid]),
  );
  useOnPush(
    useCallback(() => {
      if (uid) void loadInbox(uid, true);
    }, [uid]),
  );

  return (
    <Pressable
      onPress={() => router.push('/inbox')}
      style={[style, { overflow: 'visible' }]}
      accessibilityRole="button"
      accessibilityLabel={unread ? tr(`الإشعارات، ${unread} جديدة`, `Notifications, ${unread} new`) : tr('الإشعارات', 'Notifications')}
    >
      <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={20} color="#FFFFFF" />
      {unread ? (
        <View style={[styles.badge, isRTL ? { left: -4 } : { right: -4 }]}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E24B4A',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF', lineHeight: 13 },
});
