/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  eslint: {
    // Linting happens in its own CI job (`npm run lint`), NOT during the build.
    //
    // `next build` runs its own ESLint pass that does not honour
    // eslint-suppressions.json, so with a config present it fails on the 11
    // pre-existing violations recorded there and every build — including every
    // deploy — goes red. The dedicated job runs the same rules through the
    // ESLint CLI, where suppressions work, and the CI gate requires it. So
    // coverage is unchanged; only the place it runs moves.
    ignoreDuringBuilds: true,
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
  async redirects() {
    return [
      {
        source: '/dashboard/vendor/reviews-ratings',
        destination: '/dashboard/vendor/subscription',
        permanent: true,
      },
    ];
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

