// ─────────────────────────────────────────────────────────────────────────────
// THE TITLE, IN THREE BROWSERS
//
// The first screen now carries the headline feature, and what it says depends
// on where it is opened: no site tools, site tools in Chrome, site tools inside
// the ChatGPT desktop browser. Nothing headless can tell those apart, so a real
// browser looks at all three at a desktop height and in the ChatGPT pane, and
// reports whether the kicker and Begin are both on screen without scrolling.
//
// Like tools/shot.mjs this is a look-at-it tool, not a test. Point PLAYWRIGHT at
// an installation outside this repo; it is never a dependency here:
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/titleshot.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const OUT = process.env.SHOT_OUT || '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT || 5211), BASE = `http://localhost:${PORT}`;
const ROUTE = (process.env.ROUTE || '/').replace(/\/?$/, '/');
let chromium;
try {
  const mod = await import(process.env.PLAYWRIGHT
    ? (process.env.PLAYWRIGHT.startsWith('/') ? 'file://' + process.env.PLAYWRIGHT : process.env.PLAYWRIGHT)
    : 'playwright');
  chromium = (mod.chromium ? mod : mod.default).chromium;
} catch {
  console.log('playwright not found. This is a look-at-it tool, not a test:\n'
    + '  PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.mjs node tools/titleshot.mjs');
  process.exit(0);
}
const server = spawn('node', ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const MC = () => {
  // A ModelContext that keeps a registration pending for life, like the real one.
  document.modelContext = {
    _t: new Map(),
    registerTool(t, o) { this._t.set(t.name, t); return new Promise((res, rej) => { o?.signal?.addEventListener('abort', () => { this._t.delete(t.name); rej(Object.assign(new Error('aborted'), { name: 'AbortError' })); }); }); },
    getTools() { return Promise.resolve([...this._t.values()].map((t) => ({ ...t, origin: location.origin }))); },
    executeTool(t, input, opts) { return this._t.get(t.name).execute(input, opts).then((r) => JSON.stringify(r)); },
  };
};
const browser = await chromium.launch();
const modes = [
  { name: 'none', init: null, ua: null },
  { name: 'chrome', init: MC, ua: null },
  { name: 'chatgpt', init: MC, ua: 'CodexBrowser/1.0 Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/151.0 Safari/537.36' },
];
let problems = 0;
try {
  for (const { w, h, tag } of [{ w: 1440, h: 900, tag: 'desktop' }, { w: 760, h: 1000, tag: 'pane' }, { w: 420, h: 900, tag: 'narrow' }]) {
    for (const m of modes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, ...(m.ua ? { userAgent: m.ua } : {}) });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message)));
      page.on('console', (x) => { if (x.type() === 'error') errors.push(x.text()); });
      if (m.init) await page.addInitScript(m.init);
      // First sight: the cold open plays, and a hand clicks through it.
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
      for (let i = 0; i < 14 && !(await page.$('.title-block.in')); i++) {
        await page.mouse.click(w / 2, h / 2).catch(() => {});
        await page.waitForTimeout(260);
      }
      await page.waitForSelector('.title-webmcp', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2600);
      const file = `${OUT}/title-${m.name}-${tag}.png`;
      await page.screenshot({ path: file, fullPage: false });
      const info = await page.evaluate(() => {
        const p = document.querySelector('.title-webmcp'); if (!p) return { missing: true };
        const r = p.getBoundingClientRect();
        const stage = document.querySelector('.stage'); if (stage) stage.scrollTop = 0;
        const kicker = document.querySelector('.title-kicker')?.getBoundingClientRect();
        const begin = document.querySelector('[data-act="new-game"]')?.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width),
                 state: p.querySelector('.wm-state')?.textContent, tier: p.querySelector('.wm-tier')?.textContent,
                 tools: p.querySelectorAll('.wm-tool').length, cta: [...p.querySelectorAll('.wm-cta button')].map((b) => b.textContent.trim()),
                 kickerTop: kicker ? Math.round(kicker.top) : null, beginVisible: !!begin && begin.bottom <= innerHeight,
                 stageScroll: stage ? stage.scrollHeight - stage.clientHeight : null, vh: innerHeight };
      });
      console.log(`${tag} · ${m.name}: ${JSON.stringify(info)} · errors: ${errors.length}`);
      const bad = info.missing || errors.length || info.kickerTop < 0 || !info.beginVisible || info.tools < 6;
      if (bad) { problems++; console.log('   ✗', info.missing ? 'no panel' : !info.beginVisible ? 'Begin is below the fold' : info.kickerTop < 0 ? 'the head is clipped' : errors.slice(0, 2).join(' | ')); }
      // Then the threshold: walk the beats the way a hand would and look at the
      // question — which should exist only where there are site tools.
      await page.click('[data-act="new-game"]').catch(() => {});
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(700);
        if (await page.$('[data-act="start-game"]')) break;
        const next = await page.$('[data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"]');
        if (!next) break;
        await next.click().catch(() => {});
      }
      await page.waitForTimeout(2400);
      await page.screenshot({ path: `${OUT}/threshold-${m.name}-${tag}.png`, fullPage: false });
      const th = await page.evaluate(() => ({
        asks: !!document.querySelector('.assistant-pick'),
        lit: document.querySelector('.ap-opt.on b')?.textContent || null,
        opens: document.querySelector('[data-act="start-game"]')?.textContent.trim() || null,
        quietLink: !!document.querySelector('.assistant-line'),
        startPick: !!document.querySelector('.start-pick'),
      }));
      const shouldAsk = m.name !== 'none';
      console.log(`   threshold: ${JSON.stringify(th)}`);
      if (th.asks !== shouldAsk || !th.opens || !th.startPick) { problems++; console.log('   ✗', !th.startPick ? 'where-it-starts is missing' : shouldAsk ? 'the question is missing' : 'the question was asked where there is nothing to decide'); }
      await ctx.close();
    }
  }
  // Seen it: a returning player gets the brief panel.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(MC);
    await page.addInitScript(() => { try { localStorage.setItem('singularity_inc_legacy_v1', JSON.stringify({ points: 0, spent: 0, perks: {}, runs: 1, bestValuation: 0, bestAct: 1, unlockedArchetypes: ['hacker'], endings: {}, totalDays: 0, log: [] })); } catch {} });
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.title-webmcp', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/title-brief-desktop.png`, fullPage: false });
    const b = await page.evaluate(() => ({ brief: !!document.querySelector('.title-webmcp.brief'), tools: document.querySelectorAll('.wm-tool').length,
                                          doors: [...document.querySelectorAll('.wm-cta button')].map((x) => x.textContent.trim()) }));
    console.log(`brief (seen it): ${JSON.stringify(b)}`);
    if (!b.brief || b.tools) { problems++; console.log('   ✗ the panel did not step back'); }
    await ctx.close();
  }
  // And the quick tour, chosen where it makes sense: after the four setup
  // beats, at the threshold, before the curtain and Act III on the other side.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, userAgent: modes[2].ua });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    await page.addInitScript(MC);
    await page.addInitScript(() => { try { localStorage.setItem('singularity_inc_legacy_v1', JSON.stringify({ points: 0, spent: 0, perks: {}, runs: 1, bestValuation: 0, bestAct: 1, unlockedArchetypes: ['hacker'], endings: {}, totalDays: 0, log: [] })); } catch {} });
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-act="new-game"]', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.click('[data-act="new-game"]');
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(700);
      if (await page.$('[data-act="start-game"]')) break;
      const next = await page.$('[data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"]');
      if (!next) break;
      await next.click().catch(() => {});
    }
    await page.waitForTimeout(2000);
    await page.click('[data-act="pick-start"][data-v="act3"]');
    const lit = await page.evaluate(() => document.querySelector('.start-pick .start-opt.on')?.textContent.trim().slice(0, 24));
    await page.click('[data-act="start-game"]');
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${OUT}/late-start-desktop.png`, fullPage: false });
    const g = await page.evaluate(() => ({ act: window.S?.company.act, day: Math.floor(window.S?.time.day || 0),
      late: window.S?.settings.lateStart, tools: window.__status?.().count, muted: window.__status?.().muted,
      card: !!window.S?.narrative.activeEvent, tutorial: !!window.S?.meta.tutorial.off }));
    console.log(`late start: lit=${JSON.stringify(lit)} ${JSON.stringify(g)} · errors: ${errors.length}`);
    if (!(g.act >= 3) || g.late !== 'act3' || !(g.tools >= 10) || errors.length) { problems++; console.log('   ✗ the late start did not land in Act III with the hand dealt', errors.slice(0, 2).join(' | ')); }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(problems ? `${problems} problem(s) — look at ${OUT}` : `the title reads right in all three browsers — ${OUT}`);
process.exit(problems ? 1 : 0);
