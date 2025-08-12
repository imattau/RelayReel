import { beforeEach, expect, test, vi } from 'vitest';
import { useZapStore } from './useZap';

vi.mock('../../services/lightning', () => ({
  fetchInvoice: vi.fn().mockResolvedValue({ invoice: 'lninv', metadata: {} }),
  sendZap: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

vi.mock('../../services/nostr', () => ({
  __esModule: true,
  default: { publish: vi.fn().mockResolvedValue({ id: 'event1' }) },
}));

import { fetchInvoice, sendZap } from '../../services/lightning';
import NostrService from '../../services/nostr';

beforeEach(() => {
  useZapStore.setState({ sending: false, error: undefined });
  vi.clearAllMocks();
});

test('zap fetches invoice, publishes event, and sends payment', async () => {
  const { zap, sending } = useZapStore.getState();
  expect(sending).toBe(false);
  await zap('lnurl1', 21, 'pubkey1');
  expect(fetchInvoice).toHaveBeenCalledWith('lnurl1', 21);
  expect(NostrService.publish).toHaveBeenCalled();
  expect(sendZap).toHaveBeenCalledWith('lninv', { id: 'event1' }, 'lnurl1');
  expect(useZapStore.getState().sending).toBe(false);
  expect(useZapStore.getState().error).toBeUndefined();
});

