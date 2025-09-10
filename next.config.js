/** @type {import('next').NextConfig} */
// const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
 
  reactStrictMode: false,
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
    ]
  },
};

// const sentryWebpackPluginOptions = { silent: true };
// module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
module.exports = nextConfig;