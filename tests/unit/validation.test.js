const val = require('../../libs/unalib');
const raw = (mensaje, extra = {}) => JSON.stringify({nombre:'José', mensaje, ...extra});
describe('Validación de medios y prevención de inyección', () => {
  test.each(['https://example.com/a.png','http://example.com/a.JPG','https://example.com/a.gif?version=2'])('acepta imagen %s', url => {
    expect(JSON.parse(val.validarMensaje(raw(url))).tipo).toBe('image');
  });
  test.each(['https://example.com/a.mp4','http://example.com/a.webm','https://example.com/a.ogg'])('acepta video %s', url => {
    expect(JSON.parse(val.validarMensaje(raw(url))).tipo).toBe('video');
  });
  test('acepta YouTube y extrae un identificador exacto', () => {
    expect(JSON.parse(val.validarMensaje(raw('https://www.youtube.com/watch?v=qYwlqx-JLok'))).videoId).toBe('qYwlqx-JLok');
  });
  test.each(["<script>alert('Inyección de script');</script>",'<img src=x onerror=alert(1)>','javascript:alert(1)','data:image/svg+xml,test','&lt;script&gt;alert(1)&lt;/script&gt;','https://example.com/file.html','https://example.com/a.png.exe','ftp://example.com/a.png','https://example.com/a.png\"onerror=alert(1)','https://user:pass@example.com/a.png'])('rechaza %s', input => {
    expect(() => val.validarMensaje(raw(input))).toThrow();
  });
  test('rechaza inyección en el nombre', () => expect(() => val.validarMensaje(raw('Hola',{nombre:'<svg onload=alert(1)>'}))).toThrow());
  test('neutraliza el color que no es hexadecimal', () => expect(JSON.parse(val.validarMensaje(raw('Hola',{color:'red; background:url(x)'}))).color).toBe('#245b78'));
  test.each([null,'{',JSON.stringify({mensaje:3}),JSON.stringify({mensaje:''})])('rechaza formato inválido %s', value => expect(() => val.validarMensaje(value)).toThrow());
  test('conserva texto normal', () => expect(JSON.parse(val.validarMensaje(raw('Hola UNA'))).mensaje).toBe('Hola UNA'));
});
