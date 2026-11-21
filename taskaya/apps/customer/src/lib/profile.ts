import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export type MyProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

const COLS = 'id, full_name, first_name, phone, avatar_url';
const BUCKET = 'avatars';

// ---------- مخزن واحد للبروفايل: أي تعديل بيظهر في كل الشاشات فورًا ----------
let current: MyProfile | null = null;
let loadingFor: string | null = null;
const listeners = new Set<(p: MyProfile | null) => void>();

function publish(p: MyProfile | null) {
  current = p;
  listeners.forEach((l) => l(p));
}

async function load(uid: string) {
  if (loadingFor === uid) return;
  loadingFor = uid;
  const { data } = await supabase.from('profiles').select(COLS).eq('id', uid).single();
  loadingFor = null;
  if (data) publish(data as MyProfile);
}

export function useMyProfile(): MyProfile | null {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [p, setP] = useState<MyProfile | null>(current);

  useEffect(() => {
    listeners.add(setP);
    if (uid && current?.id !== uid) load(uid);
    return () => {
      listeners.delete(setP);
    };
  }, [uid]);

  return p && p.id === uid ? p : null;
}

export const isThreePartName = (n: string) => n.trim().split(/\s+/).filter(Boolean).length >= 3;

export async function updateMyName(uid: string, fullName: string) {
  const full_name = fullName.trim().replace(/\s+/g, ' ');
  const { data, error } = await supabase.from('profiles').update({ full_name }).eq('id', uid).select(COLS).single();
  if (!error && data) publish(data as MyProfile);
  return { error };
}

// بيرفع الصورة في فولدر المستخدم، يحدّث البروفايل، ويمسح الصورة القديمة
export async function uploadAvatar(uid: string, uri: string, mimeType?: string | null, base64?: string | null) {
  const type = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const body = base64 ? base64ToBytes(base64) : await (await fetch(uri)).arrayBuffer();
  const path = `${uid}/${Date.now()}.${ext}`;

  const up = await supabase.storage.from(BUCKET).upload(path, body, { contentType: type });
  if (up.error) return { error: up.error };

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const old = current?.avatar_url;
  const { data, error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid).select(COLS).single();
  if (error || !data) {
    void supabase.storage.from(BUCKET).remove([path]);
    return { error: error ?? new Error('update failed') };
  }
  publish(data as MyProfile);

  const marker = `/object/public/${BUCKET}/`;
  if (old?.includes(marker)) void supabase.storage.from(BUCKET).remove([old.split(marker)[1]]);
  return { error: null };
}

// ---------- تحويل base64 لبايتات (من غير مكتبات) — أضمن طريقة لرفع الصور على الموبايل ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64.length; i++) LOOKUP[B64.charCodeAt(i)] = i;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)] ?? 0;
    const b = LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c = LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    const d = LOOKUP[clean.charCodeAt(i + 3)] ?? 0;
    out[p++] = (a << 2) | (b >> 4);
    if (p < len) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < len) out[p++] = ((c & 3) << 6) | d;
  }
  return out;
}
