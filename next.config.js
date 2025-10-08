/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do NOT fail the build because of ESLint or TS
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;

