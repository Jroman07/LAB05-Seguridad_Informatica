# Reproducción del laboratorio 07

## Preparación local

Desde la raíz del proyecto, con Node.js 24:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Si `.env` ya existe, conservarlo. Completar en ese archivo únicamente el endpoint
base de Grafana Cloud que termina en `/otlp` y los encabezados que proporciona
Grafana para OTLP. El protocolo es `http/protobuf`. El encabezado debe tener
forma `Authorization=Basic%20<base64>`, sin comillas. No pegar su valor en
capturas, código, comandos compartidos ni el informe. Dejar `SENTRY_DSN` vacío
en local; Sentry se utiliza en Render para la parte 1.

```powershell
node scripts/check-telemetry.cjs
node --env-file=.env server.js
```

El verificador solo imprime presencia y validez, nunca el valor del encabezado.
Se esperan `endpointValid` y `headerValid` verdaderos y `renderBlocked` falso.
Reiniciar el proceso después de editar `.env`.

Abrir http://127.0.0.1:3000, enviar varios mensajes y una URL no permitida
como `https://example.com/prueba-lab07.html`. Anotar inicio y fin de la prueba
con la zona horaria de Costa Rica. Confirmar las tres señales en Grafana Cloud
antes de continuar con Docker. No basta con ver los logs en la consola local.

## Qué se envía

El SDK de OpenTelemetry exporta directamente por HTTP/protobuf al gateway OTLP
de Grafana Cloud. No se necesita Grafana local ni un Collector adicional.
`service.name=una-chat`, `deployment.environment=local` y
`deployment.environment.name=local` identifican el origen.

- Logs: resultado, duración, run_id y trace_id de cada mensaje, sin nombre ni
  contenido del remitente. En Grafana se consultan en Loki.
- Métricas: `una_chat_requests_total`, `una_chat_errors_total` y el histograma
  `una_chat_duration_seconds`. Miden mensajes de la aplicación, no consultas
  estáticas a la portada ni paquetes de mantenimiento de Socket.IO.
- Trazas: `chat.procesar_mensaje`, con spans de `chat.validar` y
  `chat.difundir`. La traza fallida termina en validación. Se consultan en Tempo.

Grafana permite visualizar las señales; Loki conserva los logs, Tempo las
trazas y Grafana Cloud Metrics las métricas. Un log describe un evento, una
métrica resume cantidades o duraciones y una traza muestra los pasos de una
operación concreta. Por ejemplo: rechazo de un mensaje, total de errores y
duración de la validación que produjo ese rechazo, respectivamente.

En Loki, partir del servicio `una-chat`, analizar el cuerpo como JSON y filtrar
`entorno=local` y `run_id`. En Tempo, filtrar por servicio y recurso
`deployment.environment=local`. Abrir una traza y buscar su trace_id en los logs.
Usar el mismo intervalo en todas las consultas. Las etiquetas normalizadas de
las métricas se deben comprobar en el explorador del stack antes de fijar los
selectores; no asumir que todos los backends conservan los puntos de los
nombres de atributos.

## Prueba funcional en Docker

Realizarla después de verificar la parte 2 en Grafana Cloud. Detener antes el
servidor Node.js iniciado para esa prueba y comprobar que el puerto 3000 esté
libre. El archivo `.env` debe conservar el envío a Grafana y un `LAB_RUN_ID`
identificable, por ejemplo `lab07-docker`.

```powershell
docker build -t una-chat-lab07 .
docker run --detach --name una-chat-lab07 --publish 127.0.0.1:3000:3000 --env-file .env una-chat-lab07
docker ps --filter name=una-chat-lab07
docker logs una-chat-lab07
```

La imagen no contiene `.env`. Sus credenciales se proporcionan únicamente al
ejecutar el contenedor. No compartir `docker inspect` con variables reales.
En el equipo se abre http://127.0.0.1:3000. Registrar varias respuestas y
capturar contenedor, conversación, logs y una traza correlacionada por trace_id.
No se requiere Compose porque solo hay un contenedor.

## Carga local con Artillery

Crear la cuenta exigida por la guía, pero ejecutar la herramienta en el equipo.
Solo después de validar la prueba funcional y su telemetría:

```powershell
New-Item -ItemType Directory -Force lab07/resultados
Get-Date -Format o
npx --yes artillery@2.0.34 run --platform local --output lab07/resultados/artillery.json lab07/artillery.yml
Get-Date -Format o
```

Artillery se obtiene del registro oficial npm. El archivo configura 5 usuarios
nuevos por segundo durante 60 segundos, un evento Socket.IO por usuario y la
comprobación de su confirmación `ok=true`. No hay pausas ni bucles. Se esperan
300 mensajes emitidos, pero el total real y la tasa se toman del reporte.
Si esa versión ya está en la caché de npm, se puede usar `--offline` en lugar
de `--yes`. No se necesita una clave de Artillery ni la opción `--record`.

Esta aplicación no tiene un endpoint HTTP de mensajes. La carga usa su evento
real `Evento-Mensaje-Server`; cambiarla a un GET de la portada no mediría el
procesamiento del chat. En el reporte se revisan `socketio.emit`,
`socketio.emit_rate`, `socketio.response_time` p50/p95, usuarios completados y
errores/timeouts. Los mensajes Socket.IO se confirman mediante `ok`, no mediante
un código HTTP individual; documentar ese resultado sin inventar códigos.

Conservar el JSON y la salida de consola. En Grafana, seleccionar el mismo
intervalo, servicio y entorno local: logs, cantidad o tasa de solicitudes,
duración y errores. Comparar las 300 previstas con las reales y explicar
cualquier diferencia, incluyendo solicitudes pendientes después del minuto.
No enviar esta carga a Render.

```powershell
docker stop --time 20 una-chat-lab07
```

Al detenerse normalmente se vacían los lotes pendientes de telemetría.
