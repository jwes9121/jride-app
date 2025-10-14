/** @type {import('next').NextConfig} */
const path = require('path');

const disableMaps = process.env.DISABLE_MAPS === '1';

const nextConfig = {
  reactStrictMode: true,
  // DO NOT set output: "export" (that would remove API routes)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack: (config) => {
    if (disableMaps) {
      // Replace all map imports with local stubs so build never touches leaflet/react-leaflet
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react-leaflet': path.resolve(__dirname, 'stubs/react-leaflet.js'),
        'leaflet': path.resolve(__dirname, 'stubs/leaflet.js'),
        'leaflet/dist/leaflet.css': path.resolve(__dirname, 'stubs/empty.css'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
