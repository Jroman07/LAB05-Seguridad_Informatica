const {test,expect} = require('@playwright/test');

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#connection')).toHaveText('Conectado al backend');
}
async function send(page,text) {
  await page.getByRole('textbox',{name:'Mensaje',exact:true}).fill(text);
  await page.getByRole('button',{name:'Enviar',exact:true}).click();
  await expect(page.locator('#m')).toHaveValue('');
}

test('bienvenida fuera de la lista y primer mensaje único', async ({page}) => {
  await open(page);
  await expect(page.locator('#welcome')).toBeVisible();
  await expect(page.locator('#messages li')).toHaveCount(0);
  await send(page,'Hola al grupo');
  await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#messages li')).toHaveCount(1);
  await expect(page.locator('#nombre')).toHaveValue('José');
});

for (const viewport of [{width:320,height:640},{width:1280,height:900}]) {
  test(`distribución sin desbordamiento a ${viewport.width}px`, async ({page,baseURL},testInfo) => {
    await page.setViewportSize(viewport);
    await open(page);
    await send(page,'Conversación '.repeat(20) + 'x'.repeat(120));
    await send(page,baseURL+'/media/una.png');
    await send(page,baseURL+'/media/una.webm');
    await expect.poll(() => page.locator('video').evaluate(v => v.readyState>=2)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const selector of ['#nombre','#m','form button']) await expect(page.locator(selector)).toBeInViewport();
    expect(await page.locator('main').evaluate(el => el.clientHeight)).toBeGreaterThan(160);
    expect(await page.locator('#messages').evaluate(el => {
      const panel = el.parentElement;
      panel.scrollTop=panel.scrollHeight;
      return el.lastElementChild.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom;
    })).toBe(true);
    for (const media of await page.locator('#messages img, #messages video').all()) {
      expect(await media.evaluate(el => el.getBoundingClientRect().width <= el.closest('li').clientWidth)).toBe(true);
    }
    await page.screenshot({path:testInfo.outputPath(`chat-${viewport.width}.png`),fullPage:true});
  });
}

test('teclado y nuevos mensajes conservan el foco', async ({page,context}) => {
  await open(page);
  await page.keyboard.press('Tab'); await expect(page.locator('#nombre')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#m')).toBeFocused();
  await page.keyboard.type('Mensaje por teclado');
  expect(await page.locator('#m').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:'Enviar',exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('#m')).toHaveValue(''); await expect(page.locator('#m')).toBeFocused();
  const other=await context.newPage(); await open(other); await send(other,'Mensaje de otra persona');
  await expect(page.locator('#messages li')).toHaveCount(2);
  await expect(page.locator('#m')).toBeFocused();
  await expect(page.locator('#messages')).toHaveAttribute('aria-live','polite');
  await expect(page.locator('#connection')).toHaveAttribute('role','status');
  await other.close();
});

test('errores de imagen y video conservan remitente, URL y conversación', async ({page,baseURL},testInfo) => {
  await open(page);
  await send(page,'Mensaje que se conserva');
  await send(page,baseURL+'/media/no-existe.png');
  await expect(page.locator('.media-error')).toHaveText(['No se pudo cargar la imagen.']);
  await send(page,baseURL+'/media/no-existe.webm');
  await expect(page.locator('.media-error')).toHaveText(['No se pudo cargar la imagen.','No se pudo cargar el video.']);
  await expect(page.locator('#messages li')).toHaveCount(3);
  await expect(page.locator('#messages li').first()).toContainText('Mensaje que se conserva');
  for (const item of await page.locator('#messages li').all()) await expect(item.locator('b')).toHaveText('José');
  await expect(page.locator('#messages')).toContainText('/media/no-existe.png');
  await expect(page.locator('#messages')).toContainText('/media/no-existe.webm');
  await page.screenshot({path:testInfo.outputPath('medios-no-disponibles.png'),fullPage:true});
});

test('YouTube usa título y origen fijo; los datos se representan como texto',async ({page}) => {
  await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Marco de prueba</title>'}));
  await open(page);
  await send(page,'https://www.youtube.com/watch?v=qYwlqx-JLok');
  await expect(page.getByTitle('Video de YouTube')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/qYwlqx-JLok');
  // Isolated rendering check in addition to the real-backend rejection test.
  await page.evaluate(() => {
    socket.listeners('Evento-Mensaje-Server')[0](JSON.stringify({nombre:'<img src=x onerror=alert(1)>',mensaje:'<script>alert(1)</script>',color:'red;display:none',tipo:'text'}));
  });
  const last=page.locator('#messages li').last();
  await expect(last).toContainText('<script>alert(1)</script>');
  await expect(last.locator('b')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(last.locator('script,img')).toHaveCount(0);
});
