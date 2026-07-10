const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3002';
const shot = (pg, f) => pg.screenshot({ path: path.resolve(__dirname, f) });
(async () => {
  const b = await chromium.launch({ executablePath: EXE });

  // --- KLIENT składa zamówienie ASAP/dostawa ---
  const cust = await b.newPage({ viewport: { width: 414, height: 900 }, deviceScaleFactor: 2 });
  await cust.goto(B + '/menu', { waitUntil: 'networkidle' });
  await cust.getByRole('button', { name: /Capricciosa/ }).first().click();
  await cust.waitForTimeout(250);
  await cust.getByText('Dodatkowy ser', { exact: true }).click();
  await cust.getByText('Dodaj do koszyka').click();
  await cust.waitForTimeout(200);
  await cust.getByRole('button', { name: /Coca-Cola/ }).first().click();
  await cust.waitForTimeout(200);
  await cust.getByText('Przejdź do koszyka').click();
  await cust.waitForTimeout(400);
  await cust.getByPlaceholder('Jan Kowalski').fill('Anna Wiśniewska');
  await cust.getByPlaceholder('500 100 200').fill('502 118 940');
  await cust.getByPlaceholder('ul. Świętojańska 12').fill('ul. Długa 5');
  await cust.waitForTimeout(200);
  await cust.getByText('Zamawiam').click();
  await cust.waitForTimeout(1200);
  const url = cust.url();
  console.log('thankyou url:', url);
  await shot(cust, '50-thankyou-waiting.png');

  // --- KELNERKA: panel pokazuje nowe zamówienie ---
  const staff = await b.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
  await staff.goto(B + '/panel', { waitUntil: 'networkidle' });
  await staff.waitForTimeout(500);
  await shot(staff, '51-panel-new.png');

  // ustaw ETA 45'
  await staff.getByRole('button', { name: /^45/ }).first().click();
  await staff.waitForTimeout(800);
  await shot(staff, '52-panel-progress.png');

  // --- KLIENT: strona sama się zaktualizowała (ETA) ---
  await cust.waitForTimeout(3500);
  await shot(cust, '53-thankyou-eta.png');

  // --- CTI: symulacja połączenia ---
  await staff.getByPlaceholder('numer telefonu').fill('502 118 940');
  await staff.getByText('Symuluj połączenie').click();
  await staff.waitForTimeout(600);
  await shot(staff, '54-panel-cti.png');

  await b.close();
  console.log('DONE');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
