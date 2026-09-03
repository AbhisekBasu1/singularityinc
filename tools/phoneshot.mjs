// ─────────────────────────────────────────────────────────────────────────────
// THE PHONE
//
// `shot.mjs` looks at three widths and the narrowest is 420. A phone is 390,
// 360, and on the older ones 320, held in one hand, with no hover and no
// keyboard — and people open the link there. This walks every surface the
// console has at that size, photographs each one, and audits it for the four
// things a phone is unforgiving about:
//
//   overflow   the page or a pane scrolling sideways, or something cut by the
//              right edge
//   cut        a label clipped inside its own box (`overflow: hidden` +
//              `nowrap` + more text than room)
//   small      a tap target under 36px on either side
//   tiny       text under 9.5px, which is unreadable on glass at arm's length
//
// The answer is not zero on every count — a mono index under a bracket is
// meant to be small — so it prints a list and the screenshots, and a person
// decides. Like `shot.mjs` it wants an external Playwright:
//
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/phoneshot.mjs
//   W=360 H=800 node tools/phoneshot.mjs            another phone
//   SCREENS=desk,event,wire node tools/phoneshot.mjs  a subset
//   LAND=1 node tools/phoneshot.mjs                   sideways (844×390)
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 5213);
const BASE = `http://localhost:${PORT}`;
const W = Number(process.env.W || 390), H = Number(process.env.H || 844);
const OUT = process.env.SHOT_OUT || `/tmp/shots/phone-${W}x${H}`;
const ONLY = process.env.SCREENS ? new Set(process.env.SCREENS.split(',')) : null;
const DAYS = Number(process.env.DAYS || 400);

let pw;
try {
  const spec = process.env.PLAYWRIGHT;
  const mod = await import(spec ? (spec.startsWith('/') ? 'file://' + spec : spec) : 'playwright');
  pw = mod.chromium ? mod : mod.default;
  if (!pw?.chromium) throw new Error('no chromium export');
} catch {
  console.log('playwright not found. This is a look-at-it tool, not a test:\n'
    + '  PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/phoneshot.mjs');
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

// ── The audit, run inside the page ────────────────────────────────────────
const AUDIT = () => {
  // Rendered, not necessarily on this screenful: a label cut off below the
  // fold is still cut off, and the audit reads the whole column.
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Parked off-canvas by a transform is a shut door, not clipped content.
  const parked = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      if ((r.left >= innerWidth - 1 || r.right <= 1) && getComputedStyle(n).transform !== 'none') return true;
    }
    return false;
  };
  // The boot roll is a marquee mid-flight; the act card and the ending are film.
  const skip = (el) => el.closest('#bg-layer, .tutor, canvas, script, style, .ld-rain, .tut-pane, .sl-boot, .act-overlay, .ending-overlay');
  // Inside something that scrolls sideways on purpose — the cast rail, the
  // ticker, the alert strip — past the edge is a swipe away, not cut off.
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const text = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  const out = { pageX: document.documentElement.scrollWidth - innerWidth, panes: [], clipped: [], cut: [], small: [], tiny: [], eaters: [] };

  // A scroller that scrolls sideways is the page scrolling sideways in a costume.
  for (const el of document.querySelectorAll('.main, .stage, .modal-body, .feed-list, .win-body, #modal-root, .modal')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      out.panes.push(`${label(el)} ${el.scrollWidth - el.clientWidth}px wider than itself`);
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el) || !vis(el) || parked(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if ((r.right > innerWidth + 2 || r.left < -2) && !inScroller(el)) {
      const t = text(el);
      if (t && r.width < innerWidth * 3) out.clipped.push(`${label(el)} "${t}" [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    // A label cut inside its own box. A glyph key is not a label: its
    // scroll width counts the key's own inset fill, not anything unseen.
    const ov = cs.overflowX;
    if ((ov === 'hidden' || ov === 'clip') && cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 3
        && cs.textOverflow !== 'ellipsis' && !el.classList.contains('btn-icon')) {
      const t = text(el);
      if (t) out.cut.push(`${label(el)} "${t}" ${el.scrollWidth - el.clientWidth}px short`);
    }
  }
  // Tap targets.
  for (const el of document.querySelectorAll('button, a[href], [data-act], input, select, textarea, .slider, [role="button"], [role="slider"], [role="tab"]')) {
    if (skip(el) || !vis(el) || parked(el)) continue;
    if (el.disabled) continue;
    if (el.closest('button') && el.closest('button') !== el) continue;   // a span inside a button
    const r = el.getBoundingClientRect();
    const dim = Math.min(r.width, r.height);
    if (dim < 36) out.small.push(`${label(el)} "${text(el) || el.getAttribute('aria-label') || el.dataset.act || ''}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  // Tiny text: elements with their own text nodes.
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el) || !vis(el) || parked(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 9.5) {
      const k = `${label(el)} ${fs}`;
      if (!seen.has(k)) { seen.add(k); out.tiny.push(`${label(el)} ${fs}px "${text(el)}"`); }
    }
  }
  // Page-eaters, as in shot.mjs.
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
    if (cs.pointerEvents === 'none') continue;
    if (el.closest('.tutor, #modal-root, .modal-backdrop, .act-overlay, .ending-overlay')) continue;
    out.eaters.push(label(el));
  }
  const cap = (a, n) => a.length > n ? [...a.slice(0, n), `… ${a.length - n} more`] : a;
  return { pageX: out.pageX, panes: out.panes, clipped: cap([...new Set(out.clipped)], 8), cut: cap([...new Set(out.cut)], 8),
    small: cap([...new Set(out.small)], 10), smallN: new Set(out.small).size, tiny: cap(out.tiny, 8), tinyN: out.tiny.length, eaters: out.eaters };
};

