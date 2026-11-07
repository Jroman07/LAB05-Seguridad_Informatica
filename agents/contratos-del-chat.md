# Contratos del chat

## TLDR

- Valida en el servidor y muestra las entradas como texto seguro.
- Confirma antes de limpiar el borrador; evita duplicados y reintentos automáticos.
- Conserva los identificadores, las etiquetas accesibles y el foco de escritura.

Consulta esta guía antes de modificar validación, envío o interfaz. Describe los comportamientos y nombres que deben conservarse.

## Validación y representación

- Mantén `validarMensaje` en `libs/unalib.js` como validación autoritativa y conserva el alias `validateMessage`.
- Valida tipos y estructura del mensaje. No devuelvas una entrada inválida como contenido aceptado.
- Usa `textContent` y nodos DOM para nombre, mensaje y errores; no interpoles entradas del usuario en HTML.
- Valida URLs con `URL` y formatos permitidos. Una extensión válida no demuestra que el recurso exista o cargue.
- Conserva el origen fijo y el identificador validado del iframe de YouTube.

## Envío y recuperación

- Usa el evento real `Evento-Mensaje-Server` y su confirmación para decidir cuándo limpiar el campo Mensaje.
- Representa el mensaje desde la difusión; no añadas otra copia desde el callback de aceptación.
- Conserva el borrador ante rechazo, desconexión o timeout de cinco segundos.
- Advierte que se revise la conversación cuando no se confirme la entrega. No reintentes automáticamente.
- Ignora confirmaciones tardías de intentos anteriores para que no alteren borradores posteriores.

## Compatibilidad de interfaz

- Conserva `#messages`, `#nombre`, `#m`, `#connection` y los nombres accesibles Nombre, Mensaje y Enviar.
- Deja la bienvenida fuera de la lista de mensajes y conserva el foco al recibir mensajes.

Los criterios de prueba de estas áreas están en [Ejecución y pruebas](ejecucion-y-pruebas.md#qué-comprobar).

## Frontend React y Auth0

El frontend de Lab08 se encuentra en client/ y se ejecuta con npm run dev:react
en el puerto fijo 5173. Usa el SDK oficial de Auth0, con identificadores públicos
en auth-config.js y sin Client Secret. La configuración y las limitaciones de
esta etapa están en lab08/README.md. Los identificadores públicos compartidos
están en auth0.config.json. El backend valida access tokens RS256 con el SDK
oficial express-oauth2-jwt-bearer, issuer y audience; bloquea Socket.IO sin
credencial válida y cierra conexiones al vencer el token. No registrar tokens.
La fábrica createChatServer permite inyectar autorización para pruebas; la
ejecución normal siempre habilita la autorización. isAuthenticated del
navegador no sustituye esa comprobación del servidor.
