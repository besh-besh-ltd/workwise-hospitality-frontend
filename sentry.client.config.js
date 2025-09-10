import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  sendDefaultPii: false,
  // Performance
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session Replay (low baseline, full on error)
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Optional: tunnel to avoid ad-blockers; must match next.config.js
  tunnel: "/monitoring",
});

export default Sentry;