// ── The screens ───────────────────────────────────────────────────────────
const dev = (extra = '') => `${BASE}/?dev=1&notut=1&pause=1&days=${DAYS}${extra}`;
const settle = (p, ms = 700) => p.waitForTimeout(ms);
// Answer whatever the fast-forward left open, the way shot.mjs does.
async function clear(p) {
  for (let i = 0; i < 3; i++) {
    const open = await p.$('#event-modal .choice:not(.choice-free)');
    if (!open) break;
    await open.click().catch(() => {}); await settle(p, 400);
    await p.click('#event-continue').catch(() => {}); await settle(p, 400);
  }
  for (let i = 0; i < 2; i++) {
    const hang = await p.$('[data-call-hang]');
    if (!hang) break;
    await hang.click().catch(() => {}); await settle(p, 400);
    await p.click('#call-close').catch(() => {}); await settle(p, 400);
  }
}
async function view(p, id, extra = '') {
  await p.goto(dev(`&view=${id}${extra}`), { waitUntil: 'load' }); await settle(p, 900); await clear(p);
}
const SCREENS = {
  landing: async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1400); },
  'landing-2': async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1200);
    await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) s.scrollTop = innerHeight; }); await settle(p, 500); },
  'landing-3': async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1200);
    await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) s.scrollTop = innerHeight * 2.2; }); await settle(p, 500); },
  'landing-4': async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1200);
    await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) s.scrollTop = innerHeight * 3.6; }); await settle(p, 500); },
  'landing-5': async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1200);
    await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) s.scrollTop = innerHeight * 5.2; }); await settle(p, 500); },
  'landing-end': async (p) => { await p.goto(`${BASE}/`, { waitUntil: 'load' }); await settle(p, 1200);
    await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) s.scrollTop = s.scrollHeight; }); await settle(p, 500); },
  'setup-1': async (p) => { await p.goto(`${BASE}/?setup=0`, { waitUntil: 'load' }); await settle(p, 1500); },
  'setup-2': async (p) => { await p.goto(`${BASE}/?setup=1`, { waitUntil: 'load' }); await settle(p, 1500); },
  'setup-3': async (p) => { await p.goto(`${BASE}/?setup=2`, { waitUntil: 'load' }); await settle(p, 1500); },
  'setup-4': async (p) => { await p.goto(`${BASE}/?setup=3`, { waitUntil: 'load' }); await settle(p, 1500); },
  'setup-5': async (p) => { await p.goto(`${BASE}/?setup=4`, { waitUntil: 'load' }); await settle(p, 1500); },
  'setup-6': async (p) => { await p.goto(`${BASE}/?setup=5`, { waitUntil: 'load' }); await settle(p, 1500); },
  'desk-day0': async (p) => { await p.goto(`${BASE}/?dev=1&notut=1&pause=1`, { waitUntil: 'load' }); await settle(p, 900); await clear(p); },
  desk: (p) => view(p, 'desk'),
  'desk-down': async (p) => { await view(p, 'desk'); await p.evaluate(() => { document.querySelector('.main').scrollTop = 900; }); await settle(p, 400); },
  product: (p) => view(p, 'product'),
  agents: (p) => view(p, 'agents'),
  research: (p) => view(p, 'research'),
  market: (p) => view(p, 'market'),
  world: async (p) => { await p.goto(dev('&view=world').replace(`days=${DAYS}`, 'days=900'), { waitUntil: 'load' }); await settle(p, 1100); await clear(p); },
  'world-regions': (p) => view(p, 'world', '&wtab=regions&regions=4'),
  story: (p) => view(p, 'story'),
  legacy: (p) => view(p, 'legacy', '&career'),
  wire: async (p) => { await view(p, 'desk'); await p.click('[data-act="wire-toggle"]').catch(() => {}); await settle(p, 600); },
  event: async (p) => { await p.goto(dev('&event=e_first_user'), { waitUntil: 'load' }); await settle(p, 1100); },
  'event-outcome': async (p) => { await p.goto(dev('&event=e_first_user'), { waitUntil: 'load' }); await settle(p, 1100);
    await p.click('#event-modal .choice:not(.choice-free)').catch(() => {}); await settle(p, 700); },
  // The fast-forward can leave a call open with no plate painted, because the
  // ring landed before the shell was up. Hang that one up first.
  call: async (p) => { await view(p, 'desk'); const ok = await p.evaluate(async () => {
      const { S } = await import('/src/engine/state.js'); const C = await import('/src/systems/calls.js');
      if (C.activeCall(S)) { try { C.hangUp(S, { accept: false }); } catch {} }
      S.narrative.relationships.sam = { ...(S.narrative.relationships.sam || {}), met: true, affinity: 3, arc: 1 };
      try { const r = C.startCall(S, 'sam', { by: 'them' }); return r?.ok === false ? r.reason : !!r; } catch (e) { return String(e.message); }
    }); await settle(p, 1400); if (!(await p.$('#call-modal'))) throw new Error(`no call plate (${ok})`); },
  settings: async (p) => { await p.goto(dev('&dlg=settings'), { waitUntil: 'load' }); await settle(p, 1100); },
  recruit: async (p) => { await p.goto(dev('&dlg=recruit'), { waitUntil: 'load' }); await settle(p, 1100); },
  raise: async (p) => { await p.goto(dev('&dlg=raise&view=market'), { waitUntil: 'load' }); await settle(p, 1100); },
  help: async (p) => { await p.goto(dev('&help'), { waitUntil: 'load' }); await settle(p, 1100); },
  aria: async (p) => { await p.goto(dev('&aria'), { waitUntil: 'load' }); await settle(p, 1100); },
  mail: async (p) => { await view(p, 'desk'); await p.click('[data-act="open-mail"]').catch(() => {}); await settle(p, 600); },
  contacts: async (p) => { await view(p, 'desk'); await p.click('[data-act="open-contacts"]').catch(() => {}); await settle(p, 600); },
  act: async (p) => { await view(p, 'desk'); await p.evaluate(async () => (await import('/src/ui/modal.js')).showActTransition(2, () => {})); await settle(p, 2600); },
  brief: async (p) => { await p.goto(dev('&brief'), { waitUntil: 'load' }); await settle(p, 1400); },
  ending: async (p) => { await p.goto(dev('&end=steward'), { waitUntil: 'load' }); await settle(p, 2600); },
  tutorial: async (p) => { await p.goto(dev('&tut=first_light&tstep=2').replace('&notut=1', ''), { waitUntil: 'load' }); await settle(p, 1300); },
  toast: async (p) => { await view(p, 'desk'); await p.evaluate(async () => { const T = await import('/src/ui/toast.js');
      T.toast({ icon: '◈', title: 'Shipped **Search**', sub: 'Users noticed immediately.', kind: 'good', ms: 9000 });
      T.toast({ icon: '$', title: 'Not enough cash.', kind: 'bad', ms: 9000 }); }); await settle(p, 500); },
};

