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

## OpenTelemetry local

`libs/telemetry.js` se carga antes de Express. Con endpoint vacío o `RENDER=true`
no inicializa ningún SDK de OpenTelemetry. El entorno de las señales se fija
en `local`. Se instrumenta el evento real de mensajes, sin exportar contenido,
nombres, encabezados ni variables del entorno. No se necesita un proxy OTLP
del navegador: la exportación procede exclusivamente del servidor Node.js.

Consulta [Reproducción del laboratorio 07](../lab07/README.md) para variables,
consultas, Docker y la carga Socket.IO. La suite de integración comprueba el
envío protobuf de tres señales a un receptor temporal local y la correlación
por trace_id, pero no sustituye la comprobación de recepción en Grafana Cloud.

## Vault del backend

server/vault.js consulta únicamente la función privada de Vault usando el
rol una_chat_backend y TLS con verificación del certificado y hostname.
scripts/check-vault.cjs carga el .env privado e imprime solo éxito, usuario,
verificación TLS, nombre y longitud del secreto. Ante errores solo imprime
un código; no registrar el objeto pg, la URI, stack ni el valor del secreto.
El módulo no se importa al frontend y no sustituye la autorización del chat.
En Render, el servidor lee Vault antes de escuchar y detiene el arranque si
falla la conexión o falta el frontend compilado. El log vault_ready contiene
solo usuario, TLS y longitud; el secreto no forma parte del login PKCE.
