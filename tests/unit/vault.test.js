const {buildVaultConfig} = require('../../server/vault');

const base = 'postgresql://una_chat_backend.testref:password-de-prueba@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
const env = suffix => ({VAULT_DATABASE_URL: base + suffix});

test('Vault exige TLS verificado y limita el usuario al rol del backend', () => {
  const config = buildVaultConfig(env('?sslmode=verify-full'));
  expect(config.ssl).toEqual({rejectUnauthorized: true});
  expect(config.user).toBe('una_chat_backend.testref');
  expect(config.host).toBe('aws-0-us-east-2.pooler.supabase.com');
  expect(config.connectionString).toBeUndefined();
});

test.each(['?sslmode=disable', '?sslmode=require', ''])(
  'rechaza una conexión que no exige verify-full: %s', suffix => {
    expect(() => buildVaultConfig(env(suffix))).toThrow('Configuración de Vault no válida.');
  }
);

test('los parámetros de la URI no desactivan la verificación TLS', () => {
  const config = buildVaultConfig(env('?sslmode=verify-full&sslrootcert=archivo-ajeno'));
  expect(config.ssl).toEqual({rejectUnauthorized: true});
});

test('rechaza credenciales administrativas y no incluye la URI en el error', () => {
  const input = base.replace('una_chat_backend.testref', 'postgres') + '?sslmode=verify-full';
  try {
    buildVaultConfig({VAULT_DATABASE_URL: input});
    throw new Error('Se aceptó el rol administrativo');
  } catch (error) {
    expect(error.code).toBe('VAULT_CONFIG_INVALID');
    expect(error.message).not.toContain('password-de-prueba');
  }
});

test('decodifica únicamente las credenciales al construir la conexión', () => {
  const input = base.replace('password-de-prueba', 'clave%40con%2Fsimbolos%23');
  const config = buildVaultConfig({VAULT_DATABASE_URL: input + '?sslmode=verify-full'});
  expect(config.password).toBe('clave@con/simbolos#');
});

test('una URI inválida no se copia al mensaje de error', () => {
  expect(() => buildVaultConfig({VAULT_DATABASE_URL: 'dato privado'}))
    .toThrow('Configuración de Vault no válida.');
});
