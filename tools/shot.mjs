// ─────────────────────────────────────────────────────────────────────────────
// SEEING THE THING
//
// The headless suites have no layout and no paint, so the entire visual half of
// this project is invisible to them. That gap is not theoretical: a full-screen
// overlay once covered a whole application from first paint while every DOM
// assertion passed. So a real browser looks at the page, at the three widths
// that matter, and reports what it finds.
//
//   1440  a desktop
//    760  the ChatGPT desktop app's built-in browser, which is the only place
//         this game has a real assistant, and is neither wide nor unzoomed
//    420  narrower still
//
// Playwright is NOT a dependency of this repo and must never become one — the
// whole game is a folder you can serve. Point PLAYWRIGHT at an installation:
//
//   mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright node tools/shot.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.SHOT_OUT || '/tmp/shots';
const PORT = Number(process.env.PORT || 5199);
const BASE = `http://localhost:${PORT}`;
const WIDTHS = [
  { w: 1440, h: 900, name: 'desktop' },
  { w: 760, h: 1000, name: 'chatgpt-pane' },
  { w: 420, h: 900, name: 'narrow' },
];

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  // A CommonJS package imported by URL arrives under `default`.
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch (e) {
  console.log('playwright not found. This is a look-at-it tool, not a test:\n'
    + '  mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium\n'
    + '  PLAYWRIGHT=/tmp/pw/node_modules/playwright node tools/shot.mjs');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

let problems = 0;
const note = (m) => { problems++; console.log('  ✗ ' + m); };

const browser = await pw.chromium.launch();
try {
  for (const { w, h, name } of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e.message)));

    // Skip the opening and land in a played game.
    await page.goto(`${BASE}/?dev=1&notut=1`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.goto(`${BASE}/?dev=1&notut=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    console.log(`\n── ${name} · ${w}×${h} ──`);

    // Skip the intro by clicking through, if it is on screen.
    for (let i = 0; i < 8; i++) {
      const btn = await page.$('[data-act="start-game"], [data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"], [data-act="new-game"], [data-act="continue-game"]');
      if (!btn) break;
      await btn.click().catch(() => {});
      await page.waitForTimeout(360);
    }
    await page.waitForTimeout(900);

    const shot = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`  saved ${shot}`);

    // ── The page-eater check ────────────────────────────────────────────────
    const eaters = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
        if (cs.pointerEvents === 'none') continue;
        out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className}`.slice(0, 80));
      }
      return out;
    });
    if (eaters.length) note(`full-screen fixed layer(s) over the page: ${eaters.join(', ')}`);
    else console.log('  ✓ nothing is eating the page');

    // ── The clipping check ──────────────────────────────────────────────────
    const clipped = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#app *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > innerWidth + 2 || r.left < -2) {
          const t = (el.textContent || '').trim().slice(0, 30);
          if (t) out.push(`${el.className || el.tagName}: "${t}"`.slice(0, 70));
        }
      }
      return [...new Set(out)].slice(0, 6);
    });
    if (clipped.length) note(`clipped past the viewport: ${clipped.join(' | ')}`);
    else console.log('  ✓ nothing is clipped');

    // ── The keep-out check ──────────────────────────────────────────────────
    // ChatGPT's chat input floats over the bottom centre of its browser, about
    // 720×120. Anything the page puts there is underneath it and unreachable.
    const inBox = await page.evaluate(() => {
      const bw = Math.min(720, innerWidth), bh = 120;
      const box = { l: (innerWidth - bw) / 2, r: (innerWidth + bw) / 2, t: innerHeight - bh, b: innerHeight };
      const pinned = [], flowing = [];
      const anchored = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const p = getComputedStyle(n).position;
          if (p === 'fixed' || p === 'sticky') return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('button, [data-act], input, select, a')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (!(cx > box.l && cx < box.r && cy > box.t && cy < box.b)) continue;
        const label = `${el.dataset.act || el.tagName}: "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
        (anchored(el) ? pinned : flowing).push(label);
      }
      return { pinned: [...new Set(pinned)].slice(0, 8), flowing: [...new Set(flowing)].slice(0, 6) };
    });
    if (inBox.pinned.length) note(`pinned under the ChatGPT chat box, unreachable: ${inBox.pinned.join(' | ')}`);
    else console.log('  ✓ nothing is pinned under the chat box');
    if (inBox.flowing.length) console.log(`  · in the keep-out box but scrollable: ${inBox.flowing.join(' | ')}`);

    // ── The world's console must be reachable at every width ───────────────
    const reach = await page.evaluate(() => {
      const vis = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      };
      return {
        panel: vis(document.getElementById('world-console')),
        chip: vis(document.querySelector('[data-act="author-dialog"]')),
        plug: vis(document.querySelector('[data-act="mute-world"], [data-act="assistant-link"]')),
      };
    });
    if (!reach.panel && !reach.chip) note('the world\'s console is unreachable at this width — no panel and no chip');
    else console.log(`  ✓ world console reachable (${reach.panel ? 'panel' : ''}${reach.panel && reach.chip ? ' + ' : ''}${reach.chip ? 'chip' : ''})`);

    const facts = await page.evaluate(() => ({
      tools: window.__mcpCount ?? null,
      feed: document.querySelectorAll('.feed-item').length,
      view: document.querySelector('.sl-view')?.textContent || '?',
      day: document.querySelector('.sl-left')?.textContent?.trim().slice(0, 40) || '?',
    }));
    console.log(`  ${facts.view.trim()} · ${facts.day} · ${facts.feed} wire entries`);

    if (errors.length) {
      note(`${errors.length} console error(s): ${errors.slice(0, 3).map((e) => e.slice(0, 100)).join(' | ')}`);
    } else console.log('  ✓ no console errors');

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(problems ? `\n${problems} problem(s) — look at ${OUT}` : `\nlooked at three widths, nothing wrong — ${OUT}`);
process.exit(problems ? 1 : 0);
