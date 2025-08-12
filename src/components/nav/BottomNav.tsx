import React from 'react';
import Link from 'next/link';

/**
 * Fixed bottom navigation bar with primary app sections.
 * Purely presentational; parent pages handle routing context.
 */
export default function BottomNav() {
  return (
    <nav className="pointer-events-auto fixed bottom-0 left-0 right-0 z-50 flex justify-around bg-black/60 p-2 text-white text-xs">
      <Link href="/home" className="flex flex-col items-center">
        Home
      </Link>
      <Link href="/upload" className="flex flex-col items-center">
        Upload
      </Link>
      <Link href="/profile" className="flex flex-col items-center">
        Profile
      </Link>
    </nav>
  );
}
