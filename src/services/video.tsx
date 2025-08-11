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

