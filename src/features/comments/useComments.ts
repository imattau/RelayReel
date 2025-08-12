import { create } from 'zustand';
import { useEffect } from 'react';
import type { Event, Filter, UnsignedEvent } from 'nostr-tools';
import NostrService from '../../services/nostr';

/**
 * Comment node representing an event with nested replies.
 */
export interface CommentNode {
  event: Event;
  replies: CommentNode[];
}

interface CommentsState {
  rootId?: string;
  comments: CommentNode[];
  byId: Map<string, CommentNode>;
  cursor?: number;
  hasMore: boolean;
  loading: boolean;
  setRoot: (id: string) => Promise<void>;
  loadComments: () => Promise<void>;
  addComment: (content: string) => Promise<Event>;
  replyTo: (parentId: string, content: string) => Promise<Event>;
}

let activeUnsub: (() => void) | undefined;

function findParentId(event: Event): string | undefined {
  const replyTag = event.tags.find((t) => t[0] === 'e' && t[3] === 'reply');
  return replyTag?.[1];
}

function integrateEvent(state: CommentsState, event: Event): CommentsState {
  if (state.byId.has(event.id)) return state;
  const node: CommentNode = { event, replies: [] };
  state.byId.set(event.id, node);
  const parentId = findParentId(event);
  if (parentId && state.byId.has(parentId)) {
    state.byId.get(parentId)!.replies.push(node);
  } else {
    state.comments.push(node);
    state.comments.sort((a, b) => a.event.created_at - b.event.created_at);
  }
  state.cursor =
    state.cursor === undefined
      ? event.created_at
      : Math.min(state.cursor, event.created_at);
  return state;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  rootId: undefined,
  comments: [],
  byId: new Map(),
  cursor: undefined,
  hasMore: true,
  loading: false,
  async setRoot(id: string) {
    if (get().rootId === id) return;
    activeUnsub?.();
    set({
      rootId: id,
      comments: [],
      byId: new Map(),
      cursor: undefined,
      hasMore: true,
      loading: false,
    });
    if (!id) return;
    const since = Math.floor(Date.now() / 1000);
    activeUnsub = await NostrService.subscribe(
      [{ kinds: [1], '#e': [id], since } as Filter],
      {
        onEvent: (e) => {
          set((s) => integrateEvent({ ...s }, e));
        },
      }
    );
  },
  async loadComments() {
    const { rootId, cursor, hasMore, loading } = get();
    if (!rootId || !hasMore || loading) return;
    set({ loading: true });
    const filter: Filter = { kinds: [1], '#e': [rootId], limit: 20 };
    if (cursor) filter.until = cursor - 1;
    try {
      const events = await NostrService.query([filter]);
      events.sort((a, b) => a.created_at - b.created_at);
      set((state) => {
        events.forEach((e) => integrateEvent(state, e));
        if (events.length < 20) state.hasMore = false;
        return { ...state };
      });
    } finally {
      set({ loading: false });
    }
  },
  async addComment(content: string) {
    const { rootId } = get();
    if (!rootId) throw new Error('no root');
    const unsigned: UnsignedEvent = {
      kind: 1,
      content,
      tags: [['e', rootId, '', 'root']],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: '',
    };
    const event = await NostrService.publish(unsigned);
    set((s) => integrateEvent({ ...s }, event));
    return event;
  },
  async replyTo(parentId: string, content: string) {
    const { rootId } = get();
    if (!rootId) throw new Error('no root');
    const unsigned: UnsignedEvent = {
      kind: 1,
      content,
      tags: [
        ['e', rootId, '', 'root'],
        ['e', parentId, '', 'reply'],
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: '',
    };
    const event = await NostrService.publish(unsigned);
    set((s) => integrateEvent({ ...s }, event));
    return event;
  },
}));

export default function useComments(rootId: string) {
  const { comments, loadComments, addComment, replyTo } = useCommentsStore();
  const setRoot = useCommentsStore((s) => s.setRoot);
  const cleanup = () => {
    setRoot('').catch(() => {});
  };
  useEffect(() => {
    setRoot(rootId).catch(() => {});
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId]);
  return { comments, loadComments, addComment, replyTo, cleanup };
}

