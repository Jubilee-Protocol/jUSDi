import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better Netlify compatibility
  output: 'standalone',

  // Image optimization for deployment
  images: {
    unoptimized: true,
  },

  // Ensure static exports work correctly
  trailingSlash: false,

  // Disable strict mode for production (removes double renders)
  reactStrictMode: false,
};

export default nextConfig;
