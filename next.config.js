/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Explicit aliases to avoid "Module not found" for @components/... on Vercel
    config.resolve.alias["@components"] = path.join(__dirname, "components");
    config.resolve.alias["@lib"] = path.join(__dirname, "lib");
    config.resolve.alias["@hooks"] = path.join(__dirname, "hooks");
    config.resolve.alias["@app"] = path.join(__dirname, "app");
    config.resolve.alias["@"] = path.join(__dirname);
    return config;
  }
};

module.exports = nextConfig;
