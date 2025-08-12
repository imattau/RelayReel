import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import useRemoteSigner from './useRemoteSigner';
import { useAuthStore } from './useAuth';

const { mockSetSigner, mockGetPool } = vi.hoisted(() => ({
  mockSetSigner: vi.fn(),
  mockGetPool: vi.fn()
}));

vi.mock('../../services/nostr', () => ({
  default: { getPool: mockGetPool, setSigner: mockSetSigner }
}));

const connect = vi.fn().mockResolvedValue(undefined);
const getPublicKey = vi.fn().mockResolvedValue('remote123');
const signEvent = vi.fn().mockResolvedValue({ id: '1' });
const close = vi.fn().mockResolvedValue(undefined);

vi.mock('nostr-tools/nip46', () => ({
  parseBunkerInput: vi.fn().mockResolvedValue({ relays: [], pubkey: 'remote', secret: null }),
  BunkerSigner: vi.fn().mockImplementation(() => ({
    connect,
    getPublicKey,
    signEvent,
    close
  }))
}));

beforeEach(() => {
  localStorage.clear();
  connect.mockClear();
  getPublicKey.mockClear();
  signEvent.mockClear();
  close.mockClear();
  mockSetSigner.mockClear();
  mockGetPool.mockClear();
  useAuthStore.setState({ pubkey: undefined, method: undefined, signer: undefined });
});

test('connectRemote persists session and allows signing', async () => {
  const { result } = renderHook(() => useRemoteSigner());
  await act(async () => {
    const pub = await result.current.connectRemote('input');
    expect(pub).toBe('remote123');
  });
  expect(localStorage.getItem('nip46-session')).toBeTruthy();
  await act(async () => {
    await result.current.signRemoteEvent({ kind: 1, created_at: 0, tags: [], content: '' });
  });
  expect(signEvent).toHaveBeenCalled();
});

test('restores session from storage', async () => {
  localStorage.setItem('nip46-session', JSON.stringify({ input: 'input', secret: 'aa' }));
  const { result } = renderHook(() => useRemoteSigner());
  await waitFor(() => expect(result.current.signer).toBeDefined());
  expect(connect).toHaveBeenCalled();
});
