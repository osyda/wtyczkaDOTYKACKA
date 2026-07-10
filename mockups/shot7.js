const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3004';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const c = await b.newPage({ viewport: { width: 414, height: 1000 }, deviceScaleFactor: 2 });
  await c.goto(B + '/menu', { waitUntil: 'networkidle' });
  await c.getByRole('button', { name: /Margherita/ }).first().click();
  await c.waitForTimeout(150);
  await c.getByText('Dodaj do koszyka').click();
  await c.waitForTimeout(150);
  await c.getByText('Przejdź do koszyka').click();
  await c.waitForTimeout(400);
  // Kościerzyna (domyślnie) → 5 zł auto
  await c.getByPlaceholder('Jan Kowalski').fill('Jan Kowalski');
  await c.getByPlaceholder('500 100 200').fill('500 100 200');
  await c.getByPlaceholder('ul. Świętojańska 12').fill('ul. Rynek 1');
  await c.waitForTimeout(700);
  await c.screenshot({ path: path.resolve(__dirname, '70-delivery-kosc.png'), fullPage: true });

  // Poza miastem → fallback km
  const city = c.getByDisplayValue('Kościerzyna');
  await city.fill('Skorzewo');
  await c.waitForTimeout(900);
  // wpisz km
  const kmInput = c.locator('input[type=number]');
  if (await kmInput.count()) { await kmInput.first().fill('8'); }
  await c.waitForTimeout(900);
  await c.screenshot({ path: path.resolve(__dirname, '71-delivery-outside.png'), fullPage: true });

  await b.close(); console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
