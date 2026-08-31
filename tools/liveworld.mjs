// ─────────────────────────────────────────────────────────────────────────────
// THE WHOLE THING, IN A REAL BROWSER
//
// Every other harness here runs headlessly, which means the entire visual half
// of this project — the card, the console, the plug, the form the founder signs
// — has never actually been looked at by anything. `tools/shot.mjs` looks at
// the game; this looks at the game *with a world playing against it*.
//
// A ModelContext is injected before the app boots, so the page takes exactly
// the path it takes in the ChatGPT desktop browser: it detects the API, mints
// its surface, and everything below drives it through `executeTool` the way an
// assistant would. Then it screenshots each beat.
//
//   PLAYWRIGHT=/tmp/pw/node_modules/playwright/index.js node tools/liveworld.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.SHOT_OUT || '/tmp/shots';
const PORT = Number(process.env.PORT || 5198);
const BASE = `http://localhost:${PORT}`;
const ROUTE = (process.env.ROUTE || '/').replace(/\/?$/, '/');
const WIDTH = Number(process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.HEIGHT || 900);

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

fs.mkdirSync(OUT, { recursive: true });
// The dev server puts up two listeners — the game, and the rival on the next
// port — and the second one is what this whole cross-origin section is about.
// Wait for both to actually answer rather than for a guess at how long that takes.
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
  // Say so rather than run anyway. A stale server left listening on one of
  // these ports by an earlier run serves an older copy of the repo, and the
  // cross-origin section then fails for a reason that has nothing to do with
  // the code — which cost an hour to work out once already.
  console.log(`\n  the servers did not come up: game=${ready[0]} rival=${ready[1]}`);
  console.log(`  something else may be listening on ${PORT} or ${PORT + 1} — try:`);
  console.log(`    lsof -nP -iTCP:${PORT} -iTCP:${PORT + 1} -sTCP:LISTEN -t | xargs kill\n`);
  server.kill();
  process.exit(1);
}

