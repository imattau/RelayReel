import Dexie, { Table } from 'dexie';
import type { Event, UnsignedEvent } from 'nostr-tools';
import NostrService from './nostr';

const DISABLE_WORKBOX = process.env.NEXT_PUBLIC_DISABLE_WORKBOX === 'true';

let BackgroundSyncPlugin: any;
let NetworkOnly: any;
let wbRegisterRoute: any;
let precacheAndRoute: any;

async function loadWorkbox(): Promise<void> {
  if (DISABLE_WORKBOX || wbRegisterRoute) return;
  ({ BackgroundSyncPlugin } = await import('workbox-background-sync'));
  ({ NetworkOnly } = await import('workbox-strategies'));
  ({ registerRoute: wbRegisterRoute } = await import('workbox-routing'));
  ({ precacheAndRoute } = await import('workbox-precaching'));
}

export async function precache(...args: any[]): Promise<void> {
  await loadWorkbox();
  if (!DISABLE_WORKBOX) precacheAndRoute(...args);
}

export async function registerRoute(...args: any[]): Promise<void> {
  await loadWorkbox();
  if (!DISABLE_WORKBOX) wbRegisterRoute(...args);
}

export interface Video {
  id: string;
  blob: Blob;
}

export interface Metadata {
  id: string;
  creator: string;
  caption: string;
}

export interface PendingUpload {
  id: string;
  endpoint: string;
  file: Blob;
  creator: string;
  caption: string;
}

export interface ZapSplit {
  address: string;
  amount: number; // sats
}

export interface ZapMetadata {
  creator: string;
  splits: ZapSplit[];
}

export interface ZapReceipt {
  id: string;
  event: Event;
  metadata: ZapMetadata;
  createdAt: number;
}

class AppDatabase extends Dexie {
  videos!: Table<Video, string>;
  metadata!: Table<Metadata, string>;
  pendingUploads!: Table<PendingUpload, string>;
  zapReceipts!: Table<ZapReceipt, string>;
}

const db = new AppDatabase('relayreel');
db.version(1).stores({
  videos: '&id',
  metadata: '&id',
  pendingUploads: '&id',
});
db.version(2).stores({
  videos: '&id',
  metadata: '&id',
  pendingUploads: '&id',
  zapReceipts: '&id, createdAt',
});

db.version(3).stores({
  videos: '&id',
  metadata: '&id',
  pendingUploads: '&id',
  zapReceipts: '&id, createdAt',
});

export async function saveVideo(
  video: Video,
  meta: Metadata
): Promise<void> {
  await db.transaction('rw', db.videos, db.metadata, async () => {
    await db.videos.put(video);
    await db.metadata.put(meta);
  });
}

export async function getFeed(): Promise<
  Array<{ video: Video; metadata?: Metadata }>
> {
  const videos = await db.videos.toArray();
  const metas = await db.metadata.bulkGet(videos.map((v) => v.id));
  return videos.map((video, idx) => ({ video, metadata: metas[idx] }));
}

export async function queueUpload(upload: PendingUpload): Promise<void> {
  await db.pendingUploads.put(upload);
}

export async function dequeueUpload(): Promise<PendingUpload | undefined> {
  const first = await db.pendingUploads.orderBy('id').first();
  if (first) {
    await db.pendingUploads.delete(first.id);
  }
  return first;
}

export async function saveZapReceipt(receipt: ZapReceipt): Promise<void> {
  await db.zapReceipts.put(receipt);
}

export async function getZapReceipts(limit = 20): Promise<ZapReceipt[]> {
  return db.zapReceipts.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function processPendingUploads(): Promise<void> {
  let next: PendingUpload | undefined;
  while ((next = await dequeueUpload())) {
    try {
      const res = await fetch(next.endpoint, {
        method: 'POST',
        body: next.file,
        headers: { 'Content-Type': next.file.type }
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const event: UnsignedEvent = {
        pubkey: '',
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', next.creator],
          ['caption', next.caption]
        ],
        content: url
      };
      const signed = await NostrService.publish(event);
      if (!NostrService.verify(signed)) throw new Error('Invalid event');
    } catch {
      await queueUpload(next);
      break;
    }
  }
}

let uploadSync: any;

const recordFailure = {
  fetchDidFail: async ({ request }: { request: Request }) => {
    const body = await request.clone().blob();
    await queueUpload({
      id: crypto.randomUUID(),
      endpoint: request.url,
      file: body,
      creator: '',
      caption: ''
    });
  }
};

export async function registerUploadRoute(): Promise<void> {
  await loadWorkbox();
  if (DISABLE_WORKBOX) return;
  if (!uploadSync) {
    uploadSync = new BackgroundSyncPlugin('pendingUploads', {
      onSync: processPendingUploads
    });
  }
  wbRegisterRoute(
    ({ url }: { url: URL }) => url.pathname.startsWith('/api/upload'),
    new NetworkOnly({ plugins: [uploadSync, recordFailure] }),
    'POST'
  );
}
