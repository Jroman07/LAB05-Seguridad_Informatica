'use strict';
const {io} = require('socket.io-client');
const {audience} = require('../auth0.config.json');
const base = 'http://127.0.0.1:3000';

function rejected(auth) {
  return new Promise(resolve => {
    const socket = io(base, {
      auth, transports: ['websocket'], autoConnect: false,
      reconnection: false, timeout: 3000
    });
    const done = result => {
      clearTimeout(timeout);
      socket.removeAllListeners();
      socket.disconnect();
      resolve(result);
    };
    const timeout = setTimeout(() => done(false), 4000);
    socket.once('connect', () => done(false));
    socket.once('connect_error', error => done(error.data?.code === 'AUTH_REQUIRED'));
    socket.connect();
  });
}

(async () => {
  const config = await fetch(base + '/auth/config', {signal: AbortSignal.timeout(5000)}).then(r => r.json());
  const anonymous = await fetch(base + '/sala', {signal: AbortSignal.timeout(5000)});
  const result = {
    target: base,
    authEnabled: config.enabled === true,
    audienceCorrect: config.audience === audience,
    anonymousHttpStatus: anonymous.status,
    socketWithoutTokenRejected: await rejected({}),
    socketInvalidTokenRejected: await rejected({token: 'prueba-invalida'})
  };
  result.ok = result.authEnabled && result.audienceCorrect && anonymous.status === 401 &&
    result.socketWithoutTokenRejected && result.socketInvalidTokenRejected;
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
})().catch(() => {
  console.error(JSON.stringify({ok: false, error: 'No se pudo comprobar el backend local.'}));
  process.exitCode = 1;
});
