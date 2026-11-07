const {createServer} = require('node:http');
const {spawn} = require('node:child_process');
const path = require('node:path');

function runNode(code, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !key.startsWith('OTEL_') && !key.startsWith('SENTRY_') && !['RENDER', 'LAB_RUN_ID'].includes(key)));
    const child = spawn(process.execPath, ['-e', code], {
      cwd: path.resolve(__dirname, '../..'), env: {...env, ...extraEnv}, windowsHide: true
    });
    let stdout = '', stderr = '';
    const timeout = setTimeout(() => {child.kill(); reject(new Error('La prueba de telemetría excedió 12 segundos'));}, 12000);
    child.stdout.on('data', data => {stdout += data;});
    child.stderr.on('data', data => {stderr += data;});
    child.once('error', error => {clearTimeout(timeout); reject(error);});
    child.once('close', code => {
      clearTimeout(timeout);
      code === 0 ? resolve(stdout) : reject(new Error(stderr || `Proceso terminó con ${code}`));
    });
  });
}

test('Render nunca inicializa el exportador aunque tenga un endpoint configurado', async () => {
  const output = await runNode(`
    const t = require('./libs/telemetry');
    if(t.enabled) throw new Error('Exportación activa en Render');
    if(t.processMessage(() => 'ok') !== 'ok') throw new Error('Cambió el resultado');
    console.log('exportacion-desactivada');
  `, {RENDER: 'true', OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:1/otlp'});
  expect(output.trim()).toBe('exportacion-desactivada');
});

test('los mensajes reales exportan tres señales y permiten correlacionar un log con su traza', async () => {
  const received = new Map();
  const receiver = createServer((req, res) => {
    const chunks = [];
    req.on('data', data => chunks.push(data));
    req.on('end', () => {
      expect(req.headers['content-type']).toContain('application/x-protobuf');
      const batches = received.get(req.url) || [];
      batches.push(Buffer.concat(chunks)); received.set(req.url, batches);
      res.writeHead(200, {'Content-Type': 'application/x-protobuf'}); res.end();
    });
  });
  await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
  try {
    const output = await runNode(`
      (async () => {
        const {io} = require('socket.io-client');
        const {createChatServer} = require('./server');
        const telemetry = require('./libs/telemetry');
        const chat = createChatServer({authorization: null});
        await new Promise(resolve => chat.http.listen(0, '127.0.0.1', resolve));
        const client = io('http://127.0.0.1:' + chat.http.address().port,
          {transports:['websocket'], autoConnect:false, reconnection:false});
        try {
          await new Promise((resolve,reject) => {
            client.once('connect',resolve); client.once('connect_error',reject); client.connect();
          });
          const send = raw => new Promise((resolve,reject) => client.timeout(2000)
            .emit('Evento-Mensaje-Server',raw,(error,result) => error ? reject(error) : resolve(result)));
          const ok = await send(JSON.stringify({nombre:'No debe exportarse',mensaje:'contenido privado de prueba'}));
          const failed = await send('{');
          if(!ok.ok || failed.ok) throw new Error('Contrato de mensajes incorrecto');
        } finally {
          client.disconnect();
          await new Promise(resolve => chat.io.close(resolve));
          await telemetry.shutdown();
        }
      })().catch(e => {console.error(e);process.exitCode=1;});
    `, {
      OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${receiver.address().port}/otlp`,
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
      OTEL_SERVICE_NAME: 'una-chat-test', LAB_RUN_ID: 'verificacion-local'
    });
    expect([...received.keys()].sort()).toEqual(['/otlp/v1/logs', '/otlp/v1/metrics', '/otlp/v1/traces']);
    const logs = Buffer.concat(received.get('/otlp/v1/logs'));
    const metrics = Buffer.concat(received.get('/otlp/v1/metrics'));
    const traces = Buffer.concat(received.get('/otlp/v1/traces'));
    const records = output.trim().split(/\r?\n/).map(line => JSON.parse(line));
    expect(records.map(record => record.resultado)).toEqual(['ok', 'error']);
    for (const record of records) {
      expect(record.trace_id).toMatch(/^[a-f0-9]{32}$/);
      expect(traces.includes(Buffer.from(record.trace_id, 'hex'))).toBe(true);
      expect(logs.includes(Buffer.from(record.trace_id))).toBe(true);
    }
    for (const batch of [logs, metrics, traces]) {
      expect(batch.includes(Buffer.from('una-chat-test'))).toBe(true);
      expect(batch.includes(Buffer.from('local'))).toBe(true);
      expect(batch.includes(Buffer.from('contenido privado de prueba'))).toBe(false);
      expect(batch.includes(Buffer.from('No debe exportarse'))).toBe(false);
    }
    for (const name of ['una_chat_requests_total', 'una_chat_errors_total', 'una_chat_duration_seconds']) {
      expect(metrics.includes(Buffer.from(name))).toBe(true);
    }
    expect(traces.includes(Buffer.from('chat.validar'))).toBe(true);
    expect(traces.includes(Buffer.from('chat.difundir'))).toBe(true);
    expect(traces.includes(Buffer.from('JSON inválido'))).toBe(true);
  } finally {await new Promise(resolve => receiver.close(resolve));}
}, 15000);
