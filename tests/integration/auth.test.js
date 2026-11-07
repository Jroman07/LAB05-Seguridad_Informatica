const {generateKeyPairSync, sign, createHmac} = require('node:crypto');
const {io} = require('socket.io-client');
const {createAuthorization} = require('../../server/auth');
const {createChatServer} = require('../../server');

const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {type: 'spki', format: 'pem'},
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
});
const issuer = 'https://issuer.example/';
const audience = 'https://una-chat-lab08/api';
let chat, url;
const clients = [];

function token(changes = {}, algorithm = 'RS256') {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = encode({alg: algorithm, typ: 'JWT'}) + '.' + encode({
    iss: issuer, aud: audience, sub: 'usuario-de-prueba',
    iat: now, exp: now + 60, ...changes
  });
  const signature = algorithm === 'RS256'
    ? sign('RSA-SHA256', Buffer.from(content), keys.privateKey)
    : createHmac('sha256', 'clave-de-prueba').update(content).digest();
  return content + '.' + signature.toString('base64url');
}

function client(accessToken) {
  const socket = io(url, {
    transports: ['websocket'], autoConnect: false, reconnection: false,
    timeout: 2000, auth: accessToken === undefined ? {} : {token: accessToken}
  });
  clients.push(socket);
  return socket;
}

function connect(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
    socket.connect();
  });
}

beforeAll(async () => {
  chat = createChatServer({authorization: createAuthorization({
    issuer, audience, publicKey: keys.publicKey
  })});
  await new Promise(resolve => chat.http.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + chat.http.address().port;
});

afterEach(() => clients.splice(0).forEach(socket => socket.disconnect()));
afterAll(async () => {await new Promise(resolve => chat.io.close(resolve));});

test('/sala sin token devuelve 401 y la configuración pública no revela secretos', async () => {
  const response = await fetch(url + '/sala');
  expect(response.status).toBe(401);
  const config = await fetch(url + '/auth/config').then(r => r.json());
  expect(config.enabled).toBe(true);
  expect(Object.keys(config).sort()).toEqual(['audience', 'clientId', 'domain', 'enabled']);
});

test.each([
  ['sin token', () => undefined],
  ['formato inválido', () => 'no-es-un-token'],
  ['otro emisor', () => token({iss: 'https://otro.example/'})],
  ['otra audiencia', () => token({aud: 'otra-api'})],
  ['token vencido', () => token({exp: Math.floor(Date.now() / 1000) - 10})],
  ['sin subject', () => token({sub: undefined})],
  ['algoritmo HS256', () => token({}, 'HS256')],
  ['firma alterada', () => {
    const valid = token();
    const index = valid.lastIndexOf('.') + 12;
    return valid.slice(0, index) + (valid[index] === 'A' ? 'B' : 'A') + valid.slice(index + 1);
  }]
])('rechaza Socket.IO: %s', async (_name, makeToken) => {
  const connection = jest.fn();
  chat.io.on('connection', connection);
  try {
    await expect(connect(client(makeToken()))).rejects.toMatchObject({
      data: {code: 'AUTH_REQUIRED'}
    });
    expect(connection).not.toHaveBeenCalled();
  } finally {chat.io.off('connection', connection);}
});

test('un token RSA válido permite HTTP y el envío confirmado entre dos clientes', async () => {
  const accessToken = token();
  const response = await fetch(url + '/sala', {
    headers: {authorization: 'Bearer ' + accessToken}
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({authenticated: true});
  const sender = client(accessToken), receiver = client(accessToken);
  await Promise.all([connect(sender), connect(receiver)]);
  const broadcast = new Promise(resolve => receiver.once('Evento-Mensaje-Server', resolve));
  const result = await new Promise((resolve, reject) => sender.timeout(2000).emit(
    'Evento-Mensaje-Server', JSON.stringify({nombre: 'Prueba', mensaje: 'Hola autenticado'}),
    (error, value) => error ? reject(error) : resolve(value)
  ));
  expect(result.ok).toBe(true);
  expect(JSON.parse(await broadcast).mensaje).toBe('Hola autenticado');
});

test('cierra una conexión ya abierta cuando vence su token', async () => {
  const socket = client(token({exp: Math.ceil(Date.now() / 1000) + 2}));
  await connect(socket);
  const reason = await new Promise(resolve => socket.once('disconnect', resolve));
  expect(reason).toBe('io server disconnect');
  expect(socket.connected).toBe(false);
}, 6000);
