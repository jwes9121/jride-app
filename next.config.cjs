/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DO NOT set output: "export" (it disables API routes)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
