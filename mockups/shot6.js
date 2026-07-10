const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3003';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  // place an order so panel has content
  const c = await b.newPage({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 2 });
  await c.goto(B + '/menu', { waitUntil: 'networkidle' });
  await c.screenshot({ path: path.resolve(__dirname, '60-brand-menu.png') });
  await c.getByRole('button', { name: /Capricciosa/ }).first().click();
  await c.waitForTimeout(200);
  await c.getByText('Dodatkowy ser', { exact: true }).click();
  await c.getByText('Dodaj do koszyka').click();
  await c.waitForTimeout(150);
  await c.getByRole('button', { name: /Coca-Cola/ }).first().click();
  await c.waitForTimeout(150);
  await c.getByText('Przejdź do koszyka').click();
  await c.waitForTimeout(400);
  await c.getByPlaceholder('Jan Kowalski').fill('Anna Wiśniewska');
  await c.getByPlaceholder('500 100 200').fill('502 118 940');
  await c.getByPlaceholder('ul. Świętojańska 12').fill('ul. Długa 5');
  await c.waitForTimeout(150);
  await c.screenshot({ path: path.resolve(__dirname, '61-brand-checkout.png'), fullPage: true });
  await c.getByText('Zamawiam').click();
  await c.waitForTimeout(1000);

  const s = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await s.goto(B + '/panel', { waitUntil: 'networkidle' });
  await s.waitForTimeout(600);
  await s.screenshot({ path: path.resolve(__dirname, '62-brand-panel.png') });
  await b.close(); console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
