// ─────────────────────────────────────────────────────────────────────────────
// THE CARDS BETWEEN THE SHOTS
//
// The opening, the closing and the numbers. Rendered in the game's own tokens
// rather than an editor's title tool, so they cut against the footage as the
// same object — and kept to bare typography on black, because CLAUDE.md is
// explicit that the film register takes a reticle and nothing else. A framed
// panel around a sentence is the UI walking into the shot.
//
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/filmtitles.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.FILM_OUT || '/tmp/film';
const W = 1600, H = 900, DSF = 2;

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch { console.log('playwright not found — see tools/shot.mjs'); process.exit(0); }

const TOKENS = `
  --bg-0:#05060a; --ink:#e8ecf3; --ink-2:#a3adbd; --ink-3:#6b7686; --ink-4:#454e5c;
  --green:#00e5a0; --violet:#8b5cf6; --amber:#f5a623; --red:#ff4d5e;
  --font:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif;
  --mono:ui-monospace,'SF Mono','JetBrains Mono','Menlo','Consolas',monospace;
`;

const SHELL = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
:root{${TOKENS}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%}
body{background:var(--bg-0);color:var(--ink);font-family:var(--font);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
  /* the screen's own vignette, so a card sits in the same box as the game */
  background-image:radial-gradient(ellipse at 50% 45%,rgba(255,255,255,.035),transparent 62%);}
.wrap{width:1180px;max-width:88vw}
.mono{font-family:var(--mono);letter-spacing:.16em;text-transform:uppercase}
.cur{display:inline-block;width:9px;height:1.05em;background:var(--green);
  vertical-align:-.16em;margin-left:3px;box-shadow:0 0 10px rgba(0,229,160,.8);
  animation:bl 1.05s steps(1) infinite}
@keyframes bl{0%,50%{opacity:1}50.01%,100%{opacity:0}}
.fade{opacity:0;transition:opacity .62s ease}
.fade.in{opacity:1}
/* the act card's reticle: four corner brackets standing off the title */
.ret{position:relative;padding:52px 62px}
.ret i{position:absolute;width:26px;height:26px;border:2px solid var(--green);opacity:.85}
.ret i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}
.ret i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}
.ret i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}
.ret i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}
${extra}
</style></head><body><div class="wrap">${body}</div>
<script>
window.__type = (sel, text, ms = 26) => new Promise((res) => {
  const el = document.querySelector(sel); let i = 0;
  const t = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(t); res(); }
  }, ms);
});
window.__show = (sel) => { document.querySelectorAll(sel).forEach(e => e.classList.add('in')); };
window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
</script></body></html>`;

const browser = await pw.chromium.launch({ headless: false,
  args: ['--enable-gpu', '--disable-backgrounding-occluded-windows', '--hide-scrollbars', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
const page = await ctx.newPage();

let cdp = null, frames = [], n = 0, id = 'x';
async function rec(name) {
  id = name; frames = []; n = 0;
  fs.mkdirSync(path.join(OUT, 'frames', id), { recursive: true });
  cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', (f) => {
    const file = path.join(OUT, 'frames', id, `f${String(n++).padStart(6, '0')}.jpg`);
    try { fs.writeFileSync(file, Buffer.from(f.data, 'base64')); } catch {}
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast',
    { format: 'jpeg', quality: 85, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
}
async function stop() {
  try { await cdp.send('Page.stopScreencast'); } catch {}
  await new Promise((r) => setTimeout(r, 250));
  try { await cdp.detach(); } catch {}
  if (!frames.length) { console.log(`  (no frames for ${id})`); return; }
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const d = i < frames.length - 1 ? Math.max(0.008, Math.min(2, frames[i + 1].t - frames[i].t)) : 0.12;
    lines.push(`file '${frames[i].file}'`, `duration ${d.toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file}'`);
  const list = path.join(OUT, `${id}.txt`);
  fs.writeFileSync(list, lines.join('\n'));
  fs.mkdirSync(path.join(OUT, 'clips'), { recursive: true });
  const outFile = path.join(OUT, 'clips', `${id}.mp4`);
  await new Promise((res) => spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', 'fps=30,scale=1920:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium',
    '-crf', '18', '-pix_fmt', 'yuv420p', outFile], { stdio: 'ignore' }).on('close', res));
  const secs = frames[frames.length - 1].t - frames[0].t;
  console.log(`  ${id}: ${frames.length} frames · ${secs.toFixed(1)}s · ${Math.round(fs.statSync(outFile).size / 1024)}KB`);
  fs.rmSync(path.join(OUT, 'frames', id), { recursive: true, force: true });
  fs.rmSync(list, { force: true });
}
const hold = (ms) => page.waitForTimeout(ms);

