import React from "react";
import { act, render } from "@testing-library/react";
import ReactPlayer from "react-player";
import { vi, describe, it, expect } from "vitest";
import {
  createPlayer,
  isValidVideoUrl,
  __clearVideoUrlCache
} from "./video";

vi.mock("react-player", () => {
  return {
    default: vi.fn((props: any) => <div data-testid="player" />),
  };
});

describe("createPlayer", () => {
  it("exposes controls and forwards events", () => {
    const ref = {
      current: {
        play: vi.fn(),
        pause: vi.fn(),
        currentTime: 0,
      },
    } as any;
    const callbacks = {
      onBuffer: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
    };
    const { Player, load, play, pause, seek } = createPlayer(ref, callbacks);

    render(<Player />);
    const mainProps = (ReactPlayer as any).mock.calls[0][0];
    (ref.current as any).play = vi.fn();
    (ref.current as any).pause = vi.fn();
    (ref.current as any).currentTime = 0;

    // props ensure mobile autoplay support
    expect(mainProps.muted).toBe(true);
    expect(mainProps.playsInline).toBe(true);
    expect(mainProps.preload).toBe("auto");

    // forward events
    mainProps.onWaiting();
    expect(callbacks.onBuffer).toHaveBeenCalled();
    mainProps.onEnded();
    expect(callbacks.onEnded).toHaveBeenCalled();
    mainProps.onError("err");
    expect(callbacks.onError).toHaveBeenCalledWith("err");

    // load with preloaded URLs
    act(() => {
      load("main.mp4", { next: "next.mp4", prev: "prev.mp4" });
    });
    expect((ReactPlayer as any).mock.calls.length).toBe(4);

    // controls
    act(() => {
      play();
    });
    expect((ref.current as any).play).toHaveBeenCalled();
    act(() => {
      pause();
    });
    expect((ref.current as any).pause).toHaveBeenCalled();
    seek(5);
    expect((ref.current as any).currentTime).toBe(5);
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

  it("returns true for reachable video URLs", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      headers: { get: () => "video/mp4" }
    });
    await expect(isValidVideoUrl("https://example.com/a.mp4")).resolves.toBe(
      true
    );
    expect(fetch).toHaveBeenCalledWith("https://example.com/a.mp4", {
      method: "HEAD"
    });
  });

  it("returns false for non-video content", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" }
    });
    await expect(isValidVideoUrl("https://example.com"))
      .resolves.toBe(false);
  });

  it("returns false when request fails", async () => {
    (fetch as any).mockRejectedValue(new Error("fail"));
    await expect(isValidVideoUrl("https://example.com"))
      .resolves.toBe(false);
  });
});

