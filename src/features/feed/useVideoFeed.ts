import { create } from 'zustand';
import { useEffect } from 'react';
import type { Event, Filter } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { preloadVideo, clearPreloadedVideos } from '../../services/video';

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
// Track in-flight requests to deduplicate concurrent calls
const inflight = new Map<string, Promise<Event[]>>();
async function fetchEvents(filters: Filter[]): Promise<Event[]> {
  const key = JSON.stringify(filters);
  const cached = resultsCache.get(key);
  if (cached) return cached;

  let promise = inflight.get(key);
  if (!promise) {
    promise = new Promise<Event[]>((resolve, reject) => {
      const events: Event[] = [];
      let unsub: (() => void) | undefined;
      NostrService.subscribe(
        filters,
        {
          onEvent: (e) => events.push(e),
          onEose: () => {
            unsub?.();
            resolve(events);
          },
          onClose: () => {
            unsub?.();
            resolve(events);
          }
        },
        300
      )
        .then((u) => {
          unsub = u;
        })
        .catch(reject);
    });
    inflight.set(key, promise);
  }
  const events = await promise;
  inflight.delete(key);
  resultsCache.set(key, events);
  return events;
}

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
    set({ key, currentIndex: 0, metadata: [] });
    const events = await fetchEvents(filters);
    set({ metadata: events });
    preloadAround(0, events);
  },
  next() {
    const { currentIndex, metadata } = get();
    if (currentIndex < metadata.length - 1) {
      const nextIndex = currentIndex + 1;
      set({ currentIndex: nextIndex });
      preloadAround(nextIndex, metadata);
    }
  },
  prev() {
    const { currentIndex, metadata } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      set({ currentIndex: prevIndex });
      preloadAround(prevIndex, metadata);
    }
  }
}));

export function __clearFeedCache(): void {
  resultsCache.clear();
  inflight.clear();
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
  }, [filters, setFilters]);

  return {
    currentVideo: metadata[currentIndex],
    next,
    prev
  };
}

