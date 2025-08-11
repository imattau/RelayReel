import Dexie, { Table } from 'dexie';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { NetworkOnly } from 'workbox-strategies';
import { registerRoute as wbRegisterRoute } from 'workbox-routing';
export { precacheAndRoute as precache } from 'workbox-precaching';
export { wbRegisterRoute as registerRoute };

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
}

class AppDatabase extends Dexie {
  videos!: Table<Video, string>;
  metadata!: Table<Metadata, string>;
  pendingUploads!: Table<PendingUpload, string>;
}

const db = new AppDatabase('relayreel');
db.version(1).stores({
  videos: '&id',
  metadata: '&id',
  pendingUploads: '&id'
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

const uploadSync = new BackgroundSyncPlugin('pendingUploads', {
  onSync: async () => {
    let next: PendingUpload | undefined;
    // Retry uploads until queue empty
    while ((next = await dequeueUpload())) {
      await fetch(next.endpoint, { method: 'POST', body: next.file });
    }
  }
});

const recordFailure = {
  fetchDidFail: async ({ request }: { request: Request }) => {
    const body = await request.clone().blob();
    await queueUpload({
      id: crypto.randomUUID(),
      endpoint: request.url,
      file: body
    });
  }
};

export function registerUploadRoute(): void {
  wbRegisterRoute(
    ({ url }) => url.pathname.startsWith('/api/upload'),
    new NetworkOnly({ plugins: [uploadSync, recordFailure] }),
    'POST'
  );
}
