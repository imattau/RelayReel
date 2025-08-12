import React from 'react';

export interface ActionButtonsProps {
  liked: boolean;
  likeCount?: number;
  commentCount?: number;
  zapTotal?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onZap: () => void;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-6 w-6 ${filled ? 'fill-red-500' : 'fill-white'} drop-shadow`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="h-6 w-6 fill-white drop-shadow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 2H4a2 2 0 00-2 2v14a2 2 0 002 2h4l4 4 4-4h4a2 2 0 002-2V4a2 2 0 00-2-2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-6 w-6 fill-white drop-shadow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 000-1.39l7.02-4.11A2.5 2.5 0 0018 7.91a2.5 2.5 0 10-2.5-2.5 2.5 2.5 0 00.04.43l-7.01 4.11a2.5 2.5 0 10-.01 3.9l7.02 4.11a2.5 2.5 0 10.45-1.88z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="h-6 w-6 fill-yellow-400 drop-shadow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2L3 14h7v8l10-12h-7z" />
    </svg>
  );
}

/**
 * Vertical stack of interaction buttons for a video.
 * Handlers are provided by feature hooks and passed via props.
 */
export default function ActionButtons({
  liked,
  likeCount = 0,
  commentCount = 0,
  zapTotal = 0,
  onLike,
  onComment,
  onShare,
  onZap,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-row gap-4 p-2 text-white md:flex-col md:gap-6 md:p-4">
      <button
        type="button"
        aria-label="like"
        onClick={onLike}
        className="flex flex-col items-center gap-1"
      >
        <HeartIcon filled={liked} />
        <span className="text-xs">{likeCount}</span>
      </button>
      <button
        type="button"
        aria-label="comment"
        onClick={onComment}
        className="flex flex-col items-center gap-1"
      >
        <CommentIcon />
        <span className="text-xs">{commentCount}</span>
      </button>
      <button
        type="button"
        aria-label="share"
        onClick={onShare}
        className="flex flex-col items-center gap-1"
      >
        <ShareIcon />
      </button>
      <button
        type="button"
        aria-label="zap"
        onClick={onZap}
        className="flex flex-col items-center gap-1"
      >
        <ZapIcon />
        <span className="text-xs">{zapTotal}</span>
      </button>
    </div>
  );
}
