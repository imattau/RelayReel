import { create } from 'zustand';
import { useEffect } from 'react';
import type { Event, Filter } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { DEFAULT_RELAYS } from '../../config/relays';
import {
  preloadVideo,
  clearPreloadedVideos,
  isValidVideoUrl
} from '../../services/video';

/**
 * Hook managing a scrollable video feed.
 *
 * Filters are subscribed through {@link NostrService} so new events stream in
 * real time. Private feeds rely on an active signer from {@link useAuth}; if no
 * signer is present, only public events are received. Retrieved metadata is
 * cached in memory and can be persisted offline via the storage service.
 */

interface FeedState {
  metadata: Event[];
  currentIndex: number;
  key?: string;
  setFilters: (filters: Filter[]) => Promise<void>;
  next: () => void;
  prev: () => void;
}

// Cache resolved queries so repeated filter sets reuse network results
const resultsCache = new Map<string, Event[]>();
// Track active subscription so we can clean up on unmount or filter change
let activeUnsub: (() => void) | undefined;

const SESSION_PREFIX = 'feedCache:';
const MAX_SESSION_EVENTS = 20;

function persistSession(): void {
  const { key, metadata, currentIndex } = useVideoFeedStore.getState();
  if (typeof sessionStorage !== 'undefined' && key) {
    const limited = metadata.slice(0, MAX_SESSION_EVENTS);
    sessionStorage.setItem(
      SESSION_PREFIX + key,
      JSON.stringify({ metadata: limited, currentIndex })
    );
  }
}

function loadSession(key: string): { metadata: Event[]; currentIndex: number } | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function clearSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(SESSION_PREFIX)) sessionStorage.removeItem(k);
  }
}

function getVideoUrlFrom(e: { content: string; tags: string[][] }): string | undefined {
  const imeta = e.tags?.find((t) => t[0] === 'imeta');
  if (imeta) {
    const urlEntry = imeta.find((s) => s.startsWith('url='));
    if (urlEntry) return urlEntry.slice(4);
  }

  const urlTag = e.tags?.find(
    (t) => t[0] === 'url' && t[1] && /^https?:\/\//.test(t[1]),
  );
  if (urlTag) return urlTag[1];

  const match = e.content.match(
    /https?:\/\/\S+?\.(mp4|webm|ogg|mov|m4v|m3u8)/i,
  );
  if (match) return match[0];
  return undefined;
}

function dedupe(events: Event[]): Event[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function preloadAround(idx: number, events: Event[]): void {
  const nextUrl = events[idx + 1]?.content;
  if (nextUrl) preloadVideo(nextUrl);
  const prevUrl = events[idx - 1]?.content;
  if (prevUrl) preloadVideo(prevUrl);
}

async function seedInitialFeed(target = 25): Promise<void> {
  let until: number | undefined;
  const collected: Event[] = [];
  for (let i = 0; i < 4 && collected.length < target; i++) {
    const batch = await NostrService.query([
      { kinds: [1], ...(until ? { until } : {}), limit: 100 },
    ]);
    if (!batch.length) break;
    const sorted = batch.sort((a, b) => b.created_at - a.created_at);
    for (const e of sorted) {
      const url = getVideoUrlFrom(e);
      if (!url) continue;
      if (await isValidVideoUrl(url)) collected.push({ ...e, content: url });
      if (collected.length >= target) break;
    }
    until = sorted[sorted.length - 1].created_at - 1;
  }
  useVideoFeedStore.setState((state) => ({
    ...state,
    metadata: dedupe([...state.metadata, ...collected]),
  }));
  preloadAround(0, collected);
}

export const useVideoFeedStore = create<FeedState>((set, get) => ({
  metadata: [],
  currentIndex: 0,
  key: undefined,
  async setFilters(filters) {
    const key = JSON.stringify(filters);
    if (get().key === key) return;
    // Clean up previous subscription and cached media
    activeUnsub?.();
    const prevKey = get().key;
    if (prevKey) {
      resultsCache.delete(prevKey);
    }
    clearPreloadedVideos();

    let cached = resultsCache.get(key);
    let session = !cached ? loadSession(key) : undefined;
    if (!cached && session) cached = session.metadata;
    set({ key, currentIndex: session?.currentIndex ?? 0, metadata: cached ?? [] });
    preloadAround(session?.currentIndex ?? 0, cached ?? []);
    persistSession();

    await NostrService.connect(DEFAULT_RELAYS);

    if (!cached) {
      await seedInitialFeed();
      cached = useVideoFeedStore.getState().metadata;
      resultsCache.set(key, cached);
      preloadAround(0, cached);
      persistSession();
    }

    activeUnsub = await NostrService.subscribe(filters, {
      onEvent: (e) => {
        const url = getVideoUrlFrom(e);
        if (!url) return;
        void isValidVideoUrl(url).then((valid) => {
          if (!valid) return;
          set((state) => {
            if (state.key !== key) return state;
            if (state.metadata.some((evt) => evt.id === e.id)) return state;
            const next = [...state.metadata, { ...e, content: url }];
            resultsCache.set(key, next);
            preloadAround(state.currentIndex, next);
            return { metadata: next };
          });
          persistSession();
        });
      },
    });
  },
  next() {
    const { currentIndex, metadata } = get();
    if (currentIndex < metadata.length - 1) {
      const nextIndex = currentIndex + 1;
      clearPreloadedVideos();
      set({ currentIndex: nextIndex });
      preloadAround(nextIndex, metadata);
      persistSession();
    }
  },
  prev() {
    const { currentIndex, metadata } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      clearPreloadedVideos();
      set({ currentIndex: prevIndex });
      preloadAround(prevIndex, metadata);
      persistSession();
    }
  }
}));

export function __clearFeedCache(): void {
  resultsCache.clear();
  clearPreloadedVideos();
  clearSession();
}

export default function useVideoFeed(filters: Filter[]): {
  currentVideo?: Event;
  next: () => void;
  prev: () => void;
} {
  const { metadata, currentIndex, setFilters, next, prev } = useVideoFeedStore();

  useEffect(() => {
    setFilters(filters).catch(() => {
      /* swallow errors so UI can handle empty feeds */
    });
    return () => {
      activeUnsub?.();
      __clearFeedCache();
    };
  }, [filters, setFilters]);

  return {
    currentVideo: metadata[currentIndex],
    next,
    prev
  };
}

