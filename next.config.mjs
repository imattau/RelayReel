import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  swSrc: 'worker/index.ts',
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // Disable code minification until upstream plugin resolves WebpackError issue
    // to avoid build failures.
    config.optimization.minimize = false;
    return config;
  }
};

export default withPWA(nextConfig);
