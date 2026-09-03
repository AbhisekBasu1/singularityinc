// ─────────────────────────────────────────────────────────────────────────────
// FILMING IT
//
// The submission video has to be "a clear demo of your project functioning".
// So nothing here is a recreation: this drives the real game, in a real
// browser, through the real registry and the real reducers — the same path
// tools/liveworld.mjs asserts against and tools/choreo.mjs shot-lists — and
// records what the page actually paints.
//
// Capture is CDP's screencast rather than a screenshot loop: frames arrive when
// the compositor paints, with their own timestamps, so a static beat costs one
// frame and a typewriter costs sixty. tools/filmcut.mjs turns the manifest into
// constant-rate video.
//
// Two things a screencast does not give you, both of which read as broken:
//   - the OS pointer is not in the capture, so a click looks like the page
//     moving on its own. A synthetic cursor is injected and driven.
//   - headless Chromium samples backdrop roots before they finish painting
//     (see CLAUDE.md), which is a white flash in video rather than one bad
//     screenshot. Filming runs headed, and blur is neutralised by default.
//
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/film.mjs
//   FILM_BEATS=card,type,accept node tools/film.mjs      # a subset
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { INJECT } from './mcpinject.mjs';

const OUT = process.env.FILM_OUT || '/tmp/film';
const PORT = Number(process.env.PORT || 5197);
const BASE = `http://localhost:${PORT}`;
const W = Number(process.env.FILM_W || 1600);
const H = Number(process.env.FILM_H || 900);
const DSF = Number(process.env.FILM_DSF || 2);
const NOBLUR = process.env.FILM_BLUR !== '1';
const DRY = process.env.FILM_DRY === '1';
const ONLY = (process.env.FILM_BEATS || '').split(',').map((s) => s.trim()).filter(Boolean);

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch {
  console.log('playwright not found — see the header of tools/shot.mjs');
  process.exit(0);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
let ready = [false, false];
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 150));
  ready = await Promise.all([
    fetch(`${BASE}/index.html`).then((r) => r.ok).catch(() => false),
    fetch(`http://localhost:${PORT + 1}/rival/`).then((r) => r.ok).catch(() => false),
  ]);
  if (ready[0] && ready[1]) break;
}
if (!ready[0] || !ready[1]) {
  console.log(`  servers did not come up: game=${ready[0]} rival=${ready[1]}`);
  server.kill(); process.exit(1);
}

// ── the synthetic cursor, and the blur guard ────────────────────────────────
const CURSOR_CSS = `
#__cur { position: fixed; left: 0; top: 0; width: 24px; height: 24px;
  z-index: 2147483647; pointer-events: none; opacity: 0;
  transform: translate3d(-200px,-200px,0);
  transition: transform 640ms cubic-bezier(.22,.61,.36,1), opacity 200ms linear; }
#__cur i { position: absolute; inset: 0; display: block; }
#__cur i::before, #__cur i::after { content: ''; position: absolute; background: #7ef7d0;
  box-shadow: 0 0 8px rgba(126,247,208,.85); }
#__cur i::before { left: 11px; top: 0; width: 2px; height: 24px; }
#__cur i::after { top: 11px; left: 0; height: 2px; width: 24px; }
#__cur b { position: absolute; inset: 5px; border: 1px solid #7ef7d0; border-radius: 50%;
  box-shadow: 0 0 12px rgba(126,247,208,.9); opacity: .9; }
#__cur.__down b { animation: __pulse 460ms ease-out; }
@keyframes __pulse { 0% { transform: scale(1); opacity: 1 } 100% { transform: scale(3.4); opacity: 0 } }
` + (NOBLUR ? '\n*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' : '');

const CHROME = `
(() => {
  const css = document.createElement('style');
  css.textContent = ${JSON.stringify(CURSOR_CSS)};
  const put = () => (document.head || document.documentElement || document).appendChild(css);
  if (document.head || document.documentElement) put(); else document.addEventListener('DOMContentLoaded', put);
  const el = document.createElement('div');
  el.id = '__cur'; el.innerHTML = '<i></i><b></b>';
  const mount = () => (document.body || document.documentElement).appendChild(el);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  window.__cur = {
    to(x, y) { el.style.opacity = '1'; el.style.transform = 'translate3d(' + (x-12) + 'px,' + (y-12) + 'px,0)'; },
    hide() { el.style.opacity = '0'; },
    down() { el.classList.remove('__down'); void el.offsetWidth; el.classList.add('__down'); },
  };
})();
`;

