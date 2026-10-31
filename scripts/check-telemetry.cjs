'use strict';
const fs = require('node:fs');
if (fs.existsSync('.env')) process.loadEnvFile('.env');
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || '';
const header = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
let endpointValid = false, headerValid = false;
try {
  const url = new URL(endpoint);
  endpointValid = url.protocol === 'https:' && url.pathname.replace(/\/$/, '') === '/otlp' && !url.username && !url.password;
} catch {}
const match = /^Authorization=Basic%20([A-Za-z0-9+/]+={0,2})$/.exec(header);
if (match && match[1].length % 4 === 0) {
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  headerValid = /^\d+:glc_.+/.test(decoded);
}
console.log(JSON.stringify({
  endpointConfigured: Boolean(endpoint), endpointValid,
  headerConfigured: Boolean(header), headerValid,
  renderBlocked: process.env.RENDER === 'true',
  service: process.env.OTEL_SERVICE_NAME || 'una-chat',
  environment: 'local', runId: process.env.LAB_RUN_ID || 'lab07-local'
}, null, 2));
if (!endpointValid || !headerValid || process.env.RENDER === 'true') process.exitCode = 1;
