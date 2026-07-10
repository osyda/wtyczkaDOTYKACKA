const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  for (const d of ['A-notte','B-basilico','C-napoli']) {
    const p = await b.newPage({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.resolve(__dirname, `dir-${d}.html`));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.resolve(__dirname, `DIR-${d}.png`) });
    await p.close(); console.log('OK', d);
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
