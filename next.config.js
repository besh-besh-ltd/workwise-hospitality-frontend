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
};

module.exports = nextConfig;
