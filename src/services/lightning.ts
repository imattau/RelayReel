import { requestInvoice, utils } from 'lnurl-pay';
import type { Event } from 'nostr-tools';
import type { ZapSplit, ZapMetadata } from './storage';

const HOST_SPLIT = 0.01; // 1%

function getHostLnAddress(): string | undefined {
  let addr: string | undefined = process.env.HOST_LN_ADDRESS;
  if (!addr) {
    try {
      addr = require('../../config/host-share.json').hostLnAddress as string;
    } catch {
      addr = undefined;
    }
  }
  return addr;
}

export interface InvoiceResult {
  invoice: string;
  metadata: unknown;
}

export async function fetchInvoice(lnurl: string, amount: number): Promise<InvoiceResult> {
  const { invoice, params } = await requestInvoice({
    lnUrlOrAddress: lnurl,
    tokens: utils.toSats(amount),
  });
  return { invoice, metadata: params };
}

export interface ZapStatus {
  status: 'ok' | 'error';
  data?: unknown;
}

export async function sendZap(
  invoice: string,
  nostrEvent: Event,
  creatorAddress: string
): Promise<ZapStatus> {
  const hostAddr = getHostLnAddress();
  const amtTag = nostrEvent.tags.find((t) => t[0] === 'amount');
  const msats = amtTag ? parseInt(amtTag[1], 10) : 0;
  let split: ZapSplit | undefined;

  if (hostAddr && msats > 0) {
    const hostMsats = Math.floor(msats * HOST_SPLIT);
    const hostSats = Math.floor(hostMsats / 1000);
    if (hostSats > 0) {
      const { invoice: hostInvoice } = await fetchInvoice(hostAddr, hostSats);
      await fetch('/api/bolt11', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: hostInvoice }),
      });
      nostrEvent = {
        ...nostrEvent,
        tags: [...nostrEvent.tags, ['zap_split', hostAddr, hostMsats.toString()]],
      };
      split = { address: hostAddr, amount: hostSats };
    }
  }

  const res = await fetch('/api/bolt11', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice, nostr: nostrEvent }),
  });
  if (!res.ok) {
    return { status: 'error', data: await res.text() };
  }

  const { saveZapReceipt } = await import('./storage');
  const metadata: ZapMetadata = {
    creator: creatorAddress,
    splits: split ? [split] : [],
  };
  await saveZapReceipt({
    id: (nostrEvent as any).id ?? crypto.randomUUID(),
    event: nostrEvent,
    metadata,
    createdAt: Date.now(),
  });

  return { status: 'ok', data: await res.json() };
}

export function formatAmount(amount: number): string {
  return `${Intl.NumberFormat().format(amount)} sats`;
}

export interface ParsedZapEvent {
  amount: number;
  sender: string;
  splits: ZapSplit[];
}

export function parseZapEvent(event: Event): ParsedZapEvent {
  const amtTag = event.tags.find((t) => t[0] === 'amount');
  const msats = amtTag ? parseInt(amtTag[1], 10) : 0;
  const splits = event.tags
    .filter((t) => t[0] === 'zap_split')
    .map((t) => ({ address: t[1], amount: parseInt(t[2], 10) / 1000 }));
  return { amount: msats / 1000, sender: event.pubkey, splits };
}
