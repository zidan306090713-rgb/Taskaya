import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { lang, tr } from '@/i18n';
import { supabase } from '@/lib/supabase';

/**
 * صندوق الإشعارات: طلب واحد للسيرفر (my_inbox) وكاش دقيقة.
 * "اتقرا ولا لأ" بيتحفظ على الموبايل بس (AsyncStorage) — صفر كتابة على السيرفر.
 */
export type InboxItem = {
  id: string;
  kind: 'booking' | 'broadcast' | 'service_review' | 'other';
  title: string;
  body: string | null;
  created_at: string;
  url: string | null;
  booking_number: number | null;
  booking_id: string | null;
  status: string | null;
  svc_ar: string | null;
  svc_en: string | null;
  price: number | null;
  is_customer: boolean;
};
type State = { uid: string | null; items: InboxItem[] | null; at: number; readAll: number; read: string[] };

let st: State = { uid: null, items: null, at: 0, readAll: 0, read: [] };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  st = { ...st, ...patch };
  subs.forEach((f) => f());
};
const key = (uid: string) => `taskaya.inbox.v1.${uid}`;
const save = () => {
  if (st.uid) AsyncStorage.setItem(key(st.uid), JSON.stringify({ readAll: st.readAll, read: st.read })).catch(() => {});
};

async function loadRead(uid: string) {
  const raw = await AsyncStorage.getItem(key(uid)).catch(() => null);
  try {
    const j = raw ? JSON.parse(raw) : null;
    return { readAll: Number(j?.readAll) || 0, read: Array.isArray(j?.read) ? (j.read as string[]) : [] };
  } catch {
    return { readAll: 0, read: [] as string[] };
  }
}

let inflight: Promise<void> | null = null;
export async function loadInbox(uid: string, force = false): Promise<void> {
  if (st.uid !== uid) {
    const r = await loadRead(uid);
    st = { uid, items: null, at: 0, ...r };
    subs.forEach((f) => f());
  }
  if (!force && st.items && Date.now() - st.at < 60_000) return;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.rpc('my_inbox');
    if (error) {
      console.warn('my_inbox', error.message);
      if (!st.items) set({ items: [] });
      return;
    }
    const items = ((data ?? []) as InboxItem[]).map((i) => ({ ...i, price: i.price == null ? null : Number(i.price) }));
    const ids = new Set(items.map((i) => i.id));
    set({ items, at: Date.now(), read: st.read.filter((id) => ids.has(id)) });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

const unreadIn = (s: State, i: InboxItem) => Date.parse(i.created_at) > s.readAll && !s.read.includes(i.id);

export function markRead(id: string) {
  if (st.read.includes(id)) return;
  set({ read: [...st.read, id] });
  save();
}
export function markAllRead() {
  set({ readAll: Date.now(), read: [] });
  save();
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
export function useInbox() {
  const s = useSyncExternalStore(subscribe, () => st, () => st);
  const unread = s.items ? s.items.filter((i) => unreadIn(s, i)).length : 0;
  return { items: s.items, unread, isUnread: (i: InboxItem) => unreadIn(s, i) };
}

// نص الإشعار بلغة التطبيق (إشعارات حجز العميل بتتكتب من الحالة نفسها)
const BOOKING: Record<string, [string, string]> = {
  accepted: ['تم قبول طلبك', 'Request accepted'],
  confirmed: ['حجزك مؤكد', 'Booking confirmed'],
  awaiting_customer_approval: ['عرض سعر جديد', 'New price quote'],
  in_progress: ['بدأ العمل على طلبك', 'Work has started'],
  completed: ['تم تنفيذ خدمتك', 'Service completed'],
  cancelled: ['تم إلغاء الحجز', 'Booking cancelled'],
  rejected: ['اعتذر مقدم الخدمة عن طلبك', 'Provider declined your request'],
};
export function textOf(i: InboxItem): { title: string; body: string } {
  const t = i.status ? BOOKING[i.status] : undefined;
  if (i.kind === 'booking' && i.is_customer && t) {
    const svc = (lang === 'ar' ? i.svc_ar : i.svc_en) ?? '';
    if (i.status === 'awaiting_customer_approval' && i.price != null) {
      const p = i.price.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
      return { title: tr(...t), body: tr(`${p} ج.م لخدمة ${svc} · اضغط للرد`, `${p} EGP for ${svc} · Tap to reply`) };
    }
    return { title: tr(...t), body: svc };
  }
  return { title: i.title, body: i.body ?? '' };
}

// "ملاحظة" للتنقّل: صفحة الإشعارات بتسيبها وترجع (back)، والتابات الموجودة تنفّذها أول ما تظهر
// (لو اتنقلنا من صفحة الإشعارات نفسها، Expo Router بيبني تابات جديدة فوق القديمة)
let pendingNav: unknown = null;
export function setPendingNav(href: unknown) {
  pendingNav = href;
}
export function takePendingNav(): unknown {
  const h = pendingNav;
  pendingNav = null;
  return h;
}
