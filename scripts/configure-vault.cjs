'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const {Writable} = require('node:stream');

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Ejecuta este asistente en tu terminal interactiva. No acepta contraseñas por argumentos.');
    process.exitCode = 1;
    return;
  }
  const envPath = path.resolve(__dirname, '../.env');
  const original = fs.readFileSync(envPath, 'utf8');
  const hiddenOutput = new Writable({write(_chunk, _encoding, done) {done();}});
  const prompt = readline.createInterface({input: process.stdin, output: hiddenOutput, terminal: true});
  const cancellation = new AbortController();
  prompt.once('SIGINT', () => cancellation.abort());
  console.log('Configurar Vault: una_chat_backend en el proyecto grzfapnqtzgkbbzspycb.');
  console.log('Usa la contraseña del rol creado con SQL; no el Client Secret ni la contraseña de tu cuenta.');
  process.stdout.write('Contraseña del rol (entrada oculta): ');
  let password;
  try {
    password = await prompt.question('', {signal: cancellation.signal});
  } finally {
    prompt.close();
    process.stdout.write('\n');
  }
  if (!password) throw new Error('EMPTY_PASSWORD');
  const uri = 'postgresql://una_chat_backend.grzfapnqtzgkbbzspycb:' +
    encodeURIComponent(password) + '@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=verify-full';
  const setting = 'VAULT_DATABASE_URL=' + uri;
  const updated = /^\s*VAULT_DATABASE_URL\s*=.*$/m.test(original)
    ? original.replace(/^\s*VAULT_DATABASE_URL\s*=.*$/m, () => setting)
    : original + '\n' + setting + '\n';
  fs.writeFileSync(envPath, updated, {encoding: 'utf8', mode: 0o600});
  console.log('Conexión guardada en el .env privado. No se muestra la contraseña ni la URI.');
}

main().catch(() => {
  console.error('No se completó la configuración. Revisa que exista .env y vuelve a intentarlo.');
  process.exitCode = 1;
});
