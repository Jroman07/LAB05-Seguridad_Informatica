# Monitoreo de UNA Chat

## Sentry

`libs/error-reporting.js` se carga antes de Express. Solo inicializa el SDK si
`SENTRY_DSN` tiene un valor. Configura `SENTRY_ENVIRONMENT=production` en Render
y `local` en el equipo. El SDK captura excepciones del procesamiento Socket.IO
y excepciones/rechazos no controlados; no exporta logs ni trazas de rendimiento.

El evento `Evento-Mensaje-Server` conserva su validación, difusión y confirmación.
Un mensaje rechazado se registra sin copiar el payload, nombre del remitente,
cookies, encabezados ni variables del entorno. No agregues esos datos al scope.

La prueba controlada se puede realizar desde el formulario normal enviando
`https://example.com/prueba-lab07.html`: es una URL que la política del chat
rechaza. Se espera un aviso en el chat y una excepción en Sentry. La URL se usa
como texto y no se visita. No se necesita una ruta ni un botón temporal.

El DSN se configura en el entorno, nunca en código ni en capturas. `npm start`
no carga `.env` por sí mismo. Con Node.js 20.6 o posterior se puede iniciar con
`node --env-file=.env server.js` si se necesita cargar un archivo local.

## Render

Render necesita escuchar en `0.0.0.0` y en `PORT`. Se conserva la configuración
del servidor ya utilizada por el despliegue existente. Para visitar el servicio
desde el equipo se utiliza `http://127.0.0.1:3000`.

Cronitor consulta la URL pública mediante HTTP GET. Ese resultado demuestra
disponibilidad HTTP; las pruebas del chat verifican adicionalmente Socket.IO.
La exportación hacia Grafana Cloud corresponde exclusivamente al entorno local
del laboratorio, incluido el contenedor local.
