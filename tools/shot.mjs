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
// Two housings live at two routes and both have to survive all three widths.
//   ROUTE=/computer/ node tools/shot.mjs
const ROUTE = (process.env.ROUTE || '/').replace(/\/?$/, '/');
const OS = ROUTE !== '/';
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
    // `pause=1` is what makes this tool deterministic. Without it the clock
    // keeps running while the checks do, a story card opens somewhere in the
    // middle of them, and the page-eater check flags the card's own backdrop —
    // which is the game working, not a layout bug. It cost two false failures
    // on the workstation before it was added here.
    await page.goto(`${BASE}${ROUTE}?dev=1&notut=1&pause=1`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.goto(`${BASE}${ROUTE}?dev=1&notut=1&pause=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    console.log(`\n── ${name} · ${w}×${h}${OS ? ' · workstation' : ''} ──`);

    // Skip the intro by clicking through, if it is on screen.
    for (let i = 0; i < 8; i++) {
      const btn = await page.$('[data-act="start-game"], [data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"], [data-act="new-game"], [data-act="continue-game"]');
      if (!btn) break;
      await btn.click().catch(() => {});
      await page.waitForTimeout(360);
    }
    await page.waitForTimeout(900);

    // A card that was already on screen when the clock stopped is answered, so
    // every check below looks at the ordinary game rather than at a dialog.
    for (let i = 0; i < 3; i++) {
      const open = await page.$('#event-modal .choice:not(.choice-free)');
      if (!open) break;
      await open.click().catch(() => {});
      await page.waitForTimeout(420);
      await page.click('#event-continue').catch(() => {});
      await page.waitForTimeout(420);
    }
    await page.waitForTimeout(200);

    const shot = path.join(OUT, `${OS ? 'os-' : ''}${name}.png`);
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
      // A panel deliberately parked off-canvas — the Wire drawer when it is
      // shut — is not clipped content, it is content waiting behind a door.
      // The tell is that it (or an ancestor) is *entirely* outside the viewport
      // and got there by a transform. Something genuinely clipped is cut by the
      // edge, which means part of it is still inside.
      const parked = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const r = n.getBoundingClientRect();
          if ((r.left >= innerWidth - 1 || r.right <= 1)
              && getComputedStyle(n).transform !== 'none') return true;
        }
        return false;
      };
      const out = [];
      for (const el of document.querySelectorAll('#app *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (parked(el)) continue;
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

    // ── So must the Wire ───────────────────────────────────────────────────
    // The rail used to be `display: none` below 1120px, which is every width
    // this tool looks at except the desktop one. That did not just hide a feed:
    // the threads waiting on an answer are decisions, and at 760px — the pane
    // this game is meant to be played in — nine of them were in the DOM with
    // nothing on screen that could reach any of them. It is a drawer now, so
    // what has to hold is that either the rail is open or a door exists, and
    // that the drawer's own buttons never land under ChatGPT's chat box.
    const wire = await page.evaluate(() => {
      const onScreen = (el) => {
        if (!el) return false;
        const c = getComputedStyle(el);
        if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) < 0.05) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > 2 && r.left < innerWidth - 2;
      };
      const open = () => {
        const rail = onScreen(document.getElementById('feed-rail'));
        const threads = [...document.querySelectorAll('.thread-opt')].filter(onScreen).length;
        const total = document.querySelectorAll('.thread-opt').length;
        return { rail, threads, total };
      };
      const before = open();
      const door = document.querySelector('[data-act="wire-toggle"]');
      if (!before.rail && onScreen(door)) {
        document.getElementById('app')?.classList.add('wire-open');
        const after = open();
        // Nothing the drawer pins may sit in the floating chat box.
        const bw = Math.min(720, innerWidth), bh = 120;
        const box = { l: (innerWidth - bw) / 2, r: (innerWidth + bw) / 2, t: innerHeight - bh };
        const buried = [...document.querySelectorAll('#feed-rail button')].filter((el) => {
          if (!onScreen(el)) return false;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          return cx > box.l && cx < box.r && cy > box.t;
        }).length;
        document.getElementById('app')?.classList.remove('wire-open');
        return { how: 'drawer', ...after, buried };
      }
      const housing = document.getElementById('app')?.classList.contains('os') ? 'window' : 'rail';
      return { how: before.rail ? housing : 'nothing', ...before, buried: 0 };
    });
    if (wire.how === 'nothing') note('the Wire is unreachable at this width — no rail and no door');
    else if (wire.total && !wire.threads) note(`the Wire opens but none of its ${wire.total} thread options are on screen`);
    else if (wire.buried) note(`${wire.buried} Wire control(s) sit under the ChatGPT chat box`);
    else console.log(`  ✓ Wire reachable as ${wire.how} (${wire.threads}/${wire.total} thread options on screen)`);

    // ── The workstation ─────────────────────────────────────────────────────
    if (OS) {
      const os = await page.evaluate(() => {
        const on = (el) => {
          if (!el) return false;
          const c = getComputedStyle(el);
          if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) < 0.05) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.right > 2 && r.left < innerWidth - 2
              && r.bottom > 2 && r.top < innerHeight - 2;
        };
        const tiles = [...document.querySelectorAll('.dock-tile')];
        return {
          tiles: tiles.length,
          tilesOn: tiles.filter(on).length,
          wireDoor: on(document.querySelector('.menubar .tb-wire')),
          uplink: on(document.querySelector('.menubar .tb-world')),
          clock: on(document.querySelector('.mb-clock')),
          // Every key a window *offers* has to be on screen. Not "three": the
          // zoom key is deliberately absent in stacked mode, where the front
          // window fills the desktop and zoom would refuse — a key that
          // visibly does nothing is worse than a key that is not there.
          keysOffered: [...document.querySelectorAll('.win:not(.hidden) .wk')]
            .filter((el) => el.offsetParent).length,
          keys: [...document.querySelectorAll('.win:not(.hidden) .wk')].filter(on).length,
          wins: document.querySelectorAll('.win:not(.hidden)').length,
          // Nothing in the bar or the dock may run past the glass.
          spill: [...document.querySelectorAll('.menubar *, .dock *')]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); })
            .map((el) => String(el.className).slice(0, 28)).slice(0, 4),
        };
      });
      if (os.tiles !== os.tilesOn) note(`${os.tiles - os.tilesOn} dock tile(s) are off screen`);
      else console.log(`  ✓ all ${os.tiles} dock tiles on screen`);
      if (!os.wireDoor) note('the Wire has no door in the menu bar');
      if (!os.uplink) note('the world has no door in the menu bar');
      if (!os.clock) note('the clock is not on screen');
      if (os.wireDoor && os.uplink && os.clock) console.log('  ✓ the Wire, the world and the clock are all reachable');
      if (os.wins && os.keys < os.keysOffered) {
        note(`a window offers ${os.keysOffered} keys but only ${os.keys} are on screen`);
      }
      else if (os.wins) console.log(`  ✓ ${os.wins} window(s), keys reachable`);
      if (os.spill.length) note(`chrome spilling past the glass: ${os.spill.join(' | ')}`);
      else console.log('  ✓ no chrome spills past the glass');

      // Show the desktop, and put it back. Real key presses rather than
      // synthetic events, and long enough for the transition to actually land.
      const opac = () => page.evaluate(() => [...document.querySelectorAll('.win:not(.hidden)')]
        .map((el) => Number(getComputedStyle(el).opacity)));
      await page.keyboard.press('0');
      await page.waitForTimeout(520);
      const hid = await opac();
      const widgets = await page.evaluate(() => document.querySelectorAll('.widget').length);
      await page.keyboard.press('0');
      await page.waitForTimeout(520);
      const back = await opac();
      if (!hid.length) note('no windows are open to show the desktop behind');
      else if (!hid.every((o) => o < 0.2)) note(`0 did not show the desktop (opacity ${hid.join(', ')})`);
      else if (!back.every((o) => o > 0.8)) note(`0 did not bring the windows back (opacity ${back.join(', ')})`);
      else console.log(`  ✓ show-desktop works (${widgets} widget(s) behind)`);
    }

    const facts = await page.evaluate(() => ({
      tools: window.__mcpCount ?? null,
      feed: document.querySelectorAll('.feed-item').length,
      view: document.querySelector('.sl-view')?.textContent
         || document.querySelector('.win.on .win-name')?.textContent?.replace(/\s+/g, ' ').trim()
         || document.getElementById('mb-app')?.textContent || '?',
      day: document.querySelector('.sl-left')?.textContent?.trim().slice(0, 40)
        || document.querySelector('.mb-clock')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40) || '?',
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
