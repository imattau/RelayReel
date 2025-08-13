import React, { type ReactElement, type RefObject, useState } from "react";

export interface PlayerCallbacks {
  onBuffer?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

export interface PlayerApi {
  Player: () => ReactElement;
  load: (src: string, preloadUrls?: { next?: string; prev?: string }) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  preload: (urls: { next?: string; prev?: string }) => void;
}

/**
 * createPlayer renders a native HTMLVideoElement and exposes helpers.
 * Mobile autoplay is enabled via muted + playsInline.
 */
export function createPlayer(
  ref: RefObject<HTMLVideoElement>,
  callbacks: PlayerCallbacks = {},
): PlayerApi {
  let setSrc: (src: string) => void;

  const Player = () => {
    const [src, _setSrc] = useState<string>();
    // expose setter to outer scope
    setSrc = _setSrc;

    return (
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 z-0 h-full w-full object-cover pointer-events-none"
        onWaiting={callbacks.onBuffer}
        onEnded={callbacks.onEnded}
        // Cast to any since React's type expects a specific Event type
        onError={callbacks.onError as any}
      />
    );
  };

  const load = (src: string, urls?: { next?: string; prev?: string }) => {
    setSrc?.(src);
    if (urls) {
      preload(urls);
    }
  };

  const play = () => {
    ref.current?.play?.().catch((err: any) => {
      if (err?.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    });
  };

  const pause = () => {
    ref.current?.pause?.();
  };

  const seek = (seconds: number) => {
    if (ref.current) {
      ref.current.currentTime = seconds;
    }
  };

  const preload = (urls: { next?: string; prev?: string }) => {
    preloadVideo(urls.next);
    preloadVideo(urls.prev);
  };

  return { Player, load, play, pause, seek, preload };
}

// Track preloaded video URLs to avoid duplicate DOM nodes
const preloaded = new Set<string>();

/** Preload a single video URL using a <link rel="preload"> tag. */
export function preloadVideo(url?: string): void {
  if (!url || preloaded.has(url)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  if (link.as !== "video") {
    // Fallback for browsers that don't support video preload
    link.as = "fetch";
  }
  link.href = url;
  document.head.appendChild(link);
  preloaded.add(url);
}

/** Clear preloaded video links (used in tests). */
export function clearPreloadedVideos(): void {
  preloaded.clear();
  Array.from(
    document.head.querySelectorAll(
      'link[rel="preload"][as="video"], link[rel="preload"][as="fetch"]',
    ),
  ).forEach((el) => el.parentElement?.removeChild(el));
}

const urlValidityCache = new Map<string, boolean>();

/** Validate that a URL exists and serves video content. */
export async function isValidVideoUrl(url: string): Promise<boolean> {
  const ext = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
  const validExts = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'm3u8'];
  if (ext && validExts.includes(ext)) {
    urlValidityCache.set(url, true);
    return true;
  }

  const cached = urlValidityCache.get(url);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' as any });
    const type = res.headers.get('content-type') ?? '';
    const valid = res.ok && (type.startsWith('video/') || type === '');
    urlValidityCache.set(url, valid);
    return valid;
  } catch {
    urlValidityCache.set(url, true);
    return true;
  }
}

// Testing utility
export function __clearVideoUrlCache(): void {
  urlValidityCache.clear();
}

