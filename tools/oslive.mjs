// ─────────────────────────────────────────────────────────────────────────────
// THE WORKSTATION, DRIVEN
//
// `tools/ostest.mjs` proves the housing's models are sound with no DOM at all.
// `tools/shot.mjs` proves nothing is eaten, clipped or pinned at three widths.
// This is the third thing: a real browser actually using the desktop — logging
// in, walking the whole of First Light, dragging and resizing and zooming a
// window, opening a sheet, answering a thread from a notification, taking a
// call, sliding the drawer out at 760px, and carrying one save between the two
// housings.
//
// It exists because every bug this build actually had was invisible to the
// other two. A `clip-path: none` that flooded a window with its accent colour,
// a `backdrop-filter` that did the same, window keys that answered a mouse and
// not a keyboard, a drawer that opened behind the window it was meant to cover
// — every one of them rendered, measured and validated perfectly.
//
// Playwright is NOT a dependency of this repo and must never become one:
//
//   mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.js node tools/oslive.mjs
//
// Launch with a GPU. Headless Chromium's software rasteriser reports the
// desktop at half the console's frame rate and it is an artifact — measured
// through CDP the workstation spends *less* time in script, style and layout.
//
// One more artifact to know about before you file a bug against a picture: with
// several windows stacked, about one screenshot in three comes back washed
// milky white. Five captures of a frozen, identical DOM gave one washed and
// four clean, and killing `backdrop-filter` takes it from 6-in-8 to 0-in-8.
// It is Chromium sampling a backdrop root mid-paint. Take the shot again.
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.SHOT_OUT || '/tmp/shots/os';
const PORT = Number(process.env.PORT || 5196);
const BASE = `http://localhost:${PORT}`;
const ROUTE = (process.env.ROUTE || '/computer/').replace(/\/?$/, '/');
const KEEP = process.env.KEEP_SHOTS !== '0';

let pw;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch {
  console.log('playwright not found. This is a drive-it tool, not a unit test:\n'
    + '  mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium\n'
    + '  PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.js node tools/oslive.mjs');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 150));
  try { if ((await fetch(BASE + ROUTE)).ok) { up = true; break; } } catch {}
}
if (!up) {
  console.log(`\n  the server did not come up on ${PORT} — something else may be listening:`);
  console.log(`    lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t | xargs kill\n`);
  server.kill(); process.exit(1);
}

let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name); return true; }
  fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`);
  console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
  return false;
};
const section = (t) => console.log(`\n── ${t} ──`);

const browser = await pw.chromium.launch({ args: ['--enable-gpu'] });
const shots = [];
async function shot(p, name) {
  if (!KEEP) return;
  const f = path.join(OUT, `${name}.png`);
  await p.screenshot({ path: f });
  shots.push(name);
}

// A page in a played game, with the clock stopped and any open card answered —
// so every check below looks at the ordinary desktop rather than at a dialog.
async function played(w, h, q = '', opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, ...opts });
  const p = await ctx.newPage();
  p.__errors = [];
  p.on('pageerror', (e) => p.__errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.__errors.push(m.text()); });
  await p.goto(`${BASE}${ROUTE}?dev=1&notut=1&pause=1${q}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2200);
  for (let i = 0; i < 3; i++) {
    const c = await p.$('#event-modal .choice:not(.choice-free)');
    if (!c) break;
    await c.click().catch(() => {});
    await p.waitForTimeout(420);
    await p.click('#event-continue').catch(() => {});
    await p.waitForTimeout(420);
  }
  return p;
}
const rect = (p, sel) => p.evaluate((s) => {
  const e = document.querySelector(s); return e ? e.getBoundingClientRect().toJSON() : null;
}, sel);
const state = (p, fn) => p.evaluate(async (src) => {
  const { S } = await import('/src/engine/state.js');
  // eslint-disable-next-line no-new-func
  return new Function('S', `return (${src})(S)`)(S);
}, fn.toString());

