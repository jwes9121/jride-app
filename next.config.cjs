/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DO NOT set output: "export" (disables API routes)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig; // CommonJS export (safe even with "type":"module")
