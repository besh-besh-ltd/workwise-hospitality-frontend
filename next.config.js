/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/**': ['./node_modules/@reduxjs/toolkit/dist/**'],
  },
  reactStrictMode: false,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8002",
      },
      {
        protocol: "https",
        hostname: "https://workwise-backend-ff68.onrender.com",
      },
      {
        protocol: "https",
        hostname: "test-workwise-bucket.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "workwise-static-s3.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "api.letsworkwise.com",
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/sitemap.xml', destination: '/api/sitemap.xml' },
      { source: '/sitemap-website.xml', destination: '/api/sitemap-website.xml' },
      { source: '/sitemap-vendors.xml', destination: '/api/sitemap-vendors.xml' },
      // PostHog reverse proxy
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
};

module.exports = nextConfig;

