import { beforeEach, expect, test, vi } from 'vitest';
import type { Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { useFollowsStore } from './useFollows';

let publishMock: any;

beforeEach(() => {
  useFollowsStore.setState({ following: new Set() });
  publishMock?.mockRestore();
  publishMock = vi
    .spyOn(NostrService, 'publish')
    .mockResolvedValue({} as Event);
});

test('follow adds pubkey and publishes contact list', async () => {
  await useFollowsStore.getState().follow('pk1');
  expect(useFollowsStore.getState().following.has('pk1')).toBe(true);
  expect(publishMock).toHaveBeenCalledWith(
    expect.objectContaining({ tags: [['p', 'pk1']] })
  );
});

test('unfollow removes pubkey and publishes contact list', async () => {
  useFollowsStore.setState({ following: new Set(['pk1']) });
  await useFollowsStore.getState().unfollow('pk1');
  expect(useFollowsStore.getState().following.has('pk1')).toBe(false);
  expect(publishMock).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
});

