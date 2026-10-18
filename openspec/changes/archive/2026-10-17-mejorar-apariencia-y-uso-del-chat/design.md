# Design

## Context

Ver la motivación en `proposal.md`. El frontend está en un único `index.html`, con CSS y JavaScript integrados. El formulario usa posición fija y reserva 160 píxeles en la conversación, independientemente de su altura. Los eventos de conexión solo actualizan texto y el envío vacía el campo inmediatamente. No existe bienvenida ni tratamiento de errores de carga de medios.

`server.js` ya confirma el envío mediante un callback con `{ok, message}` o `{ok, error}` y emite `Mensaje-Rechazado` al emisor. La recepción difundida es la fuente actual de mensajes visibles. Los cinco casos de Playwright localizan los campos por sus nombres y verifican los identificadores actuales. El diseño se incluye porque coordinar confirmación, rechazo y desconexión requiere decisiones previas y conservar las defensas de representación segura.

## Goals / Non-Goals

**Goals:** mantener una implementación pequeña en el frontend actual; reutilizar la confirmación existente; hacer comprobables los estados del formulario y del diseño adaptable; mantener la validación y las interfaces de pruebas actuales.

**Non-Goals:** introducir un framework, extraer módulos por razones puramente estéticas, guardar borradores fuera de la memoria de la página, ofrecer entrega exactamente una vez o transformar el backend. El alcance funcional completo se define en la propuesta y las especificaciones.

## Decisions

### Diseño visual y distribución

Mantener fondo claro, azul del encabezado y tipografía del sistema. Usar variables CSS para espacios y colores. Una estructura vertical con altura mínima de viewport, conversación desplazable y formulario en el flujo evita calcular una reserva fija. En anchuras pequeñas, apilar los campos y dar al botón el ancho disponible; en escritorio, alinear el formulario en una fila. Mantener un ancho de lectura máximo y limitar medios al contenedor.

Alternativa descartada: mantener el formulario fijo y ajustar el relleno con una constante; falla al cambiar tamaño de fuente, orientación o altura del formulario. Se comprobará también el teclado virtual en un móvil real, sin prometer su simulación completa en Playwright.

### Accesibilidad y conversación

Mantener `#messages` como lista de mensajes reales y colocar la bienvenida fuera de ella. Añadir foco visible, etiquetas existentes y una región de estado para conexión y envío. Usar una región viva no intrusiva para mensajes entrantes; mantener el foco de escritura. Los errores siguen usando `role=alert`, con una sola actualización por rechazo.

Se conservarán los nombres accesibles Nombre, Mensaje y Enviar y los identificadores existentes. Los colores del nombre y los estados deberán mantener legibilidad; la información de conexión también será textual. Alternativa descartada: comunicar errores solo mediante color o alert del navegador, porque dificulta la lectura y la navegación.

### Estado de envío y conservación del borrador

Representar conexión y envío como estados separados. Al enviar, comprobar conexión, contenido no vacío tras recortar y ausencia de otro envío pendiente. Conservar el texto original del campo para recuperación; no reemplazar la validación autoritativa del servidor. Congelar temporalmente los campos de edición mientras se espera confirmación, conservando el foco, e impedir un segundo envío.

Asignar un identificador local a cada intento y usar la confirmación Socket.IO con un límite de cinco segundos. Al recibir aceptación, vaciar Mensaje, restablecer el formulario y mantener el foco. Representar mensajes exclusivamente desde el evento difundido; no insertar otra copia desde la confirmación.

Ante rechazo, restaurar edición y borrador. Mientras haya un envío pendiente, dejar que su confirmación gestione el aviso e ignorar su notificación duplicada `Mensaje-Rechazado`; conservar el listener para rechazos que no estén asociados a ese flujo. Una desconexión o timeout termina el intento, conserva el texto y muestra una advertencia de entrega no confirmada. Invalidar el identificador del intento para que callbacks tardíos no borren un borrador ni alteren un intento posterior.

Alternativa descartada: insertar optimistamente cada mensaje, limpiar inmediatamente y reintentar al reconectar. Con el protocolo actual no hay identificadores persistentes ni deduplicación y eso puede perder borradores o duplicar entregas. No habrá reintentos automáticos ni envíos nuevos sin conexión.

### Medios y seguridad

Conservar la creación de nodos, `textContent`, el color validado y el origen fijo de YouTube. Usar `error` de imagen y video directo para añadir un aviso asociado, construido como texto, conservando la URL visible. Mantener controles nativos y tamaño adaptable; para YouTube conservar título accesible y no tratar de inferir errores internos del iframe por su evento load.

Alternativa descartada: generar tarjetas interpolando HTML o incorporar una biblioteca de reproductores; añade superficie de inyección y dependencias innecesarias.

### Verificación

Conservar las suites existentes. Ampliar Playwright con móvil 320x640 y escritorio 1280x900, estado vacío, navegación por Tab y Enter, foco, errores de medios, aceptación sin duplicados, rechazo con borrador conservado, desconexión, timeout y callbacks tardíos. Usar el backend real en los recorridos principales y los medios locales disponibles.

Para retrasos de confirmación, instrumentar únicamente el cliente Socket.IO desde la prueba antes de cargar la página: envolver su creación/emisión para retener o retrasar el callback de confirmación de un intento. No añadir endpoints ni modos de prueba a producción. Contar emisiones para comprobar doble activación. Para desconexión, usar el contexto de navegador sin conexión y esperar el estado visible. Añadir integración del contrato de confirmación: una sola aceptación y rechazo con datos utilizables por el formulario.

Los eventos de carga con recursos locales inexistentes comprueban avisos sin depender de servicios externos. La lectura real de tecnologías de asistencia se revisará manualmente; atributos y foco se comprobarán automáticamente. Ejecutar `npm test`, `npm run test:integration` y `npm run test:e2e` después de implementar.

## Risks / Trade-offs

- Confirmación perdida después de una difusión correcta → advertir entrega incierta y pedir revisar la conversación antes de reenviar; no prometer ausencia total de duplicados entre reintentos manuales.
- Dos canales de rechazo → centralizar la actualización y comprobar que un rechazo no produzca avisos repetidos.
- Cambios de distribución afectan localizadores y capturas → conservar nombres e identificadores y verificar móvil, escritorio y cinco casos originales.
- Mensajes largos o medios grandes alteran la altura → limitar ancho, permitir ajuste de texto y comprobar que el último mensaje siga accesible.
- Bloqueo breve de edición mientras se confirma → limitarlo a cinco segundos y devolver inmediatamente la edición ante rechazo o desconexión.

## Migration Plan

No hay datos ni base de datos que migrar. Tras autorización, implementar frontend y pruebas en el mismo cambio, ejecutar las tres suites y revisar el resultado visual. No publicar ni actualizar evidencias académicas automáticamente. Para revertir, restaurar los archivos de interfaz, pruebas y documentación de este cambio sin tocar las validaciones ni el protocolo del backend.
