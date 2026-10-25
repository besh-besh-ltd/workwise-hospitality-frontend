/**
 * The real OpenTelemetry wiring in lib/otelSdk.js, against the real SDK.
 * Proves head sampling decides whether the backend receives a traceparent
 * (unsampled → no header, so the backend's ParentBased sampler still records
 * its own trace) and that the SDK starts cleanly in a browser-like env.
 */
// jsdom lacks TextEncoder/TextDecoder, which the OTLP exporters need at import.
const { TextEncoder, TextDecoder } = require("util");
Object.assign(global, { TextEncoder, TextDecoder });
const { trace, propagation, context } = require("@opentelemetry/api");
const { startOtel } = require("./otelSdk");

const base = {
  collectorUrl: "http://127.0.0.1:9", // nothing listens; nothing is exported in these tests
  apiUrl: "http://localhost:8002/api/v1",
  environment: "test",
  failureThreshold: 3,
};

const headersFor = (ratio) => {
  const sdk = startOtel({ ...base, sampleRatio: ratio });
  const carrier = {};
  const span = trace.getTracer("t").startSpan("fetch GET /rfq/1");
  propagation.inject(trace.setSpan(context.active(), span), carrier);
  const sampled = span.isRecording();
  span.end();
  return { sdk, carrier, sampled };
};

afterEach(() => {
  trace.disable();
  propagation.disable();
  context.disable();
});

test("ratio 1: span is sampled and a traceparent is sent", async () => {
  const { sdk, carrier, sampled } = headersFor(1);
  expect(sampled).toBe(true);
  expect(carrier.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  expect(typeof sdk.emit).toBe("function");
  expect(sdk.breaker.isOpen).toBe(false);
  await sdk.shutdown();
});

test("ratio 0: span is not sampled and NO traceparent is sent", async () => {
  const { sdk, carrier, sampled } = headersFor(0);
  expect(sampled).toBe(false);
  expect(carrier.traceparent).toBeUndefined();
  await sdk.shutdown();
});

test("every span's URL attributes lose a receive link's token and #fragment before export", async () => {
  const sdk = startOtel({ ...base, sampleRatio: 1 });
  const link = "https://app.letsworkwise.com/receive/token?t=SECRETTOKEN&from=mail#t=SECRETTOKEN";
  // As the document-load instrumentation does: the page URL set after the span starts.
  const span = trace.getTracer("t").startSpan("documentLoad");
  span.setAttribute("http.url", link);
  span.setAttribute("url.full", link);
  span.setAttribute("browser.url", link);
  span.setAttribute("http.user_agent", "jest");
  span.end();
  expect(span.attributes).toEqual(expect.objectContaining({
    "http.url": "https://app.letsworkwise.com/receive/token?from=mail",
    "url.full": "https://app.letsworkwise.com/receive/token?from=mail",
    "browser.url": "https://app.letsworkwise.com/receive/token?from=mail",
    "http.user_agent": "jest",
  }));
  expect(JSON.stringify(span.attributes)).not.toContain("SECRETTOKEN");

  // Attributes given at start are cleaned too; other URLs are left as they are.
  const api = trace.getTracer("t").startSpan("fetch GET", {
    attributes: { "http.url": "http://localhost:8002/api/v1/inventory/receive-token/context?x=1" },
  });
  api.end();
  expect(api.attributes["http.url"]).toBe("http://localhost:8002/api/v1/inventory/receive-token/context?x=1");
  await sdk.shutdown();
});
