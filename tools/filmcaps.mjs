// ─────────────────────────────────────────────────────────────────────────────
// THE CAPTIONS
//
// This ffmpeg has neither libass nor drawtext — it is a libx264-only build — so
// the captions are rendered in the browser as transparent PNGs and composited
// with `overlay`. Which is the better result anyway: they come out in the
// game's own type, at the game's own weight, rather than a subtitle renderer's
// idea of them.
//
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/filmcaps.mjs
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { EDL } from './filmedl.mjs';

const OUT = process.env.FILM_OUT || '/tmp/film';
const CAPS = path.join(OUT, 'caps');
const W = 1920, BAND = 260;

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch { console.log('playwright not found — see tools/shot.mjs'); process.exit(0); }

fs.rmSync(CAPS, { recursive: true, force: true });
fs.mkdirSync(CAPS, { recursive: true });

const browser = await pw.chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: BAND }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const [i, e] of EDL.entries()) {
  // Prose in the game's sans, not its mono: mono is what this interface uses
  // for labels, and a full sentence set in it reads as a terminal dump.
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${W}px;height:${BAND}px;background:transparent}
    .b{width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;
       padding:0 190px 34px;box-sizing:border-box}
    p{margin:0;text-align:center;font-size:36px;line-height:1.42;font-weight:400;
      color:#f2f5fa;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif;
      letter-spacing:-.004em;
      /* legible over a bright plate as well as a dark desk */
      text-shadow:0 2px 5px rgba(0,0,0,.92),0 0 26px rgba(0,0,0,.85),0 0 3px rgba(0,0,0,.9)}
  </style><div class="b"><p>${e.vo.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p></div>`);
  await page.waitForTimeout(120);
  const file = path.join(CAPS, `c${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log(`  c${String(i).padStart(2, '0')}  ${e.vo.slice(0, 58)}${e.vo.length > 58 ? '…' : ''}`);
}
console.log('\n  ' + CAPS);
await browser.close();