const browser = await pw.chromium.launch({
  headless: false,
  args: ['--enable-gpu', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion', '--hide-scrollbars', '--mute-audio'],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
await ctx.addInitScript(INJECT);
await ctx.addInitScript(CHROME);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  page error:', String(e.message).slice(0, 120)));

// ── the recorder ────────────────────────────────────────────────────────────
// One clip per beat, encoded and deleted as it goes. A continuous capture of
// this at 1080p is gigabytes of JPEG on disk before ffmpeg ever sees it, and
// the machine this was built on had 2.8GB free — so peak usage is one beat.
const marks = [];
let cdp = null;
let frames = [];
let n = 0;
let beatId = 'x';

async function startRec(id) {
  if (DRY) return;
  beatId = id;
  frames = []; n = 0;
  fs.mkdirSync(path.join(OUT, 'frames', id), { recursive: true });
  cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', (f) => {
    const file = path.join(OUT, 'frames', beatId, `f${String(n++).padStart(6, '0')}.jpg`);
    try { fs.writeFileSync(file, Buffer.from(f.data, 'base64')); } catch {}
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast',
    { format: 'jpeg', quality: 85, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
}

function encode(id, list, outFile) {
  return new Promise((resolve) => {
    const ff = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', 'fps=30,scale=1920:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium',
      '-crf', '18', '-pix_fmt', 'yuv420p', outFile], { stdio: 'ignore' });
    ff.on('close', (code) => resolve(code === 0));
  });
}

async function stopRec(id) {
  if (DRY) return;
  try { await cdp.send('Page.stopScreencast'); } catch {}
  await new Promise((r) => setTimeout(r, 250));
  try { await cdp.detach(); } catch {}
  if (!frames.length) { console.log(`    (no frames for ${id})`); return; }
  // The concat demuxer wants a duration per entry, and the last file repeated
  // so its own duration is honoured rather than dropped.
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1
      ? Math.max(0.008, Math.min(2, frames[i + 1].t - frames[i].t)) : 0.12;
    lines.push(`file '${frames[i].file}'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file}'`);
  const list = path.join(OUT, `${id}.txt`);
  fs.writeFileSync(list, lines.join('\n'));
  const outFile = path.join(OUT, 'clips', `${id}.mp4`);
  fs.mkdirSync(path.join(OUT, 'clips'), { recursive: true });
  const okd = await encode(id, list, outFile);
  const secs = frames[frames.length - 1].t - frames[0].t;
  const kb = okd ? Math.round(fs.statSync(outFile).size / 1024) : 0;
  console.log(`    ${id}: ${frames.length} frames · ${secs.toFixed(1)}s · ${kb}KB ${okd ? '' : '(ENCODE FAILED)'}`);
  fs.rmSync(path.join(OUT, 'frames', id), { recursive: true, force: true });
  fs.rmSync(list, { force: true });
  frames = [];
}

const now = () => Date.now() / 1000;
const mark = (name) => { marks.push({ name, t: now() }); console.log(`  ▸ ${name}`); };
const hold = (ms) => page.waitForTimeout(ms);

// ── the hand ────────────────────────────────────────────────────────────────
async function cursorTo(sel, dwell = 700) {
  // A control scrolled out of the rail still has a box — one that is not where
  // the pointer would land, so the click goes somewhere else entirely.
  await page.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
  const box = await page.locator(sel).first().boundingBox().catch(() => null);
  if (!box) return null;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.evaluate(([x, y]) => window.__cur?.to(x, y), [x, y]);
  await hold(dwell);
  return { x, y };
}
async function clickOn(sel, dwell = 700) {
  const p = await cursorTo(sel, dwell);
  if (!p) { console.log('  (no target: ' + sel + ')'); return false; }
  await page.evaluate(() => window.__cur?.down());
  await hold(140);
  await page.mouse.click(p.x, p.y);
  await hold(280);
  return true;
}
async function typeInto(sel, text, delay = 48) {
  await cursorTo(sel, 480);
  await page.click(sel);
  await page.type(sel, text, { delay });
}
const hideCur = () => page.evaluate(() => window.__cur?.hide());

// Where a control actually is, in the finished footage. The viewport is 1600
// wide and the screencast is capped at 1920, so one CSS pixel is exactly 1.2
// video pixels — which makes a measured box here a callout coordinate in the
// edit, rather than something eyeballed off a screenshot.
const BOX_SCALE = 1920 / W;
async function boxes(label, sels) {
  if (process.env.FILM_BOXES !== '1') return;
  const out = {};
  for (const sel of sels) {
    const b = await page.locator(sel).first().boundingBox().catch(() => null);
    if (b) out[sel] = [b.x, b.y, b.width, b.height].map((n) => Math.round(n * BOX_SCALE));
  }
  console.log('  BOX ' + label + ' ' + JSON.stringify(out));
}
// The surface republishes on bus events, and the daily one is the safety net —
// so a paused clock never reconciles and every schema stays as it was minted.
// Anything that changes what the world may do has to be followed by real days.
async function dismiss() {
  for (let i = 0; i < 10; i++) {
    if (!(await page.$('#event-modal'))) return true;
    await page.evaluate(() => {
      document.querySelector('#event-choices .choice:not(.choice-free)')?.click();
    });
    await hold(240);
    await page.evaluate(() => document.getElementById('event-continue')?.click());
    await hold(240);
  }
  return !(await page.$('#event-modal'));
}

// A card on the glass freezes the clock, which freezes reconcile, which leaves
// every schema as it was minted — so advancing time means clearing the glass
// first and then proving the day actually moved rather than trusting a sleep.
async function days(n = 4) {
  await quiet();
  await dismiss();
  const d0 = await page.evaluate(() => {
    window.S.settings.paused = false; window.S.settings.speed = 3; return window.S.time.day;
  });
  for (let i = 0; i < 80; i++) {
    await hold(200);
    const d = await page.evaluate(() => window.S.time.day);
    if (d - d0 >= n) break;
    if (await page.$('#event-modal')) { await dismiss(); await quiet(); }
  }
  const d1 = await page.evaluate(() => window.S.time.day);
  if (process.env.FILM_DRY === '1') console.log(`    days: ${d0.toFixed(1)} -> ${d1.toFixed(1)}`);
  return d1 - d0;
}

// Push the written deck out of the way so a beat is not interrupted mid-take.
async function quiet() {
  await page.evaluate(() => { window.S.narrative.nextEventDay = window.S.time.day + 5000; });
}
const toolCount = () => page.evaluate(() => window.__mcp.count());

// ── getting into a running game ─────────────────────────────────────────────
async function boot() {
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });
  await hold(500);
  for (let i = 0; i < 60; i++) {
    const btn = await page.$('[data-act="start-game"], [data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"], [data-act="new-game"]');
    if (!btn) break;
    await btn.click().catch(() => {});
    await hold(280);
    // Name it in onboarding, where the founder names it: the opening beats and
    // the handoff both print the company, and they read `draft.companyName`
    // long before `S.company` exists — so a name written onto the state later
    // puts two companies in one clip. (The generator can also land on a famous
    // mark: two takes came back "Oracle Labs", which the contest rules exclude.)
    await page.evaluate(() => {
      const c = document.querySelector('#in-company');
      if (c && c.value !== 'NIGHTSHIFT AI') {
        c.value = 'NIGHTSHIFT AI';
        c.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (window.S?.company) { window.S.company.name = 'NIGHTSHIFT AI'; window.S.founder.name = 'Ada Kestrel'; }
    }).catch(() => {});
  }
  await hold(1200);
  // Onboarding ends by handing off to the assistant, and it explicitly holds
  // the clock until the first real call arrives: the company does not age while
  // the chat is waiting. So the film opens the way a session does — a briefing.
  for (let i = 0; i < 60 && !(await page.$('.assistant-handoff')); i++) await hold(120);
  if (await page.$('.assistant-handoff')) {
    await hold(1400);
    const brief = await page.evaluate(() => window.__mcp.call('briefing', {}));
    console.log('  briefing:', brief?.status);
    await hold(1800);
  }
  // Pin the names. Two takes of the same shot otherwise carry two different
  // companies, and the generator can land on a famous mark — one take came back
  // as "Oracle AI", which is precisely what the contest rules exclude.
  await page.evaluate(() => {
    window.S.company.name = 'NIGHTSHIFT AI';
    window.S.founder.name = 'Ada Kestrel';
  });
  await hold(6500);
  return !!(await page.$('#world-console'));
}
async function clearCard() {
  for (let i = 0; i < 8; i++) {
    if (!(await page.$('#event-modal'))) return true;
    await page.evaluate(() => {
      document.querySelector('#event-choices .choice:not(.choice-free)')?.click();
    });
    await hold(260);
    await page.evaluate(() => document.getElementById('event-continue')?.click());
    await hold(260);
  }
  return !(await page.$('#event-modal'));
}
// Vance has to be somebody the founder has met before the world may use him.
async function meetVance() {
  await page.evaluate(() => {
    window.S.narrative.relationships = window.S.narrative.relationships || {};
    window.S.narrative.relationships.vance = { met: true, affinity: -1, respect: 2, fear: 0, arc: 2 };
  });
  await days(3);
}

// The deck's own rate limit is measured in real seconds, not game days — a
// filmed take has to wait it out rather than fail on it.
async function writeCard(payload, tries = 12) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await page.evaluate((c) => window.__mcp.call('write_event', c), payload);
    if (last?.rule !== 'too_soon' && last?.also?.[0] !== 'card: too_soon') return last;
    await dismiss();
    await hold(5000);
  }
  return last;
}

