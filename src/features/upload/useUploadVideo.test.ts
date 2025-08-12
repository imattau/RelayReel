import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, expect, test, beforeEach, afterEach, describe } from 'vitest';
import useUploadVideo, {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_DURATION,
  SUPPORTED_VIDEO_TYPES
} from './useUploadVideo';
import NostrService from '../../services/nostr';
import { queueUpload } from '../../services/storage';

vi.mock('../../services/nostr', () => ({
  default: { publish: vi.fn(), verify: vi.fn() }
}));
vi.mock('../../services/storage', () => ({ queueUpload: vi.fn() }));

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
      videoWidth: 720,
      videoHeight: 1280,
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
    await waitFor(() => expect(result.current.previewUrl).toBe('blob:test'));
    expect(result.current.metadata).toEqual({
      duration: 5,
      width: 720,
      height: 1280
    });
  });

  test('rejects landscape videos', async () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    const mockVideo = {
      preload: '',
      src: '',
      onloadedmetadata: null as (() => void) | null,
      videoWidth: 1280,
      videoHeight: 720,
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
    await waitFor(() => expect(result.current.error).toBe('Video must be portrait'));
    expect(result.current.previewUrl).toBeUndefined();
  });

  test('rejects videos over max duration', async () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    const mockVideo = {
      preload: '',
      src: '',
      onloadedmetadata: null as (() => void) | null,
      videoWidth: 720,
      videoHeight: 1280,
      duration: MAX_VIDEO_DURATION + 1
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
    await waitFor(() => expect(result.current.error).toBe('Video too long'));
    expect(result.current.previewUrl).toBeUndefined();
  });

  test('queues failed uploads for background sync', async () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    const mockVideo = {
      preload: '',
      src: '',
      onloadedmetadata: null as (() => void) | null,
      videoWidth: 720,
      videoHeight: 1280,
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
    (global as any).fetch = vi.fn().mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useUploadVideo());
    act(() => result.current.selectFile(file));
    await waitFor(() => expect(result.current.metadata).toBeDefined());
    await act(async () => {
      await result.current.upload('creator', 'caption');
    });
    expect(queueUpload).toHaveBeenCalledWith(
      expect.objectContaining({ creator: 'creator', caption: 'caption' })
    );
    expect(NostrService.publish).not.toHaveBeenCalled();
  });

  test('publishes metadata after successful upload', async () => {
    const file = new File(['a'], 'a.mp4', { type: SUPPORTED_VIDEO_TYPES[0] });
    const mockVideo = {
      preload: '',
      src: '',
      onloadedmetadata: null as (() => void) | null,
      videoWidth: 720,
      videoHeight: 1280,
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
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.test/a.mp4' })
    });
    (NostrService.publish as any).mockResolvedValue({
      id: '1',
      kind: 1,
      pubkey: 'pk',
      created_at: 0,
      sig: 'sig',
      tags: [],
      content: 'https://cdn.test/a.mp4'
    });
    (NostrService.verify as any).mockReturnValue(true);

    const { result } = renderHook(() => useUploadVideo());
    act(() => result.current.selectFile(file));
    await waitFor(() => expect(result.current.metadata).toBeDefined());
    await act(async () => {
      await result.current.upload('creator', 'caption');
    });
    expect(NostrService.publish).toHaveBeenCalled();
    expect(queueUpload).not.toHaveBeenCalled();
  });
});

