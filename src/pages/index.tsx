import Head from 'next/head';

export default function Home() {
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
