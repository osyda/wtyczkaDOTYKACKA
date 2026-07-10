const { chromium } = require('playwright-core');
const path = require('path');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const jobs = [
  { file: '20-eta-flow.html',              out: '20-eta-flow.png',              w: 1280, h: 720 },
  { file: '21-dotykacka-split.html',       out: '21-dotykacka-split.png',       w: 1280, h: 800 },
  { file: '22-dotykacka-powiadomienie.html',out:'22-dotykacka-powiadomienie.png',w: 1280, h: 800 },
  { file: '23-warianty.html',              out: '23-warianty.png',              w: 1280, h: 760 },
];
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.resolve(__dirname, j.file));
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.resolve(__dirname, j.out) });
    await p.close(); console.log('OK', j.out);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
