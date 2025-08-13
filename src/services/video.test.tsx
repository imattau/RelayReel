import React from "react";
import { act, render } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import {
  createPlayer,
  isValidVideoUrl,
  __clearVideoUrlCache,
  preloadVideo,
} from "./video";
import * as videoModule from "./video";

describe("createPlayer", () => {
  it("exposes controls and forwards events", () => {
    const ref = { current: document.createElement("video") } as any;
    ref.current.play = vi.fn();
    ref.current.pause = vi.fn();
    const callbacks = {
      onBuffer: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
    };
    const preloadSpy = vi
      .spyOn(videoModule, "preloadVideo")
      .mockImplementation(() => {});
    const { Player, load, play, pause, seek } = createPlayer(ref, callbacks);

    render(<Player />);
    const videoEl = ref.current as HTMLVideoElement;

    // props ensure mobile autoplay support
    expect(videoEl.muted).toBe(true);
    expect(videoEl.playsInline).toBe(true);
    expect(videoEl.preload).toBe("auto");

    // forward events
    videoEl.dispatchEvent(new Event("waiting"));
    expect(callbacks.onBuffer).toHaveBeenCalled();
    videoEl.dispatchEvent(new Event("ended"));
    expect(callbacks.onEnded).toHaveBeenCalled();
    videoEl.dispatchEvent(new Event("error"));
    expect(callbacks.onError).toHaveBeenCalled();

    // load with preloaded URLs
    act(() => {
      load("main.mp4", { next: "next.mp4", prev: "prev.mp4" });
    });
    expect(videoEl.src).toContain("main.mp4");
    expect(preloadSpy).toHaveBeenCalledTimes(2);

    // controls
    act(() => {
      play();
    });
    expect(videoEl.play).toHaveBeenCalled();
    act(() => {
      pause();
    });
    expect(videoEl.pause).toHaveBeenCalled();
    seek(5);
    expect(videoEl.currentTime).toBe(5);
  });
});

describe("isValidVideoUrl", () => {
  beforeEach(() => {
    __clearVideoUrlCache();
    (globalThis.fetch as any) = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for URLs with a known video extension", async () => {
    await expect(isValidVideoUrl("https://example.com/a.mp4")).resolves.toBe(
      true,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns false when URL lacks a video extension", async () => {
    await expect(isValidVideoUrl("https://example.com")).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

