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

function preloadAround(idx: number, events: Event[]): void {
  const nextUrl = events[idx + 1]?.content;
  if (nextUrl) preloadVideo(nextUrl);
  const prevUrl = events[idx - 1]?.content;
  if (prevUrl) preloadVideo(prevUrl);
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

    const cached = resultsCache.get(key) ?? [];
    set({ key, currentIndex: 0, metadata: cached });
    preloadAround(0, cached);

    await NostrService.connect(DEFAULT_RELAYS);
      activeUnsub = await NostrService.subscribe(filters, {
        onEvent: (e) => {
          void isValidVideoUrl(e.content).then((valid) => {
            if (!valid) return;
            set((state) => {
              if (state.key !== key) return state;
              if (state.metadata.some((evt) => evt.id === e.id)) return state;
              const next = [...state.metadata, e];
              resultsCache.set(key, next);
              preloadAround(state.currentIndex, next);
              return { metadata: next };
            });
          });
        }
      });
  },
  next() {
    const { currentIndex, metadata } = get();
    if (currentIndex < metadata.length - 1) {
      const nextIndex = currentIndex + 1;
      clearPreloadedVideos();
      set({ currentIndex: nextIndex });
      preloadAround(nextIndex, metadata);
    }
  },
  prev() {
    const { currentIndex, metadata } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      clearPreloadedVideos();
      set({ currentIndex: prevIndex });
      preloadAround(prevIndex, metadata);
    }
  }
}));

export function __clearFeedCache(): void {
  resultsCache.clear();
  clearPreloadedVideos();
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

