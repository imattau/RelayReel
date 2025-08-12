import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, expect, test, beforeEach, afterEach, describe } from 'vitest';
import useUploadVideo, {
  MAX_VIDEO_BYTES,
  SUPPORTED_VIDEO_TYPES
} from './useUploadVideo';

describe('useUploadVideo', () => {
  beforeEach(() => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:test');
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('exposes accept input props without capture', () => {
    const { result } = renderHook(() => useUploadVideo());
    expect(result.current.inputProps).toEqual({
      accept: SUPPORTED_VIDEO_TYPES.join(',')
    });
  });

  test('rejects unsupported formats', () => {
    const file = new File(['a'], 'a.png', { type: 'image/png' });
    const { result } = renderHook(() => useUploadVideo());
    act(() => result.current.selectFile(file));
    expect(result.current.error).toBe('Unsupported format');
  });

  test('rejects files over max size', () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    Object.defineProperty(file, 'size', { value: MAX_VIDEO_BYTES + 1 });
    const { result } = renderHook(() => useUploadVideo());
    act(() => result.current.selectFile(file));
    expect(result.current.error).toBe('File too large');
  });

  test('creates preview and metadata', async () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    const mockVideo = {
      preload: '',
      src: '',
      onloadedmetadata: null as (() => void) | null,
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 5
    } as unknown as HTMLVideoElement;
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') {
        setTimeout(
          () => mockVideo.onloadedmetadata?.(new Event('loadedmetadata')),
          0
        );
        return mockVideo;
      }
      return realCreateElement(tag);
    });

    const { result } = renderHook(() => useUploadVideo());
    act(() => result.current.selectFile(file));
    expect(result.current.previewUrl).toBe('blob:test');
    await waitFor(() =>
      expect(result.current.metadata).toEqual({
        duration: 5,
        width: 1920,
        height: 1080
      })
    );
  });
});

