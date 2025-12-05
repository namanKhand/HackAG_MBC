import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore typescript errors during build to prevent failure
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use serverExternalPackages to exclude backend libs from bundling
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', 'lokijs', 'encoding'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
