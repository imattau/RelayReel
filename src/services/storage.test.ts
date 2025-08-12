import { describe, test, expect, vi } from 'vitest';

vi.mock('dexie', () => {
  class Table {
    private store = new Map<string, any>();
    async put(obj: any) {
      this.store.set(obj.id, obj);
    }
    orderBy() {
      const entries = this.store;
      return {
        first: async () => {
          const firstKey = [...entries.keys()].sort()[0];
          return firstKey ? entries.get(firstKey) : undefined;
        }
      } as any;
    }
    async delete(id: string) {
      this.store.delete(id);
    }
  }
  class DexieMock {
    videos = new Table();
    metadata = new Table();
    pendingUploads = new Table();
    zapReceipts = new Table();
    version() {
      return { stores: () => ({}) } as any;
    }
    transaction(_: any, __: any, fn: any) {
      return fn();
    }
  }
  return { default: DexieMock, Table };
});

vi.mock('./nostr', () => ({
  default: { publish: vi.fn(), verify: vi.fn() }
}));

import * as storage from './storage';
import NostrService from './nostr';

describe('processPendingUploads', () => {
  test('retries queued uploads and publishes metadata', async () => {
    const file = new Blob(['a'], { type: 'video/mp4' });
    const pending = {
      id: '1',
      endpoint: '/api/upload',
      file,
      creator: 'alice',
      caption: 'hello'
    };
    await storage.queueUpload(pending as any);
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.test/a.mp4' })
    });
    (NostrService.publish as any).mockResolvedValue({
      id: '1',
      kind: 1,
      pubkey: 'pk',
      created_at: 0,
      sig: 'sig',
      tags: [],
      content: 'https://cdn.test/a.mp4'
    });
    (NostrService.verify as any).mockReturnValue(true);

    await storage.processPendingUploads();

    expect(fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({ method: 'POST', body: file })
    );
    expect(NostrService.publish).toHaveBeenCalled();
  });
});
