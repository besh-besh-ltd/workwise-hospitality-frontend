/* ═══════════════════════════════════════════════════════════════════════
   analytics.js — PostHog, loaded after the page is idle.

   posthog-js is ~180 KB decoded and, with recording/surveys/dead-clicks on,
   pulls ~220 KB more of scripts at runtime. It used to be imported by _app,
   Header, DashboardShell, LoginContainer and lib/axios, so all of it sat in
   the _app chunk on every page including the landing page.

   This module is the only thing that touches posthog-js. It exposes the same
   method names the app used (identify / capture / reset) and queues calls
   made before the library has loaded, replaying them in order once it has.
   Callers keep writing `posthog.reset()` — only their import line changed.

   Session recording, surveys, dead-click autocapture, product tours and
   conversations are OFF unless switched on per environment:
     NEXT_PUBLIC_POSTHOG_SESSION_RECORDING=true
     NEXT_PUBLIC_POSTHOG_SURVEYS=true
     NEXT_PUBLIC_POSTHOG_DEAD_CLICKS=true
   ═══════════════════════════════════════════════════════════════════════ */

import { runWhenIdle } from "./idle";

export const MAX_QUEUED_CALLS = 100;

const isOn = (v) => /^(true|1|on|yes)$/i.test(String(v ?? "").trim());

// `token` query params are credentials (vendor emailed links, network member
// invites that can set a password), so they never reach PostHog in any URL.
const isTokenParam = (pair) => /^token$/i.test(pair.split("=")[0]);

/**
 * `url` with every `token` query param removed, wherever it sits and however
 * often it repeats; other params and the #fragment are kept. Non-strings pass
 * through. Exported for tests.
 */
export function stripTokenParams(url) {
  if (typeof url !== "string" || !/[?&]token(=|&|#|$)/i.test(url)) return url;
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = beforeHash.indexOf("?");
  if (queryAt < 0) return url;
  const kept = beforeHash
    .slice(queryAt + 1)
    .split("&")
    .filter((pair) => pair && !isTokenParam(pair));
  return beforeHash.slice(0, queryAt) + (kept.length ? `?${kept.join("&")}` : "") + hash;
}

const stripTokensIn = (bag) => {
  if (!bag || typeof bag !== "object") return;
  Object.keys(bag).forEach((k) => {
    if (typeof bag[k] === "string") bag[k] = stripTokenParams(bag[k]);
  });
};

/** posthog `before_send`: scrub token params from every captured property. Exported for tests. */
export function scrubTokenParams(event) {
  if (!event) return event;
  stripTokensIn(event.properties);
  stripTokensIn(event.$set);
  stripTokensIn(event.$set_once);
  return event;
}

/** posthog.init() options for the given env. Exported for tests. */
export function buildPosthogOptions(env) {
  return {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-01-30",
    disable_session_recording: !isOn(env.NEXT_PUBLIC_POSTHOG_SESSION_RECORDING),
    disable_surveys: !isOn(env.NEXT_PUBLIC_POSTHOG_SURVEYS),
    capture_dead_clicks: isOn(env.NEXT_PUBLIC_POSTHOG_DEAD_CLICKS),
    disable_product_tours: true,
    disable_conversations: true,
    before_send: scrubTokenParams,
  };
}

// `process.env.NEXT_PUBLIC_*` must be referenced literally for Next to inline it.
const buildTimeEnv = () => ({
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_POSTHOG_SESSION_RECORDING: process.env.NEXT_PUBLIC_POSTHOG_SESSION_RECORDING,
  NEXT_PUBLIC_POSTHOG_SURVEYS: process.env.NEXT_PUBLIC_POSTHOG_SURVEYS,
  NEXT_PUBLIC_POSTHOG_DEAD_CLICKS: process.env.NEXT_PUBLIC_POSTHOG_DEAD_CLICKS,
});

let env = buildTimeEnv();
let client = null;
let started = false;
let queue = [];

function call(method, args) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return; // analytics not configured here
  if (client) {
    try { client[method](...args); } catch (_) {}
    return;
  }
  if (queue.length < MAX_QUEUED_CALLS) queue.push([method, args]);
}

/**
 * Load and initialise PostHog once the page is idle. No-op without a key, on
 * the server, or when already started. `schedule`, `load` and `envOverride`
 * are injectable for tests.
 */
export function initAnalytics({
  schedule = runWhenIdle,
  load = () => import(/* webpackChunkName: "posthog" */ "posthog-js"),
  envOverride,
} = {}) {
  if (envOverride) env = envOverride;
  if (started || typeof window === "undefined" || !env.NEXT_PUBLIC_POSTHOG_KEY) return;
  started = true;
  schedule(() => {
    load()
      .then((mod) => {
        const posthog = mod.default || mod;
        posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, buildPosthogOptions(env));
        client = posthog;
        const pending = queue;
        queue = [];
        pending.forEach(([method, args]) => {
          try { posthog[method](...args); } catch (_) {}
        });
      })
      .catch(() => {
        // Blocked by an ad-blocker or offline: analytics must never break the app.
        queue = [];
      });
  });
}

const analytics = {
  identify: (...args) => call("identify", args),
  capture: (...args) => call("capture", args),
  reset: (...args) => call("reset", args),
};

export default analytics;

/** Test hook. */
export function __resetAnalyticsForTests(nextEnv = buildTimeEnv()) {
  env = nextEnv;
  client = null;
  started = false;
  queue = [];
}
