/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ✅ Security headers
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              font-src 'self' https:;
              connect-src 'self' https://qpemhlgjcotgnxahjidj.supabase.co https://accounts.google.com https://apis.google.com;
              frame-src 'self' https://accounts.google.com;
            `.replace(/\s{2,}/g, " "), // remove line breaks & extra spaces
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  images: {
    domains: ["lh3.googleusercontent.com"], // Google profile pictures
  },
};

module.exports = nextConfig;
