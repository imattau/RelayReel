import { create } from 'zustand';
import NostrService, {
  type Nip07Signer,
  type Nip46Signer,
} from '../../services/nostr';

export type AuthMethod = 'nip07' | 'nip46';

interface AuthState {
  pubkey?: string;
  method?: AuthMethod;
  signer?: Nip07Signer | Nip46Signer;
  connectExtension: () => Promise<string>;
  logout: () => void;
  setSigner: (pubkey: string, signer: Nip07Signer | Nip46Signer, method: AuthMethod) => void;
}

let nip07Request: Promise<string> | undefined;

export const useAuthStore = create<AuthState>((set) => ({
  async connectExtension() {
    const nostr = (globalThis as any).nostr as Nip07Signer | undefined;
    if (!nostr) {
      throw new Error('NIP-07 extension not available');
    }
    if (!nip07Request) {
      nip07Request = nostr.getPublicKey().then((pubkey) => {
        set({ pubkey, method: 'nip07', signer: nostr });
        NostrService.setSigner(nostr);
        return pubkey;
      });
    }
    return nip07Request;
  },
  logout() {
    nip07Request = undefined;
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