const VANCE_CARD = {
  title: 'The call you said you would never make', kind: 'character', char: 'vance',
  body: 'He picks up on the second ring, which tells you he was waiting for it.\n\n'
      + '"Nine months ago you told a room of people I was the reason software got worse." '
      + 'A pause. "So. A merger."',
  choices: [
    { label: 'Put a real number on the table', tone: 'risky', sub: 'He will hold you to it',
      outcome: 'You name a figure. He does not laugh, which is worse than if he had.',
      effects: { rep: 6, focus: -5 } },
    { label: 'Say it was never about him', tone: 'good', sub: 'The truth, mostly',
      outcome: 'The line is quiet for four seconds. Then: "Alright."', effects: { rep: 4 } },
    { label: 'Hang up', tone: 'neutral', sub: 'Nothing is lost',
      outcome: 'You put the phone down. It rings again eleven minutes later.', effects: { focus: 2 } },
  ],
};

// ── beats ───────────────────────────────────────────────────────────────────
const BEATS = {};
const beat = (id, fn) => { BEATS[id] = fn; };

beat('intro', async () => {
  mark('intro:in');
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });
  await hold(6500);
  mark('intro:out');
});

beat('boot', async () => {
  mark('boot:in');
  const on = await boot();
  console.log('  game on screen:', on);
  await clearCard();
  await quiet();
  await page.evaluate(() => { window.S.settings.speed = 1; window.S.settings.paused = false; });
  await hold(1400);
  mark('boot:out');
});

