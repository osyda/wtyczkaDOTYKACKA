const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const jobs = [
    { url: 'http://localhost:3000/',     out: '30-app-home.png',  w: 900,  h: 760 },
    { url: 'http://localhost:3000/menu', out: '31-app-menu.png',  w: 414,  h: 980 },
  ];
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
    await p.goto(j.url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.resolve(__dirname, j.out) });
    await p.close(); console.log('OK', j.out);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
