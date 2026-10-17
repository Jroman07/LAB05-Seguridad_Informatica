const {test,expect} = require('@playwright/test');
const path = require('path');
const evidence = path.resolve(__dirname,'../../../../evidencias');
test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#connection')).toHaveText('Conectado al backend');
});
async function send(page,message) {
  await page.getByRole('textbox',{name:'Mensaje',exact:true}).fill(message);
  await page.getByRole('button',{name:'Enviar'}).click();
}
test('URL de imagen se muestra y termina de cargar', async ({page,baseURL}) => {
  await send(page,baseURL + '/media/una.png');
  const image = page.getByRole('img',{name:'Imagen enviada en el chat'});
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.screenshot({path:path.join(evidence,'imagen-cargada.jpg'),type:'jpeg',quality:90});
});
test('URL de video crea reproductor y carga contenido real', async ({page,baseURL}) => {
  await send(page,baseURL + '/media/una.webm');
  const video = page.locator('#messages video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate(el => el.readyState >= 2 && el.videoWidth > 0)).toBe(true);
  await video.evaluate(async el => {await el.play();});
  await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0);
  await video.evaluate(el => el.pause());
  await page.screenshot({path:path.join(evidence,'video-cargado.jpg'),type:'jpeg',quality:90});
});
test('script original rechazado sin alert ni mensaje difundido', async ({page}) => {
  const dialogs = []; page.on('dialog',async dialog => {dialogs.push(dialog.message());await dialog.dismiss();});
  await send(page,"<script>alert('Inyección de script');</script>");
  await expect(page.getByRole('alert')).toContainText('Mensaje rechazado');
  await page.waitForTimeout(300);
  expect(dialogs).toEqual([]); await expect(page.locator('#messages li')).toHaveCount(0);
  await page.screenshot({path:path.join(evidence,'inyeccion-bloqueada.jpg'),type:'jpeg',quality:90});
});
test('URL no permitida rechazada', async ({page}) => {
  await send(page,'https://example.com/file.html');
  await expect(page.getByRole('alert')).toContainText('Solo se permiten URLs');
  await expect(page.locator('#messages li')).toHaveCount(0);
});
test('mensaje enviado llega a otro cliente conectado', async ({page,context}) => {
  const other = await context.newPage(); await other.goto('/');
  await expect(other.locator('#connection')).toHaveText('Conectado al backend');
  await send(page,'Hola UNA');
  await expect(other.locator('#messages')).toContainText('Hola UNA'); await other.close();
});
