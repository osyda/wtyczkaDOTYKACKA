const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3008';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
  await p.goto(B + '/panel', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.resolve(__dirname, 'A0-panel-pin.png') });
  // zaloguj
  await p.getByPlaceholder('PIN').fill('1234');
  await p.getByText('Wejdź').click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.resolve(__dirname, 'A1-panel-after-login.png') });
  await b.close(); console.log('DONE');
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
