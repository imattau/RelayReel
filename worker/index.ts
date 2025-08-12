import { precache, registerUploadRoute } from '../src/services/storage';

declare let self: ServiceWorkerGlobalScope;

precache(self.__WB_MANIFEST);
registerUploadRoute();