let fails = 0;
const ok = (name, cond, detail) => {
  if (cond) { console.log('  ✓ ' + name); return true; }
  fails++; console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`); return false;
};

// The fake ModelContext, as an init script so it exists before any module runs.
const INJECT = `
(() => {
  // A ModelContext that spans frames, because that is the part being tested.
  //
  // The browser shares registrations between a page and an <iframe allow="tools">
  // on another origin; page JavaScript cannot, because window.top is opaque
  // across origins. So the child announces what it registers to the parent over
  // postMessage, and the parent proxies executions back the same way. The shape
  // an application sees — getTools({fromOrigins}) returning another origin's
  // tools, executeTool calling them — is the real one.
  const isTop = (() => { try { return window.top === window; } catch { return false; } })();
  const local = new Map();     // registered by THIS frame
  const remote = new Map();    // announced by a child frame
  const log = [];
  let callSeq = 0;
  const pending = new Map();

  function post(target, msg) { try { target.postMessage({ __mcp: true, ...msg }, '*'); } catch {} }

  window.addEventListener('message', async (e) => {
    const m = e.data;
    if (!m || m.__mcp !== true) return;
    if (m.kind === 'announce' && isTop) {
      for (const t of m.tools) remote.set(t.name, { ...t, __origin: m.origin, __source: e.source });
      mc.dispatchEvent(new Event('toolchange'));
    } else if (m.kind === 'invoke' && local.has(m.name)) {
      let out;
      try { out = await local.get(m.name).execute(m.input || {}, { signal: new AbortController().signal }); }
      catch (err) { out = { status: 'error', message: String(err && err.message) }; }
      post(e.source, { kind: 'result', id: m.id, json: JSON.stringify(out) });
    } else if (m.kind === 'result' && pending.has(m.id)) {
      pending.get(m.id)(m.json); pending.delete(m.id);
    }
  });

  class MC extends EventTarget {
    registerTool(tool, options = {}) {
      if (local.has(tool.name)) return Promise.reject(Object.assign(new Error('dup'), { name: 'InvalidStateError' }));
      local.set(tool.name, tool);
      this.dispatchEvent(new Event('toolchange'));
      // Tell the embedder what this origin publishes, and to whom.
      if (!isTop) {
        post(window.parent, { kind: 'announce', origin: location.origin,
          tools: [{ name: tool.name, title: tool.title, description: tool.description,
                    inputSchema: tool.inputSchema, annotations: tool.annotations || {},
                    exposedTo: options.exposedTo || null }] });
      }
      return new Promise((resolve, reject) => {
        const sig = options.signal;
        if (sig) {
          if (sig.aborted) { local.delete(tool.name); return reject(Object.assign(new Error('abort'), { name: 'AbortError' })); }
          sig.addEventListener('abort', () => {
            local.delete(tool.name);
            this.dispatchEvent(new Event('toolchange'));
            reject(Object.assign(new Error('abort'), { name: 'AbortError' }));
          }, { once: true });
        } else resolve();
      });
    }
    getTools(options = {}) {
      const from = options.fromOrigins;
      const mine = [...local.values()].map((t) => ({ ...t, origin: location.origin }));
      // Another origin's tools are visible only if it exposed them to us.
      const theirs = [...remote.values()]
        .filter((t) => !t.exposedTo || t.exposedTo.includes(location.origin))
        .map((t) => ({ ...t, origin: t.__origin }));
      const all = mine.concat(theirs);
      return Promise.resolve(from ? all.filter((t) => from.includes(t.origin)) : all);
    }
    async executeTool(tool, input = {}, options = {}) {
      const name = tool && tool.name ? tool.name : tool;
      if (local.has(name)) {
        const r = await local.get(name).execute(input, { signal: options.signal || new AbortController().signal });
        const json = JSON.stringify(r);
        log.push({ name, length: json.length });
        return json;
      }
      const far = remote.get(name);
      if (!far) throw new Error('no such tool: ' + name);
      const id = ++callSeq;
      const json = await new Promise((resolve, reject) => {
        pending.set(id, resolve);
        post(far.__source, { kind: 'invoke', id, name, input });
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 4000);
      });
      log.push({ name, length: json.length, origin: far.__origin });
      return json;
    }
  }
  const mc = new MC();
  Object.defineProperty(document, 'modelContext', { value: mc, configurable: true });
  window.__mcp = {
    names: () => [...local.keys()].sort(),
    remote: () => [...remote.keys()].sort(),
    count: () => local.size,
    log: () => log.slice(),
    call: async (name, input, ms) => {
      const ac = new AbortController();
      if (ms != null) setTimeout(() => ac.abort(), ms);
      const raw = await mc.executeTool({ name }, input, { signal: ac.signal });
      try { return JSON.parse(raw); } catch { return { status: 'UNPARSEABLE', raw }; }
    },
    schema: (name) => local.get(name)?.inputSchema,
    title: (name) => local.get(name)?.title,
    description: (name) => local.get(name)?.description,
  };
})();
`;

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
await ctx.addInitScript(INJECT);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e.message)));

// The written deck keeps playing throughout, which is the point of it — so
// anything that needs to click on the console has to get the card off the glass
// first, the way a person would.
const clearCard = async () => {
  for (let i = 0; i < 6; i++) {
    if (!(await page.$('#event-modal'))) return true;
    await page.evaluate(() => {
      document.querySelector('#event-choices .choice:not(.choice-free)')?.click();
    });
    await page.waitForTimeout(280);
    await page.evaluate(() => document.getElementById('event-continue')?.click());
    await page.waitForTimeout(280);
  }
  return !(await page.$('#event-modal'));
};

const shoot = async (name) => {
  await page.waitForTimeout(280);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log(`    → ${name}.png`);
};

try {
  await page.goto(`${BASE}${ROUTE}?notut=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`${BASE}${ROUTE}?notut=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  console.log('\n── the opening ──');
  for (let i = 0; i < 10; i++) {
    const btn = await page.$('[data-act="start-game"], [data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"], [data-act="new-game"]');
    if (!btn) break;
    const action = await btn.getAttribute('data-act');
    await btn.click().catch(() => {});
    await page.waitForTimeout(340);
    // start-game is asynchronous while the curtain plays. Clicking it again
    // used to create overlapping runs that could deal the opening deck card
    // before this test reached the tool surface.
    if (action === 'start-game') break;
  }
  await page.waitForTimeout(1400);
  ok('the game is on screen', !!(await page.$('#world-console')));

  console.log('\n── the surface exists in a real browser ──');
  const names = await page.evaluate(() => window.__mcp.names());
  ok('tools were registered', names.length >= 7, names.join(','));
  ok('briefing is among them', names.includes('briefing'), names.join(','));
  const titled = await page.evaluate((ns) => ns.every((n) => !!window.__mcp.title(n)), names);
  ok('every one has a title', titled);
  console.log(`    ${names.length} tools: ${names.join(', ')}`);

  // Choosing the assistant during setup now ends onboarding with an explicit
  // handoff. The page cannot initiate a chat turn, so it holds the clock until
  // the first real WebMCP call arrives (or the founder chooses the deck).
  for (let i = 0; i < 60 && !(await page.$('.assistant-handoff')); i++) {
    await page.waitForTimeout(120);
  }
  const handoffBefore = await page.evaluate(() => ({
    shown: !!document.querySelector('.assistant-handoff'),
    day: window.S.time.day,
    hold: window.S.modalBlocking,
    done: window.S.meta.assistantHandoffDone,
    copy: document.querySelector('.assistant-handoff')?.textContent || '',
  }));
  ok('the assistant handoff is the final onboarding beat', handoffBefore.shown);
  ok('it gives the founder the opening line', /play the world/i.test(handoffBefore.copy));
  ok('and explicitly holds the clock', handoffBefore.hold === 'assistant-handoff', String(handoffBefore.hold));
  await page.waitForTimeout(700);
  const heldDay = await page.evaluate(() => window.S.time.day);
  ok('the company does not age while the chat is waiting',
     Math.abs(heldDay - handoffBefore.day) < 0.001,
     `${handoffBefore.day.toFixed(3)} → ${heldDay.toFixed(3)}`);
  await shoot('world-01-booted');

  console.log('\n── briefing, through executeTool ──');
  const brief = await page.evaluate(() => window.__mcp.call('briefing', {}));
  ok('it answers', brief.status === 'ok', JSON.stringify(brief).slice(0, 160));
  ok('and fits the platform cap', JSON.stringify(brief).length <= 1500, `${JSON.stringify(brief).length} chars`);
  await page.waitForTimeout(1450);
  const handoffAfter = await page.evaluate(() => ({
    shown: !!document.querySelector('.assistant-handoff'),
    hold: window.S.modalBlocking,
    done: window.S.meta.assistantHandoffDone,
    mode: window.__status().mode,
  }));
  ok('the first valid call completes the handoff',
     handoffAfter.done && handoffAfter.mode === 'agent', JSON.stringify(handoffAfter));
  ok('the handoff releases the glass and its clock hold',
     !handoffAfter.shown && !handoffAfter.hold, JSON.stringify(handoffAfter));

  console.log('\n── the world writes a card, and it is on the glass ──');
  const wrote = await page.evaluate(() => window.__mcp.call('write_event', {
    title: 'The forum thread', kind: 'story',
    body: 'Somebody has posted a teardown of your onboarding. It is 900 words and it is right about six of them.',
    choices: [
      { label: 'Reply with the fix and the timeline', tone: 'good', sub: 'Costs an evening',
        outcome: 'You answer in the thread with the actual cause. Two people say they had the same problem.',
        effects: { rep: 8, focus: -4 } },
      { label: 'Leave it and keep shipping', tone: 'neutral', sub: 'Nothing burns down',
        outcome: 'It scrolls off the front page by Thursday. Somebody screenshots it anyway.',
        effects: { code: 6 } },
    ],
  }));
  ok('the card is accepted', wrote.status === 'ok', JSON.stringify(wrote).slice(0, 200));
  await page.waitForTimeout(700);
  const card = await page.evaluate(() => {
    const el = document.querySelector('#event-modal .modal');
    if (!el) return null;
    return {
      title: document.querySelector('.event-title')?.textContent || '',
      choices: document.querySelectorAll('#event-choices .choice:not(.choice-free)').length,
      freeForm: !!document.querySelector('form.own-words-form'),
      textarea: !!document.querySelector('.own-words-textarea'),
      sendDisabled: document.querySelector('.own-words-send')?.disabled,
      visible: el.getBoundingClientRect().height > 100,
    };
  });
  ok('the card modal is rendered', !!card, 'no #event-modal on screen');
  ok('with its title', card?.title?.includes('forum'), card?.title);
  ok('and both choices', card?.choices === 2, String(card?.choices));
  ok('and a real free-form route on the card', !!card?.freeForm && !!card?.textarea);
  ok('whose send button waits for an actual move', card?.sendDisabled === true);
  await shoot('world-02-card');

  console.log('\n── answering in your own words ──');
  await page.evaluate(() => { window.__founderWait = window.__mcp.call('wait_for_world'); });
  await page.waitForTimeout(60);
  const founderMove = 'I call the author and invite them to test the fix beside me.';
  await page.fill('.own-words-textarea', founderMove);
  ok('typing enables Send to world', !(await page.$eval('.own-words-send', (el) => el.disabled)));
  await page.click('.own-words-send');
  // Something may have been queued before the wait opened — an objective
  // completing, a milestone — and it is delivered first, as it should be. The
  // assistant re-calls, as every result tells it to, and the typed move is
  // what comes next: the founder's words wait on the card until it does.
  let heard = await page.evaluate(() => window.__founderWait);
  for (let i = 0; i < 6 && heard?.status !== 'founder_said'; i++) {
    heard = await page.evaluate(() => window.__mcp.call('wait_for_world'));
  }
  ok('the waiting world receives the move', heard.status === 'founder_said', JSON.stringify(heard).slice(0, 180));
  ok('word for word', heard.founder_words === founderMove, heard.founder_words);
  ok('the card becomes a live waiting state', await page.$('.own-words-pending'));

  // The typed move reshapes answer_in_own_words — its schema now names the
  // submission — and a call that lands while the registry is swapping it is
  // told, by design, to call again. Do what the result says, once or twice.
  let proposed = null;
  for (let i = 0; i < 4; i++) {
    proposed = await page.evaluate((submissionId) => window.__mcp.call('answer_in_own_words', {
      submission_id: submissionId,
      outcome: 'You reply at 2am with a numbered list of your own. The author edits their post to link it.',
      tone: 'risky', effects: { rep: 5, focus: -6 },
    }), heard.submission_id);
    if (!(proposed?.status === 'refused' && proposed?.rule === 'stale' && /replaced/.test(proposed?.next || ''))) break;
    await page.waitForTimeout(150);
  }
  ok('it needs a human hand', proposed.status === 'needs_human', JSON.stringify(proposed).slice(0, 180));
  await page.waitForTimeout(600);
  const prop = await page.evaluate(() => ({
    shown: !!document.querySelector('.proposal'),
    form: !!document.querySelector('form.proposal-form'),
    toolname: document.querySelector('form.proposal-form')?.getAttribute('toolname') || null,
    autosubmit: document.querySelector('form.proposal-form')?.hasAttribute('toolautosubmit'),
    accept: document.querySelector('.proposal-form button[type="submit"]')?.textContent?.trim(),
  }));
  ok('the proposal is on the card', prop.shown);
  ok('as a real form', prop.form);
  ok('declared as a tool', prop.toolname === 'accept_outcome', String(prop.toolname));
  ok('with NO toolautosubmit — the human presses it', prop.autosubmit === false);
  ok('and the button says Accept', prop.accept === 'Accept', String(prop.accept));
  await shoot('world-03-proposal');

  const repBefore = await page.evaluate(() => window.S.resources.reputation);
  await page.click('.proposal-form button[type="submit"]');
  await page.waitForTimeout(700);
  const repAfter = await page.evaluate(() => window.S.resources.reputation);
  ok('accepting applies it', repAfter > repBefore, `${repBefore} → ${repAfter}`);
  await shoot('world-04-accepted');

  console.log('\n── the founder dismisses it, and the clock is theirs again ──');
  await page.click('#event-continue');
  await page.waitForTimeout(500);
  await clearCard();
  ok('the card is gone', !(await page.$('#event-modal')));
  ok('and nothing is holding the clock',
     await page.evaluate(() => !window.S.narrative.activeEvent));

  console.log('\n── the console shows what happened ──');
  const console_ = await page.evaluate(() => ({
    calls: document.querySelectorAll('.wc-call').length,
    hasBytes: !!document.querySelector('.wc-bytes i'),
    status: document.querySelector('.wc-label')?.textContent,
    plug: document.querySelector('[data-act="mute-world"]')?.textContent?.trim(),
  }));
  ok('calls are listed', console_.calls >= 3, String(console_.calls));
  ok('with what each one weighed', console_.hasBytes);
  ok('the status reads as live', /PLAYING|ON DUTY/.test(console_.status || ''), console_.status);
  ok('and the plug is there', console_.plug === 'MUTE THE WORLD', String(console_.plug));

  console.log('\n── a refusal, on screen ──');
  const refused = await page.evaluate(() => window.__mcp.call('write_event', {
    title: 'Everything at once', kind: 'crisis',
    body: 'A number arrives that would end this, on a Tuesday, at 11pm.',
    choices: [
      { label: 'Take all of it', tone: 'cruel', outcome: 'You sign.', effects: { cash: -99999999 } },
      { label: 'Refuse', tone: 'neutral', outcome: 'You do not.', effects: { focus: -2 } },
    ],
  }));
  ok('the rules refuse it', refused.status === 'refused', JSON.stringify(refused).slice(0, 200));
  ok('with a rule', typeof refused.rule === 'string');
  ok('and something to do next', typeof refused.next === 'string' && refused.next.length > 12);
  await page.waitForTimeout(500);
  const marked = await page.evaluate(() =>
    !!document.querySelector('.wc-call.refused'));
  ok('and the console marks it', marked);
  await shoot('world-05-refused');

  console.log('\n── another origin, publishing to this one ──');
  // getTools({fromOrigins}) + executeTool across an <iframe allow="tools">.
  // The rival runs its own page on its own port — two ports on localhost are
  // two origins — registers there, and exposes only to this origin.
  const partner = await page.evaluate(() => {
    const st = window.__status ? window.__status() : null;
    return {
      frame: !!document.querySelector('iframe.partner-frame'),
      allow: document.querySelector('iframe.partner-frame')?.getAttribute('allow'),
      src: document.querySelector('iframe.partner-frame')?.getAttribute('src') || '',
      panel: !!document.querySelector('.wc-partner'),
      names: [...document.querySelectorAll('.wc-partner .wc-tools span')].map((s) => s.textContent),
    };
  });
  ok('the rival is embedded', partner.frame);
  ok('with allow="tools" — the default allowlist is self, and it is not self',
     partner.allow === 'tools', String(partner.allow));
  ok('on a different origin', (() => {
    try { return new URL(partner.src, BASE).origin !== new URL(BASE).origin; } catch { return false; }
  })(), partner.src);
  if (!partner.panel || partner.names.length < 2) {
    // Discovery polls for a few seconds after boot; give it the time it asks for.
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(300);
      const again = await page.evaluate(() => ({
        panel: !!document.querySelector('.wc-partner'),
        names: [...document.querySelectorAll('.wc-partner .wc-tools span')].map((s) => s.textContent),
      }));
      if (again.panel && again.names.length >= 2) { partner.panel = true; partner.names = again.names; break; }
    }
  }
  if (!partner.panel) {
    console.log('    frames:', page.frames().map((f) => f.url().slice(0, 70)).join(' | '));
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      try {
        const info = await f.evaluate(() => ({ href: location.href, hasMC: !!document.modelContext,
          local: window.__mcp ? window.__mcp.names() : null,
          status: document.getElementById('status')?.textContent }));
        console.log('    child:', JSON.stringify(info));
      } catch (e) { console.log('    child eval failed:', String(e.message).slice(0, 110)); }
    }
  }
  ok('and this page discovered what it publishes', partner.panel && partner.names.length >= 2,
     'panel=' + partner.panel + ' names=[' + partner.names.join(',') + '] remote='
     + JSON.stringify(await page.evaluate(() => (window.__mcp && window.__mcp.remote) ? window.__mcp.remote() : 'no handle'))
     + ' status=' + JSON.stringify(await page.evaluate(() => { try { return window.__status().partner; } catch (e) { return 'ERR'; } })));
  console.log(`    from ${new URL(partner.src, BASE).origin}: ${partner.names.join(', ')}`);
  await shoot('world-11-second-origin');

  // Call across the boundary, and catch what comes back.
  const press = await page.evaluate(async () => {
    const P = window.__partners;
    if (!P) return { status: 'no-handle' };
    return P.readPress('weights', { quiet: true });
  });
  ok('a call across the origin boundary comes back', press.status === 'ok', JSON.stringify(press).slice(0, 160));
  ok('and the page notices what is in it', press.flagged === true,
     'the injected release was not flagged');
  console.log(`    read "${press.title}" — flagged: ${press.flagged}`);

  console.log('\n── staying on duty does not freeze the game ──');
  // `wait_for_world` is the one tool that must NOT hold the mutex: the founder
  // keeps playing while it is pending, and the clock keeps running. If this is
  // wrong the page appears to hang for a minute at a time and nobody would ever
  // find out from a headless test.
  await page.evaluate(() => { window.S.settings.speed = 4; window.S.settings.paused = false; });
  // A priority card is legal from day 0.12 and opens the moment its real-time
  // floor passes; if that lands inside the window below, the clock stops for
  // a card and the check misreads it as a frozen clock. Restart the floor.
  const waitStart = await page.evaluate(() => { window.S.narrative.lastEventReal = Date.now(); return window.S.time.day; });
  // Everything the founder did above — the Accept, the button on the second
  // card — was queued for the world, and a wait opened now would be answered
  // with it at once, correctly. This step is about a wait with nothing to
  // say; an assistant that had been on duty would have read all of it.
  const pending = await page.evaluate(() => {
    window.S.world.author.inbox.length = 0;
    window.S.world.author.routinePending = null;
    window.__waitDone = null;
    window.__mcp.call('wait_for_world', {}).then((r) => { window.__waitDone = r; });
    return true;
  });
  ok('the wait is open', pending);
  await page.waitForTimeout(2500);
  const during = await page.evaluate(() => ({
    day: window.S.time.day,
    done: window.__waitDone,
    status: document.querySelector('.wc-label')?.textContent,
    clickable: !!document.querySelector('[data-act="do"][data-v="code"]'),
  }));
  ok('the clock kept running while it waited', during.day > waitStart,
     `${waitStart.toFixed(1)} → ${during.day.toFixed(1)}`);
  // Meaningful play wakes the wait — an objective completing on its own at 4×
  // counts — so the wait is either still open or back with the founder's own
  // play in hand. What it may never be is cancelled, muted, or an error.
  const FOUNDER = ['company_changed', 'founder_acted', 'founder_activity', 'founder_chose', 'founder_accepted'];
  ok('it is pending, or returned for the founder\'s own play',
     during.done === null || FOUNDER.includes(during.done?.status), JSON.stringify(during.done));
  ok('and the console says so', during.done === null ? during.status === 'ON DUTY' : during.status === 'PLAYING',
     String(during.status));
  ok('and the founder can still act', during.clickable);
  // The founder does something, which is the point. Time was running at 4x, so
  // stop the clock first or the written deck keeps putting cards up faster than
  // this can answer them — and then answer whatever is on screen, the way a
  // person would. A card answered while the world is on duty comes back
  // through the wait; with no card to answer, the wait stays open.
  await page.evaluate(() => { window.S.settings.paused = true; });
  const hadCard = await page.evaluate(() => !!window.S.narrative.activeEvent);
  if (during.done !== null) {
    await page.evaluate(() => {
      window.__waitDone = null;
      window.__mcp.call('wait_for_world', {}).then((r) => { window.__waitDone = r; });
    });
  }
  await clearCard();
  await page.waitForTimeout(120);
  const afterCard = await page.evaluate(() => window.__waitDone);
  ok(hadCard ? 'the answered card came back through the wait' : 'with nothing to answer, the wait stayed open',
     hadCard ? afterCard?.status === 'founder_chose' : afterCard === null, JSON.stringify(afterCard));
  const code0 = await page.evaluate(() => window.S.resources.code);
  await page.click('[data-act="do"][data-v="code"]');
  await page.waitForTimeout(400);
  ok('and the founder\'s own hands still work', await page.evaluate((c) => window.S.resources.code > c, code0));
  await shoot('world-10-on-duty');

  console.log('\n── the scripted world, through getTools and executeTool ──');
  // The half of the API almost nobody uses. This does not reach into the
  // registry: it discovers the surface and calls it by name, and in a browser
  // with no agent in it, it is the only way any of this can be seen at all.
  const seenBeats = [];
  await page.exposeFunction('__beat', (b) => seenBeats.push(b));
  await page.evaluate(() => {
    window.__discovered = 0;
    const real = document.modelContext.getTools.bind(document.modelContext);
    document.modelContext.getTools = (...a) => { window.__discovered++; return real(...a); };
  });
  // Hold the clock and stand down the two rate rules this test keeps tripping:
  // the script's card is refused if the written deck already has one open, and
  // cards also answer to a real-time floor of 26 seconds so that running at 5x
  // cannot turn the game into a slideshow of modals. This test writes them far
  // faster than a person ever would. What is under test here is the
  // getTools/executeTool round trip, not the floor.
  await page.evaluate(() => { window.S.settings.paused = true; });
  await clearCard();
  await page.evaluate(() => {
    window.S.world.author.recent.cardDays = [];
    window.S.narrative.lastEventReal = 0;
    // Zeroing the floor lets the deck's own opening card through as well, and
    // it raced the script's card for the screen. Make it ineligible instead:
    // its `when` checks this flag, and nothing else in the deck is due.
    window.S.narrative.flags.opened = true;
    window.S.narrative.nextEventDay = window.S.time.day + 5000;
    window.S.settings.paused = false;
  });
  let runBtn = await page.$('[data-act="demo-run"]');
  let demoDialog = false;
  // At the in-app browser's narrow width the rail is intentionally hidden.
  // Open the same World console from the topbar, just as a player does.
  if (runBtn && !(await runBtn.isVisible())) {
    await page.click('[data-act="author-dialog"]');
    await page.waitForTimeout(350);
    runBtn = await page.$('.world-console.in-dialog [data-act="demo-run"]');
    demoDialog = true;
  }
  ok('the button is there', !!runBtn);
  if (runBtn) {
    await runBtn.click();
    await page.waitForTimeout(4200);
    const mid = await page.evaluate(() => ({
      discovered: window.__discovered,
      line: document.querySelector('.wc-demo-say')?.textContent || '',
      calls: window.__mcp.log().map((c) => c.name),
    }));
    ok('it discovered the surface with getTools()', mid.discovered > 0, String(mid.discovered));
    ok('and it is saying what it is doing', mid.line.length > 4, mid.line);
    ok('and calls are landing', mid.calls.length >= 2, mid.calls.join(','));
    console.log(`    said: "${mid.line}"`);
    await shoot('world-08-scripted');

    // It writes a card and then waits for the founder, which is the beat.
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);
      if (await page.$('#event-modal')) break;
    }
    const scriptCard = await page.evaluate(() => window.S.narrative.activeEvent
      ? { title: window.S.narrative.activeEvent.title, written: !!window.S.narrative.activeEvent.runtime }
      : null);
    ok('the script put a card in front of the founder', !!scriptCard,
       'calls so far: ' + (await page.evaluate(() => window.__mcp.log().map((c) => c.name).join(','))));
    if (scriptCard) ok('and the world wrote it, not the deck', scriptCard.written, scriptCard.title);
    await shoot('world-09-scripted-card');
    await page.evaluate(() => document.querySelector('#event-choices .choice:not(.choice-free)')?.click());
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('event-continue')?.click());
    await page.waitForTimeout(1800);
    await page.evaluate(() => document.querySelector('[data-act="demo-stop"]')?.click());
    await page.waitForTimeout(400);
    ok('and it can be stopped', !(await page.$('[data-act="demo-stop"]')));
    if (demoDialog) {
      await page.evaluate(() => document.querySelector('#generic-modal [data-dlg]')?.click());
      await page.waitForTimeout(300);
    }
  }
  await page.evaluate(() => { window.S.settings.paused = true; });
  ok('the glass is clear for the next beat', await clearCard());

  console.log('\n── the plug ──');
  await clearCard();
  const before = await page.evaluate(() => window.__mcp.count());
  await page.evaluate(() => { window.S.settings.confirmBigMoves = false; });

  // Below 1120px the Wire rail is display:none and the plug goes with it — and
  // the browser this game is meant to be played in is a ~760px pane. The way
  // through is the topbar readout, which opens the same panel in a dialog. Take
  // the route a person at this width would actually have to take.
  const plugVisible = await page.isVisible('[data-act="mute-world"]').catch(() => false);
  if (!plugVisible) {
    ok('the topbar readout is the way in at this width',
       await page.isVisible('[data-act="author-dialog"]'));
    await page.click('[data-act="author-dialog"]');
    await page.waitForTimeout(400);
    await shoot('world-06a-dialog');
    ok('and it opens the same console', await page.isVisible('.world-console.in-dialog'));
  }
  // Two elements carry this action at narrow widths — the hidden one in the
  // rail and the live one in the dialog. Click the one a person can see.
  await page.click(plugVisible
    ? '#world-console [data-act="mute-world"]'
    : '.world-console.in-dialog [data-act="mute-world"]');
  await page.waitForTimeout(900);
  // Close the dialog if that is how we got here.
  await page.evaluate(() => document.querySelector('#generic-modal [data-dlg]')?.click());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__mcp.count());
  ok('every tool is revoked', after === 0, `${before} → ${after}`);
  const muted = await page.evaluate(() => ({
    label: document.querySelector('#world-console .wc-label')?.textContent
        || document.querySelector('.wc-label')?.textContent,
    back: document.querySelector('[data-act="unmute-world"]')?.textContent?.trim(),
    chip: document.querySelector('.tb-world')?.className || '',
  }));
  ok('and the topbar readout says muted too', /muted/.test(muted.chip), muted.chip);
  ok('the console says so', muted.label === 'MUTED', String(muted.label));
  ok('and offers it back', muted.back === 'UNMUTE THE WORLD', String(muted.back));
  await shoot('world-06-muted');

  console.log('\n── and the written world carries on ──');
  // The beat this whole project rests on: with every tool revoked, the game
  // does not stop, it reverts. The deck takes the next slot and plays an
  // authored card — one with no `runtime` on it, because nothing wrote it here.
  await page.evaluate(() => {
    window.S.settings.speed = 4;
    window.S.settings.paused = false;
    // This test has burned through the opening cards faster than a person would
    // and every one of them is on cooldown. Clear them so the deck has
    // something legal to draw inside a ten-second window.
    window.S.narrative.cooldowns = {};
    window.S.narrative.nextEventDay = window.S.time.day + 0.4;
    window.S.narrative.lastEventReal = 0;      // the real-time floor, again
  });
  const day0 = await page.evaluate(() => window.S.time.day);
  let moved = false, authored = false;
  for (let i = 0; i < 24 && !(moved && authored); i++) {
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({
      day: window.S.time.day,
      card: window.S.narrative.activeEvent
        ? { title: window.S.narrative.activeEvent.title,
            written: !!window.S.narrative.activeEvent.runtime }
        : null,
    }));
    if (st.day > day0 + 0.2) moved = true;
    if (st.card && !st.card.written) { authored = true; console.log(`    the deck played: "${st.card.title}"`); }
    // Keep playing past it, the way a person would.
    if (st.card) {
      await page.evaluate(() => {
        document.querySelector('#event-choices .choice:not(.choice-free)')?.click();
      });
      await page.waitForTimeout(220);
      await page.evaluate(() => document.getElementById('event-continue')?.click());
    }
  }
  ok('the clock is still running with every tool revoked', moved,
     `day ${day0.toFixed(1)} did not move`);
  ok('and the written deck is playing the world', authored,
     'no authored card in 10s at 4x, from day '
     + (await page.evaluate(() => Math.floor(window.S.time.day))));
  await shoot('world-07-deck-carries-on');
  const stillNone = await page.evaluate(() => window.__mcp.count());
  ok('and nothing quietly re-registered', stillNone === 0, String(stillNone));

  console.log('\n── errors ──');
  ok('no console errors', errors.length === 0,
     errors.slice(0, 3).map((e) => e.slice(0, 120)).join(' | '));
  // ── The other origin, absent ───────────────────────────────────────────────
  // The whole cross-origin layer is optional and the game must not notice when
  // it is not there — not a hang, not a throw, not a missing tool. Two ways of
  // being absent, because they fail differently: a port with nothing listening
  // refuses the connection, and a host that does not resolve does not even get
  // that far.
  console.log('\n── and when the other origin is not there ──');
  for (const [label, q] of [['nothing listening', '&rival=http://localhost:59999'],
                            ['a host that does not resolve', '&rival=http://no-such-host.invalid']]) {
    const c2 = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    await c2.addInitScript(INJECT);
    const p2 = await c2.newPage();
    const errs = [];
    p2.on('pageerror', (e) => errs.push(String(e.message)));
    p2.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|ERR_|Failed to load resource|Origin trial/.test(m.text())) {
        errs.push(m.text());
      }
    });
    const t0 = Date.now();
    await p2.goto(`${BASE}${ROUTE}?notut=1${q}`, { waitUntil: 'networkidle' });
    await p2.evaluate(() => { try { localStorage.clear(); } catch {} });
    await p2.goto(`${BASE}${ROUTE}?notut=1${q}`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 10; i++) {
      const b = await p2.$('[data-act="start-game"], [data-act="beat-next"], [data-act="choose-arch"], [data-act="choose-cat"], [data-act="new-game"]');
      if (!b) break;
      const action = await b.getAttribute('data-act');
      await b.click().catch(() => {});
      await p2.waitForTimeout(320);
      if (action === 'start-game') break;
    }
    for (let i = 0; i < 60 && !(await p2.$('.assistant-handoff')); i++) {
      await p2.waitForTimeout(120);
    }
    console.log(`  · ${label}`);
    ok(`  the game is playable`, !!(await p2.$('#world-console')));
    ok(`  the surface is registered anyway`, (await p2.evaluate(() => window.__mcp.count())) >= 7);
    ok(`  boot did not wait for it`, Date.now() - t0 < 25000, `${Date.now() - t0}ms`);
    ok(`  briefing still answers`, (await p2.evaluate(() => window.__mcp.call('briefing', {}))).status === 'ok');
    await p2.waitForTimeout(1450);
    ok(`  no other origin is claimed`, !(await p2.$('.wc-partner')));
    ok(`  and its tools are not published`,
       !(await p2.evaluate(() => window.__mcp.names())).some((n) => n.includes('rival')));
    await p2.evaluate(() => { window.S.settings.speed = 4; window.S.settings.paused = false; });
    const d0 = await p2.evaluate(() => window.S.time.day);
    await p2.waitForTimeout(1800);
    ok(`  the clock runs`, (await p2.evaluate(() => window.S.time.day)) > d0);
    ok(`  no console errors`, errs.length === 0, errs.slice(0, 2).join(' | ').slice(0, 150));
    await c2.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(fails ? `\n${fails} problem(s) — look at ${OUT}` : `\nthe world plays, in a real browser — ${OUT}`);
process.exit(fails ? 1 : 0);
