import { beforeEach, expect, test, vi } from 'vitest';
import { useProfileStore } from './useProfile';
import { useAuthStore } from '../auth/useAuth';
import NostrService from '../../services/nostr';
import { getZapReceipts } from '../../services/storage';
import { parseZapEvent } from '../../services/lightning';

vi.mock('../../services/nostr', () => ({ default: { query: vi.fn(), publish: vi.fn() } }));
vi.mock('../../services/storage', () => ({ getZapReceipts: vi.fn() }));
vi.mock('../../services/lightning', () => ({ parseZapEvent: vi.fn() }));

beforeEach(() => {
  useProfileStore.setState({ avatar: undefined, bio: undefined, zapTotal: 0 });
});

test('loadProfile populates metadata and zap totals', async () => {
  const nostr = vi.mocked(NostrService);
  nostr.query.mockResolvedValue([
    { content: JSON.stringify({ picture: 'a', about: 'b' }) } as any,
  ]);
  vi.mocked(getZapReceipts).mockResolvedValue([
    { event: {}, metadata: { creator: 'pub' } } as any,
  ]);
  vi.mocked(parseZapEvent).mockReturnValue({ amount: 42 } as any);

  await useProfileStore.getState().loadProfile('pub');

  const state = useProfileStore.getState();
  expect(state.avatar).toBe('a');
  expect(state.bio).toBe('b');
  expect(state.zapTotal).toBe(42);
});

test('signOut clears state and invokes auth logout', () => {
  const logout = vi.fn();
  useAuthStore.setState({ logout } as any);
  useProfileStore.setState({ avatar: 'x', bio: 'y', zapTotal: 9 });

  useProfileStore.getState().signOut();

  expect(logout).toHaveBeenCalled();
  expect(useProfileStore.getState()).toMatchObject({
    avatar: undefined,
    bio: undefined,
    zapTotal: 0,
  });
});

test('updateProfile publishes metadata event', async () => {
  useAuthStore.setState({ pubkey: 'pub', logout: vi.fn() } as any);
  const nostr = vi.mocked(NostrService);
  nostr.publish.mockResolvedValue({
    content: JSON.stringify({ picture: 'new', about: 'bio' }),
  } as any);

  await useProfileStore.getState().updateProfile({ avatar: 'new', bio: 'bio' });

  expect(nostr.publish).toHaveBeenCalled();
  expect(useProfileStore.getState().avatar).toBe('new');
});
