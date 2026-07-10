const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3001';
const save = (p, f) => p.screenshot({ path: path.resolve(__dirname, f) });
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 2 });

  await p.goto(B + '/menu', { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  await save(p, '40-shop-menu.png');

  // open Capricciosa modal, pick unique addons
  await p.getByRole('button', { name: /Capricciosa/ }).first().click();
  await p.waitForTimeout(300);
  await p.getByText('Dodatkowy ser', { exact: true }).click();
  await p.getByText('Oliwki', { exact: true }).click();
  await p.waitForTimeout(200);
  await save(p, '41-shop-modal.png');
  await p.getByText('Dodaj do koszyka').click();
  await p.waitForTimeout(300);

  // add a drink (no addons => direct add)
  await p.getByRole('button', { name: /Coca-Cola/ }).first().click();
  await p.waitForTimeout(300);
  await save(p, '42-shop-cartbar.png');

  // checkout
  await p.getByText('Przejdź do koszyka').click();
  await p.waitForTimeout(500);
  await p.getByPlaceholder('Jan Kowalski').fill('Jan Kowalski');
  await p.getByPlaceholder('500 100 200').fill('500 134 092');
  await p.getByPlaceholder('ul. Świętojańska 12').fill('ul. Świętojańska 12');
  await p.waitForTimeout(300);
  await save(p, '43-checkout.png');
  await p.screenshot({ path: path.resolve(__dirname, '43-checkout-full.png'), fullPage: true });

  await b.close();
  console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
