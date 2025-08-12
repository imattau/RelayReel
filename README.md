# RelayReel
Nostr based short videos

Visit the home feed at `/home`.

## Development
Start the Next.js dev server on all network interfaces:

```bash
pnpm dev
```

## Feature Hook Usage
- **useAuth**: establishes a signer (browser NIP-07 or remote NIP-46) and connects to the user's preferred relays via `NostrService.connect`.
- **useVideoFeed**: queries initial video events with `NostrService.query` and listens for updates via `NostrService.subscribe`. Components that can tolerate delayed updates may pass a debounce interval to avoid rapid re-renders.
- **useZap**: signs and publishes zap events through `NostrService.publish`, also subscribing for zap receipts. The service queues calls per relay so hooks should always reuse it rather than creating their own pool.
- **useUploadVideo**: uploads media and publishes metadata using `NostrService.publish`, verifying published events with `NostrService.verify`.
- **Data fetching hooks** should call `NostrService.query` so identical filters share a single in-flight request, preventing parallel relay queries.
