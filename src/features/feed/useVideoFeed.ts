import { create } from 'zustand';
import { useEffect } from 'react';
import type { Event, Filter } from 'nostr-tools';
import NostrService from '../../services/nostr';

interface FeedState {
  events: Event[];
  index: number;
  key?: string;
  setFilters: (filters: Filter[]) => Promise<void>;
  next: () => void;
  prev: () => void;
}

// Cache resolved queries so repeated filter sets reuse network results
const resultsCache = new Map<string, Event[]>();
// Track in-flight requests to deduplicate concurrent calls
const inflight = new Map<string, Promise<Event[]>>();
// Track preloaded URLs to avoid redundant DOM nodes
const preloaded = new Set<string>();

async function fetchEvents(filters: Filter[]): Promise<Event[]> {
  const key = JSON.stringify(filters);
  const cached = resultsCache.get(key);
  if (cached) return cached;

  let promise = inflight.get(key);
  if (!promise) {
    promise = NostrService.query(filters);
    inflight.set(key, promise);
  }
  const events = await promise;
  inflight.delete(key);
  resultsCache.set(key, events);
  return events;
}

function preloadUrl(url?: string): void {
  if (!url || preloaded.has(url)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  document.head.appendChild(link);
  preloaded.add(url);
}

function preloadAround(idx: number, events: Event[]): void {
  preloadUrl(events[idx + 1]?.content);
  preloadUrl(events[idx - 1]?.content);
}

export const useVideoFeedStore = create<FeedState>((set, get) => ({
  events: [],
  index: 0,
  key: undefined,
  async setFilters(filters) {
    const key = JSON.stringify(filters);
    if (get().key === key) return;
    set({ key, index: 0, events: [] });
    const events = await fetchEvents(filters);
    set({ events });
    preloadAround(0, events);
  },
  next() {
    const { index, events } = get();
    if (index < events.length - 1) {
      const nextIndex = index + 1;
      set({ index: nextIndex });
      preloadAround(nextIndex, events);
    }
  },
  prev() {
    const { index, events } = get();
    if (index > 0) {
      const prevIndex = index - 1;
      set({ index: prevIndex });
      preloadAround(prevIndex, events);
    }
  }
}));

export function __clearFeedCache(): void {
  resultsCache.clear();
  inflight.clear();
  preloaded.clear();
  // remove existing preload links
  Array.from(document.head.querySelectorAll('link[rel="preload"][as="video"]')).forEach((el) =>
    el.parentElement?.removeChild(el)
  );
}

export default function useVideoFeed(filters: Filter[]): {
  currentVideo?: Event;
  next: () => void;
  prev: () => void;
} {
  const { events, index, setFilters, next, prev } = useVideoFeedStore();

  useEffect(() => {
    setFilters(filters).catch(() => {
      /* swallow errors so UI can handle empty feeds */
    });
  }, [filters, setFilters]);

  return {
    currentVideo: events[index],
    next,
    prev
  };
}

