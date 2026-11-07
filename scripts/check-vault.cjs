'use strict';
const path = require('node:path');
const {readVaultSecret} = require('../server/vault');

async function main() {
  try {
    try {process.loadEnvFile(path.resolve(__dirname, '../.env'));}
    catch (error) {if (error.code !== 'ENOENT') throw error;}
    const result = await readVaultSecret();
    console.log(JSON.stringify({
      ok: true,
      databaseUser: result.databaseUser,
      tlsVerified: result.tlsVerified,
      secretName: 'una_chat_auth0_client_secret',
      secretLength: result.secret.length
    }, null, 2));
  } catch (error) {
    const code = /^[A-Z0-9_]{1,64}$/.test(error.code || '') ? error.code : 'VAULT_CHECK_FAILED';
    // No imprimir error.message, stack, configuración ni objeto de conexión.
    console.error(JSON.stringify({ok: false, error: code}, null, 2));
    process.exitCode = 1;
  }
}

main();
