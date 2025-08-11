# RelayReel
Nostr based short videos

## Feature Hook Usage
- **useAuth**: establishes a signer (browser NIP-07 or remote NIP-46) and connects to the user's preferred relays via `NostrService.connect`.
- **useVideoFeed**: fetches and listens for video events by calling `NostrService.subscribe` with feed filters.
- **useZap**: signs and publishes zap events through `NostrService.publish`, also subscribing for zap receipts.
- **useUploadVideo**: uploads media and publishes metadata using `NostrService.publish`, verifying published events with `NostrService.verify`.
