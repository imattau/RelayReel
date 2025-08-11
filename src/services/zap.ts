import { requestInvoice, utils } from 'lnurl-pay';
import type { Event } from 'nostr-tools';

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

export async function sendZap(invoice: string, nostrEvent: Event): Promise<ZapStatus> {
  const res = await fetch('/api/bolt11', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice, nostr: nostrEvent }),
  });
  if (!res.ok) {
    return { status: 'error', data: await res.text() };
  }
  return { status: 'ok', data: await res.json() };
}

export function formatAmount(amount: number): string {
  return `${Intl.NumberFormat().format(amount)} sats`;
}

export function parseZapEvent(event: Event): { amount: number; sender: string } {
  const amtTag = event.tags.find((t) => t[0] === 'amount');
  const msats = amtTag ? parseInt(amtTag[1], 10) : 0;
  return { amount: msats / 1000, sender: event.pubkey };
}
