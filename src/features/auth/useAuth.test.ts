import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { useAuthStore } from './useAuth';

beforeEach(() => {
  useAuthStore.setState({ pubkey: undefined, method: undefined, signer: undefined });
});

afterEach(() => {
  // cleanup global nostr and store
  // eslint-disable-next-line
  delete (globalThis as any).nostr;
});

test('connectExtension requests pubkey once and stores session', async () => {
  const getPublicKey = vi.fn().mockResolvedValue('npub123');
  const fakeSigner = { getPublicKey, signEvent: vi.fn() };
  // eslint-disable-next-line
  (globalThis as any).nostr = fakeSigner;

  const { connectExtension } = useAuthStore.getState();
  const [a, b] = await Promise.all([connectExtension(), connectExtension()]);

  expect(a).toBe('npub123');
  expect(b).toBe('npub123');
  expect(getPublicKey).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().pubkey).toBe('npub123');
  expect(useAuthStore.getState().method).toBe('nip07');
});
