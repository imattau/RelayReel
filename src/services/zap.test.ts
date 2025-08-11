import { describe, it, expect } from 'vitest';
import type { Event } from 'nostr-tools';
import { formatAmount, parseZapEvent } from './zap';

describe('formatAmount', () => {
  it('formats sats with separators', () => {
    expect(formatAmount(1234)).toBe('1,234 sats');
  });
});

describe('parseZapEvent', () => {
  it('extracts amount and sender', () => {
    const event: Event = {
      id: '1',
      pubkey: 'pub',
      created_at: 0,
      kind: 9735,
      tags: [['amount', '1000']],
      content: '',
      sig: '',
    };
    expect(parseZapEvent(event)).toEqual({ amount: 1, sender: 'pub' });
  });
});
