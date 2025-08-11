import { describe, it, expect } from 'vitest';
import type { Event } from 'nostr-tools';
import { formatAmount, parseZapEvent } from './lightning';

describe('formatAmount', () => {
  it('formats sats with separators', () => {
    expect(formatAmount(1234)).toBe('1,234 sats');
  });
});

describe('parseZapEvent', () => {
  it('extracts amount, sender, and splits', () => {
    const event: Event = {
      id: '1',
      pubkey: 'pub',
      created_at: 0,
      kind: 9735,
      tags: [
        ['amount', '100000'],
        ['zap_split', 'host', '1000']
      ],
      content: '',
      sig: '',
    };
    expect(parseZapEvent(event)).toEqual({
      amount: 100,
      sender: 'pub',
      splits: [{ address: 'host', amount: 1 }]
    });
  });
});
