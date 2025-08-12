import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  swSrc: 'worker/index.ts',
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default withPWA(nextConfig);
