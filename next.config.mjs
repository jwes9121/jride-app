/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // You are using the App Router (app/ folder)
  experimental: { appDir: true },

  // DO NOT set output: "export" (that would remove API routes)
  // output: "standalone", // optional
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
