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

## Apariencia y uso

El chat adapta su formulario a móvil (320x640) y escritorio (1280x900). La conversación tiene su propia área de desplazamiento y el formulario permanece en el flujo, sin cubrir mensajes. La bienvenida se muestra solo cuando no hay mensajes. Las etiquetas Nombre, Mensaje y Enviar mantienen la navegación por teclado: Tab recorre los controles y Enter desde Mensaje envía. Los cambios de conexión y los mensajes entrantes ofrecen anuncios accesibles sin mover el foco de escritura.

Las comprobaciones automáticas de distribución y teclado están en `tests/e2e/ux.spec.js` y se ejecutan con `npm run test:e2e`. Las capturas de esta revisión se guardan en `test-results`, separadas de las evidencias académicas anteriores. La lectura con una tecnología de asistencia y el teclado virtual en un móvil físico requieren revisión manual adicional.

El estado muestra Conectando, Conectado al backend o Desconectado. Sin conexión puedes editar tu borrador, pero no enviarlo. Mientras aparece Enviando, el formulario conserva el texto y bloquea nuevos envíos; solo vacía Mensaje cuando el servidor confirma la aceptación. Nombre se conserva. Si se rechaza la entrada, aparece un único aviso y el texto queda disponible para corregirlo.

Si pasan cinco segundos sin confirmación, o se pierde la conexión durante el envío, se avisa: «No se pudo confirmar la entrega. Revisa la conversación antes de reenviar». El texto permanece y no hay reintentos automáticos. Una confirmación tardía no borra un borrador posterior. La advertencia no significa que el mensaje necesariamente haya fallado: pudo llegar al grupo sin que se recibiera la confirmación.

Los casos de confirmación, rechazo, timeout y desconexión están en `tests/e2e/composition.spec.js`. Los recorridos de aceptación usan el backend real; las pruebas de confirmación tardía retienen su callback únicamente desde el cliente instrumentado para la prueba. `npm run test:integration` comprueba también que se devuelve una única confirmación y que los rechazos ofrecen un error utilizable.

Si una imagen o un video directo no carga, aparece un aviso junto al recurso y se conservan el remitente, la URL y los mensajes anteriores. YouTube mantiene un marco con título y origen fijo; el chat no puede comprobar los errores internos del reproductor externo. Las pruebas usan recursos locales inexistentes para los errores y comprueban título y origen del marco sin depender de YouTube.

## Validación de contenido

`validarMensaje` también se exporta como `validateMessage` para conservar compatibilidad. Rechaza JSON incorrecto, etiquetas HTML, esquemas ejecutables, nombres peligrosos y URLs ajenas a los formatos permitidos. Acepta HTTP/HTTPS con extensión de imagen o video y URLs de YouTube con identificador válido. Valida el color con una lista de caracteres permitidos.

El frontend construye nodos DOM y usa `textContent`; no inserta HTML procedente de los mensajes. Los videos directos usan `<video controls>` y YouTube usa un iframe con origen fijo. Las extensiones son una política de formato; no certifican el contenido remoto. La carga real se comprueba con los medios locales en las pruebas de navegador.

La captura inicial del alert fue conservada del documento de evidencias original. Las capturas posteriores documentan la versión corregida.
