# Login local de UNA Chat con React y Auth0

Esta etapa adapta el Quickstart React solicitado: SPA, autenticación del
cliente "none" y SDK oficial @auth0/auth0-react con Authorization Code + PKCE.
Domain, Client ID y audience son identificadores públicos en auth0.config.json.
No añadir Client Secrets ni conexiones de Vault al código del navegador.

## Ejecutar en el equipo

Con Node.js 24, desde la raíz del repositorio:

1. Ejecutar npm ci si faltan las dependencias.
2. En una terminal, ejecutar npm start (backend en el puerto 3000).
3. En otra terminal, ejecutar npm run dev:react.
4. Abrir http://localhost:5173.
5. Pulsar Iniciar sesión o Crear cuenta. Completar Universal Login personalmente.
6. Al volver, comprobar nombre, Cerrar sesión y mensajes del chat.
7. Cerrar sesión y comprobar que vuelve a aparecer el acceso.

Vite mantiene el puerto 5173 fijo con strictPort; no cambiará de puerto si
está ocupado. El proxy local conduce /socket.io y /media al servidor Node.
No hace falta cargar el .env de Lab07 para este paso.

En Auth0, Allowed Callback URLs, Allowed Logout URLs y Allowed Web Origins
deben incluir http://localhost:5173, http://127.0.0.1:5173 y el origen HTTPS
de Render. El callback del SDK regresa a la raíz del origen actual.

## Comprobaciones y alcance de esta etapa

- npm run build:react compila el frontend en dist/client.
- npm test y npm run test:integration comprueban el backend existente.
- El login real se comprueba con una cuenta y evidencia propia en Auth0.

El servidor sirve React compilado cuando existe dist/client; para desarrollo
se utiliza el puerto 5173. Ambos comparten el backend protegido: Socket.IO
requiere un access token firmado con RS256, con issuer, audience y vencimiento
válidos. React obtiene el token con getAccessTokenSilently y lo envía en auth
del handshake, nunca en una URL. El backend usa el SDK oficial de Auth0.
Al vencer el token, se cierra la conexión para impedir nuevos envíos y recepción.
En Render, Node.js sirve el frontend React compilado desde el mismo origen HTTPS.

Registrar en Auth0 la API https://una-chat-lab08/api con RS256. En su pestaña
Application Access, autorizar User-Delegated Access para la SPA de UNA Chat
si la política exige autorización por aplicación. No basta con crear la API.
Si aparece Client is not authorized to access resource server, revisar este
grant; no cambiar la SPA a M2M ni desactivar la validación del backend.
Tras añadir
la audience, cerrar la sesión anterior y volver a iniciar sesión para obtener
un token destinado a la API. Completar personalmente el consentimiento si se
solicita. Nunca compartir ni capturar el token.

node scripts/check-auth.cjs comprueba /auth/config, el HTTP 401 de /sala y
el rechazo de sockets sin token o con token inválido, sin imprimir credenciales.
tests/integration/auth.test.js verifica además firmas reales RSA locales,
emisor, audience, algoritmo, vencimiento y envío autorizado. Las pruebas de
contratos anteriores y telemetría inyectan autorización null exclusivamente
en su instancia de prueba; npm start no dispone de un modo anónimo.

La guía escrita presupone un cliente confidencial con secreto de Auth0 en
Vault. Una SPA con PKCE no utiliza ese secreto para el login; la prueba de
rotación descrita en la guía requiere adaptar ese punto y documentarlo.

## Comprobar acceso del backend a Vault

Conservar el .env existente de la raíz y completar únicamente en él:

VAULT_DATABASE_URL=postgresql://una_chat_backend.PROJECT_REF:PASSWORD_CODIFICADA@HOST:5432/postgres?sslmode=verify-full

Usar la contraseña del rol una_chat_backend, distinta del Client Secret.
Codificar los caracteres especiales de la contraseña como componente URL.
Para el proyecto de esta práctica, node scripts/configure-vault.cjs solicita
la contraseña con entrada oculta en una terminal interactiva, la codifica y
guarda la conexión en el .env existente. No pasar la contraseña por argumentos.
Si hace falta un certificado CA, descargarlo desde Supabase y establecer
VAULT_CA_FILE con su ruta. El código nunca desactiva la verificación TLS.

Ejecutar node scripts/check-vault.cjs desde la raíz del repositorio.
El resultado solo muestra ok, databaseUser, tlsVerified, secretName y
secretLength. Los errores solo muestran un código. La comprobación no
inicia telemetría ni imprime credenciales. Este acceso es una prueba del
backend; no cambia el flujo PKCE de React.

## Preparar Render

Build Command: npm ci --include=dev && npm run build:react
Start Command: npm start

Configurar en Environment AUTH0_DOMAIN, AUTH0_CLIENT_ID y AUTH0_AUDIENCE
con los identificadores públicos de auth0.config.json. Añadir la conexión
privada VAULT_DATABASE_URL y VAULT_CA_FILE=server/supabase-root-2021-ca.pem.
Conservar las variables de Sentry y la exclusión de Grafana en Render.
No añadir AUTH0_CLIENT_SECRET al navegador ni al entorno de Render.

El pipeline compila React y comprueba las pruebas antes de solicitar Deploy.
En Render, el arranque exige el frontend compilado y la conexión de Vault.
Lee el secreto mediante el rol limitado y TLS verificado, y registra solamente
event=vault_ready, usuario, TLS y longitud. Un fallo detiene el arranque
mostrando solo su código. No registra ni usa ese valor en el login PKCE.

El Dockerfile también compila React en una primera etapa y copia los módulos
del backend y su certificado público a la imagen final. No incluye .env.

## Comparar la rotación sin exponer secretos

Antes de rotar, ejecutar node scripts/check-rotation.cjs --prepare. Conserva
el valor anterior en .env.lab08-rotation.local, excluido de Git. No entregar
ese archivo ni incluirlo en un ZIP o una captura. No sobreescribe una copia
anterior si ya existe.

Rotar el Client Secret en Auth0 y actualizar el mismo registro de Vault.
Ejecutar node scripts/check-rotation.cjs después de la propagación del cambio.
El script comprueba que el valor cambió y realiza dos POST a /oauth/token
con los mismos campos salvo client_secret y un código deliberadamente falso.
El reporte test-results/lab08-rotation.json registra horas UTC, estado HTTP
y error. No incluye secretos, contraseñas, tokens ni cuerpos de petición.

La guía espera invalid_client para el anterior e invalid_grant para el nuevo.
Conservar siempre el código real de Auth0: un 401 access_denied puede aparecer
en lugar de invalid_client. matchesGuideExpectation compara literalmente los
dos nombres de error esperados; no reemplaza la interpretación del resultado.
El inicio de sesión SPA usa PKCE y no demuestra que el Client Secret se use
en el navegador. Verificar aparte una sesión nueva tras el despliegue.

Después de conservar el reporte, ejecutar node scripts/check-rotation.cjs
--cleanup para eliminar la copia privada anterior. La evidencia pública
puede mostrarse con Get-Content test-results/lab08-rotation.json en PowerShell.
