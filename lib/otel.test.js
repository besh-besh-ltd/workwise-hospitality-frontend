// lib/otel.js is what _app ships on every page: it must not start the SDK
// eagerly, must start it only via the idle scheduler, must buffer error logs
// until the SDK is up (bounded), and must respect the off switch.

import { initOtel, sendLog, getOtelConfig, SeverityNumber, MAX_BUFFERED_LOGS, __resetOtelForTests } from "./otel";

const ENV = { NEXT_PUBLIC_OTEL_COLLECTOR_URL: "https://collector.test", NEXT_PUBLIC_API_URL: "https://api.test/api/v1" };

const flush = () => new Promise((r) => setTimeout(r, 0));

let idleTasks;
const schedule = (cb) => { idleTasks.push(cb); };
const fakeSdk = () => {
  const emit = jest.fn();
  return { emit, loadSdk: jest.fn(() => Promise.resolve({ startOtel: jest.fn(() => ({ emit })) })) };
};

beforeEach(() => {
  idleTasks = [];
  __resetOtelForTests();
});

test("SeverityNumber keeps the OpenTelemetry numeric values", () => {
  const { SeverityNumber: Real } = jest.requireActual("@opentelemetry/api-logs");
  for (const k of ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"]) expect(SeverityNumber[k]).toBe(Real[k]);
});

test("config: 20% sampling by default, env-overridable", () => {
  expect(getOtelConfig(ENV).sampleRatio).toBe(0.2);
  expect(getOtelConfig({ ...ENV, NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO: "0.5" }).sampleRatio).toBe(0.5);
  expect(getOtelConfig(ENV).failureThreshold).toBeGreaterThan(0);
});

test("the SDK is loaded only from the idle callback, then buffered logs are flushed in order", async () => {
  const { emit, loadSdk } = fakeSdk();
  initOtel({ env: ENV, schedule, loadSdk });
  expect(loadSdk).not.toHaveBeenCalled();

  sendLog({ severityNumber: SeverityNumber.ERROR, severityText: "ERROR", body: "first" });
  sendLog({ severityNumber: SeverityNumber.ERROR, severityText: "ERROR", body: "second" });
  expect(emit).not.toHaveBeenCalled();

  idleTasks.forEach((t) => t());
  await flush();
  expect(loadSdk).toHaveBeenCalledTimes(1);
  expect(emit.mock.calls.map((c) => c[0].body)).toEqual(["first", "second"]);

  sendLog({ severityNumber: SeverityNumber.ERROR, severityText: "ERROR", body: "after" });
  expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ body: "after" }));
});

test("startOtel receives the resolved config", async () => {
  const startOtel = jest.fn(() => ({ emit: jest.fn() }));
  initOtel({ env: ENV, schedule, loadSdk: () => Promise.resolve({ startOtel }) });
  idleTasks.forEach((t) => t());
  await flush();
  expect(startOtel).toHaveBeenCalledWith(expect.objectContaining({
    collectorUrl: "https://collector.test",
    apiUrl: "https://api.test/api/v1",
    sampleRatio: 0.2,
  }));
});

test("the pre-load buffer is bounded", async () => {
  const { emit, loadSdk } = fakeSdk();
  initOtel({ env: ENV, schedule, loadSdk });
  for (let i = 0; i < MAX_BUFFERED_LOGS + 25; i++) sendLog({ body: String(i) });
  idleTasks.forEach((t) => t());
  await flush();
  expect(emit).toHaveBeenCalledTimes(MAX_BUFFERED_LOGS);
});

test("uncaught errors are captured as ERROR logs", async () => {
  const { emit, loadSdk } = fakeSdk();
  initOtel({ env: ENV, schedule, loadSdk });
  window.dispatchEvent(new ErrorEvent("error", { message: "kaboom", error: new TypeError("kaboom") }));
  idleTasks.forEach((t) => t());
  await flush();
  expect(emit).toHaveBeenCalledWith(expect.objectContaining({
    severityNumber: SeverityNumber.ERROR,
    body: "kaboom",
    attributes: expect.objectContaining({ "error.type": "TypeError", "log.source": "window.onerror" }),
  }));
});

test("NEXT_PUBLIC_OTEL_ENABLED=false: nothing is scheduled or loaded, sendLog is a no-op", () => {
  const { loadSdk } = fakeSdk();
  initOtel({ env: { ...ENV, NEXT_PUBLIC_OTEL_ENABLED: "false" }, schedule, loadSdk });
  sendLog({ body: "x" });
  expect(idleTasks).toHaveLength(0);
  expect(loadSdk).not.toHaveBeenCalled();
});

test("a failed SDK load is swallowed — telemetry never breaks the app", async () => {
  initOtel({ env: ENV, schedule, loadSdk: () => Promise.reject(new Error("blocked")) });
  idleTasks.forEach((t) => t());
  await flush();
  expect(() => sendLog({ body: "x" })).not.toThrow();
});

test("initOtel is idempotent", () => {
  const { loadSdk } = fakeSdk();
  initOtel({ env: ENV, schedule, loadSdk });
  initOtel({ env: ENV, schedule, loadSdk });
  expect(idleTasks).toHaveLength(1);
});
