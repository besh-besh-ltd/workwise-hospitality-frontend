/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "143.110.242.57",
        port: "8112",
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

module.exports = nextConfig;
