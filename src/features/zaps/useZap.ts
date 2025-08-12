import { create } from 'zustand';
import type { UnsignedEvent, Event } from 'nostr-tools';
import NostrService from '../../services/nostr';
import {
  fetchInvoice,
  sendZap,
  parseZapEvent,
} from '../../services/lightning';
import { getZapReceipts } from '../../services/storage';

interface ZapTotals {
  byVideo: Record<string, number>;
  byUser: Record<string, number>;
}

interface ZapState {
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
  totals: ZapTotals;
  zap: (
    lnurl: string,
    amount: number,
    recipientPubkey: string,
    videoId?: string,
  ) => Promise<void>;
  loadTotals: () => Promise<void>;
  reset: () => void;
}

function aggregate(receipts: Awaited<ReturnType<typeof getZapReceipts>>): ZapTotals {
  const totals: ZapTotals = { byVideo: {}, byUser: {} };
  for (const r of receipts) {
    const { amount } = parseZapEvent(r.event);
    const videoTag = r.event.tags.find((t) => t[0] === 'e');
    if (videoTag) {
      totals.byVideo[videoTag[1]] = (totals.byVideo[videoTag[1]] || 0) + amount;
    }
    const user = r.metadata.creator;
    totals.byUser[user] = (totals.byUser[user] || 0) + amount;
  }
  return totals;
}

export const useZapStore = create<ZapState>((set, get) => ({
  status: 'idle',
  error: undefined,
  totals: { byVideo: {}, byUser: {} },
  async loadTotals() {
    const receipts = await getZapReceipts();
    set({ totals: aggregate(receipts) });
  },
  async zap(lnurl, amount, recipientPubkey, videoId) {
    set({ status: 'pending', error: undefined });
    try {
      const { invoice } = await fetchInvoice(lnurl, amount);
      const tags: string[][] = [
        ['p', recipientPubkey],
        ['bolt11', invoice],
        ['amount', String(amount * 1000)],
      ];
      if (videoId) {
        tags.push(['e', videoId]);
      }
      const event: UnsignedEvent = {
        pubkey: '',
        kind: 9735,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: '',
      };
      const signed: Event = await NostrService.publish(event);
      const res = await sendZap(invoice, signed, lnurl);
      if (res.status !== 'ok') {
        throw new Error(String(res.data));
      }
      await get().loadTotals();
      set({ status: 'success' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },
  reset() {
    set({ status: 'idle', error: undefined });
  },
}));

export default function useZap() {
  return useZapStore();
}
