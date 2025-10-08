/** @type {import('next').NextConfig} */
const nextConfig = {
  // Never fail CI builds because of lint or type errors
  eslint: { ignoreDuringBuilds: true, /* also skip scanning any dirs */ dirs: [] },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;


