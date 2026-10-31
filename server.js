'use strict';
const telemetry = require('./libs/telemetry');
const {captureChatError} = require('./libs/error-reporting');
const express = require('express');
const {createServer} = require('http');
const {Server} = require('socket.io');
const validation = require('./libs/unalib');
function createChatServer() {
  const app = express();
  const http = createServer(app);
  const io = new Server(http);
  app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
  app.use('/media', express.static(__dirname + '/public/media'));
  io.on('connection', socket => {
    socket.on('Evento-Mensaje-Server', (raw, acknowledge) => {
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
  http.listen(port, '0.0.0.0', () => {
    console.log(`UNA Chat escuchando en el puerto ${port}`);
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
