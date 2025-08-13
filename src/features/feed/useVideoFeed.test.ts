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

let connectSpy: any;
let querySpy: any;

beforeEach(() => {
  useVideoFeedStore.setState({ metadata: [], currentIndex: 0, key: undefined });
  __clearFeedCache();
  connectSpy = vi.spyOn(NostrService, 'connect').mockResolvedValue();
  querySpy = vi.spyOn(NostrService, 'query').mockResolvedValue(sampleEvents);
  vi.spyOn(videoService, 'isValidVideoUrl').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('setFilters caches results and avoids duplicate subscriptions', async () => {
  const subscribe = vi
    .spyOn(NostrService, 'subscribe')
    .mockResolvedValue(() => {});
  const { setFilters } = useVideoFeedStore.getState();
  await setFilters(filters);
  await setFilters(filters);
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(connectSpy).toHaveBeenCalledTimes(1);
  expect(querySpy).toHaveBeenCalled();
});

test('next and prev update index and preload videos', async () => {
  vi.spyOn(NostrService, 'subscribe').mockResolvedValue(() => {});
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

test('invalid video URLs are ignored', async () => {
  vi.spyOn(NostrService, 'subscribe').mockResolvedValue(() => {});
  (videoService.isValidVideoUrl as any).mockImplementation((url: string) =>
    Promise.resolve(url.includes('a.mp4')),
  );
  const { setFilters } = useVideoFeedStore.getState();
  await setFilters(filters);
  const state = useVideoFeedStore.getState();
  expect(state.metadata).toHaveLength(1);
  expect(state.metadata[0].id).toBe('1');
});

test('extracts URL from content with trailing text', async () => {
  vi.spyOn(NostrService, 'subscribe').mockResolvedValue(() => {});
  querySpy.mockResolvedValue([
    {
      id: '3',
      kind: 1,
      pubkey: 'pk3',
      created_at: 0,
      sig: 'sig3',
      tags: [],
      content: 'https://example.com/c.mp4%F0%9F%93%8A extra',
    } as Event,
  ]);
  const { setFilters } = useVideoFeedStore.getState();
  await setFilters(filters);
  const state = useVideoFeedStore.getState();
  expect(state.metadata[0].content).toBe('https://example.com/c.mp4');
});

