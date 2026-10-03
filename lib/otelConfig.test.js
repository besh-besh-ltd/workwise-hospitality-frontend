// Policy for browser telemetry (lib/otelConfig.js): sampling ratio, which URLs
// are never traced, when exports stop for the session, and which requests carry
// a trace header to the backend.

import {
  DEFAULT_TRACE_SAMPLE_RATIO,
  EXPORT_FAILED,
  EXPORT_SUCCESS,
  buildIgnoreUrls,
  buildPropagateUrls,
  createExportBreaker,
  isOtelEnabled,
  parseSampleRatio,
  sampledOnlyPropagator,
} from "./otelConfig";

describe("parseSampleRatio", () => {
  test("defaults to 20% when unset or malformed", () => {
    expect(DEFAULT_TRACE_SAMPLE_RATIO).toBe(0.2);
    expect(parseSampleRatio(undefined)).toBe(0.2);
    expect(parseSampleRatio("")).toBe(0.2);
    expect(parseSampleRatio("lots")).toBe(0.2);
  });
  test("accepts 0..1 and clamps outside it", () => {
    expect(parseSampleRatio("0.05")).toBe(0.05);
    expect(parseSampleRatio("0")).toBe(0);
    expect(parseSampleRatio("1")).toBe(1);
    expect(parseSampleRatio("7")).toBe(1);
    expect(parseSampleRatio("-1")).toBe(0);
  });
});

describe("isOtelEnabled", () => {
  test("on by default, off only when explicitly disabled", () => {
    expect(isOtelEnabled(undefined)).toBe(true);
    expect(isOtelEnabled("true")).toBe(true);
    for (const v of ["false", "0", "off", "NO"]) expect(isOtelEnabled(v)).toBe(false);
  });
});

describe("buildIgnoreUrls", () => {
  const COLLECTOR = "https://otlp.hospitality.letsworkwise.com";
  const ignored = (url) => buildIgnoreUrls(COLLECTOR).some((re) => re.test(url));

  test("skips the pollers", () => {
    expect(ignored("https://api.letsworkwise.com/api/v1/general/hospitality/approval/pending/counts?hotel_id=3")).toBe(true);
    expect(ignored("https://api.letsworkwise.com/api/v1/users/notifications/unread-count")).toBe(true);
  });
  test("skips the collector itself and the PostHog proxy", () => {
    expect(ignored(`${COLLECTOR}/v1/traces`)).toBe(true);
    expect(ignored(`${COLLECTOR}/v1/logs`)).toBe(true);
    expect(ignored("https://hospitality.letsworkwise.com/ingest/e/?ip=1")).toBe(true);
  });
  test("still traces real API calls", () => {
    expect(ignored("https://api.letsworkwise.com/api/v1/rfq/536645/lifecycle")).toBe(false);
    expect(ignored("https://api.letsworkwise.com/api/v1/general/hospitality/approval/pending")).toBe(false);
    expect(ignored("https://api.letsworkwise.com/api/v1/users/notifications")).toBe(false);
  });
});

describe("buildPropagateUrls", () => {
  test("matches only the API origin, with regex metacharacters escaped", () => {
    const [re] = buildPropagateUrls("https://api.letsworkwise.com/api/v1");
    expect(re.test("https://api.letsworkwise.com/api/v1/rfq/1")).toBe(true);
    expect(re.test("https://apiXletsworkwise.com/api/v1/rfq/1")).toBe(false);
    expect(buildPropagateUrls("")).toEqual([]);
  });
});

describe("createExportBreaker", () => {
  const failingExporter = () => {
    const ex = {
      calls: 0,
      shutdown: jest.fn(() => Promise.resolve()),
      export: jest.fn((items, cb) => { ex.calls += 1; cb({ code: EXPORT_FAILED, error: new Error("cert expired") }); }),
    };
    return ex;
  };

  test("stops calling the network after N consecutive failures and shuts every exporter down", () => {
    const onTrip = jest.fn();
    const breaker = createExportBreaker({ threshold: 3, onTrip });
    const traces = failingExporter();
    const logs = failingExporter();
    const t = breaker.wrap(traces);
    const l = breaker.wrap(logs);
    const cb = jest.fn();

    t.export([1], cb);
    l.export([1], cb);
    expect(breaker.isOpen).toBe(false);
    t.export([1], cb);
    expect(breaker.isOpen).toBe(true);
    expect(onTrip).toHaveBeenCalledTimes(1);
    expect(traces.shutdown).toHaveBeenCalled();
    expect(logs.shutdown).toHaveBeenCalled();

    // A session's worth of batch-processor ticks: no further network attempts.
    for (let i = 0; i < 100; i++) { t.export([i], cb); l.export([i], cb); }
    expect(traces.calls + logs.calls).toBe(3);
    expect(cb).toHaveBeenCalledTimes(203);
    expect(cb.mock.calls.at(-1)[0].code).toBe(EXPORT_FAILED);
    expect(onTrip).toHaveBeenCalledTimes(1);
  });

  test("a success resets the count, so intermittent failures never trip it", () => {
    const breaker = createExportBreaker({ threshold: 3 });
    let n = 0;
    const flaky = { shutdown: jest.fn(), export: (items, cb) => cb({ code: ++n % 3 === 0 ? EXPORT_SUCCESS : EXPORT_FAILED }) };
    const w = breaker.wrap(flaky);
    for (let i = 0; i < 30; i++) w.export([], () => {});
    expect(breaker.isOpen).toBe(false);
    expect(flaky.shutdown).not.toHaveBeenCalled();
  });

  test("an exporter that throws synchronously counts as a failure", () => {
    const breaker = createExportBreaker({ threshold: 2 });
    const w = breaker.wrap({ shutdown: jest.fn(), export: () => { throw new Error("boom"); } });
    const cb = jest.fn();
    w.export([], cb);
    w.export([], cb);
    expect(breaker.isOpen).toBe(true);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ code: EXPORT_FAILED }));
  });
});

describe("sampledOnlyPropagator", () => {
  const inner = { inject: jest.fn(), extract: jest.fn((c) => c), fields: () => ["traceparent", "tracestate"] };
  beforeEach(() => inner.inject.mockClear());

  test("injects traceparent only for sampled spans", () => {
    const sampled = sampledOnlyPropagator(inner, () => ({ traceId: "a", spanId: "b", traceFlags: 1 }));
    sampled.inject({}, {}, {});
    expect(inner.inject).toHaveBeenCalledTimes(1);

    const unsampled = sampledOnlyPropagator(inner, () => ({ traceId: "a", spanId: "b", traceFlags: 0 }));
    unsampled.inject({}, {}, {});
    const none = sampledOnlyPropagator(inner, () => undefined);
    none.inject({}, {}, {});
    expect(inner.inject).toHaveBeenCalledTimes(1);
  });

  test("delegates extract and fields", () => {
    const p = sampledOnlyPropagator(inner, () => undefined);
    expect(p.fields()).toEqual(["traceparent", "tracestate"]);
    expect(p.extract("ctx", {}, {})).toBe("ctx");
  });
});