try {
  // ══ A first run, end to end ═══════════════════════════════════════════════
  section('a first run: title → setup → desktop → First Light');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(`${BASE}${ROUTE}?cold=0`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    ok('the title screen comes up', await p.evaluate(() => !!document.querySelector('.title-word')));
    await shot(p, '01-title');
    await p.click('[data-act="new-game"]'); await p.waitForTimeout(1200);
    ok('the setup assistant opens', await p.evaluate(() => !!document.querySelector('.beat')));
    await shot(p, '02-setup');
    await p.click('[data-act="beat-next"]'); await p.waitForTimeout(900);
    await p.click('.choice-card'); await p.waitForTimeout(1100);
    await p.click('.choice-card'); await p.waitForTimeout(1400);
    ok('the threshold arrives', await p.evaluate(() => !!document.querySelector('[data-act="start-game"]')));
    await shot(p, '03-threshold');
    await p.click('[data-act="start-game"]'); await p.waitForTimeout(5200);
    ok('the desktop boots', await p.evaluate(() => !!document.querySelector('#app.os .dock-tile')));
    ok('First Light runs', await p.evaluate(() => !!document.querySelector('.tut-card')));
    await shot(p, '04-first-light');

    // Walk the whole chapter. Every step must land its ring on something, or
    // be a deliberately centred one — a spotlight pointing at nothing is worse
    // than no walkthrough at all, and it fails silently in a browser.
    let steps = 0; const missed = []; const seenTitles = new Set();
    let approachFullyVisible = false;
    for (let i = 0; i < 26; i++) {
      const st = await p.evaluate(() => {
        const c = document.querySelector('.tut-card'); if (!c) return null;
        const ring = document.querySelector('.tut-ring');
        const r = ring && !ring.hidden ? ring.getBoundingClientRect() : null;
        return { title: c.querySelector('.tut-title')?.textContent,
          ringed: !!(r && r.width > 4 && r.height > 4),
          centred: c.classList.contains('centred'),
          waiting: !!c.querySelector('.tut-wait') };
      });
      if (!st) break;
      steps++;
      seenTitles.add(st.title);
      if (!st.ringed && !st.centred) missed.push(st.title);
      if (st.title === 'How you ask changes what you get') {
        approachFullyVisible = await p.evaluate(() => {
          const target = document.querySelector('.approach-strip');
          const clip = target?.closest('.win-body');
          if (!target || !clip) return false;
          const r = target.getBoundingClientRect();
          const c = clip.getBoundingClientRect();
          return r.top >= c.top + 10 && r.bottom <= c.bottom - 10;
        });
      }
      if (st.waiting) {
        // Press the hand the step is actually waiting for. This used to try
        // Write Code first whatever the step asked, so the chapter stalled on
        // "Now let the machine do it" — which wants Prompt — and looped
        // twenty-six times on one card. Every assertion below still passed,
        // because counting iterations is not the same as walking a chapter.
        const did = await p.evaluate(() => {
          const asks = (document.querySelector('.tut-card')?.textContent || '');
          const order = /machine do it|prompt|delegate/i.test(asks)
            ? ['[data-act="do"][data-v="prompt"]', '[data-act="do"][data-v="code"]']
            : ['[data-act="do"][data-v="code"]', '[data-act="do"][data-v="prompt"]'];
          for (const sel of order) {
            const e = document.querySelector(sel);
            if (e && !e.disabled) { e.click(); return true; }
          }
          return false;
        });
        await p.waitForTimeout(700);
        if (!did) { await p.click('[data-tutact="next"]').catch(() => {}); await p.waitForTimeout(500); }
      } else {
        await p.click('[data-tutact="next"]').catch(() => {});
        await p.waitForTimeout(560);
      }
    }
    ok(`First Light walks all ${seenTitles.size} of its steps`, seenTitles.size >= 15,
      `${seenTitles.size} distinct cards in ${steps} turns`);
    ok('and every one of them lands on something', missed.length === 0, missed.join(' | '));
    ok('step 9 scrolls the prompting controls fully inside the Desk window', approachFullyVisible);
    ok('with no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
    await shot(p, '05-desk');
    await ctx.close();
  }

  // ══ Logging back in ═══════════════════════════════════════════════════════
  section('the login screen');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}${ROUTE}?dev=1&notut=1&days=60`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);                                  // makes a save
    await p.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2200);
    const tile = await p.evaluate(() => {
      const t = document.querySelector('.login-tile');
      return t ? { text: t.textContent.replace(/\s+/g, ' ').trim(), go: !!t.querySelector('[data-act="continue-game"]') } : null;
    });
    ok('the saved run is an account you log into', !!tile?.go);
    ok('and the tile names the founder, the act and the day', /Act/.test(tile?.text || '') && /day/.test(tile?.text || ''), tile?.text?.slice(0, 80));
    await shot(p, '06-login');
    await p.click('[data-act="continue-game"]'); await p.waitForTimeout(4000);
    ok('logging in reaches the desktop', await p.evaluate(() => !!document.querySelector('#app.os .win:not(.hidden)')));
    await ctx.close();
  }

  // ══ Windows ═══════════════════════════════════════════════════════════════
  section('windows');
  {
    const p = await played(1440, 900, '&days=420');
    await p.click('.dock-tile[data-v="market"]'); await p.waitForTimeout(600);
    ok('a dock tile opens a window', await p.evaluate(() => !!document.querySelector('.win[data-app="market"]:not(.hidden)')));
    ok('the new window takes focus', await p.evaluate(() => document.querySelector('.win.on')?.dataset.app === 'market'));
    ok('and the menu bar follows it', (await p.textContent('#mb-app'))?.trim() === 'Market');

    // A module opens filling the field, so there is nothing to its right to grow
    // into — the rail is the wall. Drag the grip *inward*, which is always
    // available and is the direction a founder uses to make room for a second
    // window anyway.
    const start = await rect(p, '.win[data-app="market"]');
    const g = await rect(p, '.win[data-app="market"] .win-grip');
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await p.mouse.down(); await p.mouse.move(g.x - 200, g.y - 90, { steps: 10 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const sized = await rect(p, '.win[data-app="market"]');
    ok('the grip resizes it', sized.width < start.width - 150 && sized.height < start.height - 60,
      `${Math.round(start.width)}×${Math.round(start.height)} → ${Math.round(sized.width)}×${Math.round(sized.height)}`);

    await p.mouse.move(sized.x + sized.width / 2, sized.y + 16);
    await p.mouse.down(); await p.mouse.move(sized.x + sized.width / 2 + 120, sized.y + 16 + 70, { steps: 12 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const moved = await rect(p, '.win[data-app="market"]');
    ok('the title bar drags it', Math.abs(moved.x - (sized.x + 120)) < 6 && Math.abs(moved.y - (sized.y + 70)) < 6);

    await p.click('.win[data-app="market"] .wk-zoom'); await p.waitForTimeout(320);
    // "The desktop" is the *field* — what is left after the docked Wire rail —
    // so this is measured against the rail's left edge rather than a number.
    const zoomed = await rect(p, '.win[data-app="market"]');
    const railL = (await rect(p, '#feed-rail'))?.x ?? 1e9;
    ok('zoom fills the field', zoomed.width > 900 && zoomed.x + zoomed.width <= railL + 1,
      `${Math.round(zoomed.width)}px, ends at ${Math.round(zoomed.x + zoomed.width)}, rail at ${Math.round(railL)}`);
    await p.click('.win[data-app="market"] .wk-zoom'); await p.waitForTimeout(320);
    ok('and zooming again restores it', Math.abs((await rect(p, '.win[data-app="market"]')).width - moved.width) < 3);

    await p.click('.win[data-app="market"] .wk-min'); await p.waitForTimeout(420);
    ok('minimize hides it', await p.evaluate(() => document.querySelector('.win[data-app="market"]').classList.contains('hidden')));
    ok('and the tile says it is still running', await p.evaluate(() => document.querySelector('.dock-tile[data-v="market"]').classList.contains('min')));
    await p.click('.dock-tile[data-v="market"]'); await p.waitForTimeout(420);
    ok('the tile brings it back where it was',
      Math.abs((await rect(p, '.win[data-app="market"]')).width - moved.width) < 3);

    // A window key is a real button, and a button answers the keyboard.
    await p.evaluate(() => document.querySelector('.win[data-app="market"] .wk-close')?.focus());
    await p.keyboard.press('Enter'); await p.waitForTimeout(420);
    ok('Enter on a window key works', await p.evaluate(() => document.querySelector('.win[data-app="market"]').classList.contains('hidden')));

    // Snapping.
    const d = await rect(p, '.win[data-app="desk"]');
    await p.mouse.move(d.x + d.width / 2, d.y + 16);
    await p.mouse.down();
    await p.mouse.move(d.x + d.width / 2, d.y + 120, { steps: 6 });
    await p.mouse.move(6, 400, { steps: 14 });
    await p.waitForTimeout(240);
    ok('the left edge arms a half-screen ghost', await p.evaluate(() => {
      const gh = document.querySelector('.win-ghost');
      return !!gh?.classList.contains('on') && gh.getBoundingClientRect().width > 400 && gh.getBoundingClientRect().width < 900;
    }));
    await shot(p, '07-snap');
    await p.mouse.up(); await p.waitForTimeout(420);
    const snapped = await rect(p, '.win[data-app="desk"]');
    ok('releasing snaps it there', snapped.x < 20 && snapped.width > 400 && snapped.width < 900);

    ok('0 shows the desktop', await p.evaluate(async () => {
      document.querySelector('.win.on')?.focus();
      return true;
    }));
    await p.keyboard.press('0'); await p.waitForTimeout(520);
    ok('and the widgets are behind it', await p.evaluate(() =>
      document.querySelectorAll('.widget').length === 2
      && [...document.querySelectorAll('.win:not(.hidden)')].every((el) => Number(getComputedStyle(el).opacity) < 0.2)));
    await shot(p, '08-widgets');
    await p.keyboard.press('0'); await p.waitForTimeout(520);
    ok('and pressing it again brings them back', await p.evaluate(() =>
      [...document.querySelectorAll('.win:not(.hidden)')].every((el) => Number(getComputedStyle(el).opacity) > 0.8)));

    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ The menu bar ══════════════════════════════════════════════════════════
  section('the menu bar');
  {
    const p = await played(1440, 900, '&days=420');
    await p.click('.mb-title[data-v="window"]'); await p.waitForTimeout(280);
    ok('a menu opens', await p.evaluate(() => !!document.querySelector('.menu')));
    ok('and lists the open windows', await p.evaluate(() =>
      [...document.querySelectorAll('.menu-item')].some((e) => /Desk/i.test(e.textContent))));
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(140);
    ok('the arrow keys select', await p.evaluate(() => !!document.querySelector('.menu-item.sel')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(220);
    ok('escape closes it', await p.evaluate(() => !document.querySelector('.menu')));

    await p.click('.dock-tile[data-v="research"]'); await p.waitForTimeout(600);
    await p.click('.mb-app'); await p.waitForTimeout(280);
    await shot(p, '09-menu');
    await p.evaluate(() => [...document.querySelectorAll('.menu-item')].find((e) => /capital/i.test(e.textContent))?.click());
    await p.waitForTimeout(600);
    ok("the app's menu actually does the thing", await state(p, (S) => S.ui?.researchBranch === 'capital'));

    await p.click('.dock-tile[data-v="agents"]'); await p.waitForTimeout(600);
    await p.click('.mb-app'); await p.waitForTimeout(280);
    await p.evaluate(() => [...document.querySelectorAll('.menu-item')].find((e) => /^\s*Research\s*$/.test(e.textContent))?.click());
    await p.waitForTimeout(600);
    ok('assign-all moves every agent', await state(p, (S) => S.agents.length > 0 && S.agents.every((a) => a.lane === 'research')));

    // Time is the most-pressed control in the game and there is no key for
    // speed — Space pauses and the digits are the eight modules — so it has to
    // be in the bar rather than behind the clock's popover, which was three
    // actions instead of one, many times a session.
    const speed = async () => p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js');
      return { paused: S.settings.paused, speed: S.settings.speed,
        keys: document.querySelectorAll('.mb-speed .sp').length,
        lit: [...document.querySelectorAll('.mb-speed .sp')].findIndex((b) => b.classList.contains('on')) };
    });
    ok('the bar carries the transport', (await speed()).keys === 5);
    // A real pointer, not `el.click()`: a synthesised click has `detail: 0` and
    // is treated as the keyboard's, which is the whole point of the focus rule
    // being tested three lines down.
    const press = async (n) => {
      const box = await p.evaluate((i) => {
        const e = document.querySelectorAll('.mb-speed .sp')[i]; if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, n);
      if (box) await p.mouse.click(box.x, box.y);
      await p.waitForTimeout(300);
    };
    await press(3);
    let tr = await speed();
    ok('a speed key is one click from anywhere', tr.speed === 3 && !tr.paused && tr.lit === 3, JSON.stringify(tr));
    await press(0);
    tr = await speed();
    ok('and the pause key pauses', tr.paused && tr.lit === 0, JSON.stringify(tr));
    await p.keyboard.press('Space'); await p.waitForTimeout(300);
    tr = await speed();
    ok('Space still works after a click, and the keys follow it',
      !tr.paused && tr.lit !== 0, JSON.stringify(tr));

    // The bar sheds rather than shrinks: nothing may run past the glass.
    for (const w of [1440, 1180, 1000, 760, 560, 420, 340, 300]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.waitForTimeout(400);
      const spill = await p.evaluate(() => [...document.querySelectorAll('.menubar *')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); })
        .map((e) => String(e.className).slice(0, 24)));
      ok(`the bar fits at ${w}px`, spill.length === 0, [...new Set(spill)].join(', '));
    }
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ Sheets ════════════════════════════════════════════════════════════════
  section('sheets hang from the window that opened them');
  {
    const p = await played(1440, 900, '&days=200');
    await p.click('.dock-tile[data-v="agents"]'); await p.waitForTimeout(700);
    const win = await rect(p, '.win[data-app="agents"]');
    await p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js');
      S.agents.length = 0; S.company.cash = 5e6;
    });
    await p.waitForTimeout(500);
    await p.click('[data-act="recruit"]'); await p.waitForTimeout(700);
    const sheet = await p.evaluate(() => {
      const bd = document.querySelector('#generic-modal'); if (!bd) return null;
      return { isSheet: bd.classList.contains('sheet'),
        rect: bd.querySelector('.modal').getBoundingClientRect().toJSON(),
        cands: bd.querySelectorAll('[data-cand]').length };
    });
    ok('recruit opens as a sheet', !!sheet?.isSheet);
    ok('centred on its own window', sheet && Math.abs((sheet.rect.x + sheet.rect.width / 2) - (win.x + win.width / 2)) < 8);
    ok('hanging from its title bar', sheet && Math.abs(sheet.rect.y - (win.y + 32)) < 6, sheet && `${Math.round(sheet.rect.y)} vs ${Math.round(win.y + 32)}`);
    ok('with its three candidates', sheet?.cands === 3);
    await shot(p, '10-sheet');
    await p.evaluate(() => document.querySelector('[data-cand="0"]')?.click());
    await p.waitForTimeout(700);
    ok('and hiring from it works', await p.evaluate(() => !document.querySelector('#generic-modal')));
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ The machine speaking ══════════════════════════════════════════════════
  section('notifications, threads and calls');
  {
    const p = await played(1440, 900, '&days=300');
    await p.evaluate(async () => {
      const t = await import('/src/ui/toast.js');
      t.toast({ icon: '★', title: 'A test notification', sub: 'from the harness', kind: 'good', ms: 9000 });
    });
    await p.waitForTimeout(500);
    ok('a toast lands under the menu bar, on the right', await p.evaluate(() => {
      const t = document.querySelector('#toast-root .toast'); if (!t) return false;
      const r = t.getBoundingClientRect();
      return r.top < 200 && r.right > innerWidth - 380;
    }));
    await p.click('.mb-nc'); await p.waitForTimeout(400);
    ok('the notification centre keeps it', await p.evaluate(() => /test notification/i.test(document.querySelector('.nc-list')?.textContent || '')));
    await shot(p, '11-notifications');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);

    await p.evaluate(() => document.querySelector('.win[data-app="wire"] .wk-close')?.click());
    await p.waitForTimeout(500);
    const made = await p.evaluate(async () => {
      const feed = await import('/src/systems/feed.js');
      const { S } = await import('/src/engine/state.js');
      let m = null; for (let i = 0; i < 10 && !m; i++) m = feed.maybeThread(S);
      return !!m;
    });
    await p.waitForTimeout(800);
    ok('a thread arriving with the Wire shut offers its replies', made
      && await p.evaluate(() => !!document.querySelector('.os-banner.thread .thread-opt')));
    await shot(p, '12-thread-banner');
    ok('and answering from the banner closes it', await p.evaluate(async () => {
      const btn = document.querySelector('.os-banner.thread .thread-opt'); if (!btn) return false;
      btn.click(); await new Promise((r) => setTimeout(r, 700));
      return !document.querySelector('.os-banner.thread');
    }));

    await p.evaluate(async () => {
      const { presentEvent } = await import('/src/systems/narrative.js');
      const { EVENT_MAP } = await import('/src/data/events.js');
      const { CHARACTERS } = await import('/src/data/characters.js');
      const { S } = await import('/src/engine/state.js');
      const ev = Object.values(EVENT_MAP).find((e) => e.char && CHARACTERS[e.char]?.kind !== 'ai' && CHARACTERS[e.char]?.img);
      S.narrative.activeEvent = null;
      presentEvent(S, ev);
    });
    await p.waitForTimeout(320);
    ok('a card from a person says who is calling first', await p.evaluate(() => !!document.querySelector('.os-banner.call')));
    await shot(p, '13-incoming');
    await p.waitForTimeout(900);
    ok('and then the card opens', await p.evaluate(() => !!document.querySelector('#event-modal')));
    await shot(p, '14-card');
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ The act turns, and the machine goes down ══════════════════════════════
  section('the act turns');
  {
    const p = await played(1440, 900, '&days=300');
    const before = await p.evaluate(() => [...document.querySelectorAll('.wall-plate')].map((e) => e.style.backgroundImage));
    await p.evaluate(async () => {
      const { emit } = await import('/src/engine/bus.js');
      const { S } = await import('/src/engine/state.js');
      S.company.act = 4;
      emit('act:advance', { act: 4 });
    });
    await p.waitForTimeout(1200);
    ok('the act card is up', await p.evaluate(() => !!document.querySelector('.act-overlay')));
    await shot(p, '15-act');
    await p.waitForTimeout(2400);
    ok('and the wallpaper turned under it', await p.evaluate((b) => {
      const now = [...document.querySelectorAll('.wall-plate')];
      return now.some((e) => e.classList.contains('on') && /act4/.test(e.style.backgroundImage))
        && JSON.stringify(now.map((e) => e.style.backgroundImage)) !== JSON.stringify(b);
    }, before));
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }
  section('and the machine goes down before the ending');
  {
    const p = await played(1440, 900, '&days=900&end=steward');
    await p.waitForTimeout(3000);
    ok('the retrospective is up', await p.evaluate(() => !!document.querySelector('.ending-overlay')));
    ok('over a machine that shut down', await p.evaluate(() => document.getElementById('app')?.classList.contains('powerdown')));
    await shot(p, '16-ending');
    await p.context().close();
  }

  // ══ The narrow widths ═════════════════════════════════════════════════════
  section('the drawer, at the widths this game is played at');
  for (const [w, h, label] of [[1000, 820, 'compact'], [760, 1000, 'the ChatGPT pane'], [420, 900, 'narrow']]) {
    const p = await played(w, h, '&days=400');
    ok(`${label}: one window at a time`, await p.evaluate(() =>
      document.querySelectorAll('.win:not(.hidden)').length <= 2));
    await p.click('.menubar .tb-wire'); await p.waitForTimeout(600);
    const d = await p.evaluate(() => {
      const el = document.getElementById('feed-rail'); const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      // What is at the drawer's own left edge, a few px in? If the dock rail is
      // over it, every line in the feed is losing its first word.
      const dock = document.querySelector('#app.dock-left .dock')?.getBoundingClientRect() || null;
      return { left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom),
        w: innerWidth, h: innerHeight, onTop: !!hit?.closest('#feed-rail'),
        underRail: !!dock && r.left < dock.right - 1,
        railRight: dock ? Math.round(dock.right) : null,
        replies: [...document.querySelectorAll('#feed-rail .thread-opt')].filter((b) => {
          const rr = b.getBoundingClientRect(); return rr.width > 0 && rr.right <= innerWidth + 2;
        }).length,
        total: document.querySelectorAll('#feed-rail .thread-opt').length };
    });
    ok(`${label}: the drawer slides in`,
      d.right <= d.w + 2 && d.left >= 0 && d.right - d.left >= 240, JSON.stringify(d));
    ok(`${label}: and is in front of the window`, d.onTop, JSON.stringify(d));
    ok(`${label}: and clear of the dock rail`, !d.underRail,
      `drawer starts at ${d.left}, rail ends at ${d.railRight}`);
    // The console's own rule, which this matches on purpose: below 861px assume
    // ChatGPT's floating chat input and stop well clear of it; above that only
    // clear the chrome, because a 1000px window is not that pane.
    const clear = d.h - d.bottom;
    const want = w <= 860 ? 120 : 30;
    ok(`${label}: stopping clear of the bottom band`, clear >= want, `${clear}px clear, wanted ${want}`);
    ok(`${label}: with every reply reachable`, d.total === 0 || d.replies === d.total, `${d.replies}/${d.total}`);
    await shot(p, `17-drawer-${w}`);
    if (w <= 860) {
      await p.click('.dock-tile[data-v="research"]'); await p.waitForTimeout(600);
      ok(`${label}: switching apps keeps the drawer`, await p.evaluate(() => {
        const v = [...document.querySelectorAll('.win:not(.hidden)')].map((x) => x.dataset.app);
        return v.includes('research') && v.includes('wire');
      }));
    }
    ok(`${label}: no console errors`, p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ Reach ═════════════════════════════════════════════════════════════════
  section('reduced motion and high contrast');
  {
    const p = await played(1440, 900, '&days=400', { reducedMotion: 'reduce' });
    ok('nothing is animating', await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#app *')) {
        const cs = getComputedStyle(el);
        if (cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.05) out.push(el.className);
      }
      return out.length === 0;
    }));
    await p.click('.dock-tile[data-v="market"]'); await p.waitForTimeout(300);
    ok('a window still opens', await p.evaluate(() => !!document.querySelector('.win[data-app="market"]:not(.hidden)')));
    await p.click('.win[data-app="market"] .wk-close'); await p.waitForTimeout(300);
    ok('and closes at once', await p.evaluate(() => document.querySelector('.win[data-app="market"]').classList.contains('hidden')));
    await p.context().close();
  }
  {
    const p = await played(1440, 900, '&days=400');
    await p.evaluate(() => document.documentElement.classList.add('high-contrast'));
    await p.waitForTimeout(500);
    const c = await p.evaluate(() => ({
      ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
      bezel: getComputedStyle(document.documentElement).getPropertyValue('--os-bezel').trim(),
      wall: getComputedStyle(document.querySelector('.wall-plate.on') || document.body).opacity,
      widget: getComputedStyle(document.querySelector('.widget') || document.body).opacity,
    }));
    ok('the ink ramp lifts', c.ink === '#ffffff', JSON.stringify(c));
    ok('the window bezels lift', c.bezel === 'rgba(255,255,255,0.26)', c.bezel);
    ok('the wallpaper steps back', Number(c.wall) <= 0.11, c.wall);
    ok('and the widgets go solid', Number(c.widget) === 1, c.widget);
    await shot(p, '18-contrast');
    await p.context().close();
  }
  section('the keyboard');
  {
    const p = await played(1440, 900, '&days=150');
    const code = () => state(p, (S) => Math.round(S.resources.code));
    await p.evaluate(async () => { const { S } = await import('/src/engine/state.js'); S.founder.focus = S.founder.focusMax; });
    await p.click('.dock-tile[data-v="story"]'); await p.waitForTimeout(600);
    const a = await code(); await p.keyboard.press('q'); await p.waitForTimeout(500);
    ok('Q writes code from any window', (await code()) > a);
    ok('and brings the Desk forward', await p.evaluate(() => document.querySelector('.win.on')?.dataset.app === 'desk'));
    await p.evaluate(() => document.querySelector('.win[data-app="desk"] .wk-close').click());
    await p.waitForTimeout(500);
    await p.evaluate(async () => { const { S } = await import('/src/engine/state.js'); S.founder.focus = S.founder.focusMax; });
    const b2 = await code(); await p.keyboard.press('q'); await p.waitForTimeout(600);
    ok('Q reopens a closed Desk and still writes', (await code()) > b2);
    for (const [d, app] of [['3', 'agents'], ['5', 'market'], ['7', 'story']]) {
      await p.keyboard.press(d); await p.waitForTimeout(420);
      ok(`${d} opens ${app}`, await p.evaluate((x) => document.querySelector('.win.on')?.dataset.app === x, app));
    }
    await p.keyboard.press('?'); await p.waitForTimeout(700);
    ok('? opens the Manual window, not a dialog', await p.evaluate(() =>
      document.querySelector('.win.on')?.dataset.app === 'manual' && !document.querySelector('#generic-modal')));
    await p.keyboard.press('a'); await p.waitForTimeout(800);
    ok('A opens ARIA', await p.evaluate(() => document.querySelector('.win.on')?.dataset.app === 'aria'));
    const paused = await state(p, (S) => S.settings.paused);
    await p.keyboard.press(' '); await p.waitForTimeout(300);
    ok('space still pauses', await p.evaluate(async (was) => {
      const { S } = await import('/src/engine/state.js'); return S.settings.paused !== was;
    }, paused));
    let reached = 0;
    for (let i = 0; i < 14; i++) {
      await p.keyboard.press('Tab');
      if (await p.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return false;
        const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      })) reached++;
    }
    ok('tab reaches real controls', reached >= 10, `${reached}/14`);
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ The walkthrough, at the width this is played at ═══════════════════════
  // First Light was only ever walked at 1440 here, and the step that teaches
  // the Wire spotlighted a panel nobody could see at 760: below 1120px the Wire
  // is a drawer, and opening the *window* left the plate parked off-canvas by a
  // transform. A spotlight on nothing fails silently in a browser, which is the
  // whole reason this file exists.
  // Desktop width is in this list because it was not, and that is why the Wire
  // step shipped broken. At 1440 the Wire is a *docked rail*, which is furniture
  // rather than a window: permanently in front and deliberately never focusable.
  // `showing()` answered it with a focus test, so it was false for ever, and
  // `tick()` — which calls `ensureStepView` every animation frame — re-ran
  // `setView('wire')` (a whole `applyAll` plus three repaints) sixty times a
  // second. Chrome absorbed it; Firefox locked up. Every assertion in this file
  // passed throughout, because a ring that lands on a thrashing page still
  // lands. Hence the call counter below: the ring being right is not the same
  // as the step being still.
  section('the walkthrough, at the width this is played at');
  for (const [w, h, label] of [[760, 1000, 'the ChatGPT pane'], [1000, 820, 'compact'], [1440, 900, 'desktop']]) {
    const p = await played(w, h, '&days=6');
    await p.evaluate(async () => {
      const OS = await import('/src/ui/os/shell.js');
      const T = await import('/src/ui/tutorial.js');
      // Re-register with a counting wrapper so a step that re-forces its own
      // view on a loop is visible as a number rather than as a slow machine.
      window.__setViews = 0;
      T.registerShell({ setView: (id) => { window.__setViews++; return OS.setView(id); },
        getView: OS.getView, showing: OS.showing, alias: OS.anchorAlias,
        os: true, onEnd: () => {} });
      T.setDisabled(false);
      T.start('first_light');
    });
    await p.waitForTimeout(900);
    let steps = 0; const seen = new Set(); const blind = [];
    for (let i = 0; i < 30; i++) {
      const st = await p.evaluate(() => {
        const c = document.querySelector('.tut-card'); if (!c) return null;
        const ring = document.querySelector('.tut-ring');
        const r = ring && !ring.hidden ? ring.getBoundingClientRect() : null;
        const cr = c.getBoundingClientRect();
        return { title: c.querySelector('.tut-title')?.textContent,
          waiting: !!c.querySelector('.tut-wait'),
          ringed: !!(r && r.width > 4 && r.height > 4 && r.right > 0 && r.left < innerWidth),
          centred: c.classList.contains('centred'),
          cardOff: cr.right > innerWidth + 1 || cr.bottom > innerHeight + 1 || cr.left < -1 || cr.top < -1 };
      });
      if (!st) break;
      steps++; seen.add(st.title);
      if (!st.ringed && !st.centred) blind.push(`no ring: ${st.title}`);
      if (st.cardOff) blind.push(`card off screen: ${st.title}`);
      // Hold on this step for a few frames and see whether it is asking the
      // housing to switch view over and over. A settled step asks zero times.
      const spun = await p.evaluate(() => new Promise((res) => {
        const before = window.__setViews || 0;
        let f = 0;
        const tick = () => (++f < 20)
          ? requestAnimationFrame(tick)
          : res((window.__setViews || 0) - before);
        requestAnimationFrame(tick);
      }));
      if (spun > 2) blind.push(`re-forces its view ${spun}× in 20 frames: ${st.title}`);
      if (st.waiting) {
        const did = await p.evaluate(() => {
          const asks = document.querySelector('.tut-card')?.textContent || '';
          const order = /machine do it|prompt|delegate/i.test(asks)
            ? ['[data-act="do"][data-v="prompt"]', '[data-act="do"][data-v="code"]']
            : ['[data-act="do"][data-v="code"]', '[data-act="do"][data-v="prompt"]'];
          for (const sel of order) { const e = document.querySelector(sel); if (e && !e.disabled) { e.click(); return true; } }
          return false;
        });
        await p.waitForTimeout(650);
        if (!did) { await p.click('[data-tutact="next"]').catch(() => {}); await p.waitForTimeout(450); }
      } else { await p.click('[data-tutact="next"]').catch(() => {}); await p.waitForTimeout(520); }
    }
    ok(`${label}: First Light walks its whole chapter`, seen.size >= 14,
      `${seen.size} distinct cards in ${steps} turns`);
    ok(`${label}: and every step lands on something on screen`, blind.length === 0, blind.slice(0, 3).join(' | '));
    ok(`${label}: no console errors`, p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
    await p.context().close();
  }

  // ══ No key that visibly does nothing ══════════════════════════════════════
  // The codebase's own rule, applied to the three window keys in all three
  // modes. Zoom was dead everywhere: in desktop and compact a module opens
  // already filling the field, so the green key had nowhere bigger to go, and
  // in stacked `toggleZoom` refuses outright. It goes the other way now — back
  // to the size the app was drawn to float at — and in stacked it is hidden.
  section('no window key that visibly does nothing');
  for (const [w, h, label] of [[1600, 1000, 'desktop'], [1000, 820, 'compact'], [760, 1000, 'stacked']]) {
    const p = await played(w, h, '&days=420');
    const box = () => p.evaluate(() => {
      const win = document.querySelector('.win.on'); if (!win) return null;
      const r = win.getBoundingClientRect();
      return { app: win.dataset.app, w: Math.round(r.width), h: Math.round(r.height),
        keys: [...win.querySelectorAll('.wk')].filter((k) => k.offsetParent).map((k) => k.dataset.winkey) };
    });
    const b0 = await box();
    if (b0.keys.includes('zoom')) {
      await p.evaluate(() => document.querySelector('.win.on [data-winkey="zoom"]')?.click());
      await p.waitForTimeout(420);
      const b1 = await box();
      ok(`${label}: the zoom key changes the window`, b1.w !== b0.w || b1.h !== b0.h,
        `${b0.w}×${b0.h} → ${b1.w}×${b1.h}`);
      await p.evaluate(() => document.querySelector('.win.on [data-winkey="zoom"]')?.click());
      await p.waitForTimeout(420);
      const b2 = await box();
      ok(`${label}: and puts it back`, Math.abs(b2.w - b0.w) <= 4 && Math.abs(b2.h - b0.h) <= 4,
        `${b1.w}×${b1.h} → ${b2.w}×${b2.h}, wanted ${b0.w}×${b0.h}`);
    } else {
      ok(`${label}: the zoom key is not offered`, true, 'hidden, because it would refuse');
    }
    const vis0 = await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').length);
    await p.evaluate(() => document.querySelector('.win.on [data-winkey="min"]')?.click());
    await p.waitForTimeout(420);
    const vis1 = await p.evaluate(() => document.querySelectorAll('.win:not(.hidden)').length);
    ok(`${label}: the minimise key hides it`, vis1 < vis0, `${vis0} → ${vis1}`);
    ok(`${label}: no console errors`, p.__errors.length === 0, p.__errors.slice(0, 2).join(' | '));
    await p.context().close();
  }

  // ══ The Record, Find and the right-click ══════════════════════════════════
  // The three things that make this a desktop rather than a window manager.
  // None of them can be seen by ostest: the Record is a pure render, but
  // browsing it is three actions deep, Find is an overlay that only exists once
  // a key is pressed, and a context menu is a pointer event with a button on it.
  section('the Record, Find and the right-click');
  {
    const p = await played(1600, 1000, '&days=760');

    // ── The Record ──
    await p.evaluate(() => document.querySelector('.dock-tile[data-v="record"]')?.click());
    await p.waitForTimeout(900);
    const rec0 = await p.evaluate(() => {
      const w = document.querySelector('.win[data-app="record"]:not(.hidden)');
      return w ? { folders: w.querySelectorAll('.rec-folder').length,
        readout: document.querySelector('.win[data-app="record"] [data-readout]')?.textContent?.trim() } : null;
    });
    ok('the Record opens with drawers in it', !!rec0 && rec0.folders >= 6, JSON.stringify(rec0));
    ok('and its title bar counts them', /FILE|FOLDER/.test(rec0?.readout || ''), rec0?.readout);

    await p.evaluate(() => [...document.querySelectorAll('.rec-folder')].find((b) => !b.disabled)?.click());
    await p.waitForTimeout(700);
    const rows = await p.evaluate(() => document.querySelectorAll('.rec-row').length);
    ok('a drawer opens onto its files', rows > 0, `${rows} rows`);

    await p.evaluate(() => document.querySelectorAll('.rec-row')[0]?.click());
    await p.waitForTimeout(700);
    const doc = await p.evaluate(() => {
      const d = document.querySelector('.rec-doc');
      return d ? { name: d.querySelector('.rec-doc-name')?.textContent?.trim(),
        meta: d.querySelectorAll('.rec-mk').length, prose: (d.querySelector('.rec-prose')?.textContent || '').trim().length } : null;
    });
    ok('and a file opens onto something worth reading', !!doc && doc.prose > 20, JSON.stringify(doc));
    ok('with the machine\'s own meta on it', (doc?.meta || 0) >= 2, JSON.stringify(doc));

    // Nothing in the Record may be O(n) on the paint loop: the readout runs
    // seven times a second for the focused window.
    const cost = await p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js');
      const R = await import('/src/ui/os/record.js');
      const t0 = performance.now();
      for (let i = 0; i < 200; i++) R.readoutFor(S);
      return (performance.now() - t0) / 200;
    });
    ok('its readout is cheap enough for the paint loop', cost < 1.5, `${cost.toFixed(3)}ms per call`);

    // ── Find ──
    await p.keyboard.press('f'); await p.waitForTimeout(600);
    ok('f opens Find', await p.evaluate(() => !!document.querySelector('.find-panel')));
    ok('and it holds the clock', await p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js'); return !!S.modalBlocking;
    }));
    await p.keyboard.type('research'); await p.waitForTimeout(700);
    const hits = await p.evaluate(() => ({
      rows: document.querySelectorAll('.find-row').length,
      groups: document.querySelectorAll('.find-head').length,
      blocked: document.querySelectorAll('.fr-note.blocked').length,
    }));
    ok('typing finds things across the machine', hits.rows > 3 && hits.groups >= 2, JSON.stringify(hits));
    const onGlass = await p.evaluate(() => {
      const el = document.querySelector('.find-panel'); if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
    });
    ok('and the palette is on the glass', onGlass);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok('escape closes it', await p.evaluate(() => !document.querySelector('.find-panel')));
    ok('and gives the clock back', await p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js'); return !S.modalBlocking;
    }));

    // ── The right-click ──
    const targets = [
      ['a dock tile', '.dock-tile[data-v="research"]'],
      ['a window title bar', '.win.on .win-title'],
      ['the desktop', '.desktop'],
      ['a Desk action', '.action-btn'],
    ];
    for (const [name, sel] of targets) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      if (sel === '.action-btn') {
        await p.evaluate(() => document.querySelector('.dock-tile[data-v="desk"]')?.click());
        await p.waitForTimeout(600);
      }
      const box = await p.evaluate((s) => {
        const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect();
        if (s === '.desktop') return { x: r.left + 5, y: r.bottom - 5 };
        return r.width > 4 ? { x: r.left + Math.min(30, r.width / 2), y: r.top + Math.min(14, r.height / 2) } : null;
      }, sel);
      if (!box) { ok(`${name} is there to right-click`, false, sel); continue; }
      await p.mouse.click(box.x, box.y, { button: 'right' });
      await p.waitForTimeout(500);
      const menu = await p.evaluate(() => {
        const el = document.querySelector('#ctx .menu'); if (!el) return null;
        const r = el.getBoundingClientRect();
        return { items: el.querySelectorAll('.menu-item').length,
          onGlass: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 };
      });
      ok(`${name} opens a context menu`, !!menu && menu.items > 0, JSON.stringify(menu));
      ok(`${name}'s menu stays on the glass`, !!menu?.onGlass, JSON.stringify(menu));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok('escape closes a context menu', await p.evaluate(() => !document.querySelector('#ctx .menu')));
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ The Wire is furniture, not a window ═══════════════════════════════════
  // It is the panel that says a decision is waiting, so it cannot be something
  // you lose behind four other panels. At desktop width it is a rail taken out
  // of the field rather than laid over it: `deskSize()` returns the smaller box
  // and every window in the machine stops at its edge.
  section('the Wire cannot be buried');
  {
    const p = await played(1600, 1000, '&days=420');
    const look = () => p.evaluate(() => {
      const rail = document.getElementById('feed-rail')?.getBoundingClientRect();
      const desk = document.getElementById('desktop')?.getBoundingClientRect();
      const wins = [...document.querySelectorAll('.win:not(.hidden):not(.win-wire)')]
        .map((w) => ({ app: w.dataset.app, right: Math.round(w.getBoundingClientRect().right) }));
      return { docked: document.getElementById('app').classList.contains('wire-docked'),
        rail: rail ? { l: Math.round(rail.left), r: Math.round(rail.right), w: Math.round(rail.width) } : null,
        deskR: desk ? Math.round(desk.right) : 0, wins };
    });
    let g = await look();
    ok('it is docked at desktop width', g.docked && g.rail.w > 300, JSON.stringify(g.rail));
    ok('and against the right edge', Math.abs(g.rail.r - g.deskR) <= 1);
    for (const a of ['product', 'agents', 'research', 'market', 'world', 'story', 'legacy', 'manual', 'settings']) {
      await p.evaluate((id) => document.querySelector(`.dock-tile[data-v="${id}"]`)?.click(), a);
      await p.waitForTimeout(200);
    }
    g = await look();
    ok(`with ${g.wins.length} windows open, none of them reaches it`,
      g.wins.every((w) => w.right <= g.rail.l + 1),
      JSON.stringify(g.wins.filter((w) => w.right > g.rail.l + 1)));
    // Toasts and banners hang off the right edge, and the rail is now part of
    // that edge. One printed across the Wire hides the threads waiting on you.
    await p.evaluate(async () => {
      const T = await import('/src/ui/toast.js');
      T.toast({ icon: '⚠', title: 'Tech debt is compounding', sub: 'and climbing', kind: 'bad' });
    });
    await p.waitForTimeout(600);
    const lane = await p.evaluate(() => {
      const t = document.querySelector('.toast'); const rail = document.getElementById('feed-rail');
      return { r: t ? Math.round(t.getBoundingClientRect().right) : null,
        railL: rail ? Math.round(rail.getBoundingClientRect().left) : null };
    });
    ok('a toast lands clear of it', lane.r !== null && lane.r <= lane.railL + 1, JSON.stringify(lane));

    // Every control that can reach the rail has to agree that it is furniture.
    // Its dock tile used to *focus* a panel that is permanently in front, so
    // pressing it twice left the founder exactly where they started; its zoom
    // key is hidden but a hidden button still answers a programmatic click, and
    // the `zoomed` flag it set is saved.
    await p.evaluate(() => document.querySelector('.dock-tile[data-v="wire"]')?.click());
    await p.waitForTimeout(500);
    ok('its dock tile puts it away', !(await look()).docked);
    await p.evaluate(() => document.querySelector('.dock-tile[data-v="wire"]')?.click());
    await p.waitForTimeout(500);
    ok('and the same tile brings it back', (await look()).docked);
    await p.evaluate(() => document.querySelector('#feed-rail [data-winkey="zoom"]')?.click());
    await p.waitForTimeout(400);
    ok('a rail refuses to be zoomed', await p.evaluate(() =>
      !document.getElementById('feed-rail')?.classList.contains('zoomed')));
    await p.evaluate(() => document.querySelector('#feed-rail [data-winkey="min"]')?.click());
    await p.waitForTimeout(400);
    ok('and refuses to be minimised', (await look()).docked);
    await p.evaluate(() => document.querySelector('#feed-rail [data-winkey="close"]')?.click());
    await p.waitForTimeout(500);
    ok('but its close key shuts it', !(await look()).docked);
    await p.evaluate(() => document.querySelector('.menubar .tb-wire')?.click());
    await p.waitForTimeout(500);
    ok('and the chip opens it again', (await look()).docked);

    await p.evaluate(() => document.querySelector('.menubar .tb-wire')?.click()); await p.waitForTimeout(500);
    ok('the menu-bar chip puts it away', !(await look()).docked);
    await p.evaluate(() => document.querySelector('.menubar .tb-wire')?.click()); await p.waitForTimeout(500);
    g = await look();
    ok('and the same chip brings it back', g.docked && g.rail.w > 300);
    ok('with the windows stepping aside again', g.wins.every((w) => w.right <= g.rail.l + 1));
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ A tooltip opens once ══════════════════════════════════════════════════
  // `pointerover` and `pointerout` bubble, so they fire again for every child
  // the pointer crosses inside one tipped element — and a tipped element is
  // usually a button with an icon, a label and a number in it. Taking each of
  // those for an arrival and a departure made every tooltip in the game blink
  // three or four times on the way in.
  section('a tooltip opens once');
  {
    const p = await played(1600, 1000, '&days=420');
    await p.evaluate(() => {
      window.__tips = 0;
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes)
        if (n.classList?.contains?.('tip')) window.__tips++; }).observe(document.body, { childList: true });
    });
    for (const [name, sel] of [['a dock tile', '.dock-tile[data-v="research"]'],
      ['a menu-bar readout', '.stat-strip .stat'], ['ARIA’s key', '.mb-aria']]) {
      const box = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect();
        return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top } : null; }, sel);
      if (!box) { ok(`${name} is there to hover`, false, sel); continue; }
      // Approach from straight above and leave the same way. Sideways would
      // cross the neighbouring tile, whose tip is a second, correct open — the
      // question here is whether *one* element opens *one* tip.
      await p.mouse.move(box.x, box.top - 16); await p.waitForTimeout(250);
      await p.evaluate(() => { window.__tips = 0; });
      await p.mouse.move(box.x, box.y, { steps: 6 });
      await p.waitForTimeout(1200);
      const n = await p.evaluate(() => window.__tips);
      ok(`${name} opens its tip exactly once`, n === 1, `${n} opens`);
      ok(`${name} still has a tip on screen`, await p.evaluate(() => !!document.querySelector('.tip')));
      await p.mouse.move(box.x, box.top - 16, { steps: 4 }); await p.waitForTimeout(400);
      ok(`${name} closes it on the way out`, await p.evaluate(() => !document.querySelector('.tip')));
    }
    ok('no console errors', p.__errors.length === 0, p.__errors.slice(0, 3).join(' | '));
    await p.context().close();
  }

  // ══ Nothing lives outside its own clip ════════════════════════════════════
  // A clip-path clips every descendant, absolutely-positioned ones included.
  // The dock learned this the expensive way: its tile carried the chamfer, so
  // the running tick 7px below it, the badge 5px over its corner and the
  // focus ring around it were all cut away — three affordances that rendered,
  // measured and validated perfectly and painted nothing at all. The cut lives
  // on a pseudo-element now, and this walks every screen looking for the same
  // shape of mistake anywhere else.
  section('nothing lives outside its own clip');
  {
    const sweep = () => {
      const out = []; const seen = new Set();
      for (const host of document.querySelectorAll('*')) {
        const hs = getComputedStyle(host);
        if (hs.clipPath === 'none') continue;
        // A host that also hides its overflow is clipping by that instead; the
        // path is taking nothing away that was going to be seen.
        if (hs.overflowX !== 'visible' || hs.overflowY !== 'visible') continue;
        const hr = host.getBoundingClientRect();
        if (hr.width < 2 || hr.height < 2) continue;
        for (const kid of host.querySelectorAll('*')) {
          const kr = kid.getBoundingClientRect();
          if (kr.width < 1 || kr.height < 1) continue;
          const ks = getComputedStyle(kid);
          if (ks.display === 'none' || ks.visibility === 'hidden' || +ks.opacity === 0) continue;
          // A scroller between the two is the operative clipper, not the path.
          let scrolled = false;
          for (let n = kid.parentElement; n && n !== host; n = n.parentElement) {
            const ns = getComputedStyle(n);
            if (ns.overflowX !== 'visible' || ns.overflowY !== 'visible') { scrolled = true; break; }
          }
          if (scrolled) continue;
          const t = hr.top - kr.top, b = kr.bottom - hr.bottom;
          const l = hr.left - kr.left, r = kr.right - hr.right;
          const worst = Math.max(t, b, l, r);
          if (worst < 1.5) continue;
          const key = (host.className || host.tagName) + '>' + (kid.className || kid.tagName);
          if (seen.has(key)) continue; seen.add(key);
          out.push(`${['above', 'below', 'left', 'right'][[t, b, l, r].indexOf(worst)]} `
            + `by ${worst.toFixed(0)}px: .${String(host.className || host.tagName).trim().slice(0, 34)}`
            + ` > .${String(kid.className || kid.tagName).trim().slice(0, 28)}`);
        }
      }
      return out;
    };

    for (const [w, h, mode] of [[1600, 1000, 'desktop'], [980, 900, 'compact'], [820, 1100, 'stacked']]) {
      const p = await played(w, h, '&days=340');
      const hits = new Set();
      for (const v of ['desk', 'product', 'team', 'research', 'growth', 'money', 'world', 'story']) {
        await p.evaluate(async (vv) => { (await import('/src/ui/shell.js')).setView(vv); }, v);
        await p.waitForTimeout(360);
        for (const hit of await p.evaluate(sweep)) hits.add(hit);
      }
      // The menu bar and the notification centre are open surfaces too.
      await p.evaluate(() => document.querySelector('.mb-title')?.click()); await p.waitForTimeout(300);
      for (const hit of await p.evaluate(sweep)) hits.add(hit);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      await p.evaluate(() => document.querySelector('[data-act="os-menu"][data-v="clock"]')?.click());
      await p.waitForTimeout(300);
      for (const hit of await p.evaluate(sweep)) hits.add(hit);
      ok(`${mode}: nothing is cut away by a clip it lives outside of`, hits.size === 0,
        [...hits].slice(0, 4).join(' | '));
      await p.context().close();
    }

    // And the check has to be able to see the bug it was written for.
    const p = await played(1600, 1000, '&days=340');
    await p.addStyleTag({ content: '.os .dock-tile { clip-path: var(--cut-br) !important; }' });
    await p.waitForTimeout(400);
    const caught = await p.evaluate(sweep);
    ok('the sweep still catches the dock bug it was written for',
      caught.some((h) => /dock-tick|nav-badge/.test(h)), `${caught.length} hits`);
    await p.context().close();
  }

  // ══ One save, two housings ════════════════════════════════════════════════
  section('one save, two housings');
  {
    const p = await played(1440, 900, '&days=350');
    await p.evaluate(async () => {
      const Save = await import('/src/engine/save.js');
      const { S } = await import('/src/engine/state.js');
      Save.save(S);
    });
    const day = await state(p, (S) => Math.floor(S.time.day));
    const layout = await state(p, (S) => Object.keys(S.ui.os.windows).filter((k) => S.ui.os.windows[k].open).sort().join(','));
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1400);
    await p.click('[data-act="continue-game"]'); await p.waitForTimeout(2600);
    ok('the console opens the workstation’s save', Math.abs((await state(p, (S) => Math.floor(S.time.day))) - day) < 10);
    ok('and it is the console', await p.evaluate(() => !!document.querySelector('#app .topbar .brand') && !document.querySelector('#app.os')));
    await p.evaluate(async () => {
      const Save = await import('/src/engine/save.js');
      const { S } = await import('/src/engine/state.js');
      Save.save(S);
    });
    await p.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1600);
    await p.click('[data-act="continue-game"]'); await p.waitForTimeout(3200);
    ok('and the workstation gets its layout back',
      (await state(p, (S) => Object.keys(S.ui.os.windows).filter((k) => S.ui.os.windows[k].open).sort().join(','))) === layout);
    ok('as the workstation', await p.evaluate(() => !!document.querySelector('#app.os .dock-tile')));
    await p.context().close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n═══ the workstation, driven: ${pass}/${pass + fail} ═══`);
if (failures.length) { console.log('\nfailures:'); failures.forEach((f) => console.log('  · ' + f)); }
else if (KEEP) console.log(`  ${shots.length} shots in ${OUT}`);
process.exit(fail ? 1 : 0);
