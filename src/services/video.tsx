import React, { type ReactElement, type RefObject, useState } from "react";
import ReactPlayer from "react-player";

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
 * createPlayer renders ReactPlayer with standardized props and exposes helpers.
 * Mobile autoplay is enabled via muted + playsInline.
 */
export function createPlayer(
  ref: RefObject<HTMLVideoElement>,
  callbacks: PlayerCallbacks = {}
): PlayerApi {
  let setSrc: (src: string) => void;
  let setPlaying: (playing: boolean) => void;
  let setPreload: (urls: { next?: string; prev?: string }) => void;

  const Player = () => {
    const [src, _setSrc] = useState<string>();
    const [playing, _setPlaying] = useState(false);
    const [preloadUrls, _setPreload] = useState<{ next?: string; prev?: string }>({});

    // expose setters to outer scope
    setSrc = _setSrc;
    setPlaying = _setPlaying;
    setPreload = _setPreload;

    return (
      <>
        <ReactPlayer
          ref={ref}
          src={src}
          playing={playing}
          muted
          playsInline
          preload="auto"
          width="100%"
          height="100%"
          style={{ objectFit: 'contain' }}
          onWaiting={callbacks.onBuffer}
          onEnded={callbacks.onEnded}
          onError={callbacks.onError}
        />
        {preloadUrls.next && (
          <ReactPlayer
            src={preloadUrls.next}
            playing={false}
            muted
            playsInline
            preload="auto"
            width="0"
            height="0"
            style={{ display: "none" }}
          />
        )}
        {preloadUrls.prev && (
          <ReactPlayer
            src={preloadUrls.prev}
            playing={false}
            muted
            playsInline
            preload="auto"
            width="0"
            height="0"
            style={{ display: "none" }}
          />
        )}
      </>
    );
  };

  const load = (src: string, urls?: { next?: string; prev?: string }) => {
    setSrc?.(src);
    if (urls) {
      setPreload?.(urls);
    }
  };

  const play = () => {
    setPlaying?.(true);
    ref.current?.play?.();
  };

  const pause = () => {
    setPlaying?.(false);
    ref.current?.pause?.();
  };

  const seek = (seconds: number) => {
    if (ref.current) {
      ref.current.currentTime = seconds;
    }
  };

  const preload = (urls: { next?: string; prev?: string }) => {
    setPreload?.(urls);
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
  link.href = url;
  document.head.appendChild(link);
  preloaded.add(url);
}

/** Clear preloaded video links (used in tests). */
export function clearPreloadedVideos(): void {
  preloaded.clear();
  Array.from(
    document.head.querySelectorAll('link[rel="preload"][as="video"]')
  ).forEach((el) => el.parentElement?.removeChild(el));
}

const urlValidityCache = new Map<string, boolean>();

/** Validate that a URL exists and serves video content. */
export async function isValidVideoUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }

  const cached = urlValidityCache.get(url);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(url, { method: 'HEAD' });
    const type = res.headers.get('content-type') ?? '';
    const valid = res.ok && type.startsWith('video/');
    urlValidityCache.set(url, valid);
    return valid;
  } catch {
    urlValidityCache.set(url, false);
    return false;
  }
}

// Testing utility
export function __clearVideoUrlCache(): void {
  urlValidityCache.clear();
}


