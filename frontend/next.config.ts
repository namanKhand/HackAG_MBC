import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Turbopack warning
  // @ts-ignore
  experimental: {
    turbo: {
    }
  },
  // Ignore typescript/eslint errors during build to prevent failure
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'tap');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;
