import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_DISABLE_NOSTR: 'true', NEXT_PUBLIC_DISABLE_WORKBOX: 'true' },
  },
});
