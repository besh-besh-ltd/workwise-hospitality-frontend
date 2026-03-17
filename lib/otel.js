import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

let initialized = false;

export function initOtel() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const collectorUrl = process.env.NEXT_PUBLIC_OTEL_COLLECTOR_URL || 'http://localhost:4318';

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'workwise-frontend',
      [ATTR_SERVICE_VERSION]: '1.0.0',
      'deployment.environment': process.env.NEXT_PUBLIC_ENV || 'development',
    }),
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
}
