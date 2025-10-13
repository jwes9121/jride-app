/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Important: do NOT set output: "export" (that disables API routes)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
