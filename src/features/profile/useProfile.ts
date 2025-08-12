import { create } from 'zustand';
import type { UnsignedEvent, Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { getZapReceipts } from '../../services/storage';
import { parseZapEvent } from '../../services/lightning';
import { useAuthStore } from '../auth/useAuth';

/**
 * Shape of the profile store returned by {@link useProfile}.
 */
export interface ProfileState {
  /** Profile image URL */
  avatar?: string;
  /** Short bio or description */
  bio?: string;
  /** Sum of received zap amounts */
  zapTotal: number;
  /** Fetch metadata and zap receipts for a given pubkey */
  loadProfile: (pubkey: string) => Promise<void>;
  /** Publish updated profile metadata */
  updateProfile: (data: { avatar?: string; bio?: string }) => Promise<void>;
  /** Clear profile state and sign the user out */
  signOut: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  avatar: undefined,
  bio: undefined,
  zapTotal: 0,
  async loadProfile(pubkey) {
    // fetch latest metadata event
    const events = await NostrService.query([
      { kinds: [0], authors: [pubkey], limit: 1 },
    ]);
    let avatar: string | undefined;
    let bio: string | undefined;
    if (events.length > 0) {
      try {
        const content = JSON.parse(events[0].content || '{}');
        avatar = content.picture;
        bio = content.about;
      } catch {
        // ignore malformed metadata
      }
    }
    // aggregate zap totals from recent receipts
    const receipts = await getZapReceipts();
    let total = 0;
    for (const r of receipts) {
      if (r.metadata.creator === pubkey) {
        total += parseZapEvent(r.event).amount;
      }
    }
    set({ avatar, bio, zapTotal: total });
  },
  async updateProfile(data) {
    const { pubkey } = useAuthStore.getState();
    if (!pubkey) throw new Error('not logged in');
    const current = get();
    const content = JSON.stringify({
      picture: data.avatar ?? current.avatar,
      about: data.bio ?? current.bio,
    });
    const event: UnsignedEvent = {
      pubkey: '',
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content,
    };
    const signed: Event = await NostrService.publish(event);
    set({
      avatar: JSON.parse(signed.content).picture,
      bio: JSON.parse(signed.content).about,
    });
  },
  signOut() {
    useAuthStore.getState().logout();
    set({ avatar: undefined, bio: undefined, zapTotal: 0 });
  },
}));

/**
 * Access the profile store containing metadata and helpers.
 *
 * @returns {ProfileState} Current profile state and actions.
 */
export default function useProfile(): ProfileState {
  return useProfileStore();
}
