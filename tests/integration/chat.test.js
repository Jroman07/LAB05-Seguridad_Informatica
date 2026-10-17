const {io: connect} = require('socket.io-client');
const validation = require('../../libs/unalib');
const {createChatServer} = require('../../server');
let chat, sender, receiver, spy;
beforeAll(async () => {
  chat = createChatServer();
  await new Promise(resolve => chat.http.listen(0,'127.0.0.1',resolve));
  const url = 'http://127.0.0.1:' + chat.http.address().port;
  sender = connect(url,{autoConnect:false,transports:['websocket']});
  receiver = connect(url,{autoConnect:false,transports:['websocket']});
  await Promise.all([sender,receiver].map(client => new Promise((resolve,reject) => {
    client.once('connect',resolve); client.once('connect_error',reject); client.connect();
  })));
});
beforeEach(() => {spy = jest.spyOn(validation,'validarMensaje');});
afterEach(() => spy.mockRestore());
afterAll(async () => {
  sender?.disconnect(); receiver?.disconnect();
  if (chat) await new Promise(resolve => chat.io.close(resolve));
});
const send = raw => new Promise((resolve,reject) => sender.timeout(2000).emit('Evento-Mensaje-Server',raw,(error,result) => error ? reject(error) : resolve(result)));
test.each([['https://example.com/a.png','image'],['https://example.com/a.webm','video']])('acepta y difunde %s mediante el evento real', async (mensaje,tipo) => {
  const raw = JSON.stringify({nombre:'José',mensaje});
  const broadcast = new Promise(resolve => receiver.once('Evento-Mensaje-Server',resolve));
  const result = await send(raw);
  expect(result.ok).toBe(true); expect(result.message.tipo).toBe(tipo);
  expect(JSON.parse(await broadcast)).toEqual(result.message);
  expect(spy).toHaveBeenCalledWith(raw);
});
test.each(["<script>alert('Inyección de script');</script>",'https://example.com/file.html','javascript:alert(1)','{'])('rechaza sin difundir %s', async input => {
  const received = jest.fn(); receiver.on('Evento-Mensaje-Server',received);
  const raw = input === '{' ? input : JSON.stringify({nombre:'José',mensaje:input});
  const rejection = new Promise(resolve => sender.once('Mensaje-Rechazado',resolve));
  const result = await send(raw);
  expect(result.ok).toBe(false); expect(result.error).toBeTruthy();
  expect((await rejection).error).toBe(result.error);
  await new Promise(resolve => setTimeout(resolve,80));
  expect(received).not.toHaveBeenCalled(); expect(spy).toHaveBeenCalledWith(raw);
  receiver.off('Evento-Mensaje-Server',received);
});
