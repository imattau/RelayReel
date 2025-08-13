import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import BottomNav from '@/components/nav/BottomNav';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <div id="ui-layer" />
      <BottomNav />
    </>
  );
}
