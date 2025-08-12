import { create } from 'zustand';
import type { UnsignedEvent } from 'nostr-tools';
import NostrService from '../../services/nostr';

interface FollowsState {
  following: Set<string>;
  follow: (pubkey: string) => Promise<void>;
  unfollow: (pubkey: string) => Promise<void>;
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

export const useFollowsStore = create<FollowsState>((set, get) => ({
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
}));

export default function useFollows() {
  return useFollowsStore();
}

