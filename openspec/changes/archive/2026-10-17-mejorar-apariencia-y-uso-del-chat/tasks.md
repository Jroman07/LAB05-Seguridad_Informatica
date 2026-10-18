# Tasks

## 1. Presentación adaptable de la conversación

- [x] 1.1 Reorganizar estilos y distribución de `index.html`, conservando azul, español, etiquetas e identificadores actuales; verificar en Playwright ventanas de 320x640 y 1280x900 sin desbordamiento horizontal, incluidos texto largo, imagen, video y acceso al último mensaje.
- [x] 1.2 Añadir bienvenida fuera de `#messages` y retirarla al recibir el primer mensaje; verificar con Playwright cero elementos de mensaje antes del envío y un único mensaje real después.
- [ ] 1.3 Añadir foco visible, orden de navegación y anuncios accesibles de conexión y mensajes; verificar Tab, envío con Enter, nombres accesibles y conservación del foco ante recepción de otro cliente; revisar manualmente legibilidad y anuncio con lector de pantalla.
- [x] 1.4 Documentar en `README.md` el diseño adaptable y su comprobación; verificar que las instrucciones correspondan con las ventanas y comportamientos probados en este grupo.

## 2. Composición y confirmación de mensajes

- [x] 2.1 Implementar estados de conexión y envío en el frontend con guardas para desconexión, contenido vacío y doble activación; verificar mediante Playwright el botón y la conservación del borrador antes de conectar, al desconectar y al reconectar sin envío automático.
- [x] 2.2 Utilizar el callback real de `Evento-Mensaje-Server`, conservar el borrador hasta confirmar y representar el mensaje solo desde la difusión; verificar con backend real aceptación, limpieza del campo, nombre conservado y una única aparición para emisor y receptor.
- [x] 2.3 Centralizar el rechazo para conservar el borrador y evitar avisos duplicados entre callback y `Mensaje-Rechazado`; verificar por Playwright script bloqueado sin dialog, borrador intacto, un solo anuncio y corrección posterior con envío exitoso.
- [x] 2.4 Incorporar timeout de cinco segundos, invalidación de callbacks tardíos y recuperación del formulario ante desconexión durante envío; verificar reteniendo o retrasando la confirmación únicamente desde la instrumentación de Playwright, sin cambios de producción para pruebas, y comprobar que no se pierde el borrador ni se reenvía automáticamente.
- [x] 2.5 Agregar pruebas del contrato de confirmación en `tests/integration/chat.test.js` para aceptación única y rechazo con error utilizable; verificar `npm run test:integration` sin conexiones abiertas al finalizar.
- [x] 2.6 Documentar en `README.md` los estados Enviando, rechazado y entrega no confirmada; verificar que la advertencia indique revisar la conversación antes de un reintento manual y coincida con los casos de este grupo.

## 3. Medios y errores de carga

- [x] 3.1 Añadir avisos asociados a errores de imagen y video directo conservando remitente y URL; verificar con Playwright recursos locales inexistentes y ausencia de eliminación del mensaje o del resto de la conversación.
- [x] 3.2 Mantener texto mediante nodos seguros, controles nativos y origen fijo del iframe de YouTube; verificar los casos existentes de imagen, reproducción de video y bloqueo del script, más la representación de YouTube por título y origen sin depender de su carga externa.
- [x] 3.3 Documentar en `README.md` el aviso de medios no disponibles y el alcance del reproductor de YouTube; verificar correspondencia con la conducta implementada y sin afirmar detección de errores internos del iframe.

## 4. Verificación conjunta

- [x] 4.1 Ejecutar `npm test`, `npm run test:integration` y `npm run test:e2e`; verificar aprobación de las suites originales y nuevas, sin mezclar Jest con Playwright ni sustituir recorridos principales por simulaciones.
- [ ] 4.2 Revisar visualmente móvil y escritorio, teclado virtual en un móvil real, foco, textos en español y estados de error; registrar resultados y cualquier limitación del entorno, sin afirmar pruebas manuales no realizadas ni reemplazar las evidencias académicas existentes.
- [x] 4.3 Revisar el diff y confirmar que no cambian formatos admitidos, validación de seguridad, protocolo del servidor ni dependencias; verificar que todos los requisitos de las dos especificaciones tengan una prueba o revisión registrada.

## Workflow follow-up

- Presentar el resultado de la implementación al usuario antes de publicar cambios o reemplazar documentos de evidencias.
- Archivar el cambio de OpenSpec después de su revisión y de las pruebas correspondientes, cuando el usuario solicite cerrar ese flujo.
