/* ═══════════════════════════════════════════════════════════════════════
   otelSdk.js — the heavy half of browser telemetry (~130 KB decoded of
   OpenTelemetry SDK). Never import this statically: lib/otel.js loads it
   with a dynamic import once the page is idle, so it is not in _app.

   Policy (sampling, ignored URLs, export circuit breaker, propagation) lives
   in lib/otelConfig.js and is explained there.
   ═══════════════════════════════════════════════════════════════════════ */

import {
  WebTracerProvider,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { trace, context } from "@opentelemetry/api";

import {
  buildIgnoreUrls,
  buildPropagateUrls,
  createExportBreaker,
  sampledOnlyPropagator,
} from "./otelConfig";

/**
 * Start tracing + logging. Returns `{ emit, breaker, shutdown }`; `emit(record)` sends a
 * log record (lib/otel.js's sendLog forwards to it).
 */
export function startOtel({ collectorUrl, apiUrl, environment, sampleRatio, failureThreshold }) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "workwise-frontend",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": environment,
  });

  let unregisterInstrumentations = null;
  const breaker = createExportBreaker({
    threshold: failureThreshold,
    // A dead collector: stop patching fetch/XHR too, there is nowhere to send spans.
    onTrip: () => {
      if (unregisterInstrumentations) unregisterInstrumentations();
      if (typeof console !== "undefined") {
        console.warn(`[otel] ${failureThreshold} consecutive export failures to ${collectorUrl}; telemetry disabled for this session`);
      }
    },
  });

  // ── Traces ──
  const provider = new WebTracerProvider({
    resource,
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(sampleRatio) }),
    spanProcessors: [
      new BatchSpanProcessor(breaker.wrap(new OTLPTraceExporter({ url: `${collectorUrl}/v1/traces` }))),
    ],
  });

  // Default (stack) context manager: no zone.js, which patched every Promise,
  // timer and event listener in the app just to parent spans across awaits.
  provider.register({
    propagator: sampledOnlyPropagator(new W3CTraceContextPropagator(), (ctx) => trace.getSpanContext(ctx)),
  });

  const ignoreUrls = buildIgnoreUrls(collectorUrl);
  const propagateTraceHeaderCorsUrls = buildPropagateUrls(apiUrl);

  unregisterInstrumentations = registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({ ignoreUrls, propagateTraceHeaderCorsUrls }),
      new XMLHttpRequestInstrumentation({ ignoreUrls, propagateTraceHeaderCorsUrls }),
      new DocumentLoadInstrumentation(),
    ],
  });

  // ── Logs ── (errors are not sampled: every one is exported)
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(breaker.wrap(new OTLPLogExporter({ url: `${collectorUrl}/v1/logs` }))),
    ],
  });
  const logger = loggerProvider.getLogger("workwise-frontend");

  const emit = ({ severityNumber, severityText, body, attributes = {} }) => {
    if (breaker.isOpen) return;
    const spanContext = trace.getSpan(context.active())?.spanContext();
    logger.emit({
      severityNumber,
      severityText,
      body,
      attributes: {
        ...attributes,
        ...(spanContext ? { "trace.id": spanContext.traceId, "span.id": spanContext.spanId } : {}),
      },
    });
  };

  const shutdown = () => {
    if (unregisterInstrumentations) unregisterInstrumentations();
    return Promise.all([provider.shutdown(), loggerProvider.shutdown()]).catch(() => {});
  };

  return { emit, breaker, shutdown };
}
