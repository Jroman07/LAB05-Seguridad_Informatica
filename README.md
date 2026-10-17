# UNA Chat Laboratorio 05

Proyecto de José Daniel Román F. para Seguridad Informática.

## Instalación y ejecución

Requiere Node.js 20 o posterior. Desde esta carpeta:

```sh
npm ci
npm start
```

Abrir http://127.0.0.1:3000. Frontend y backend se sirven desde el mismo proceso Express. El envío usa el evento Socket.IO `Evento-Mensaje-Server`.

## Pruebas

```sh
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npx playwright show-report
```

Jest excluye `tests/e2e`. Las pruebas originales de `test/test.js` se conservan. Las pruebas de integración usan socket.io-client porque el proyecto envía mensajes mediante Socket.IO y no mediante una ruta HTTP. Abren un puerto efímero y cierran sus clientes y servidor.

Playwright abre Chromium con interfaz visible y verifica carga real de imagen, reproducción de video, rechazo del script sin alert, rechazo de URL no permitida y comunicación entre dos clientes. Los medios están en `public/media` para evitar dependencia de Internet durante las pruebas. La imagen es un recurso propio y el video es la muestra CC0 flower.webm de MDN: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm. Referencia: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video.

La configuración utiliza el motor Chromium del Microsoft Edge instalado (`channel: msedge`). Para usar Chrome for Testing de Playwright, instalarlo y ejecutar con `LAB_BROWSER_CHANNEL=chromium`. El Chromium descargado no pudo iniciarse en este equipo (spawn UNKNOWN); las cinco pruebas aprobaron en el canal msedge con las mismas comprobaciones.

## Validación y representación

`validarMensaje` también se exporta como `validateMessage` para conservar compatibilidad. Rechaza JSON incorrecto, etiquetas HTML, esquemas ejecutables, nombres peligrosos y URLs ajenas a los formatos permitidos. Acepta HTTP/HTTPS con extensión de imagen o video y URLs de YouTube con identificador válido. Valida el color con una lista de caracteres permitidos.

El frontend construye nodos DOM y usa `textContent`; no inserta HTML procedente de los mensajes. Los videos directos usan `<video controls>` y YouTube usa un iframe con origen fijo. Las extensiones son una política de formato; no certifican el contenido remoto. La carga real se comprueba con los medios locales en las pruebas de navegador.

La captura inicial del alert fue conservada del documento de evidencias original. Las capturas posteriores documentan la versión corregida.
