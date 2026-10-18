# Spec Delta

## Purpose

Permitir que las personas lean la conversación y sus medios con claridad en pantallas pequeñas y grandes, con estados comprensibles y acceso por teclado.

## ADDED Requirements

### Requirement: Diseño adaptable

La interfaz SHALL presentar encabezado, conversación y formulario sin desplazamiento horizontal ni contenido oculto por el formulario, desde 320 píxeles de ancho. Los medios SHALL permanecer dentro del ancho disponible.

#### Scenario: Conversación en móvil
- **WHEN** la persona abre el chat en una ventana de 320 por 640 píxeles y recibe texto largo, una imagen y un video
- **THEN** la página no requiere desplazamiento horizontal, los controles permanecen accesibles y el último mensaje se puede ver completo al desplazarse

#### Scenario: Conversación en escritorio
- **WHEN** la persona abre el chat en una ventana de 1280 por 900 píxeles
- **THEN** la conversación mantiene una columna de lectura centrada y el formulario no cubre el último mensaje

### Requirement: Estado vacío comprensible

El chat SHALL mostrar una bienvenida y una indicación breve para enviar texto o una URL admitida mientras no haya mensajes. Esa indicación SHALL distinguirse de los mensajes enviados.

#### Scenario: Apertura sin mensajes
- **WHEN** una persona abre una conversación vacía
- **THEN** ve la bienvenida y la lista de mensajes contiene cero mensajes

#### Scenario: Primer mensaje recibido
- **WHEN** llega el primer mensaje aceptado
- **THEN** desaparece la bienvenida y aparece únicamente el mensaje real en la lista

### Requirement: Lectura y navegación accesibles

Los campos y acciones SHALL tener nombres accesibles en español. La navegación por teclado SHALL seguir el orden Nombre, Mensaje y Enviar con foco visible. Los estados de conexión y los nuevos mensajes SHALL poder anunciarse a tecnologías de asistencia sin mover el foco del formulario.

#### Scenario: Envío mediante teclado
- **WHEN** una persona recorre el formulario con Tab y envía un texto con Enter desde Mensaje
- **THEN** puede completar el envío sin ratón y el foco permanece en el campo Mensaje

#### Scenario: Mensaje entrante mientras se escribe
- **WHEN** llega un mensaje de otra persona mientras el campo Mensaje tiene el foco
- **THEN** el nuevo mensaje queda disponible para anuncio accesible y el foco permanece donde la persona escribía

### Requirement: Presentación segura de medios y errores

El chat SHALL distinguir el remitente y el contenido, conservar el texto como texto y ofrecer imágenes, video y YouTube dentro de la conversación. Cuando falle la carga de una imagen o un video directo, SHALL mostrar un aviso en español junto al medio sin eliminar el resto del mensaje.

#### Scenario: Imagen y video válidos
- **WHEN** se reciben URLs admitidas de una imagen y un video disponibles
- **THEN** la imagen carga, el video ofrece controles y ambos respetan el ancho de la conversación

#### Scenario: Recurso inexistente
- **WHEN** el mensaje aceptado contiene una URL de imagen o video directo cuyo recurso devuelve un error
- **THEN** aparece un aviso de carga fallida asociado al recurso y se conservan el remitente y la URL como texto

#### Scenario: Texto recibido con apariencia de marcado
- **WHEN** un mensaje se representa en la conversación
- **THEN** el nombre y el texto no se interpretan como HTML y no ejecutan código
