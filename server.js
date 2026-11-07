'use strict';
const telemetry = require('./libs/telemetry');
const {captureChatError} = require('./libs/error-reporting');
const express = require('express');
const {createServer} = require('http');
const {Server} = require('socket.io');
const validation = require('./libs/unalib');
const {createAuthorization} = require('./server/auth');
const authConfig = require('./auth0.config.json');
const {existsSync} = require('node:fs');
const {join} = require('node:path');
const clientEntry = join(__dirname, 'dist/client/index.html');
function createChatServer({authorization = createAuthorization()} = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http);
  if (authorization) io.use(authorization.socketMiddleware);
  app.get('/auth/config', (req, res) => res.json({
    enabled: Boolean(authorization),
    domain: process.env.AUTH0_DOMAIN || authConfig.domain,
    clientId: process.env.AUTH0_CLIENT_ID || authConfig.clientId,
    audience: process.env.AUTH0_AUDIENCE || authConfig.audience
  }));
  app.get('/sala', ...(authorization ? [authorization.httpMiddleware] : []),
    (req, res) => res.json({authenticated: Boolean(authorization)}));
  app.use('/assets', express.static(join(__dirname, 'dist/client/assets')));
  app.get('/', (req, res) => res.sendFile(
    existsSync(clientEntry) ? clientEntry : join(__dirname, 'index.html')
  ));
  app.use('/media', express.static(__dirname + '/public/media'));
  io.on('connection', socket => {
    socket.on('Evento-Mensaje-Server', (raw, acknowledge) => {
      if (authorization && socket.data.identity.exp * 1000 <= Date.now()) {
        if (typeof acknowledge === 'function') acknowledge({
          ok: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.'
        });
        socket.disconnect(true);
        return;
      }
      try {
        telemetry.processMessage(() => {
          const msg = telemetry.step('chat.validar', () => validation.validarMensaje(raw));
          telemetry.step('chat.difundir', () => io.emit('Evento-Mensaje-Server', msg));
          if (typeof acknowledge === 'function') acknowledge({ok: true, message: JSON.parse(msg)});
        });
      } catch (error) {
        captureChatError(error);
        socket.emit('Mensaje-Rechazado', {error: error.message});
        if (typeof acknowledge === 'function') acknowledge({ok: false, error: error.message});
      }
    });
  });
  return {app, http, io};
}
if (require.main === module) {
  const {http, io} = createChatServer();
  const port = process.env.PORT || 3000;
  http.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${port} ya está ocupado. Si UNA Chat ya está abierto, visita http://127.0.0.1:${port}. Para reiniciarlo, detén el servidor anterior con Ctrl+C en su terminal y vuelve a ejecutar npm start.`);
    } else {
      console.error('No se pudo iniciar UNA Chat:', error.message);
    }
    process.exit(1);
  });
  (async () => {
    if (process.env.RENDER === 'true' && !existsSync(clientEntry)) {
      throw Object.assign(new Error(), {code: 'REACT_BUILD_MISSING'});
    }
    if (process.env.RENDER === 'true' && !process.env.VAULT_DATABASE_URL?.trim()) {
      throw Object.assign(new Error(), {code: 'VAULT_CONFIG_MISSING'});
    }
    if (process.env.VAULT_DATABASE_URL?.trim()) {
      const vault = await require('./server/vault').readVaultSecret();
      console.log(JSON.stringify({
        event: 'vault_ready', databaseUser: vault.databaseUser,
        tlsVerified: vault.tlsVerified, secretLength: vault.secret.length
      }));
    }
    http.listen(port, '0.0.0.0', () => {
      console.log(`UNA Chat escuchando en el puerto ${port}`);
    });
  })().catch(error => {
    const code = /^[A-Z0-9_]{1,64}$/.test(error.code || '') ? error.code : 'STARTUP_FAILED';
    console.error(JSON.stringify({event: 'startup_failed', error: code}));
    process.exit(1);
  });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 15000);
    timeout.unref();
    io.close(() => {
      telemetry.shutdown().then(() => {clearTimeout(timeout); process.exit(0);}, () => process.exit(1));
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
module.exports = {createChatServer};