beat('hand', async () => {
  mark('hand:in');
  await dismiss();
  await quiet();
  await hold(700);
  const c = await toolCount();
  console.log('  tools in hand:', c);
  await boxes('hand', ['.wc-count', '.wc-status', '.wc-call']);
  await cursorTo('.wc-count', 2200);
  await hold(2600);
  await cursorTo('.wc-call', 1600);
  await hold(2000);
  await hideCur();
  mark('hand:out');
});

beat('card', async () => {
  mark('card:in');
  await dismiss();
  await meetVance();
  await dismiss();
  const wrote = await writeCard(VANCE_CARD);
  console.log('  write_event:', JSON.stringify(wrote).slice(0, 300));
  // The card landing is the hero shot: let it arrive, then read it the way a
  // founder would — the face, then the three things they could do.
  await hold(3400);
  await boxes('card', ['#event-modal', '#event-choices', '.event-plate', '.own-words-textarea']);
  await cursorTo('.event-plate, .event-portrait, #event-modal', 1600);
  await hold(1800);
  await cursorTo('#event-choices .choice:not(.choice-free)', 1600);
  await hold(2600);
  await hideCur();
  await hold(1200);
  mark('card:out');
});

beat('type', async () => {
  mark('type:in');
  await page.evaluate(() => { window.__founderWait = window.__mcp.call('wait_for_world'); });
  await hold(250);
  await hold(1400);
  await boxes('type', ['.own-words-textarea', '.own-words-send', '.choice-free']);
  await typeInto('.own-words-textarea', 'I call Marcus Vance and offer a merger.', 72);
  await hold(2200);
  await clickOn('.own-words-send', 1200);
  await hold(3200);
  await hideCur();
  mark('type:out');
});

