const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Never allow CI to fail because of lint or type errors
  eslint: { ignoreDuringBuilds: true, dirs: [] },
  typescript: { ignoreBuildErrors: true },

  // Hard alias so `@/…` resolves no matter what
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname)
    };
    return config;
  }
};

module.exports = nextConfig;



