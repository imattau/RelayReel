import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { Event, Filter } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { useVideoFeedStore, __clearFeedCache } from './useVideoFeed';

const sampleEvents: Event[] = [
  {
    id: '1',
    kind: 1,
    pubkey: 'pk1',
    created_at: 0,
    sig: 'sig1',
    tags: [],
    content: 'https://example.com/a.mp4'
  },
  {
    id: '2',
    kind: 1,
    pubkey: 'pk2',
    created_at: 0,
    sig: 'sig2',
    tags: [],
    content: 'https://example.com/b.mp4'
  }
];

const filters: Filter[] = [{ kinds: [1] }];

beforeEach(() => {
  useVideoFeedStore.setState({ events: [], index: 0, key: undefined });
  __clearFeedCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('setFilters caches results and avoids duplicate queries', async () => {
  const query = vi.spyOn(NostrService, 'query').mockResolvedValue(sampleEvents);
  const { setFilters } = useVideoFeedStore.getState();
  await setFilters(filters);
  await setFilters(filters);
  expect(query).toHaveBeenCalledTimes(1);
});

test('next and prev update index and preload links', async () => {
  vi.spyOn(NostrService, 'query').mockResolvedValue(sampleEvents);
  const { setFilters, next, prev } = useVideoFeedStore.getState();
  await setFilters(filters);
  expect(useVideoFeedStore.getState().index).toBe(0);
  // link for next video should be preloaded
  expect(
    document.head.querySelector('link[rel="preload"][href="https://example.com/b.mp4"]')
  ).toBeTruthy();
  next();
  expect(useVideoFeedStore.getState().index).toBe(1);
  // prev link should now be preloaded
  expect(
    document.head.querySelector('link[rel="preload"][href="https://example.com/a.mp4"]')
  ).toBeTruthy();
  prev();
  expect(useVideoFeedStore.getState().index).toBe(0);
});

