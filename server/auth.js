'use strict';
const {auth} = require('express-oauth2-jwt-bearer');
const defaults = require('../auth0.config.json');

function createAuthorization(options = {}) {
  const issuer = options.issuer || 'https://' + (process.env.AUTH0_DOMAIN || defaults.domain) + '/';
  const audience = options.audience || process.env.AUTH0_AUDIENCE || defaults.audience;
  // publicKey se utiliza solo en pruebas con firmas RSA locales. Producción
  // obtiene las claves públicas desde el JWKS del tenant, nunca desde el cliente.
  const keyOptions = options.publicKey
    ? {publicKey: options.publicKey}
    : {jwksUri: new URL('.well-known/jwks.json', issuer).href};
  const middleware = auth({
    issuer, audience, ...keyOptions,
    tokenSigningAlg: 'RS256',
    clockTolerance: 0,
    dpop: {enabled: false},
    validators: {sub: value => typeof value === 'string' && value.length > 0}
  });

  function verifyToken(token) {
    return new Promise((resolve, reject) => {
      if (typeof token !== 'string' || !token || token.length > 16384) {
        return reject(new Error('AUTH_REQUIRED'));
      }
      // Adaptador de petición para el middleware oficial; el token no se
      // coloca en la URL ni en la petición HTTP original de Socket.IO.
      const headers = {authorization: 'Bearer ' + token, host: 'una-chat.local'};
      const request = {
        headers, method: 'GET', protocol: 'https', url: '/socket.io/',
        query: {}, is: () => false, get: name => headers[name.toLowerCase()]
      };
      middleware(request, {}, error => {
        if (error) return reject(new Error('AUTH_REQUIRED'));
        const claims = request.auth?.payload;
        if (!Number.isFinite(claims?.exp) || claims.exp * 1000 <= Date.now()) {
          return reject(new Error('AUTH_REQUIRED'));
        }
        resolve({sub: claims.sub, exp: claims.exp});
      }).catch(() => reject(new Error('AUTH_REQUIRED')));
    });
  }

  async function socketMiddleware(socket, next) {
    try {
      const identity = await verifyToken(socket.handshake.auth?.token);
      delete socket.handshake.auth.token;
      socket.data.identity = identity;
      const timeout = setTimeout(() => socket.disconnect(true),
        Math.min(identity.exp * 1000 - Date.now(), 2147483647));
      timeout.unref();
      socket.once('disconnect', () => clearTimeout(timeout));
      next();
    } catch {
      if (socket.handshake.auth) delete socket.handshake.auth.token;
      const error = new Error('Inicia sesión para entrar al chat.');
      error.data = {code: 'AUTH_REQUIRED'};
      next(error);
    }
  }

  function httpMiddleware(req, res, next) {
    middleware(req, res, error => {
      if (error) return res.status(401).json({error: 'Inicia sesión para entrar al chat.'});
      next();
    }).catch(() => res.status(401).json({error: 'Inicia sesión para entrar al chat.'}));
  }

  return {socketMiddleware, httpMiddleware};
}

module.exports = {createAuthorization};