const browser = await pw.chromium.launch();
const summary = {};
let problems = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e.message)));
  await p.goto(`${BASE}/?dev=1&notut=1&pause=1`, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });

  console.log(`\n── the phone · ${W}×${H} ──`);
  for (const [name, go] of Object.entries(SCREENS)) {
    if (ONLY && !ONLY.has(name)) continue;
    const before = errors.length;
    try { await go(p); } catch (e) { console.log(`  ${name.padEnd(14)} ✗ could not open: ${e.message}`); problems++; continue; }
    const shot = path.join(OUT, `${name}.png`);
    await p.screenshot({ path: shot });
    const a = await p.evaluate(AUDIT);
    summary[name] = a;
    const bad = [];
    if (a.pageX > 1) bad.push(`page scrolls sideways by ${a.pageX}px`);
    if (a.panes.length) bad.push(...a.panes);
    if (a.clipped.length) bad.push(`clipped: ${a.clipped.join(' | ')}`);
    if (a.cut.length) bad.push(`cut: ${a.cut.join(' | ')}`);
    if (a.eaters.length) bad.push(`page-eater: ${a.eaters.join(', ')}`);
    const soft = [];
    if (a.smallN) soft.push(`${a.smallN} small target(s): ${a.small.join(' | ')}`);
    if (a.tinyN) soft.push(`${a.tinyN} tiny text: ${a.tiny.join(' | ')}`);
    const errs = errors.slice(before);
    if (errs.length) bad.push(`${errs.length} console error(s): ${errs[0].slice(0, 90)}`);
    problems += bad.length;
    console.log(`  ${name.padEnd(14)} ${bad.length ? '✗' : '✓'}${bad.length ? '\n     ' + bad.join('\n     ') : ''}${soft.length ? '\n     · ' + soft.join('\n     · ') : ''}`);
  }
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(summary, null, 1));
console.log(problems ? `\n${problems} problem(s) — look at ${OUT}` : `\nnothing wrong at ${W}×${H} — ${OUT}`);
process.exit(problems ? 1 : 0);
