import { registerUploadRoute } from '../src/services/storage';
import { precacheAndRoute } from 'workbox-precaching';
import { setCatchHandler } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute([
  ...self.__WB_MANIFEST,
  { url: '/', revision: null },
  { url: '/favicon.ico', revision: null }
]);

registerUploadRoute();

setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    return (await caches.match('/')) ?? Response.error();
  }
  return Response.error();
});
