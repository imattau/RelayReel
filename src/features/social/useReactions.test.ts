import { beforeEach, expect, test, vi } from 'vitest';
import type { Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { useReactionsStore } from './useReactions';

let publishMock: any;

beforeEach(() => {
  useReactionsStore.setState({ liked: new Set() });
  publishMock?.mockRestore();
  publishMock = vi
    .spyOn(NostrService, 'publish')
    .mockResolvedValue({} as Event);
});

test('toggleLike publishes like and unlike events', async () => {
  await useReactionsStore.getState().toggleLike('e1', 'p1');
  expect(publishMock).toHaveBeenCalledWith(
    expect.objectContaining({ content: '+' })
  );
  expect(useReactionsStore.getState().liked.has('e1')).toBe(true);

  await useReactionsStore.getState().toggleLike('e1', 'p1');
  expect(publishMock).toHaveBeenCalledWith(
    expect.objectContaining({ content: '-' })
  );
  expect(useReactionsStore.getState().liked.has('e1')).toBe(false);
  expect(publishMock).toHaveBeenCalledTimes(2);
});

