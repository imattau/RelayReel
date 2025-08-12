import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import type { UnsignedEvent, Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import useAuth from '../auth/useAuth';

interface ReactionsState {
  liked: Set<string>;
  toggleLike: (eventId: string, pubkey: string) => Promise<void>;
  sync: (pubkey: string) => Promise<void>;
}

let unsubscribe: (() => void) | undefined;

export const useReactionsStore = create<ReactionsState>()(
  persist(
    (set, get) => ({
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
      async sync(pubkey) {
        if (unsubscribe || !pubkey) return;
        unsubscribe = await NostrService.subscribe(
          [{ kinds: [7], authors: [pubkey] }],
          {
            onEvent(event: Event) {
              const eTag = event.tags.find((t) => t[0] === 'e');
              if (!eTag) return;
              const liked = new Set(get().liked);
              if (event.content === '+') {
                liked.add(eTag[1]);
              } else if (event.content === '-') {
                liked.delete(eTag[1]);
              }
              set({ liked });
            },
          }
        );
      },
    }),
    {
      name: 'reactions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ liked: Array.from(state.liked) }),
      merge: (persisted: any, current) => ({
        ...current,
        liked: new Set(persisted?.liked || []),
      }),
    }
  )
);

export default function useReactions() {
  const { pubkey } = useAuth();
  const store = useReactionsStore();
  useEffect(() => {
    if (pubkey) {
      void store.sync(pubkey);
    }
  }, [pubkey, store]);
  return store;
}

