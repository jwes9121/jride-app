/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // ❗️Allow production builds to complete even if there are type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // You already pass --no-lint, this is a belt-and-suspenders in CI
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

