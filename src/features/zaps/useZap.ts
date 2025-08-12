import { create } from 'zustand';
import type { UnsignedEvent, Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { fetchInvoice, sendZap } from '../../services/lightning';

interface ZapState {
  sending: boolean;
  error?: string;
  zap: (
    lnurl: string,
    amount: number,
    recipientPubkey: string
  ) => Promise<void>;
}

export const useZapStore = create<ZapState>((set) => ({
  sending: false,
  error: undefined,
  async zap(lnurl, amount, recipientPubkey) {
    set({ sending: true, error: undefined });
    try {
      const { invoice } = await fetchInvoice(lnurl, amount);
      const event: UnsignedEvent = {
        pubkey: '',
        kind: 9735,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', recipientPubkey],
          ['bolt11', invoice],
          ['amount', String(amount * 1000)],
        ],
        content: '',
      };
      const signed: Event = await NostrService.publish(event);
      const res = await sendZap(invoice, signed, lnurl);
      if (res.status !== 'ok') {
        throw new Error(String(res.data));
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ sending: false });
    }
  },
}));

export default function useZap() {
  return useZapStore();
}
