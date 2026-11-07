'use strict';
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {Client} = require('pg');

function configurationError(code) {
  const error = new Error('Configuración de Vault no válida.');
  error.code = code;
  return error;
}

function buildVaultConfig(env = process.env) {
  const raw = env.VAULT_DATABASE_URL?.trim();
  if (!raw || raw.includes('REEMPLAZAR_CON_PASSWORD')) {
    throw configurationError('VAULT_CONFIG_MISSING');
  }
  let url, user, password, database;
  try {
    url = new URL(raw);
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    // URL() puede incluir el input privado en su error; nunca propagarlo.
    throw configurationError('VAULT_CONFIG_INVALID');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !/^(db\.[a-z0-9]+\.supabase\.co|aws-[a-z0-9-]+\.pooler\.supabase\.com)$/.test(url.hostname) ||
      !/^una_chat_backend(?:\.[a-z0-9]+)?$/.test(user) ||
      !password || database !== 'postgres' || (url.port && url.port !== '5432') ||
      url.searchParams.get('sslmode') !== 'verify-full') {
    throw configurationError('VAULT_CONFIG_INVALID');
  }
  const ssl = {rejectUnauthorized: true};
  if (env.VAULT_CA_FILE?.trim()) {
    try {ssl.ca = readFileSync(resolve(__dirname, '..', env.VAULT_CA_FILE.trim()), 'utf8');}
    catch {throw configurationError('VAULT_CA_UNREADABLE');}
  }
  // Separamos los campos: pg no debe reemplazar ssl al analizar sslmode.
  return {
    host: url.hostname, port: 5432, database, user, password, ssl,
    application_name: 'una-chat-lab08',
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    query_timeout: 12000
  };
}

async function readVaultSecret(env = process.env) {
  const client = new Client(buildVaultConfig(env));
  try {
    await client.connect();
    if (client.connection.stream.authorized !== true) {
      throw configurationError('VAULT_TLS_UNVERIFIED');
    }
    const {rows} = await client.query(
      'select current_user as database_user, una_chat_private.get_auth0_client_secret() as secret'
    );
    const row = rows[0];
    if (typeof row?.secret !== 'string' || row.secret.length <= 16) {
      throw configurationError('VAULT_SECRET_INVALID');
    }
    // Solo el servidor recibe el valor; no exponer este resultado en HTTP/logs.
    return {secret: row.secret, databaseUser: row.database_user, tlsVerified: true};
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = {buildVaultConfig, readVaultSecret};
