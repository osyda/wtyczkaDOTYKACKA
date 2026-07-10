const { chromium } = require('playwright-core');
const path = require('path');

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const jobs = [
  { file: '00-architektura.html',     out: '00-architektura.png',     w: 1280, h: 920 },
  { file: '01-klient-menu.html',      out: '01-klient-menu.png',      w: 414,  h: 896 },
  { file: '02-klient-checkout.html',  out: '02-klient-checkout.png',  w: 414,  h: 896 },
  { file: '03-klient-dziekujemy.html',out: '03-klient-dziekujemy.png',w: 414,  h: 896 },
  { file: '10-kelnerka-panel.html',   out: '10-kelnerka-panel.png',   w: 1280, h: 800 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.resolve(__dirname, j.file));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.resolve(__dirname, j.out) });
    await page.close();
    console.log('OK', j.out);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
