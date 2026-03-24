import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context } from '@opentelemetry/api';

let initialized = false;
let loggerInstance = null;

export function initOtel() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const collectorUrl = process.env.NEXT_PUBLIC_OTEL_COLLECTOR_URL || 'http://localhost:4318';

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'workwise-frontend',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NEXT_PUBLIC_ENV || 'development',
  });

  // ── Traces ──
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${collectorUrl}/v1/traces` })
      ),
    ],
  });

  provider.register({ contextManager: new ZoneContextManager() });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [new RegExp(apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))],
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [new RegExp(apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))],
      }),
      new DocumentLoadInstrumentation(),
    ],
  });

  // ── Logs ──
  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({ url: `${collectorUrl}/v1/logs` })
    )
  );
  loggerInstance = loggerProvider.getLogger('workwise-frontend');

  // ── Client-side error capture ──
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: message || 'Unknown error',
      attributes: {
        'error.type': error?.name || 'Error',
        'error.message': message || 'Unknown error',
        'error.stack': error?.stack || '',
        'error.source': filename || '',
        'error.lineno': lineno || 0,
        'error.colno': colno || 0,
        'code.filepath': filename || '',
        'browser.url': window.location.href,
        'log.source': 'window.onerror',
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection');
    const stack = reason instanceof Error ? reason.stack : '';
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: message,
      attributes: {
        'error.type': reason?.name || 'UnhandledRejection',
        'error.message': message,
        'error.stack': stack || '',
        'browser.url': window.location.href,
        'log.source': 'unhandledrejection',
      },
    });
  });
}

/**
 * Send a log record to SigNoz.
 * @param {object} opts
 * @param {SeverityNumber} opts.severityNumber
 * @param {string} opts.severityText - e.g. 'INFO', 'WARN', 'ERROR'
 * @param {string} opts.body - log message
 * @param {Record<string, any>} [opts.attributes] - extra attributes
 */
export function sendLog({ severityNumber, severityText, body, attributes = {} }) {
  if (!loggerInstance) return;
  const activeSpan = trace.getSpan(context.active());
  const spanContext = activeSpan?.spanContext();
  loggerInstance.emit({
    severityNumber,
    severityText,
    body,
    attributes: {
      ...attributes,
      ...(spanContext ? { 'trace.id': spanContext.traceId, 'span.id': spanContext.spanId } : {}),
    },
  });
}

export { SeverityNumber };
