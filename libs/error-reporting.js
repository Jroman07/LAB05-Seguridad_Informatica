'use strict';

// Sin DSN no se inicializa ningún cliente ni se envían eventos.
let sentry;
if (process.env.SENTRY_DSN?.trim()) {
  sentry = require('@sentry/node');
  sentry.init({
    dsn: process.env.SENTRY_DSN.trim(),
    environment: process.env.SENTRY_ENVIRONMENT || (process.env.RENDER === 'true' ? 'production' : 'local'),
    release: process.env.RENDER_GIT_COMMIT || undefined,
    enableOpenTelemetrySetup: false,
    tracesSampleRate: 0,
    enableLogs: false,
    defaultIntegrations: false,
    integrations: [
      sentry.contextLinesIntegration(),
      sentry.onUncaughtExceptionIntegration(),
      sentry.onUnhandledRejectionIntegration()
    ],
    beforeSend(event) {
      // El laboratorio necesita la excepción y su pila, no el contenido del chat.
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      delete event.extra;
      return event;
    }
  });
}

function captureChatError(error) {
  if (!sentry) return;
  try {
    return sentry.captureException(error, {
      tags: {component: 'una-chat', transport: 'socket.io', operation: 'procesar_mensaje'}
    });
  } catch {
    // Un fallo de monitoreo no debe impedir el rechazo y la confirmación del chat.
    console.error('No se pudo registrar el error del chat en Sentry.');
  }
}

module.exports = {captureChatError};