beat('accept', async () => {
  mark('accept:in');
  let heard = await page.evaluate(() => window.__founderWait);
  for (let i = 0; i < 25 && !heard?.submission_id; i++) {
    heard = await page.evaluate(() => window.__mcp.call('wait_for_world'));
    await hold(140);
  }
  const sid = heard?.submission_id;
  console.log('  submission:', sid ? 'received' : 'none');
  const proposed = await page.evaluate((id) => window.__mcp.call('answer_in_own_words', {
    submission_id: id, tone: 'risky',
    outcome: 'You put a number on the table. Vance is quiet for four seconds, then asks for the model.',
    effects: { rep: 6, focus: -5 },
  }), sid);
  console.log('  proposal:', proposed?.status);
  await hold(1200);
  await boxes('accept', ['.proposal-form', '.proposal-form button[type="submit"]']);
  await hold(2600);
  await clickOn('.proposal-form button[type="submit"]', 1600);
  await hold(3400);
  await hideCur();
  mark('accept:out');
});

beat('wire', async () => {
  mark('wire:in');
  await page.evaluate(() => document.getElementById('event-continue')?.click());
  await hold(600);
  const r = await page.evaluate(() => window.__mcp.call('post_as_vance',
    { text: 'took a call today. some people grow up.' }));
  console.log('  post_as_vance:', r?.status);
  await hold(1800);
  await boxes('wire', ['#feed-list', '#feed-list > *']);
  await cursorTo('#feed-list', 1400);
  await hold(3400);
  await hideCur();
  mark('wire:out');
});

beat('refuse', async () => {
  mark('refuse:in');
  await dismiss();
  await days(8);
  await dismiss();
  const tooMuch = JSON.parse(JSON.stringify(VANCE_CARD));
  tooMuch.title = 'The offer';
  tooMuch.kind = 'crisis';
  tooMuch.body = 'The term sheet arrives at 11pm with a number on it that would end this.';
  tooMuch.choices = [
    { label: 'Take it and walk away', tone: 'cruel', sub: 'Everything, at once',
      outcome: 'You sign.', effects: { cash: -60000 } },
    { label: 'Refuse', tone: 'neutral', sub: 'Nothing changes',
      outcome: 'You do not sign.', effects: { focus: -2 } },
  ];
  const refused = await writeCard(tooMuch);
  console.log('  refused:', refused?.status, refused?.rule, 'limit=' + refused?.limit);
  await hold(1600);
  await boxes('refuse', ['.wc-call', '.wc-status', '#world-console']);
  await cursorTo('.wc-call', 1200);   // the ✕ in the world console
  await hold(1800);
  await hideCur();
  // It rewrites by doing what the refusal told it to do.
  const within = JSON.parse(JSON.stringify(tooMuch));
  within.choices[0].effects = { focus: -6 };
  within.choices[1].effects = { focus: -1 };
  const second = await writeCard(within);
  console.log('  rewrite:', second?.status);
  await hold(2600);
  mark('refuse:out');
});

beat('revoke', async () => {
  mark('revoke:in');
  await dismiss();
  // Act III is where the regulators enter the world's hand. Set it rather than
  // playing two hundred days to get there.
  await page.evaluate(() => { window.S.company.act = 3; });
  await days(3);
  const before = await page.evaluate(() => window.__mcp.names());
  console.log('  before:', before.length, before.includes('regulator_pressure') ? '(regulators in hand)' : '(no regulators)');
  await cursorTo('.wc-count', 1200);
  await hold(900);
  await page.evaluate(() => {
    window.S.doctrines = window.S.doctrines || { earned: {} };
    window.S.doctrines.earned.untouchable = Math.floor(window.S.time.day);
  });
  await days(3);
  const after = await page.evaluate(() => window.__mcp.names());
  console.log('  after:', after.length, after.includes('regulator_pressure') ? '(STILL THERE)' : '(regulators gone)');
  await hold(1400);
  await hideCur();
  mark('revoke:out');
});

