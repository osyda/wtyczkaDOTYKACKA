const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
const B = 'http://localhost:3009';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 414, height: 860 }, deviceScaleFactor: 2 });
  await p.goto(B + '/menu', { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.resolve(__dirname, 'B0-menu-chipotto.png') });
  await b.close(); console.log('DONE');
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
