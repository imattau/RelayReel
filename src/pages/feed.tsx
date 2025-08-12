import { useEffect, useMemo, useRef, useState } from 'react';
import type { Filter } from 'nostr-tools';
import { motion } from 'framer-motion';
import useVideoFeed from '@/features/feed/useVideoFeed';
import { createPlayer } from '@/services/video';

export default function FeedPage() {
  const filters = useMemo<Filter[]>(() => [{ kinds: [1] }], []);
  const { currentVideo, next, prev } = useVideoFeed(filters);

  const videoRef = useRef<HTMLVideoElement>(null!);
  const { Player, load, play, pause, seek } = useMemo(
    () => createPlayer(videoRef, { onEnded: next }),
    [next],
  );
  const [playing, setPlaying] = useState(false);
  const [indicator, setIndicator] = useState<string | null>(null);

  useEffect(() => {
    if (currentVideo?.content) {
      load(currentVideo.content);
      play();
      setPlaying(true);
      if (videoRef.current) {
        videoRef.current.playbackRate = 1;
      }
    }
  }, [currentVideo, load, play]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') next();
      if (e.key === 'ArrowUp') prev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev]);

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const longPress = useRef(false);
  const longPressTimer = useRef<number | undefined>(undefined);
  const scrubbing = useRef(false);
  const scrubStartX = useRef(0);
  const scrubStartTime = useRef(0);

  useEffect(() => {
    return () => clearTimeout(longPressTimer.current);
  }, []);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    touchStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    longPress.current = false;
    scrubbing.current = false;
    longPressTimer.current = window.setTimeout(() => {
      const rect = videoRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relY = e.clientY - rect.top;
      longPress.current = true;
      if (!playing) {
        play();
        setPlaying(true);
      }
      videoRef.current.playbackRate = 2;
      setIndicator('2x');
      if (relY >= (rect.height * 2) / 3) {
        scrubbing.current = true;
        scrubStartX.current = e.clientX;
        scrubStartTime.current = videoRef.current.currentTime;
      }
    }, 500);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (longPress.current && scrubbing.current) {
      const deltaX = e.clientX - scrubStartX.current;
      const seconds = scrubStartTime.current + deltaX * 0.05;
      seek(Math.max(0, seconds));
    } else if (!longPress.current) {
      const dx = e.clientX - touchStart.current.x;
      const dy = e.clientY - touchStart.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(longPressTimer.current);
      }
    }
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    clearTimeout(longPressTimer.current);
    if (longPress.current) {
      videoRef.current.playbackRate = 1;
      setIndicator(null);
      longPress.current = false;
      scrubbing.current = false;
      return;
    }
    const elapsed = Date.now() - touchStart.current.time;
    if (elapsed < 200) {
      if (playing) {
        pause();
        setPlaying(false);
        setIndicator('Paused');
      } else {
        play();
        setPlaying(true);
        setIndicator('Playing');
      }
      window.setTimeout(() => setIndicator(null), 500);
    }
  };

  const onPanEnd = (_: any, info: { offset: { y: number } }) => {
    if (longPress.current) return;
    if (info.offset.y < -50) {
      next();
    } else if (info.offset.y > 50) {
      prev();
    }
  };

  return (
    <motion.div
      className="h-screen w-screen bg-black"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPanEnd={onPanEnd}
    >
      {currentVideo ? (
        <div className="relative h-full w-full">
          <Player />
          {indicator && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white text-3xl">
              {indicator}
            </div>
          )}
        </div>
      ) : (
        <p className="flex h-full items-center justify-center text-white">Loading...</p>
      )}
    </motion.div>
  );
}

