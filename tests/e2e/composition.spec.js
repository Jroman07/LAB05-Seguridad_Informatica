const {test,expect} = require('@playwright/test');
const eventName='Evento-Mensaje-Server';

// Instrument only the test client; the application and real backend stay unchanged.
async function instrument(page,{autoConnect=true}={}) {
  await page.route('**/socket.io/socket.io.js',async route => {
    const response=await route.fetch();
    const body=await response.text();
    await route.fulfill({response,body:body+`;(() => {
      const original=window.io;
      window.io=Object.assign(function(...args) {
        const socket=original(...args);
        window.testSocket=socket;
        window.chatAttempts=0; window.holdConfirmation=false; window.heldConfirmations=[];
        ${autoConnect ? '' : 'socket.disconnect();'}
        const emit=socket.emit.bind(socket);
        socket.emit=function(event,...values) {
          if(event==='${eventName}') {
            window.chatAttempts++;
            const callback=values[values.length-1];
            if(typeof callback==='function') values[values.length-1]=result => {
              if(window.holdConfirmation) window.heldConfirmations.push(() => callback(result));
              else callback(result);
            };
          }
          return emit(event,...values);
        };
        return socket;
      },original);
    })();`});
  });
}
async function open(page) {
  await page.goto('/');
  await expect(page.locator('#connection')).toHaveText('Conectado al backend');
}
async function submit(page,text) {
  await page.locator('#m').fill(text);
  await page.getByRole('button',{name:'Enviar',exact:true}).click();
}

test('sin conexión inicial se conserva el borrador sin emitir', async ({page}) => {
  await instrument(page,{autoConnect:false}); await page.goto('/');
  await expect(page.locator('#connection')).toHaveText('Conectando');
  await page.locator('#m').fill('Borrador inicial');
  await expect(page.getByRole('button',{name:'Enviar',exact:true})).toBeDisabled();
  await page.locator('#m').press('Enter');
  expect(await page.evaluate(() => window.chatAttempts)).toBe(0);
  await page.evaluate(() => window.testSocket.connect());
  await expect(page.locator('#connection')).toHaveText('Conectado al backend');
  await expect(page.locator('#m')).toHaveValue('Borrador inicial');
  await expect(page.locator('#messages li')).toHaveCount(0);
  await page.locator('#m').fill('   ');
  await expect(page.getByRole('button',{name:'Enviar',exact:true})).toBeDisabled();
});

test('aceptación limpia solo al confirmar y evita doble envío', async ({page,context}) => {
  await instrument(page); await open(page);
  const other=await context.newPage(); await open(other);
  await page.evaluate(() => window.holdConfirmation=true);
  await submit(page,'Confirmación pendiente');
  await expect(page.locator('#send-state')).toHaveText('Enviando…');
  await expect(page.locator('#m')).toHaveValue('Confirmación pendiente');
  await expect(page.locator('#m')).toHaveAttribute('readonly','');
  await page.locator('#m').press('Enter');
  await page.evaluate(() => document.querySelector('form').requestSubmit());
  expect(await page.evaluate(() => window.chatAttempts)).toBe(1);
  await expect(page.locator('#messages li')).toHaveCount(1);
  await expect(other.locator('#messages li')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.heldConfirmations.length)).toBe(1);
  await page.evaluate(() => window.heldConfirmations.shift()());
  await expect(page.locator('#m')).toHaveValue('');
  await expect(page.locator('#m')).toBeFocused();
  await expect(page.locator('#nombre')).toHaveValue('José');
  await expect(page.locator('#send-state')).toHaveText('Mensaje enviado.');
  await expect(page.locator('#messages li')).toHaveCount(1); await other.close();
});

test('rechazo conserva borrador y anuncia un único error; permite corregir', async ({page}) => {
  await open(page);
  const dialogs=[]; page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
  await page.evaluate(() => {
    window.errorChanges=[];
    new MutationObserver(() => window.errorChanges.push(document.querySelector('#error').textContent))
      .observe(document.querySelector('#error'),{childList:true,subtree:true});
  });
  const draft="  <script>alert('Inyección de script');</script>  ";
  await submit(page,draft);
  await expect(page.getByRole('alert')).toContainText('Mensaje rechazado');
  await expect(page.locator('#m')).toHaveValue(draft);
  await expect(page.locator('#m')).not.toHaveAttribute('readonly','');
  await expect(page.locator('#messages li')).toHaveCount(0);
  expect(await page.evaluate(() => window.errorChanges.filter(Boolean).length)).toBe(1);
  expect(dialogs).toEqual([]);
  await submit(page,'Ahora sí');
  await expect(page.locator('#m')).toHaveValue('');
  await expect(page.locator('#error')).toBeEmpty();
  await expect(page.locator('#messages li')).toHaveCount(1);
});

test('timeout conserva borrador y callbacks tardíos no alteran otro intento', async ({page}) => {
  await instrument(page); await open(page);
  await page.evaluate(() => window.holdConfirmation=true);
  await submit(page,'Primer intento');
  await expect.poll(() => page.evaluate(() => window.heldConfirmations.length)).toBe(1);
  await expect(page.locator('#send-state')).toContainText('Revisa la conversación antes de reenviar',{timeout:7000});
  await expect(page.locator('#m')).toHaveValue('Primer intento');
  expect(await page.evaluate(() => window.chatAttempts)).toBe(1);
  await submit(page,'Segundo borrador');
  await expect.poll(() => page.evaluate(() => window.heldConfirmations.length)).toBe(2);
  await page.evaluate(() => window.heldConfirmations.shift()());
  await expect(page.locator('#m')).toHaveValue('Segundo borrador');
  await expect(page.locator('#send-state')).toHaveText('Enviando…');
  await page.evaluate(() => window.heldConfirmations.shift()());
  await expect(page.locator('#m')).toHaveValue('');
  expect(await page.evaluate(() => window.chatAttempts)).toBe(2);
});

for (const duringSend of [false,true]) {
  test(`desconexión ${duringSend ? 'durante envío' : 'al redactar'} conserva borrador`,async ({page,context}) => {
    await instrument(page); await open(page);
    await page.locator('#m').fill('Borrador que se conserva');
    if(duringSend) {
      await page.evaluate(() => window.holdConfirmation=true);
      await page.getByRole('button',{name:'Enviar',exact:true}).click();
      await expect.poll(() => page.evaluate(() => window.heldConfirmations.length)).toBe(1);
    }
    await context.setOffline(true);
    await expect(page.locator('#connection')).toHaveText('Desconectado',{timeout:40000});
    await expect(page.locator('#m')).toHaveValue('Borrador que se conserva');
    await expect(page.locator('#m')).toBeEditable();
    await expect(page.getByRole('button',{name:'Enviar',exact:true})).toBeDisabled();
    if(duringSend) await expect(page.locator('#send-state')).toContainText('No se pudo confirmar');
    const attempts=await page.evaluate(() => window.chatAttempts);
    await context.setOffline(false);
    await expect(page.locator('#connection')).toHaveText('Conectado al backend',{timeout:15000});
    await expect(page.locator('#m')).toHaveValue('Borrador que se conserva');
    expect(await page.evaluate(() => window.chatAttempts)).toBe(attempts);
    if(duringSend) {
      await page.evaluate(() => window.heldConfirmations.shift()());
      await expect(page.locator('#m')).toHaveValue('Borrador que se conserva');
    }
  });
}
