# Spec Delta

## Purpose

Permitir que las personas redacten mensajes y comprendan si el envío fue aceptado, rechazado o no confirmado, conservando el contenido necesario para corregirlo o reintentarlo.

## ADDED Requirements

### Requirement: Estado de conexión explícito

La interfaz SHALL diferenciar conectando, conectado y desconectado mediante texto visible en español, sin depender únicamente del color. Mientras no exista conexión, SHALL impedir nuevos envíos y conservar el borrador editable.

#### Scenario: Conexión inicial pendiente
- **WHEN** la página todavía no ha establecido conexión con el backend
- **THEN** muestra Conectando y no permite enviar mensajes

#### Scenario: Desconexión y recuperación
- **WHEN** se pierde la conexión con un borrador escrito y posteriormente se recupera
- **THEN** el estado cambia a Desconectado y después a Conectado al backend, sin perder el borrador ni enviarlo automáticamente

### Requirement: Envío con confirmación

El chat SHALL indicar Enviando mientras espera la respuesta del servidor e impedir envíos simultáneos desde ese formulario. SHALL limpiar el campo Mensaje únicamente tras confirmar la aceptación y conservar el nombre de la persona.

#### Scenario: Mensaje aceptado
- **WHEN** una persona envía un mensaje válido y el servidor confirma su aceptación
- **THEN** el mensaje aparece una sola vez, el campo Mensaje queda vacío y se conserva el nombre

#### Scenario: Doble activación durante el envío
- **WHEN** una persona vuelve a activar Enviar mientras existe un envío pendiente
- **THEN** el formulario no inicia un segundo envío y sigue indicando que espera confirmación

### Requirement: Recuperación ante rechazo

Ante un rechazo, el chat SHALL mostrar un error comprensible en español, conservar exactamente el borrador enviado y permitir corregirlo. El rechazo SHALL anunciarse una sola vez y no convertirse en un mensaje de la conversación.

#### Scenario: Script rechazado
- **WHEN** la persona envía el script del laboratorio y el servidor lo rechaza
- **THEN** ve un aviso de rechazo, conserva el script como texto editable, no se abre ningún alert y no se añade un mensaje a la conversación

#### Scenario: Corrección posterior al rechazo
- **WHEN** la persona sustituye una URL rechazada por un mensaje válido y lo envía
- **THEN** puede completar el envío, se retira el error anterior al iniciar el nuevo intento y el contenido aceptado aparece una sola vez

### Requirement: Envío sin confirmación recuperable

Si no llega confirmación en cinco segundos, o se pierde la conexión durante el envío, el chat SHALL conservar el borrador, salir del estado Enviando y advertir que no pudo confirmar la entrega. SHALL evitar reintentos automáticos e informar que se revise la conversación antes de reenviar.

#### Scenario: Respuesta ausente
- **WHEN** transcurren cinco segundos desde el envío sin confirmación del servidor
- **THEN** la persona conserva el contenido y recibe una advertencia de entrega no confirmada, sin que el formulario reenvíe automáticamente

#### Scenario: Desconexión durante el envío
- **WHEN** se pierde la conexión antes de recibir la confirmación
- **THEN** se conserva el contenido, se muestra la advertencia y no se permite un nuevo envío hasta recuperar la conexión
