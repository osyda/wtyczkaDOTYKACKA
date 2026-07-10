const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3006';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const c = await b.newPage({ viewport: { width: 414, height: 920 }, deviceScaleFactor: 2 });
  await c.goto(B + '/menu', { waitUntil: 'networkidle' });
  await c.waitForTimeout(400);
  await c.screenshot({ path: path.resolve(__dirname, '80-shop-premium.png') });
  await c.getByRole('button', { name: /Capricciosa/ }).first().click();
  await c.waitForTimeout(300);
  await c.getByText('Dodatkowy ser', { exact: true }).click();
  await c.waitForTimeout(150);
  await c.screenshot({ path: path.resolve(__dirname, '81-modal-premium.png') });
  await b.close(); console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
