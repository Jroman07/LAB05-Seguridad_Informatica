# Ejecución y pruebas

## TLDR

- Revisa el puerto 3000 y cierra los servidores que hayas iniciado.
- Ejecuta cada suite por separado; Playwright usa Edge por defecto.
- Comprueba carga real de medios y conserva las evidencias anteriores.
- Distingue los resultados automáticos de las revisiones manuales pendientes.

Consulta esta guía al iniciar el chat, elegir una suite o preparar verificaciones. Los comandos principales están en [AGENTS.md](../AGENTS.md#comandos-principales).

## Servidor local

- Abre `http://127.0.0.1:3000`. Express sirve frontend y backend desde el mismo proceso.
- Ante `EADDRINUSE`, identifica qué proceso usa el puerto. Reutiliza el chat activo o detén su servidor anterior; no cierres procesos ajenos.
- Usa `Ctrl+C` para detener el servidor de tu terminal. No dejes el puerto ocupado sin avisar.

## Suites y navegador

- `npm run test:unit` es la alternativa explícita al comando unitario principal.
- Mantén Jest separado de `tests/e2e`; Playwright ejecuta esa carpeta con su propio comando.
- Conserva las pruebas originales y añade casos que comprueben comportamientos observables.
- Prueba la integración con `socket.io-client`: el envío usa Socket.IO, no una ruta HTTP de mensajes.
- Usa puertos efímeros y cierra clientes y servidores de integración al terminar.
- Playwright usa el proyecto `chromium` con el canal `msedge` por defecto y navegador visible. Instalar Chromium no cambia ese canal.
- Para consultar el reporte, ejecuta `npx playwright show-report`.

Para usar el navegador descargado por Playwright, ejecuta en PowerShell:

```powershell
npx playwright install chromium
$env:LAB_BROWSER_CHANNEL='chromium'
```

Después ejecuta el comando end-to-end de la tabla principal. Para volver al canal predeterminado en esa terminal:

```powershell
Remove-Item Env:LAB_BROWSER_CHANNEL
```

## Integración continua y Render

- `.github/workflows/deploy.yml` ejecuta `npm test` y `npm run test:integration` con Node.js 24 al actualizar `main`.
- Instala dependencias con `npm ci --include=dev`: Jest y socket.io-client son necesarios para las pruebas.
- El trabajo `deploy` depende de `test` mediante `needs: test`; una prueba fallida omite la llamada al Deploy Hook.
- Mantén Auto-Deploy desactivado en Render para que las publicaciones dependan del workflow.
- El Deploy Hook recibe el SHA del commit probado. Un workflow exitoso confirma la solicitud; verifica el estado Live y el mismo commit en Render.

## Comprobaciones manuales

- Comprueba móvil a 320x640 y escritorio a 1280x900, sin desbordamiento horizontal ni controles cubiertos.
- En end-to-end verifica carga real de imágenes y reproducción de video con los medios locales de `public/media`.
- Registra el listener de `dialog` antes de enviar el script y comprueba también su rechazo.
- Instrumenta confirmaciones tardías solo desde las pruebas; no añadas modos de prueba al código de producción.
- Guarda las capturas nuevas en `test-results`. No reemplaces evidencias académicas anteriores sin que se solicite.
- Distingue las comprobaciones automáticas de las manuales: emulación móvil y atributos accesibles no sustituyen un celular físico o un lector de pantalla.
