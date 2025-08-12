import { create } from 'zustand';
import type { UnsignedEvent } from 'nostr-tools';
import NostrService from '../../services/nostr';

interface ReactionsState {
  liked: Set<string>;
  toggleLike: (eventId: string, pubkey: string) => Promise<void>;
}

export const useReactionsStore = create<ReactionsState>((set, get) => ({
  liked: new Set<string>(),
  async toggleLike(eventId, pubkey) {
    const liked = new Set(get().liked);
    const hasLiked = liked.has(eventId);
    const content = hasLiked ? '-' : '+';
    const unsigned: UnsignedEvent = {
      kind: 7,
      content,
      tags: [
        ['e', eventId],
        ['p', pubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: '',
    };
    await NostrService.publish(unsigned);
    if (hasLiked) {
      liked.delete(eventId);
    } else {
      liked.add(eventId);
    }
    set({ liked });
  },
}));

export default function useReactions() {
  return useReactionsStore();
}

