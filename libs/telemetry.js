'use strict';

// Render queda excluido aunque alguien copie allí variables OTEL por error.
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
const enabled = process.env.RENDER !== 'true' && Boolean(endpoint);
let sdk, api, tracer, logger, requests, errors, duration;

if (enabled) {
  const {NodeSDK} = require('@opentelemetry/sdk-node');
  const {resourceFromAttributes} = require('@opentelemetry/resources');
  const {PeriodicExportingMetricReader} = require('@opentelemetry/sdk-metrics');
  const {BatchLogRecordProcessor} = require('@opentelemetry/sdk-logs');
  const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-proto');
  const {OTLPMetricExporter} = require('@opentelemetry/exporter-metrics-otlp-proto');
  const {OTLPLogExporter} = require('@opentelemetry/exporter-logs-otlp-proto');
  api = require('@opentelemetry/api');
  sdk = new NodeSDK({
    autoDetectResources: false,
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || 'una-chat',
      'deployment.environment': 'local',
      'deployment.environment.name': 'local',
      'test.run_id': process.env.LAB_RUN_ID || 'lab07-local'
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(), exportIntervalMillis: 10000
    })],
    logRecordProcessors: [new BatchLogRecordProcessor({exporter: new OTLPLogExporter()})],
    instrumentations: []
  });
  sdk.start();
  tracer = api.trace.getTracer('una-chat');
  logger = api.logs.getLogger('una-chat');
  const meter = api.metrics.getMeter('una-chat');
  requests = meter.createCounter('una_chat_requests_total', {description: 'Mensajes procesados'});
  errors = meter.createCounter('una_chat_errors_total', {description: 'Mensajes rechazados o fallidos'});
  duration = meter.createHistogram('una_chat_duration_seconds', {
    unit: 's', description: 'Duración del procesamiento de mensajes',
    advice: {explicitBucketBoundaries: [0, 0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]}
  });
}

function step(name, operation) {
  if (!enabled) return operation();
  return tracer.startActiveSpan(name, span => {
    try {
      const result = operation();
      span.setStatus({code: api.SpanStatusCode.OK});
      return result;
    } catch (error) {
      span.setStatus({code: api.SpanStatusCode.ERROR});
      span.recordException(error);
      throw error;
    } finally {span.end();}
  });
}

function processMessage(operation) {
  if (!enabled) return operation();
  return tracer.startActiveSpan('chat.procesar_mensaje', {
    kind: api.SpanKind.SERVER,
    attributes: {'messaging.system': 'socket.io', 'messaging.operation.name': 'Evento-Mensaje-Server'}
  }, span => {
    const start = process.hrtime.bigint();
    let result = 'ok';
    try {
      const value = operation();
      span.setStatus({code: api.SpanStatusCode.OK});
      return value;
    } catch (error) {
      result = 'error';
      span.setStatus({code: api.SpanStatusCode.ERROR});
      span.recordException(error);
      throw error;
    } finally {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const attributes = {resultado: result};
      requests.add(1, attributes);
      errors.add(result === 'error' ? 1 : 0);
      duration.record(seconds, attributes);
      const ids = span.spanContext();
      // Solo resultado, duración y correlación; nunca el nombre ni el mensaje.
      const record = {
        evento: 'mensaje_procesado', resultado: result,
        duration_ms: seconds * 1000, trace_id: ids.traceId, span_id: ids.spanId,
        run_id: process.env.LAB_RUN_ID || 'lab07-local', entorno: 'local'
      };
      logger.emit({
        severityNumber: result === 'ok' ? api.SeverityNumber.INFO : api.SeverityNumber.ERROR,
        severityText: result === 'ok' ? 'INFO' : 'ERROR',
        body: JSON.stringify(record),
        attributes: {resultado: result, trace_id: ids.traceId, 'test.run_id': record.run_id}
      });
      console.log(JSON.stringify(record));
      span.end();
    }
  });
}

async function shutdown() {
  if (sdk) await sdk.shutdown();
}

module.exports = {enabled, step, processMessage, shutdown};
