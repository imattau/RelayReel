"use client";

import React from 'react';
import Link from 'next/link';
import Portal from '@/components/Portal';

/**
 * Fixed bottom navigation bar with primary app sections.
 * Purely presentational; parent pages handle routing context.
 */
export default function BottomNav() {
  return (
    <Portal>
      <nav className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[9999] w-full bg-black/60 p-2 pb-[env(safe-area-inset-bottom)] text-white text-xs flex justify-around">
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
    </Portal>
  );
}
