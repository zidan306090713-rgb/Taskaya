/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import type { ProviderCard } from '@/lib/api';
import { normalizeAr } from '@/lib/arabic';
import {
  Directory,
  loadDirectory,
  loadFeaturedServer,
  MIN_SERVER_CHARS,
  peekServerSearch,
  searchLocal,
  searchServer,
  SERVER_DEBOUNCE_MS,
} from '@/lib/directory';

// يحمّل الدليل مرة واحدة (أو من التخزين) ويطلّع منه المميزين
export function useDirectory() {
  const [dir, setDir] = useState<Directory | null>(null);
  const [serverFeatured, setServerFeatured] = useState<ProviderCard[]>([]);

  useEffect(() => {
    let alive = true;
    loadDirectory().then(async (d) => {
      if (!alive) return;
      setDir(d);
      if (d.large) {
        const f = await loadFeaturedServer();
        if (alive) setServerFeatured(f);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const featured: ProviderCard[] = useMemo(() => {
    if (!dir) return [];
    return dir.large ? serverFeatured : dir.items.filter((i) => i.is_featured);
  }, [dir, serverFeatured]);

  return { dir, featured };
}

// null = مفيش بحث (أو لسه في الانتظار) ، مصفوفة = نتايج
export function useProviderSearch(term: string, dir: Directory | null): ProviderCard[] | null {
  const q = term.trim();
  const [serverResults, setServerResults] = useState<ProviderCard[] | null>(null);

  const local = useMemo(() => (!dir || dir.large || !q ? null : searchLocal(dir.items, q)), [dir, q]);

  useEffect(() => {
    if (!dir?.large) return;
    if (normalizeAr(q).length < MIN_SERVER_CHARS) {
      setServerResults(null);
      return;
    }
    const hit = peekServerSearch(q);
    if (hit) {
      setServerResults(hit);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await searchServer(q, ctrl.signal);
        if (!ctrl.signal.aborted) setServerResults(r);
      } catch {
        if (!ctrl.signal.aborted) setServerResults([]);
      }
    }, SERVER_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [dir, q]);

  if (!q || !dir) return null;
  return dir.large ? serverResults : local;
}
