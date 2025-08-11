## Project Specification — RelayReel

### Overview
RelayReel is a TikTok‑style short‑video Progressive Web App powered by the Nostr protocol. The app delivers a swipeable feed of clips, allows creators to upload and receive zaps (Lightning payments), and supports offline usage through PWA features. All code must be resource‑aware, minimizing network and server load and fitting within device memory and storage constraints while maintaining responsiveness.

### Goals
1. **Mobile‑first PWA** with installability, offline caching, and fast startup.
2. **Nostr‑based social graph** for posts, reactions, follows, and zap receipts.
3. **Clear separation of concerns**: presentational components, feature hooks, and service wrappers.
4. **Resource‑aware implementation**: evaluate network usage, server load, device memory and storage, and responsiveness before writing code.

### Tech Stack
| Layer/Concern            | Library/Framework                |
|-------------------------|----------------------------------|
| Build & Routing         | Next.js (with `next-pwa`)        |
| UI                      | React + Tailwind CSS             |
| Animation & Gestures    | Framer Motion                    |
| State Management        | Zustand                          |
| Data Storage            | Dexie (IndexedDB)                |
| Nostr Integration       | nostr-tools                      |
| Video Playback          | react-player                     |
| Payments (Lightning)    | lnurl-pay + nostr-tools          |
| Testing                 | Vitest/Jest + Playwright         |

### High-Level Architecture
```
src/
 ├─ components/           # Pure presentation; no side effects
 ├─ features/
 │   ├─ feed/             # useVideoFeed, swipe logic
 │   ├─ zaps/             # useZap, zap totals
 │   ├─ upload/           # useUploadVideo
 │   └─ auth/             # useAuth (NIP-07)
 ├─ services/
 │   ├─ nostr.ts          # wrapper around nostr-tools
 │   ├─ video.ts          # playback utilities (react-player)
 │   └─ storage.ts        # Dexie persistence, Workbox helpers
 └─ pages/                # Next.js routes; compose hooks + components
```

### Core Features
1. **Swipe Feed**: Vertical carousel of video clips, preloading next/prev items for smooth transitions.
2. **Video Overlay**: Creator avatar, caption, like/comment/share and Zap button.
3. **Zap Payments**: Nostr-based lightning payments with zap receipts and total display.
4. **Upload Flow**: File capture, upload to storage/CDN, publish metadata on Nostr.
5. **Offline Support**: Workbox precaching, runtime caching for media, background sync for pending uploads.
6. **Social Interactions**: Likes, comments, follows, and real-time updates via relay subscriptions.

### Testing & Quality
- Unit tests mock services and feature hooks.
- Playwright tests emulate mobile devices and PWA install flows.
- Lighthouse audits enforced in CI.
- ESLint, Prettier, and TypeScript for code consistency.

