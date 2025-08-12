import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import type { UnsignedEvent, Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import useAuth from '../auth/useAuth';

interface FollowsState {
  following: Set<string>;
  follow: (pubkey: string) => Promise<void>;
  unfollow: (pubkey: string) => Promise<void>;
  sync: (pubkey: string) => Promise<void>;
}

async function publishContacts(following: Set<string>) {
  const unsigned: UnsignedEvent = {
    kind: 3,
    content: '',
    tags: [...following].map((pk) => ['p', pk]),
    created_at: Math.floor(Date.now() / 1000),
    pubkey: '',
  };
  await NostrService.publish(unsigned);
}

let unsubscribe: (() => void) | undefined;
export const useFollowsStore = create<FollowsState>()(
  persist(
    (set, get) => ({
      following: new Set<string>(),
      async follow(pubkey) {
        if (get().following.has(pubkey)) return;
        const next = new Set(get().following);
        next.add(pubkey);
        await publishContacts(next);
        set({ following: next });
      },
      async unfollow(pubkey) {
        if (!get().following.has(pubkey)) return;
        const next = new Set(get().following);
        next.delete(pubkey);
        await publishContacts(next);
        set({ following: next });
      },
      async sync(pubkey) {
        if (unsubscribe || !pubkey) return;
        unsubscribe = await NostrService.subscribe(
          [{ kinds: [3], authors: [pubkey], limit: 1 }],
          {
            onEvent(event: Event) {
              const following = new Set(
                event.tags.filter((t) => t[0] === 'p').map((t) => t[1])
              );
              set({ following });
            },
          }
        );
      },
    }),
    {
      name: 'follows',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ following: Array.from(state.following) }),
      merge: (persisted: any, current) => ({
        ...current,
        following: new Set(persisted?.following || []),
      }),
    }
  )
);
export default function useFollows() {
  const { pubkey } = useAuth();
  const store = useFollowsStore();
  useEffect(() => {
    if (pubkey) {
      void store.sync(pubkey);
    }
  }, [pubkey, store]);
  return store;
}

