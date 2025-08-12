import React from 'react';

export interface CreatorInfoProps {
  /** URL of the creator avatar image */
  avatarUrl?: string;
  /** Display name or identifier of the creator */
  creator: string;
  /** Caption or description for the video */
  caption: string;
}

/**
 * Displays the creator's avatar, name and video caption.
 * Purely presentational so it can be reused with various feature hooks.
 */
export default function CreatorInfo({ avatarUrl, creator, caption }: CreatorInfoProps) {
  return (
    <div className="flex items-center gap-2 p-2 md:p-4">
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${creator} avatar`}
          className="h-8 w-8 rounded-full object-cover md:h-10 md:w-10"
        />
      )}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-sm font-semibold text-white md:text-base">{creator}</span>
        <span className="truncate text-xs text-white md:text-sm">{caption}</span>
      </div>
    </div>
  );
}
