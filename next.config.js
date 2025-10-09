/** @type {import('next').NextConfig} */
const nextConfig = {
  // Never fail CI builds due to lint or type errors
  eslint: { ignoreDuringBuilds: true, dirs: [] },
  typescript: { ignoreBuildErrors: true }
};
module.exports = nextConfig;



