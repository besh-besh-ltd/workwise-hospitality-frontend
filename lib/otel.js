/* ═══════════════════════════════════════════════════════════════════════
   otel.js — browser telemetry entry point. Deliberately tiny: it is imported
   by _app and ErrorBoundary, so anything here ships on every page.

   initOtel() installs the error listeners immediately (cheap) and loads the
   OpenTelemetry SDK (lib/otelSdk.js) with a dynamic import once the page is
   idle. sendLog() buffers a bounded number of records until the SDK is up,
   then forwards. If the SDK never loads (blocked, offline, disabled) the
   buffer just stops growing.

   Env:
     NEXT_PUBLIC_OTEL_COLLECTOR_URL        collector base URL (default localhost:4318)
     NEXT_PUBLIC_OTEL_ENABLED=false        switch browser telemetry off
     NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO   head sampling ratio, 0..1 (default 0.2)
   ═══════════════════════════════════════════════════════════════════════ */

import { runWhenIdle } from "./idle";
import {
  DEFAULT_EXPORT_FAILURE_THRESHOLD,
  isOtelEnabled,
  parseSampleRatio,
} from "./otelConfig";

/** Same numeric values as SeverityNumber in @opentelemetry/api-logs. */
export const SeverityNumber = Object.freeze({
  UNSPECIFIED: 0,
  TRACE: 1, TRACE2: 2, TRACE3: 3, TRACE4: 4,
  DEBUG: 5, DEBUG2: 6, DEBUG3: 7, DEBUG4: 8,
  INFO: 9, INFO2: 10, INFO3: 11, INFO4: 12,
  WARN: 13, WARN2: 14, WARN3: 15, WARN4: 16,
  ERROR: 17, ERROR2: 18, ERROR3: 19, ERROR4: 20,
  FATAL: 21, FATAL2: 22, FATAL3: 23, FATAL4: 24,
});

export const MAX_BUFFERED_LOGS = 50;

let started = false;
let listenersInstalled = false;
let sdk = null;
let buffer = [];

/** Resolved runtime config. Exported for tests. */
export function getOtelConfig(env = process.env) {
  return {
    enabled: isOtelEnabled(env.NEXT_PUBLIC_OTEL_ENABLED),
    collectorUrl: env.NEXT_PUBLIC_OTEL_COLLECTOR_URL || "http://localhost:4318",
    apiUrl: env.NEXT_PUBLIC_API_URL || "http://localhost:8002",
    environment: env.NEXT_PUBLIC_ENV || "development",
    sampleRatio: parseSampleRatio(env.NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO),
    failureThreshold: DEFAULT_EXPORT_FAILURE_THRESHOLD,
  };
}

// `process.env.NEXT_PUBLIC_*` must be referenced literally for Next to inline it.
const buildTimeEnv = () => ({
  NEXT_PUBLIC_OTEL_ENABLED: process.env.NEXT_PUBLIC_OTEL_ENABLED,
  NEXT_PUBLIC_OTEL_COLLECTOR_URL: process.env.NEXT_PUBLIC_OTEL_COLLECTOR_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO: process.env.NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO,
});

/**
 * Start browser telemetry. Safe to call more than once and on the server
 * (no-op). `loadSdk` and `schedule` are injectable for tests.
 */
export function initOtel({
  env = buildTimeEnv(),
  schedule = runWhenIdle,
  loadSdk = () => import(/* webpackChunkName: "otel-sdk" */ "./otelSdk"),
} = {}) {
  if (started || typeof window === "undefined") return;
  const config = getOtelConfig(env);
  if (!config.enabled) return;
  started = true;

  installErrorListeners();

  schedule(() => {
    loadSdk()
      .then((mod) => {
        sdk = mod.startOtel(config);
        const pending = buffer;
        buffer = [];
        pending.forEach((rec) => sdk.emit(rec));
      })
      .catch(() => {
        // Telemetry must never break the app. Stop buffering.
        buffer = [];
        started = false;
      });
  });
}

function installErrorListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener("error", (event) => {
    const { message, filename, lineno, colno, error } = event;
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: message || "Unknown error",
      attributes: {
        "error.type": error?.name || "Error",
        "error.message": message || "Unknown error",
        "error.stack": error?.stack || "",
        "error.source": filename || "",
        "error.lineno": lineno || 0,
        "error.colno": colno || 0,
        "code.filepath": filename || "",
        "browser.url": window.location.href,
        "log.source": "window.onerror",
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || "Unhandled promise rejection");
    const stack = reason instanceof Error ? reason.stack : "";
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: message,
      attributes: {
        "error.type": reason?.name || "UnhandledRejection",
        "error.message": message,
        "error.stack": stack || "",
        "browser.url": window.location.href,
        "log.source": "unhandledrejection",
      },
    });
  });
}

/**
 * Send a log record to SigNoz.
 * @param {object} opts
 * @param {number} opts.severityNumber - a SeverityNumber value
 * @param {string} opts.severityText - e.g. 'INFO', 'WARN', 'ERROR'
 * @param {string} opts.body - log message
 * @param {Record<string, any>} [opts.attributes] - extra attributes
 */
export function sendLog(record) {
  if (sdk) {
    sdk.emit(record);
    return;
  }
  if (!started) return;
  if (buffer.length < MAX_BUFFERED_LOGS) buffer.push(record);
}

/** Test hook. */
export function __resetOtelForTests() {
  started = false;
  sdk = null;
  buffer = [];
}
