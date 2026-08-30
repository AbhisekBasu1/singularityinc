// ─────────────────────────────────────────────────────────────────────────────
// ONE-SIDED ACCENTS
//
// The rule this checks: an accent colour lights every edge of a thing or none
// of them. A 2px stripe down the left of a card is how the web says "category";
// a frame closed on all four sides is how a console says "this is a component",
// and the difference is most of why this game reads as hardware rather than as
// a dashboard. `styles/hud.css` exists to close those frames, and both
// stylesheets underneath it are full of the older idiom — `border: 1px solid A;
// border-left: 2px solid ACCENT` — so this is easy to reintroduce by accident.
//
// It catches two shapes:
//   1. a border whose width or colour on one side differs from the other three
//   2. a ::before / ::after that is a thin bar pinned to a single edge
//
// It is not a pass/fail gate, because the answer is not zero. Region dividers
// and list-row separators are legitimately one-sided — they are structure, not
// accent — so what this prints is a list to read, and the expected contents are
// named in EXPECTED below. Anything not in that list is a bug.
//
// Playwright is NOT a dependency of this repo and must never become one:
//
//   mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright node tools/oneside.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 5217);
const BASE = `http://localhost:${PORT}`;

// Hairlines that separate one region or row from the next. These are meant to
// be one-sided and always will be.
const EXPECTED = new Set([
  'topbar', 'nav', 'brand', 'statusline', 'feed-rail', 'feed-head', 'world-console',
  'time-block', 'view-head', 'modal-top', 'sinks', 'approach-strip', 'thread-out',
  'ch-head', 'ch-foot', 'nem-moves', 'nem-move', 'nem-counters', 'quote', 'wm-status',
  'modal-act', 'act-head', 'own-words-footer',
]);

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch {
  console.log('playwright not found. This is a look-at-it tool, not a test:\n'
    + '  mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium\n'
    + '  PLAYWRIGHT=/tmp/pw/node_modules/playwright node tools/oneside.mjs');
  process.exit(0);
}

const VIEWS = [
  ['title', ''],
  ['desk', '?dev=1&notut=1&days=200'],
  ['product', '?dev=1&notut=1&days=300&view=product'],
  ['agents', '?dev=1&notut=1&days=400&view=agents'],
  ['research', '?dev=1&notut=1&days=400&view=research'],
  ['market', '?dev=1&notut=1&days=500&view=market'],
  ['world', '?dev=1&notut=1&days=800&view=world'],
  ['story', '?dev=1&notut=1&days=600&view=story'],
  ['legacy', '?dev=1&notut=1&days=600&view=legacy'],
  ['event', '?dev=1&notut=1&days=120&event=e_debt_wall'],
  ['settings', '?dev=1&notut=1&days=200&dlg=settings'],
  ['manual', '?dev=1&notut=1&days=200&help=1'],
  ['tutorial', '?dev=1&notut=1&days=30&tut=basics'],
  // A state that never renders on its own. The pending own-words card kept a
  // violet rail down the left of its quote through the whole sweep purely
  // because nothing above ever put it on screen — a checker that only walks
  // default states has exactly that blind spot, so this one forces it.
  ['event/own-words-pending', '?dev=1&notut=1&days=120&event=e_debt_wall', async (page) => {
    await page.evaluate(async () => {
      const m = await import('/src/ui/modal.js');
      m.setFreeTextProvider(() => ({ available: true, waiting: false, max: 600,
        pending: { id: 'probe', text: 'A move the founder typed, held for the world.', delivered: false } }));
      m.refreshFreeText();
    });
    await page.waitForTimeout(500);
  }],
];

const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 } });
const found = new Map();

for (const [name, q, setup] of VIEWS) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${q}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  if (setup) await setup(page);
  const hits = await page.evaluate(() => {
    const px = (v) => parseFloat(v) || 0;
    const out = new Set();
    const key = (el) => (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 10) continue;
      const c = getComputedStyle(el);
      const sides = ['Top', 'Right', 'Bottom', 'Left'];
      const w = sides.map((s) => px(c[`border${s}Width`]));
      const col = sides.map((s) => c[`border${s}Color`]);
      const sty = sides.map((s) => c[`border${s}Style`]);
      const on = w.map((x, i) => x > 0 && sty[i] !== 'none' && !/rgba\(.*, 0\)$/.test(col[i]));
      const n = on.filter(Boolean).length;
      if (n > 0 && n < 4 && (on[0] !== on[2] || on[1] !== on[3])) out.add(key(el) + '  partial border');
      else if (n === 4 && Math.max(...w) > Math.min(...w) + 0.6) out.add(key(el) + '  uneven width');
      else if (n === 4 && new Set(col).size > 1) out.add(key(el) + '  uneven colour');
      for (const pe of ['::before', '::after']) {
        const pc = getComputedStyle(el, pe);
        if (pc.content === 'none' || pc.position !== 'absolute' || pc.display === 'none') continue;
        const paint = pc.backgroundColor + pc.backgroundImage;
        if (/rgba\(0, 0, 0, 0\)/.test(pc.backgroundColor) && pc.backgroundImage === 'none') continue;
        const h = px(pc.height), wd = px(pc.width);
        const bar = (h > 0 && h <= 3 && wd > r.width * 0.6) || (wd > 0 && wd <= 3 && h > r.height * 0.6);
        if (bar && !/rgba\(255, 255, 255, 0\.0[0-6]/.test(paint)) out.add(key(el) + ' ' + pe + '  edge bar');
      }
    }
    return [...out];
  });
  for (const h of hits) {
    if (!found.has(h)) found.set(h, new Set());
    found.get(h).add(name);
  }
  await page.close();
}

let unexpected = 0;
for (const [hit, views] of [...found].sort()) {
  const cls = hit.replace(/^\./, '').split(/[. ]/)[0];
  const ok = EXPECTED.has(cls);
  if (!ok) unexpected++;
  console.log(`  ${ok ? '·' : '✗'} ${hit.padEnd(42)} ${[...views].join(', ')}`);
}
console.log(unexpected
  ? `\n═══ ${unexpected} accent(s) landing on one edge — close them ═══`
  : `\n═══ every accent closes · ${found.size} structural divider(s), all expected ═══`);

await browser.close();
server.kill();
