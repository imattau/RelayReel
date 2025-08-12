import { beforeEach, expect, test, vi } from 'vitest';
import { useZapStore } from './useZap';

vi.mock('../../services/lightning', async () => {
  const actual = await vi.importActual<typeof import('../../services/lightning')>(
    '../../services/lightning',
  );
  return {
    ...actual,
    fetchInvoice: vi
      .fn()
      .mockResolvedValue({ invoice: 'lninv', metadata: {} }),
    sendZap: vi.fn().mockResolvedValue({ status: 'ok' }),
  };
});

vi.mock('../../services/nostr', () => ({
  __esModule: true,
  default: { publish: vi.fn().mockResolvedValue({ id: 'event1' }) },
}));

vi.mock('../../services/storage', () => ({
  getZapReceipts: vi.fn().mockResolvedValue([
    {
      id: 'r1',
      event: {
        pubkey: 'pubkey1',
        kind: 9735,
        created_at: 0,
        tags: [
          ['p', 'pubkey1'],
          ['amount', '21000'],
          ['e', 'video1'],
        ],
        content: '',
      },
      metadata: { creator: 'lnurl1', splits: [] },
      createdAt: 0,
    },
  ]),
}));

import { fetchInvoice, sendZap } from '../../services/lightning';
import NostrService from '../../services/nostr';
import { getZapReceipts } from '../../services/storage';

beforeEach(() => {
  useZapStore.setState({
    status: 'idle',
    error: undefined,
    totals: { byVideo: {}, byUser: {} },
  });
  vi.clearAllMocks();
});

test('zap fetches invoice, publishes event, sends payment, and aggregates totals', async () => {
  const { zap, status } = useZapStore.getState();
  expect(status).toBe('idle');
  await zap('lnurl1', 21, 'pubkey1', 'video1');
  expect(fetchInvoice).toHaveBeenCalledWith('lnurl1', 21);
  expect(NostrService.publish).toHaveBeenCalled();
  expect(sendZap).toHaveBeenCalledWith('lninv', { id: 'event1' }, 'lnurl1');
  expect(getZapReceipts).toHaveBeenCalled();
  expect(useZapStore.getState().status).toBe('success');
  expect(useZapStore.getState().totals.byVideo.video1).toBe(21);
  expect(useZapStore.getState().totals.byUser.lnurl1).toBe(21);
  useZapStore.getState().reset();
  expect(useZapStore.getState().status).toBe('idle');
  expect(useZapStore.getState().error).toBeUndefined();
});

