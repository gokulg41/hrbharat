import withPWAFn from '@ducanh2912/next-pwa';

const withPWA = withPWAFn({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  
  disable: false,
});

import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Correct top-level key for Next.js 16
};

export default withPWA(nextConfig);