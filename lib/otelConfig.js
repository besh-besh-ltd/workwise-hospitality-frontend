/* ═══════════════════════════════════════════════════════════════════════
   otelConfig.js — the policy half of browser telemetry, kept free of SDK
   imports so it is cheap to unit-test and cheap to bundle.

   Why each knob exists (prod, Oct 2026):
   • Head sampling — every page view was tracing every fetch/XHR. 20% of
     traces is plenty for latency percentiles. NEXT_PUBLIC_OTEL_TRACE_SAMPLE_RATIO
     overrides it (0..1).
   • ignoreUrls — the 30-60 s pollers (approval pending counts, notification
     unread count) were the bulk of all browser spans and say nothing new.
     The collector's own URL is ignored so exports never trace themselves.
   • Export circuit breaker — when the collector is unreachable (its TLS cert
     expired 2026-09-22) every tab retried an export every few seconds,
     forever. After N consecutive failures we stop exporting for the rest of
     the session.
   • Sampled-only propagation — the backend samples ParentBased(AlwaysOn). If
     an unsampled browser span sent `traceparent: …-00`, the backend would drop
     its own trace too and backend coverage would fall to the browser's 20%.
     So unsampled requests carry no trace header and the backend starts its
     own root trace exactly as it does for requests without one.
   ═══════════════════════════════════════════════════════════════════════ */

export const DEFAULT_TRACE_SAMPLE_RATIO = 0.2;
export const DEFAULT_EXPORT_FAILURE_THRESHOLD = 3;

/** ExportResultCode from @opentelemetry/core, inlined to keep this file SDK-free. */
export const EXPORT_SUCCESS = 0;
export const EXPORT_FAILED = 1;

/** Parse a 0..1 ratio; anything missing or malformed falls back to the default. */
export function parseSampleRatio(raw, fallback = DEFAULT_TRACE_SAMPLE_RATIO) {
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** NEXT_PUBLIC_OTEL_ENABLED=false (or 0/off/no) switches browser telemetry off. */
export function isOtelEnabled(raw) {
  if (raw == null || String(raw).trim() === "") return true;
  return !/^(false|0|off|no)$/i.test(String(raw).trim());
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pollers that must not be traced. Matched against the full request URL. */
export const POLLING_URL_PATTERNS = [
  /\/approval\/pending\/counts(\?|$)/,
  /\/notifications\/unread-count(\?|$)/,
];

/**
 * URLs the fetch/XHR instrumentations must skip: the pollers, the collector
 * itself, and the PostHog ingest proxy (analytics beacons are not app latency).
 */
export function buildIgnoreUrls(collectorUrl) {
  const list = [...POLLING_URL_PATTERNS, /\/ingest\//];
  if (collectorUrl) list.push(new RegExp("^" + escapeRe(String(collectorUrl).replace(/\/+$/, ""))));
  return list;
}

/** Regex list for `propagateTraceHeaderCorsUrls` — only our own API gets headers. */
export function buildPropagateUrls(apiUrl) {
  return apiUrl ? [new RegExp(escapeRe(apiUrl))] : [];
}

/**
 * Circuit breaker shared by the trace and log exporters (same collector).
 *
 * wrap(exporter) returns an exporter with the same interface. While closed it
 * delegates and counts consecutive FAILED results; any success resets the
 * count. At `threshold` it trips: every wrapped exporter is shut down (their
 * pending retries stop), `onTrip` runs once (used to unpatch fetch/XHR), and
 * all later exports are answered FAILED immediately without touching the
 * network. It never re-closes — a dead collector stays dead for the session;
 * a reload starts afresh.
 */
export function createExportBreaker({ threshold = DEFAULT_EXPORT_FAILURE_THRESHOLD, onTrip } = {}) {
  let failures = 0;
  let open = false;
  const wrapped = [];

  const trip = () => {
    if (open) return;
    open = true;
    for (const inner of wrapped) {
      try { Promise.resolve(inner.shutdown && inner.shutdown()).catch(() => {}); } catch (_) {}
    }
    try { onTrip && onTrip(); } catch (_) {}
  };

  const record = (result) => {
    if (open) return;
    if (result && result.code === EXPORT_SUCCESS) failures = 0;
    else if (++failures >= threshold) trip();
  };

  const wrap = (inner) => {
    wrapped.push(inner);
    return {
      export(items, resultCallback) {
        if (open) {
          resultCallback({ code: EXPORT_FAILED, error: new Error("telemetry export disabled for this session") });
          return;
        }
        try {
          inner.export(items, (result) => {
            record(result);
            resultCallback(result);
          });
        } catch (error) {
          record({ code: EXPORT_FAILED, error });
          resultCallback({ code: EXPORT_FAILED, error });
        }
      },
      shutdown() {
        return open ? Promise.resolve() : Promise.resolve(inner.shutdown && inner.shutdown());
      },
      forceFlush() {
        return open || !inner.forceFlush ? Promise.resolve() : inner.forceFlush();
      },
    };
  };

  return {
    wrap,
    get isOpen() { return open; },
    get consecutiveFailures() { return failures; },
  };
}

/** Bit 0 of W3C trace-flags = sampled. */
const isSampled = (spanContext) => !!spanContext && (spanContext.traceFlags & 1) === 1;

/**
 * Wrap a TextMapPropagator so it injects nothing for unsampled spans.
 * `getSpanContext(ctx)` is passed in (trace.getSpanContext from @opentelemetry/api).
 */
export function sampledOnlyPropagator(inner, getSpanContext) {
  return {
    inject(ctx, carrier, setter) {
      if (!isSampled(getSpanContext(ctx))) return;
      inner.inject(ctx, carrier, setter);
    },
    extract(ctx, carrier, getter) {
      return inner.extract(ctx, carrier, getter);
    },
    fields() {
      return inner.fields();
    },
  };
}
