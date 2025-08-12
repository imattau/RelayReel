import { useState, useCallback, useEffect } from 'react';
import type { UnsignedEvent } from 'nostr-tools';
import NostrService from '../../services/nostr';
import { queueUpload } from '../../services/storage';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_DURATION = 5 * 60; // 5 minutes in seconds

/**
 * Hook to validate and preview selected video files.
 *
 * Provides an API for handling file input from storage while guarding against
 * excessive memory usage or unsupported formats. On valid selection a preview
 * URL is generated and basic metadata is extracted.
 */
export default function useUploadVideo(): {
  selectFile: (file?: File) => void;
  upload: (creator: string, caption: string) => Promise<void>;
  previewUrl?: string;
  metadata?: VideoMetadata;
  error?: string;
  reset: () => void;
  inputProps: {
    accept: string;
  };
} {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [metadata, setMetadata] = useState<VideoMetadata>();
  const [error, setError] = useState<string>();
  const [file, setFile] = useState<File>();

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setMetadata(undefined);
    setError(undefined);
    setFile(undefined);
  }, [previewUrl]);

  const selectFile = useCallback((file?: File) => {
    reset();
    if (!file) return;

    if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      setError('Unsupported format');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError('File too large');
      return;
    }

    const url = URL.createObjectURL(file);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      if (video.duration > MAX_VIDEO_DURATION) {
        setError('Video too long');
        URL.revokeObjectURL(url);
        return;
      }
      if (video.videoWidth > video.videoHeight) {
        setError('Video must be portrait');
        URL.revokeObjectURL(url);
        return;
      }
      setPreviewUrl(url);
      setMetadata({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
      setFile(file);
    };
  }, [reset]);

  const upload = useCallback(
    async (creator: string, caption: string) => {
      if (!file) {
        setError('No file selected');
        return;
      }
      const id = crypto.randomUUID();
      const endpoint = '/api/upload';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = await res.json();
        const event: UnsignedEvent = {
          pubkey: '',
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['p', creator],
            ['caption', caption]
          ],
          content: url
        };
        const signed = await NostrService.publish(event);
        if (!NostrService.verify(signed)) {
          throw new Error('Invalid event');
        }
      } catch (e) {
        await queueUpload({ id, endpoint, file, creator, caption });
      }
    },
    [file]
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return {
    selectFile,
    previewUrl,
    metadata,
    error,
    reset,
    upload,
    inputProps: {
      accept: SUPPORTED_VIDEO_TYPES.join(',')
    }
  };
}