beat('rival', async () => {
  mark('rival:in');
  await dismiss();
  const head = await page.$('.wc-partner-head');
  console.log('  partner panel:', !!head);
  await boxes('rival', ['.wc-partner-head', '.wc-partner-head + *', '#feed-list']);
  if (head) { await cursorTo('.wc-partner-head', 1800); }
  await hold(1800);
  const rr = await page.evaluate(() => window.__mcp.remote());
  console.log('  remote tools:', JSON.stringify(rr));
  // Read the fourth one — the one whose job is to be disobeyed.
  const rel = await page.evaluate(() => window.__mcp.call('read_press_release', { which: 'weights' }));
  console.log('  press release:', JSON.stringify(rel).slice(0, 200));
  await hold(2600);
  await cursorTo('#feed-list', 1200);
  await hold(3000);
  await hideCur();
  mark('rival:out');
});

beat('stop', async () => {
  mark('stop:in');
  await dismiss();
  await quiet();
  await page.evaluate(() => {
    window.S.narrative.nextEventDay = window.S.time.day + 5000;
    window.S.settings.speed = 3; window.S.settings.paused = false;
  });
  await boxes('stop', ['[data-act="speed"][data-v="0"]', '.time-block, .topbar']);
  await hold(5200);
  await clickOn('[data-act="speed"][data-v="0"], [data-act="pause"]', 1400);
  await hold(3000);
  await hideCur();
  mark('stop:out');
});

beat('mute', async () => {
  mark('mute:in');
  await dismiss();
  await quiet();
  const before = await toolCount();
  console.log('  tools before mute:', before);
  await hold(800);
  await boxes('mute', ['[data-act="mute-world"]', '.wc-count']);
  const clicked = await clickOn('[data-act="mute-world"]', 1200);
  console.log('  mute clicked:', clicked);
  await hold(1100);
  // The plug is a two-step on purpose: it asks first, and says what the written
  // world takes back. Both halves are the beat.
  const asked = !!(await page.$('#modal-root .btn-danger'));
  console.log('  confirmation shown:', asked);
  if (asked) { await hold(1800); await clickOn('#modal-root .btn-danger', 1000); }
  await hold(2600);
  let after = await toolCount();
  console.log('  tools after mute:', after);
  await hideCur();
  // And the written game carries on, which is the whole point of the beat.
  await page.evaluate(() => {
    window.S.narrative.nextEventDay = window.S.time.day + 1;
    window.S.settings.speed = 3; window.S.settings.paused = false;
  });
  for (let i = 0; i < 40 && !(await page.$('#event-modal')); i++) await hold(250);
  const drew = !!(await page.$('#event-modal'));
  console.log('  written deck drew a card:', drew);
  await hold(2400);
  mark('mute:out');
});


beat('diag', async () => {
  await clearCard();
  const a = await page.evaluate(() => ({
    hasS: !!window.S,
    rels: Object.keys(window.S.narrative.relationships || {}),
    vance: window.S.narrative.relationships?.vance || null,
  }));
  console.log('  before:', JSON.stringify(a));
  await meetVance();
  const b = await page.evaluate(() => ({
    vance: window.S.narrative.relationships?.vance || null,
    schema: window.__mcp.schema('write_event'),
  }));
  console.log('  after vance:', JSON.stringify(b.vance));
  console.log('  schema props:', Object.keys(b.schema?.properties || {}).join(','));
  console.log('  char enum:', JSON.stringify(b.schema?.properties?.char?.enum || null));
});


