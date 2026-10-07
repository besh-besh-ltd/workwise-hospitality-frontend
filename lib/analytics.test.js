// lib/analytics.js — PostHog behind an idle-time dynamic import. Calls made
// before the library loads (identify on app start, reset on logout) must be
// replayed in order; replay/surveys/dead-clicks are opt-in per environment.

import analytics, {
  initAnalytics,
  buildPosthogOptions,
  MAX_QUEUED_CALLS,
  __resetAnalyticsForTests,
  stripTokenParams,
  scrubTokenParams,
} from "./analytics";

const ENV = { NEXT_PUBLIC_POSTHOG_KEY: "phc_test", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" };
const flush = () => new Promise((r) => setTimeout(r, 0));

let idleTasks;
const schedule = (cb) => { idleTasks.push(cb); };
const fakePosthog = () => {
  const order = [];
  const ph = {
    order,
    init: jest.fn(() => order.push("init")),
    identify: jest.fn((...a) => order.push(["identify", ...a])),
    capture: jest.fn((...a) => order.push(["capture", ...a])),
    reset: jest.fn(() => order.push("reset")),
  };
  return ph;
};

beforeEach(() => {
  idleTasks = [];
  __resetAnalyticsForTests(ENV);
});

describe("buildPosthogOptions", () => {
  test("recording, surveys and dead clicks are off by default", () => {
    const o = buildPosthogOptions(ENV);
    expect(o.api_host).toBe("https://eu.i.posthog.com");
    expect(o.defaults).toBe("2026-01-30");
    expect(o.disable_session_recording).toBe(true);
    expect(o.disable_surveys).toBe(true);
    expect(o.capture_dead_clicks).toBe(false);
  });
  test("each can be switched on by its env flag", () => {
    const o = buildPosthogOptions({
      ...ENV,
      NEXT_PUBLIC_POSTHOG_SESSION_RECORDING: "true",
      NEXT_PUBLIC_POSTHOG_SURVEYS: "1",
      NEXT_PUBLIC_POSTHOG_DEAD_CLICKS: "on",
    });
    expect(o.disable_session_recording).toBe(false);
    expect(o.disable_surveys).toBe(false);
    expect(o.capture_dead_clicks).toBe(true);
  });
  test("default host when none configured", () => {
    expect(buildPosthogOptions({ NEXT_PUBLIC_POSTHOG_KEY: "k" }).api_host).toBe("https://us.i.posthog.com");
  });
});

test("posthog-js is loaded only from the idle callback, then queued calls replay in order after init", async () => {
  const ph = fakePosthog();
  const load = jest.fn(() => Promise.resolve({ default: ph }));
  initAnalytics({ schedule, load });
  analytics.reset();
  analytics.identify("436", { name: "KUS404" });
  analytics.capture("rfq_viewed", { id: 1 });
  expect(load).not.toHaveBeenCalled();

  idleTasks.forEach((t) => t());
  await flush();
  expect(ph.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ disable_session_recording: true }));
  expect(ph.order).toEqual(["init", "reset", ["identify", "436", { name: "KUS404" }], ["capture", "rfq_viewed", { id: 1 }]]);

  analytics.reset();
  expect(ph.reset).toHaveBeenCalledTimes(2);
});

test("without a PostHog key nothing loads and calls are no-ops", () => {
  __resetAnalyticsForTests({});
  const load = jest.fn();
  initAnalytics({ schedule, load });
  expect(() => { analytics.identify("1"); analytics.reset(); }).not.toThrow();
  expect(idleTasks).toHaveLength(0);
  expect(load).not.toHaveBeenCalled();
});

test("the pre-load queue is bounded", async () => {
  const ph = fakePosthog();
  initAnalytics({ schedule, load: () => Promise.resolve(ph) });
  for (let i = 0; i < MAX_QUEUED_CALLS + 10; i++) analytics.capture("e" + i);
  idleTasks.forEach((t) => t());
  await flush();
  expect(ph.capture).toHaveBeenCalledTimes(MAX_QUEUED_CALLS);
});

test("an ad-blocked load is swallowed", async () => {
  initAnalytics({ schedule, load: () => Promise.reject(new Error("blocked")) });
  idleTasks.forEach((t) => t());
  await flush();
  expect(() => analytics.identify("1")).not.toThrow();
});

// `token` query params are credentials (emailed vendor links, network member
// invites that can set a password): they must never reach PostHog.
describe("token params are scrubbed before PostHog sends anything", () => {
  test("before_send is wired into the init options", () => {
    expect(buildPosthogOptions(ENV).before_send).toBe(scrubTokenParams);
  });

  test.each([
    ["https://x.io/vendor/network/accept-invite?token=abc123", "https://x.io/vendor/network/accept-invite"],
    ["https://x.io/p?token=abc&tab=2", "https://x.io/p?tab=2"],
    ["https://x.io/p?tab=2&token=abc", "https://x.io/p?tab=2"],
    ["https://x.io/p?a=1&token=abc&b=2#h", "https://x.io/p?a=1&b=2#h"],
    ["https://x.io/p?token=abc#h", "https://x.io/p#h"],
    ["https://x.io/p?mytoken=keep&b=2", "https://x.io/p?mytoken=keep&b=2"],
    ["https://x.io/p", "https://x.io/p"],
  ])("%s", (input, expected) => {
    expect(stripTokenParams(input)).toBe(expected);
  });

  test("scrubs properties, $set and $set_once and keeps the event", () => {
    const event = {
      event: "$pageview",
      properties: { $current_url: "https://x.io/a?token=s3cret", $pathname: "/a", n: 1 },
      $set: { $current_url: "https://x.io/a?token=s3cret" },
      $set_once: { $initial_current_url: "https://x.io/a?x=1&token=s3cret" },
    };
    const out = scrubTokenParams(event);
    expect(JSON.stringify(out)).not.toContain("s3cret");
    expect(out.properties).toEqual({ $current_url: "https://x.io/a", $pathname: "/a", n: 1 });
    expect(out.$set_once.$initial_current_url).toBe("https://x.io/a?x=1");
    expect(scrubTokenParams(null)).toBeNull();
  });
});
