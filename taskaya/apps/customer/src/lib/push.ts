import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { lang } from '@/i18n';
import { supabase } from '@/lib/supabase';

/**
 * الإشعارات: التطبيق بيطلب الإذن مرة واحدة، وبياخد "عنوان" الموبايل (push token)
 * ويسجّله في push_tokens باسم المستخدم. السيرفر بيبعت الإشعار بس لما الحجز يتغير.
 * التسجيل على السيرفر بيحصل بس لو (الحساب/العنوان/اللغة) اتغيروا، أو مرة في الأسبوع.
 * (Expo Go على أندرويد مش بيدعم الإشعارات — لازم APK)
 */
let myToken: string | null = null;
const KEY = 'taskaya.push.v1';
const WEEK = 7 * 24 * 60 * 60_000;

if (Platform.OS !== 'web') {
  // لو التطبيق مفتوح: الإشعار يظهر برضه فوق
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Taskaya',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F5BFF',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export async function registerPush(uid: string) {
  try {
    const token = await getToken();
    if (!token) return;
    myToken = token;
    // نفس الحساب + نفس الموبايل + نفس اللغة واتسجّل من أقل من أسبوع → مفيش داعي نكلّم السيرفر
    const sig = `${uid}|${token}|${lang}`;
    const saved = await AsyncStorage.getItem(KEY).catch(() => null);
    if (saved) {
      const [s, at] = saved.split('@');
      if (s === sig && Date.now() - Number(at) < WEEK) return;
    }
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS, p_lang: lang });
    if (!error) await AsyncStorage.setItem(KEY, `${sig}@${Date.now()}`);
  } catch {
    // Expo Go / مفيش نت: نكمّل عادي من غير إشعارات
  }
}

// عند تسجيل الخروج: الموبايل ده مايستقبلش إشعارات الحساب تاني
export async function unregisterPush() {
  await AsyncStorage.removeItem(KEY).catch(() => {});
  if (!myToken) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: myToken });
  } catch {
    // مش مشكلة
  }
  myToken = null;
}

function openFrom(resp: Notifications.NotificationResponse | null | undefined) {
  const data = resp?.notification.request.content.data as { url?: string; booking_id?: string | null } | undefined;
  if (data?.url) router.navigate((data.booking_id && (data.url === '/orders' || data.url === '/pro/requests') ? { pathname: data.url, params: { open: data.booking_id } } : data.url) as never);
}

// بيتنادى مرة في الرئيسية: يسجّل الموبايل + لما تدوس على إشعار يفتح المكان بتاعه
export function usePushSetup(uid: string | undefined) {
  useEffect(() => {
    if (uid) void registerPush(uid);
  }, [uid]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(openFrom);
    Notifications.getLastNotificationResponseAsync()
      .then(openFrom)
      .catch(() => {});
    return () => sub.remove();
  }, []);
}

// إشعار وصل والتطبيق مفتوح (مثلًا: "طلباتي" تحدّث نفسها)
export function useOnPush(cb: () => void) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener(() => cb());
    return () => sub.remove();
  }, [cb]);
}