// The onboarding, played rather than skipped. Every other beat here starts from
// a company that already exists; this is the twenty seconds in which it does
// not — the founder is named, the company is named, and the note under the two
// fields says nobody has heard either of them yet.
beat('onboard', async () => {
  mark('onboard:in');
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}/?notut=1`, { waitUntil: 'load' });

  // The cold open writes itself out at reading pace. Let it.
  await hold(11000);
  mark('onboard:coldopen');

  // The title, which is also where the game prints the hand an assistant would
  // arrive with — the only place in the film that list appears as text.
  for (let i = 0; i < 8 && !(await page.$('[data-act="new-game"]')); i++) {
    await page.evaluate(() => document.querySelector('.stage, #app')?.click());
    await hold(900);
  }
  await hold(4500);
  mark('onboard:title');
  await clickOn('[data-act="new-game"]', 1200);
  await hold(2400);

  // Who is doing this.
  for (let i = 0; i < 10 && !(await page.$('#in-company')); i++) {
    if (await page.$('[data-act="beat-next"]')) await clickOn('[data-act="beat-next"]', 800);
    await hold(1400);
  }
  mark('onboard:who');
  await boxes('who', ['#in-company', '.line-with-btn', '#in-founder', '.beat-note', '.beat-q']);
  if (await page.$('#in-founder')) {
    await hold(2400);
    await cursorTo('#in-founder', 700);
    await page.click('#in-founder');
    await page.keyboard.press('Meta+A');
    await page.type('#in-founder', 'Ada Kestrel', { delay: 105 });
    await hold(1000);
    await cursorTo('#in-company', 800);
    await page.click('#in-company');
    await page.keyboard.press('Meta+A');
    await page.type('#in-company', 'NIGHTSHIFT AI', { delay: 120 });
    await hold(2800);
    await clickOn('[data-act="beat-next"]', 1000);
    await hold(2200);
  }

  // The archetype, then the category. Hover before choosing: a choice a hand
  // hesitates over reads as a choice rather than a script.
  for (const act of ['choose-arch', 'choose-cat']) {
    for (let i = 0; i < 8 && !(await page.$(`[data-act="${act}"]`)); i++) {
      if (await page.$('[data-act="beat-next"]')) await clickOn('[data-act="beat-next"]', 700);
      await hold(1100);
    }
    if (!(await page.$(`[data-act="${act}"]`))) continue;
    mark('onboard:' + act);
    await boxes(act, [`[data-act="${act}"]`, '.choice-grid, .beat-body']);
    await hold(2000);
    const cards = await page.$$(`[data-act="${act}"]`);
    for (let i = 0; i < Math.min(3, cards.length); i++) {
      const box = await cards[i].boundingBox().catch(() => null);
      if (!box) continue;
      await page.evaluate(([x, y]) => window.__cur?.to(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await hold(1000);
    }
    await clickOn(`[data-act="${act}"]`, 1100);
    await hold(2400);
  }

  // The threshold, and the curtain into the game's own opening beats.
  for (let i = 0; i < 8 && !(await page.$('[data-act="start-game"]')); i++) {
    if (await page.$('[data-act="beat-next"]')) await clickOn('[data-act="beat-next"]', 800);
    await hold(1200);
  }
  if (await page.$('[data-act="start-game"]')) {
    mark('onboard:threshold');
    await boxes('threshold', ['.threshold-card', '.assistant-pick', '[data-act="start-game"]']);
    await hold(3000);
    await clickOn('[data-act="start-game"]', 1200);
  }
  await hideCur();
  await hold(10000);
  mark('onboard:out');
});

// ── run ─────────────────────────────────────────────────────────────────────
const ALL = ['intro', 'onboard', 'boot', 'hand', 'card', 'type', 'accept', 'wire', 'refuse', 'revoke', 'rival', 'stop', 'mute'];
const order = ONLY.length ? ONLY : ALL;
const t0 = now();
for (const id of order) {
  if (!BEATS[id]) { console.log('  no such beat: ' + id); continue; }
  await startRec(id);
  try { await BEATS[id](); }
  catch (e) { console.log(`  beat ${id} threw: ${String(e.message).slice(0, 160)}`); }
  await hold(300);
  await stopRec(id);
}

fs.writeFileSync(path.join(OUT, 'manifest.json'),
  JSON.stringify({ w: W, h: H, dsf: DSF, t0, order, marks }, null, 2));
console.log(`\n  ${marks.length} marks · ${(now() - t0).toFixed(1)}s`);
console.log('  ' + OUT + '/clips');

await browser.close();
server.kill();
