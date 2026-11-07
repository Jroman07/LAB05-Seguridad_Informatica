'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
const {readVaultSecret} = require('../server/vault');
const config = require('../auth0.config.json');
const root = path.resolve(__dirname, '..');
const privateFile = path.join(root, '.env.lab08-rotation.local');
const reportFile = path.join(root, 'test-results/lab08-rotation.json');
const allowedErrors = new Set([
  'invalid_client', 'invalid_grant', 'invalid_request', 'unauthorized_client',
  'access_denied', 'unsupported_grant_type', 'server_error', 'temporarily_unavailable'
]);

async function main() {
  process.loadEnvFile(path.join(root, '.env'));
  const action = process.argv[2];
  if (action === '--prepare') {
    const value = await readVaultSecret();
    fs.writeFileSync(privateFile, JSON.stringify({
      capturedAt: new Date().toISOString(),
      secret: value.secret, domain: config.domain, clientId: config.clientId
    }), {encoding: 'utf8', flag: 'wx', mode: 0o600});
    console.log(JSON.stringify({oldSecretSaved: true, secretLength: value.secret.length}));
    return;
  }
  if (action === '--cleanup') {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    if (report.secretsChanged !== true) throw new Error();
    fs.unlinkSync(privateFile);
    console.log(JSON.stringify({privateSnapshotRemoved: true}));
    return;
  }
  if (action) throw new Error();

  const old = JSON.parse(fs.readFileSync(privateFile, 'utf8'));
  if (old.domain !== config.domain || old.clientId !== config.clientId ||
      typeof old.secret !== 'string' || old.secret.length <= 16) throw new Error();
  const current = await readVaultSecret();
  if (old.secret === current.secret) {
    console.log(JSON.stringify({secretsChanged: false, error: 'Vault conserva el valor anterior.'}));
    process.exitCode = 1;
    return;
  }

  // Mismos campos en ambos intentos; solo cambia client_secret. Código falso
  // deliberado para comprobar la credencial, sin obtener una sesión de usuario.
  const common = {
    grant_type: 'authorization_code', client_id: config.clientId,
    code: 'vault-startup-probe',
    redirect_uri: 'https://lab05-seguridad-informatica.onrender.com',
    code_verifier: randomBytes(32).toString('base64url')
  };
  async function probe(secret) {
    const at = new Date().toISOString();
    const response = await fetch('https://' + config.domain + '/oauth/token', {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({...common, client_secret: secret}),
      redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    const body = await response.json().catch(() => ({}));
    // No conservar tokens, error_description ni el cuerpo de la petición.
    return {
      atUTC: at, httpStatus: response.status,
      error: allowedErrors.has(body.error) ? body.error : 'unexpected_response'
    };
  }
  const previous = await probe(old.secret);
  const next = await probe(current.secret);
  const report = {
    secretsChanged: true,
    oldSnapshotAtUTC: old.capturedAt,
    tlsVerified: current.tlsVerified,
    newSecretLength: current.secret.length,
    endpoint: 'https://' + config.domain + '/oauth/token',
    clientId: config.clientId,
    previous, next,
    matchesGuideExpectation: previous.error === 'invalid_client' && next.error === 'invalid_grant',
    loginFlow: 'SPA Authorization Code + PKCE; el login no envia client_secret'
  };
  fs.mkdirSync(path.dirname(reportFile), {recursive: true});
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(() => {
  console.error(JSON.stringify({ok: false, error: 'ROTATION_CHECK_FAILED'}));
  process.exitCode = 1;
});
