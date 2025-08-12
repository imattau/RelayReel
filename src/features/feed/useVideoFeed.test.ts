import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { Event, Filter } from 'nostr-tools';
import NostrService from '../../services/nostr';
import * as videoService from '../../services/video';
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
  useVideoFeedStore.setState({ metadata: [], currentIndex: 0, key: undefined });
  __clearFeedCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('setFilters caches results and avoids duplicate subscriptions', async () => {
  const subscribe = vi
    .spyOn(NostrService, 'subscribe')
    .mockImplementation(async (_filters, handlers) => {
      sampleEvents.forEach((e) => handlers.onEvent(e));
      handlers.onEose?.();
      return () => {};
    });
  const { setFilters } = useVideoFeedStore.getState();
  await setFilters(filters);
  await setFilters(filters);
  expect(subscribe).toHaveBeenCalledTimes(1);
});

test('next and prev update index and preload videos', async () => {
  vi.spyOn(NostrService, 'subscribe').mockImplementation(async (_f, handlers) => {
    sampleEvents.forEach((e) => handlers.onEvent(e));
    handlers.onEose?.();
    return () => {};
  });
  const preloadSpy = vi
    .spyOn(videoService, 'preloadVideo')
    .mockImplementation(() => {});
  const { setFilters, next, prev } = useVideoFeedStore.getState();
  await setFilters(filters);
  expect(useVideoFeedStore.getState().currentIndex).toBe(0);
  expect(preloadSpy).toHaveBeenCalledWith('https://example.com/b.mp4');
  next();
  expect(useVideoFeedStore.getState().currentIndex).toBe(1);
  expect(preloadSpy).toHaveBeenCalledWith('https://example.com/a.mp4');
  prev();
  expect(useVideoFeedStore.getState().currentIndex).toBe(0);
});

