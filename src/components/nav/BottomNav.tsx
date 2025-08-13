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
      <nav
        className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[9999] w-full text-white"
        style={{ height: "var(--nav-h)", paddingBottom: "env(safe-area-inset-bottom)" }}
        role="navigation"
        aria-label="Bottom Navigation"
      >
        <div className="h-[var(--nav-h-base)] bg-black/60 backdrop-blur-md flex items-center justify-around px-2 text-xs">
          <Link href="/home" className="flex flex-col items-center">
            Home
          </Link>
          <Link href="/upload" className="flex flex-col items-center">
            Upload
          </Link>
          <Link href="/profile" className="flex flex-col items-center">
            Profile
          </Link>
        </div>
      </nav>
    </Portal>
  );
}
