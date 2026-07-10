const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3005';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const c = await b.newPage({ viewport: { width: 414, height: 1050 }, deviceScaleFactor: 2 });
  await c.goto(B + '/menu', { waitUntil: 'networkidle' });
  await c.getByRole('button', { name: /Margherita/ }).first().click();
  await c.waitForTimeout(150);
  await c.getByText('Dodaj do koszyka').click();
  await c.waitForTimeout(150);
  await c.getByText('Przejdź do koszyka').click();
  await c.waitForTimeout(400);
  await c.getByPlaceholder('Jan Kowalski').fill('Jan Kowalski');
  await c.getByPlaceholder('500 100 200').fill('500 100 200');
  await c.getByPlaceholder('ul. Świętojańska 12').fill('ul. Rynek 1');
  await c.waitForTimeout(800);
  await c.screenshot({ path: path.resolve(__dirname, '72-kosc-5zl.png'), fullPage: true });

  // poza miastem: zmień miasto (4. input tekstowy)
  const inputs = c.locator('main input:not([type=number]):not([type=time])');
  await inputs.nth(3).fill('Skorzewo');   // Miasto
  await c.waitForTimeout(1000);
  const km = c.locator('input[type=number]');
  if (await km.count()) await km.first().fill('8');
  await c.waitForTimeout(800);
  await c.screenshot({ path: path.resolve(__dirname, '73-outside-km.png'), fullPage: true });

  await b.close(); console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
