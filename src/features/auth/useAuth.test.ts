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

test('login requests pubkey and signs once, storing session', async () => {
  const getPublicKey = vi.fn().mockResolvedValue('npub123');
  const signEvent = vi.fn().mockResolvedValue({});
  const fakeSigner = { getPublicKey, signEvent };
  // eslint-disable-next-line
  (globalThis as any).nostr = fakeSigner;

  const { login } = useAuthStore.getState();
  const [a, b] = await Promise.all([login(), login()]);

  expect(a).toBe('npub123');
  expect(b).toBe('npub123');
  expect(getPublicKey).toHaveBeenCalledTimes(1);
  expect(signEvent).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState().pubkey).toBe('npub123');
  expect(useAuthStore.getState().method).toBe('nip07');
});
