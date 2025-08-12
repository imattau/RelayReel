import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { useCommentsStore } from './useComments';

const rootId = 'root';

const top: Event = {
  id: 'c1',
  kind: 1,
  pubkey: 'pk',
  created_at: 2,
  sig: 'sig',
  tags: [['e', rootId, '', 'root']],
  content: 'top',
};

const reply: Event = {
  id: 'c2',
  kind: 1,
  pubkey: 'pk',
  created_at: 3,
  sig: 'sig',
  tags: [
    ['e', rootId, '', 'root'],
    ['e', 'c1', '', 'reply'],
  ],
  content: 'reply',
};

const older: Event = {
  id: 'c0',
  kind: 1,
  pubkey: 'pk',
  created_at: 1,
  sig: 'sig',
  tags: [['e', rootId, '', 'root']],
  content: 'older',
};

beforeEach(() => {
  useCommentsStore.setState({
    rootId,
    comments: [],
    byId: new Map(),
    cursor: undefined,
    hasMore: true,
    loading: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('loadComments builds threaded structure', async () => {
  vi.spyOn(NostrService, 'query').mockResolvedValue([top, reply, older]);
  await useCommentsStore.getState().loadComments();
  const state = useCommentsStore.getState();
  expect(state.comments).toHaveLength(2);
  expect(state.comments[0].event.id).toBe('c0');
  expect(state.comments[1].event.id).toBe('c1');
  expect(state.comments[1].replies[0].event.id).toBe('c2');
  expect(state.cursor).toBe(1);
  expect(state.hasMore).toBe(false);
});

test('addComment publishes and adds to store', async () => {
  vi.spyOn(NostrService, 'publish').mockResolvedValue(top);
  await useCommentsStore.getState().addComment('top');
  expect(useCommentsStore.getState().comments[0].event.id).toBe('c1');
});

test('replyTo attaches reply to parent', async () => {
  const topNode = { event: top, replies: [] as any[] };
  useCommentsStore.setState({
    rootId,
    comments: [topNode],
    byId: new Map([[top.id, topNode]]),
    cursor: 2,
    hasMore: true,
    loading: false,
  });
  vi.spyOn(NostrService, 'publish').mockResolvedValue(reply);
  await useCommentsStore.getState().replyTo('c1', 'reply');
  expect(useCommentsStore.getState().comments[0].replies[0].event.id).toBe('c2');
});

test('loadComments stops when no more events', async () => {
  const spy = vi
    .spyOn(NostrService, 'query')
    .mockResolvedValueOnce([top])
    .mockResolvedValue([]);
  await useCommentsStore.getState().loadComments();
  await useCommentsStore.getState().loadComments();
  expect(spy).toHaveBeenCalledTimes(1);
});

