# Proposal

## Why

UNA Chat ya admite texto, imágenes y videos, pero su formulario mantiene las mismas proporciones en pantallas pequeñas y borra el mensaje antes de conocer el resultado del servidor. Una interfaz más clara y adaptable permitirá conversar, reconocer errores y recuperar un envío rechazado con menos esfuerzo.

## What Changes

- Organizar encabezado, conversación y formulario con espacios, colores y tipografía consistentes, conservando la identidad azul del chat y el idioma español.
- Adaptar el formulario y los medios a móvil y escritorio, sin desplazamiento horizontal ni mensajes cubiertos por el área de escritura.
- Mostrar una bienvenida cuando no existen mensajes; retirarla al recibir el primero sin crear mensajes ficticios dentro de la lista.
- Mostrar estados de conexión comprensibles y evitar nuevos envíos cuando no haya conexión.
- Conservar el borrador ante rechazo o falta de confirmación; limpiar el mensaje solo cuando el servidor confirme la aceptación.
- Mejorar la navegación por teclado, los anuncios de estado y la presentación de medios que no puedan cargar.
- Ampliar las pruebas de navegador para los nuevos comportamientos y conservar las comprobaciones de seguridad y las suites existentes.

### Fuera de alcance

No se incorporan usuarios registrados, historial persistente, carga de archivos, temas configurables ni nuevas dependencias. No se amplían los formatos de URL admitidos ni se modifican los eventos del servidor. No se rediseñan las evidencias ya entregadas.

## Capabilities

### New Capabilities

- `chat-presentation`: presentación adaptable y accesible de la conversación, estado vacío y contenido multimedia.
- `message-composition`: escritura, confirmación de envío, conservación del borrador y respuesta visible ante desconexiones o rechazos.

### Modified Capabilities

Ninguna. El inventario actual de `openspec/specs` no contiene especificaciones; estas capacidades documentarán los comportamientos propuestos, sin duplicar especificaciones existentes.

## Impact

- `index.html`: estilos, estructura accesible y lógica de presentación y envío de mensajes.
- `tests/e2e/chat.spec.js`: escenarios de móvil, teclado, estados, confirmaciones y errores de medios; se mantienen los cinco casos existentes.
- `tests/integration/chat.test.js`: cobertura adicional de confirmaciones y rechazos necesaria para el formulario.
- `README.md`: descripción breve de los comportamientos y cómo comprobarlos.
- Se reutilizan los acknowledgements existentes de `Evento-Mensaje-Server` y el evento `Mensaje-Rechazado`; no se prevén cambios de protocolo, dependencias o reglas de `libs/unalib.js`.
- Compatibilidad: conservar los identificadores `#messages`, `#nombre`, `#m`, `#connection`, la acción accesible `Enviar` y la construcción segura del DOM con `textContent`.
