import { create } from 'zustand';
import type { EventTemplate } from 'nostr-tools';
import NostrService, {
  type Nip07Signer,
  type Nip46Signer,
} from '../../services/nostr';

export type AuthMethod = 'nip07' | 'nip46';

interface AuthState {
  pubkey?: string;
  method?: AuthMethod;
  signer?: Nip07Signer | Nip46Signer;
  login: () => Promise<string>;
  logout: () => void;
  setSigner: (
    pubkey: string,
    signer: Nip07Signer | Nip46Signer,
    method: AuthMethod
  ) => void;
}

let loginRequest: Promise<string> | undefined;

export const useAuthStore = create<AuthState>((set, get) => ({
  async login() {
    const current = get();
    if (current.signer && current.method === 'nip46' && current.pubkey) {
      return current.pubkey;
    }

    const nostr = (globalThis as any).nostr as Nip07Signer | undefined;
    if (!nostr || typeof nostr.getPublicKey !== 'function' || typeof nostr.signEvent !== 'function') {
      throw new Error('NIP-07 extension not available');
    }
    if (!loginRequest) {
      loginRequest = (async () => {
        const pubkey = await nostr.getPublicKey();
        // request signing permission with a lightweight dummy event
        await nostr.signEvent({
          kind: 27235,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: '',
        } as EventTemplate);
        set({ pubkey, method: 'nip07', signer: nostr });
        NostrService.setSigner(nostr);
        return pubkey;
      })();
    }
    return loginRequest;
  },
  logout() {
    loginRequest = undefined;
    set({ pubkey: undefined, method: undefined, signer: undefined });
    NostrService.setSigner();
  },
  setSigner(pubkey, signer, method) {
    set({ pubkey, signer, method });
    NostrService.setSigner(signer);
  },
}));

export default function useAuth() {
  return useAuthStore();
}
