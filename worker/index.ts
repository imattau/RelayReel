import { registerUploadRoute } from '../src/services/storage';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute([
  ...self.__WB_MANIFEST,
  { url: '/', revision: null },
  { url: '/favicon.ico', revision: null }
]);

registerUploadRoute();
