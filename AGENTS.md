# Guía para trabajar en UNA Chat

## TLDR

- Trabaja desde esta raíz y usa los comandos de la tabla siguiente.
- Conserva la validación, el contenido seguro y el borrador hasta confirmar el envío.
- Prueba los cambios, cierra tus procesos y respeta las evidencias existentes.
- Consulta solo la guía pertinente y actualízala al confirmar una práctica nueva.

## Comandos principales

| Acción | Comando |
| --- | --- |
| Instalar dependencias | `npm ci` |
| Iniciar el chat | `npm start` |
| Pruebas unitarias | `npm test` |
| Pruebas de integración | `npm run test:integration` |
| Pruebas end-to-end | `npm run test:e2e` |

## Guías según la tarea

Lee únicamente la guía pertinente antes de modificar esa área:

- [Ejecución y pruebas](agents/ejecucion-y-pruebas.md): puerto ocupado, navegadores, separación de suites, capturas y revisiones manuales.
- [Contratos del chat](agents/contratos-del-chat.md): validación, envío, URLs, representación segura y compatibilidad de la interfaz.
- [Flujo de OpenSpec](agents/openspec.md): planificación, implementación y cierre de cambios.

## Mantenimiento

Cuando confirmes una práctica nueva aplicable al repositorio, actualiza estas instrucciones en el mismo cambio: añade aquí solo reglas esenciales y desarrolla los detalles en la guía pertinente, enlazándola si es nueva. Mantén cada regla en un único lugar y corrige o elimina las que dejen de ser ciertas. No incluyas secretos, notas temporales, resultados de una sola ejecución ni consejos genéricos.
