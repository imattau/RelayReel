import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/home');
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Head>
        <title>RelayReel</title>
        <meta name="description" content="Nostr based short videos" />
      </Head>
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-3xl font-bold">Welcome to RelayReel</h1>
      </main>
    </>
  );
}
