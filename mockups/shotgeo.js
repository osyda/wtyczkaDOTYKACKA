const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3007';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  // lokalizacja ~8 km na północ od centrum Kościerzyny
  const ctx = await b.newContext({
    viewport: { width: 414, height: 1000 }, deviceScaleFactor: 2,
    geolocation: { latitude: 54.1226 + 0.072, longitude: 17.9766 }, permissions: ['geolocation'],
  });
  const c = await ctx.newPage();
  await c.goto(B + '/menu', { waitUntil: 'networkidle' });
  await c.getByRole('button', { name: /Margherita/ }).first().click();
  await c.waitForTimeout(150);
  await c.getByText('Dodaj do koszyka').click();
  await c.waitForTimeout(150);
  await c.getByText('Przejdź do koszyka').click();
  await c.waitForTimeout(400);
  await c.getByPlaceholder('Jan Kowalski').fill('Anna Nowak');
  await c.getByPlaceholder('500 100 200').fill('500 123 456');
  await c.getByPlaceholder('ul. Świętojańska 12').fill('ul. Leśna 3');
  // zmień miasto na spoza Kościerzyny, żeby nie złapać flat po nazwie
  const inputs = c.locator('main input:not([type=number]):not([type=time])');
  await inputs.nth(3).fill('Skorzewo');
  await c.waitForTimeout(400);
  // kliknij lokalizację
  await c.getByText('Policz z mojej lokalizacji').click();
  await c.waitForTimeout(1500);
  await c.screenshot({ path: path.resolve(__dirname, '90-geo-delivery.png'), fullPage: true });
  await b.close(); console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
