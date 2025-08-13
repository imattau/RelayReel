import { vi } from 'vitest';
import { feedSince, FEED_WINDOW_DAYS } from './feed';

describe('feedSince', () => {
  it('returns timestamp limited by FEED_WINDOW_DAYS', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-08T00:00:00Z');
    vi.setSystemTime(now);
    const since = feedSince();
    const expected = Math.floor(now.getTime() / 1000 - FEED_WINDOW_DAYS * 24 * 60 * 60);
    expect(since).toBe(expected);
    vi.useRealTimers();
  });
});

