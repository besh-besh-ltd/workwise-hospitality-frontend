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

// `token` params are credentials (vendor emailed links, network member invites
// that can set a password), so they never reach PostHog in any URL: not in the
// query, not in the #fragment (the member-invite link puts it there), and not
// nested in another param or URL-encoded (a return URL such as
// ?next=%2Faccept-invite%23token%3D…).
const isTokenParam = (pair) => /^token$/i.test(pair.split("=")[0]);

const withoutTokenPairs = (part) =>
  part
    .split("&")
    .filter((pair) => pair && !isTokenParam(pair))
    .join("&");

// A `token=` (or encoded `token%3D`, `token%253D`) that follows a URL delimiter,
// raw or percent-encoded any number of times. Group 1 is kept, the value (up to
// the next raw or encoded & / #) is replaced. `mytoken=` never matches.
const ENC = (hex) => `%(?:25)*${hex}`;
const NESTED_TOKEN = new RegExp(
  `((?:^|[?&#]|${ENC("(?:3F|26|23)")})token(?:=|${ENC("3D")}))` +
    `((?:[^&#\\s"'<>%]|%(?!(?:25)*(?:26|23)))+)`,
  "gi"
);

// A top-level `token` pair: `token` right after ?, # or & and followed by =, &, # or the end.
const TOKEN_PAIR = /[?#&]token(?:[=&#]|$)/i;

/**
 * `url` with every top-level `token` param removed from the query and the
 * #fragment (other params kept, an emptied part dropped), then any token still
 * nested or encoded inside it replaced by REDACTED. Only a string carrying a
 * token pair is rebuilt; any other string (prose, labels) only has nested
 * token values redacted, and is otherwise left exactly as it was.
 * Non-strings pass through. Exported for tests.
 */
export function stripTokenParams(url) {
  if (typeof url !== "string" || !/token/i.test(url)) return url;
  if (!TOKEN_PAIR.test(url)) return url.replace(NESTED_TOKEN, "$1REDACTED");
  const hashAt = url.indexOf("#");
  const fragment = hashAt >= 0 ? withoutTokenPairs(url.slice(hashAt + 1)) : "";
  const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = beforeHash.indexOf("?");
  const query = queryAt >= 0 ? withoutTokenPairs(beforeHash.slice(queryAt + 1)) : "";
  const base = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const out = base + (query ? `?${query}` : "") + (fragment ? `#${fragment}` : "");
  return out.replace(NESTED_TOKEN, "$1REDACTED");
}

const MAX_SCRUB_DEPTH = 6;

const stripTokensIn = (bag, depth = 0) => {
  if (!bag || typeof bag !== "object" || depth > MAX_SCRUB_DEPTH) return;
  Object.keys(bag).forEach((k) => {
    if (typeof bag[k] === "string") bag[k] = stripTokenParams(bag[k]);
    else if (bag[k] && typeof bag[k] === "object") stripTokensIn(bag[k], depth + 1);
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