// ── 1. the compatibility contract, as a power-on check ─────────────────────
await page.setContent(SHELL(`
  <div class="mono" style="font-size:13px;color:var(--green);margin-bottom:26px">
    <span id="l0"></span><span class="cur"></span></div>
  <div class="fade" id="rows" style="font-family:var(--mono);font-size:19px;line-height:2.15;letter-spacing:.02em">
    <div style="color:var(--ink-3)">RUNS IN &nbsp;<span style="color:var(--ink)">CHATGPT DESKTOP APP · BUILT-IN BROWSER</span></div>
    <div style="color:var(--ink-3)">MODEL &nbsp;&nbsp;&nbsp;<span style="color:var(--ink)">GPT-5.6 SOL OR TERRA</span>
      <span style="color:var(--ink-4)">&nbsp;— LUNA HAS WEBMCP DISABLED</span></div>
    <div style="color:var(--ink-3)">OR &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:var(--ink)">CHROME 149+</span>
      <span style="color:var(--ink-4)">&nbsp;— ORIGIN TRIAL, NO FLAG NEEDED</span></div>
    <div style="color:var(--ink-3)">OR &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:var(--green)">NO ASSISTANT AT ALL</span>
      <span style="color:var(--ink-4)">&nbsp;— THE GAME IS FINISHED WITHOUT ONE</span></div>
  </div>`));
await rec('t1-contract');
await hold(600);
await page.evaluate(() => window.__type('#l0', 'SINGULARITY, INC. — COMPATIBILITY', 34));
await hold(500);
await page.evaluate(() => window.__show('#rows'));
await hold(4200);
await stop();

// ── 2. the hook ────────────────────────────────────────────────────────────
await page.setContent(SHELL(`
  <div style="font-size:44px;line-height:1.42;font-weight:300;letter-spacing:-.015em">
    <div id="h1" style="color:var(--ink-2)"></div>
    <div id="h2" style="color:var(--ink);margin-top:34px;font-weight:500"></div>
  </div>`));
await rec('t2-hook');
await hold(700);
await page.evaluate(() => window.__type('#h1', 'They keep saying this era will produce the first one-person billion-dollar company.', 27));
await hold(1500);
await page.evaluate(() => window.__type('#h2', 'Nobody ever says who the other person is.', 42));
await hold(2600);
await stop();

// ── 3. the numbers ─────────────────────────────────────────────────────────
const ROWS = [
  ['TOOL SELECTION · TOP-1', '76%', 'green'],
  ['PHRASES THAT REACH NO TOOL', '0', 'green'],
  ['FACTS NO DOM AGENT CAN REACH', '8 / 8', 'green'],
  ['WORLD ACTIONS WITH NO DOM PATH', '5 / 5', 'green'],
  ['WORST LEGAL WORLD vs CONTROL', 'ACT III · D479 vs D437', 'ink'],
  ['AUTHORED CHOICES BEHIND THE CEILINGS', '8,340 EXECUTIONS', 'ink'],
];
await page.setContent(SHELL(`
  <div class="mono" style="font-size:12px;color:var(--green);margin-bottom:30px">EVALS · EVERY GATE FAILS THE BUILD</div>
  <div style="font-family:var(--mono);font-size:20px">
    ${ROWS.map((r, i) => `<div class="fade row" data-i="${i}" style="display:flex;justify-content:space-between;
      align-items:baseline;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.075)">
      <span style="color:var(--ink-3);letter-spacing:.05em">${r[0]}</span>
      <span style="color:${r[2] === 'green' ? 'var(--green)' : 'var(--ink)'};font-weight:600">${r[1]}</span></div>`).join('')}
  </div>`));
await rec('t3-evals');
await hold(600);
for (let i = 0; i < ROWS.length; i++) {
  await page.evaluate((i) => window.__show(`.row[data-i="${i}"]`), i);
  await hold(340);
}
await hold(2800);
await stop();

// ── 4. the end card ────────────────────────────────────────────────────────
await page.setContent(SHELL(`
  <div style="display:flex;flex-direction:column;align-items:center;text-align:center">
    <div class="ret fade" id="title"><i></i><i></i><i></i><i></i>
      <div style="font-size:56px;font-weight:200;letter-spacing:.14em">SINGULARITY, INC.</div>
    </div>
    <div class="fade" id="sub" style="margin-top:30px;color:var(--ink-2);font-size:21px;font-weight:300">
      A founder simulation where your own assistant plays the world against you.</div>
    <div class="mono fade" id="url" style="margin-top:46px;font-size:13px;color:var(--ink-3)">
      <span id="u"></span><span class="cur"></span></div>
  </div>`));
await rec('t4-end');
await hold(500);
await page.evaluate(() => window.__show('#title'));
await hold(900);
await page.evaluate(() => window.__show('#sub'));
await hold(1100);
await page.evaluate(() => window.__show('#url'));
await page.evaluate(() => window.__type('#u', 'YOUR MOVE.', 90));
await hold(3200);
await stop();

console.log('\n  ' + OUT + '/clips');
await browser.close();
