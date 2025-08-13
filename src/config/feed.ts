const DEFAULT_FEED_WINDOW_DAYS = 7;

export const FEED_WINDOW_DAYS = Number(
  process.env.NEXT_PUBLIC_FEED_WINDOW_DAYS ?? DEFAULT_FEED_WINDOW_DAYS
);

export function feedSince(): number {
  return Math.floor(Date.now() / 1000) - FEED_WINDOW_DAYS * 24 * 60 * 60;
}

