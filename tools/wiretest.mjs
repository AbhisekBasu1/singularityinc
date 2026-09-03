// ─────────────────────────────────────────────────────────────────────────────
// WIRE TEST — a thread is asked once, a family walks its stages, and no two
// open asks ever share a word.
//
// The Wire's live threads had no memory: a resolved thread went straight back
// into the draw, and one seeded run opened the same twenty-one questions a
// hundred and fifty-one times — the incident post-mortem forty-eight of them,
// because every severe incident asked it by name. This checks the rule that
// replaced that (`askedState` in `systems/feed.js`), the family mechanism the
// incident ask runs on, the seeding an older save gets, and then plays a
// seeded run answering every thread the way a player would and asserts that
// nothing came back. `DAYS=` lengthens the run; the default reaches Act III.
// ─────────────────────────────────────────────────────────────────────────────
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
globalThis.window = { addEventListener() {}, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener() {}, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} }, appendChild(){}, remove(){}, addEventListener(){} }),
  body: { appendChild(){} }, hidden: false };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const Game = await import('../src/game.js');
const Feed = await import('../src/systems/feed.js');
const Mail = await import('../src/systems/mail.js');
const { THREADS, THREAD_MAP } = await import('../src/data/threads.js');
const { LETTERS } = await import('../src/data/mail.js');
const { INCIDENTS: INCB, WIRE } = await import('../src/data/balance.js');
const { on } = await import('../src/engine/bus.js');
const { EVENT_MAP } = await import('../src/data/events.js');
const { makeBot } = await import('./bot.mjs');

let checks = 0, fails = 0;
const ok = (name, cond, detail = '') => { checks++; if (cond) console.log(`  ✓ ${name}`); else { fails++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); } };
const eq = (name, a, b) => ok(name, a === b, `${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
const section = (name, fn) => { console.log(`\n── ${name}`); try { fn(); } catch (e) { fails++; console.log(`  ✗ threw: ${e?.stack || e}`); } };

let seedN = 11;
function fresh({ day = 200, users = 5000, act = 1 } = {}) {
  const s = Game.startNewGame({ founderName: 'Ada Test', companyName: 'Meridian', archetype: 'hacker',
    category: 'devtools', productName: 'Meridian', seed: seedN++ });
  s.time.day = day;
  s.products[0].launched = true;
  s.products[0].users = users;
  s.company.act = act;
  return s;
}
const labelsOf = (S, item) => Feed.threadOptions(S, item).map((o) => o.label);

section('a thread is asked once a run', () => {
  const S = fresh();
  ok('the pool offers a praise thread to a company with users', Feed.eligibleThreads(S).some((t) => t.id === 't_praise'));
  const item = Feed.maybeThread(S, 't_praise');
  ok('it opens by name', !!item && item.thread === 't_praise');
  eq('and is counted', Feed.timesAsked(S, 't_praise'), 1);
  ok('while open it is not offered again', !Feed.eligibleThreads(S).some((t) => t.id === 't_praise'));
  ok('answering it works', !!Feed.resolveThread(S, item.id, 0));
  ok('and once answered it is still not offered', !Feed.eligibleThreads(S).some((t) => t.id === 't_praise'));
  ok('nor opened by name', Feed.maybeThread(S, 't_praise') === null);
  ok('but a different thread still is', !!Feed.maybeThread(S, 't_complaint'));
  ok('the record is in the save, not in module memory', S.wire.asked.t_praise === 1 && S.wire.askedDay.t_praise === 200);
});

section('`until` closes a thread after its act; `act` opens it', () => {
  const early = fresh({ day: 30, users: 80, act: 1 });
  ok('a landing-page typo is a first-act question', Feed.eligibleThreads(early).some((t) => t.id === 't2_coming_son'));
  const late = fresh({ day: 600, users: 80, act: 3 });
  ok('and not a third-act one', !Feed.eligibleThreads(late).some((t) => t.id === 't2_coming_son'));
  ok('a fifth-act question is not offered in the first', !Feed.eligibleThreads(early).some((t) => t.id === 't5_museum'));
  const last = fresh({ day: 1200, users: 1e6, act: 5 });
  ok('and is in the fifth', Feed.eligibleThreads(last).some((t) => t.id === 't5_museum'));
  ok('every thread with `until` starts on or before it', THREADS.every((t) => !t.until || !t.act || t.act <= t.until));
});

section('the incident ask is a family: one stage per outage, each its own question', () => {
  const S = fresh({ day: 300, users: 40000, act: 2 });
  const incident = (day, kind = 'dependency') => {
    S.time.day = day; S.stats.lastIncidentDay = day; S.stats.lastIncident = 'Upstream Outage';
    S.stats.lastIncidentKind = kind; S.world.lastIncidentSeverity = INCB.THREAD_SEVERITY + 0.1;
  };
  const seenText = new Set(), seenLabels = new Set();
  const stages = THREAD_MAP.t_incident_ask.stages.length;
  ok('the family has more than one stage', stages >= 3, String(stages));
  let n = 0;
  for (let i = 0; i < stages; i++) {
    incident(300 + i * 30);
    const item = Feed.maybeThread(S, 't_incident_ask');
    if (!item) { ok(`stage ${i} opens`, false); break; }
    n++;
    eq(`stage ${i} is recorded on the item`, item.stage, i);
    const labels = labelsOf(S, item);
    ok(`stage ${i} has replies`, labels.length >= 2);
    ok(`stage ${i} reads differently from every stage before it`, !seenText.has(item.text), item.text.slice(0, 60));
    ok(`stage ${i} offers replies no stage before it offered`, labels.every((l) => !seenLabels.has(l)), labels.join(' | '));
    seenText.add(item.text); labels.forEach((l) => seenLabels.add(l));
    ok(`a second incident the same day does not open stage ${i + 1}`, Feed.maybeThread(S, 't_incident_ask') === null);
    // The replies an open stage shows survive a save: the stage rides on the
    // item, so a reload does not answer with whichever stage is due next.
    const back = JSON.parse(JSON.stringify(S));
    ok(`stage ${i}'s replies survive a round trip`, labelsOf(back, back.feed.find((f) => f.id === item.id)).join('|') === labels.join('|'));
    Feed.resolveThread(S, item.id, i % labels.length);
  }
  eq('every stage opened once', n, stages);
  incident(300 + stages * 30);
  ok('and the outage after the last stage asks nothing', Feed.maybeThread(S, 't_incident_ask') === null);
  ok('nor is it in the pool', !Feed.eligibleThreads(S).some((t) => t.id === 't_incident_ask'));
  ok('the first stage still names what happened', [...seenText][0].includes('took the thing down'));
});

section('an older save learns what is already on its rail', () => {
  const S = fresh();
  delete S.wire;
  S.feed.unshift({ id: 9001, day: 150, type: 'social', thread: 't_praise', resolved: true, text: 'x' });
  S.feed.unshift({ id: 9002, day: 190, type: 'social', thread: 't_complaint', resolved: false, text: 'y', expires: 300 });
  ok('a thread answered before the record existed is not asked again', !Feed.eligibleThreads(S).some((t) => t.id === 't_praise'));
  eq('and is counted from the feed', Feed.timesAsked(S, 't_praise'), 1);
  eq('with the day it was asked', Feed.lastAskedDay(S, 't_complaint'), 190);
  ok('an unknown thread id on the rail is ignored', (() => { S.feed.unshift({ id: 9003, day: 1, thread: 't_from_a_build_that_is_gone', resolved: true, text: 'z' }); delete S.wire; return Feed.timesAsked(S, 't_from_a_build_that_is_gone') === 0; })());
});

section('a letter that asks still answers through the same door', () => {
  const S = fresh();
  const l = LETTERS.find((x) => x.ask?.length >= 2 && !x.repeat);
  const item = Mail.deliver(S, l);
  ok('it lands as a thread', !!item && item.thread === l.id);
  eq('with its own replies', labelsOf(S, item).length, l.ask.length);
  ok('and answers', !!Feed.resolveThread(S, item.id, 0));
});

section('reply labels are unique across every ask, and the lint knows the shape', () => {
  const all = [];
  for (const t of THREADS) (Array.isArray(t.stages) ? t.stages : [t]).forEach((f) => (f.opts || []).forEach((o) => all.push(o.label.toLowerCase().trim())));
  for (const l of LETTERS) (l.ask || []).forEach((o) => all.push(o.label.toLowerCase().trim()));
  eq('no two asks in the game share a label', new Set(all).size, all.length);
  ok('the pool is deep enough to carry a run', THREADS.length >= 90, String(THREADS.length));
});

// ── A run, answered like a player ───────────────────────────────────────────
const DAYS = Number(process.env.DAYS || 600);
const SEED = Number(process.env.SEED || 7);
await (async () => {
  console.log(`\n── a seeded ${DAYS}-day run, every thread answered two days after it opens`);
  const bot = await makeBot('../src/', { seed: SEED });
  const s = bot.Game.startNewGame({ founderName: 'Ada', companyName: 'Meridian', archetype: 'hacker',
    category: 'devtools', productName: 'Meridian', seed: SEED });
  const opened = [];
  on('feed', (item) => { if (item.thread && item.type !== 'mail' && THREAD_MAP[item.thread]) opened.push({ day: item.day, id: item.thread, act: s.company.act }); });
  let shared = 0, sharedAt = '';
  const errs = []; const origErr = console.error; console.error = (...a) => errs.push(a.join(' '));
  // Cards are answered at random, except that a choice that ends the run is
  // never taken: the harness is here to walk the acts, not to be acquired on
  // day 150, which the bot's own dice did on three seeds out of three. The
  // presented card blanks its cost lines under `LIFE.SLEEP_JUDGEMENT`, so the
  // authored card is what is read, by the choice's own index.
  const choose = (n) => {
    const ev = s.narrative.activeEvent; const okI = [];
    for (let i = 0; i < n; i++) {
      const a = EVENT_MAP[ev?.id]?.choices?.[ev?.choices?.[i]?.oi];
      if (!/ends? the run/i.test(typeof a?.sub === 'string' ? a.sub : '')) okI.push(i);
    }
    return okI.length ? okI[Math.floor(bot.rand() * okI.length)] : Math.floor(bot.rand() * n);
  };
  for (let d = 0; d < DAYS; d++) {
    bot.step(s, { choose });
    // Two open asks offering the same word would be one decision printed twice.
    const open = s.feed.filter((f) => f.thread && !f.resolved);
    const words = open.flatMap((f) => labelsOf(s, f).map((l) => l.toLowerCase()));
    if (new Set(words).size !== words.length && !shared) { shared++; sharedAt = `day ${Math.floor(s.time.day)}: ${words.join(' | ')}`; }
    for (const f of open) {
      if (s.time.day - f.day >= 2) { const n = labelsOf(s, f).length; if (n) Feed.resolveThread(s, f.id, Math.floor(bot.rand() * n)); }
    }
    if (s.company.dead || s.ending) break;
  }
  console.error = origErr;
  const byId = new Map(); for (const o of opened) byId.set(o.id, (byId.get(o.id) || 0) + 1);
  const repeats = [...byId].filter(([id, n]) => n > 1 && !Array.isArray(THREAD_MAP[id]?.stages));
  ok(`${opened.length} threads opened across ${Math.floor(s.time.day)} days and none came back`, repeats.length === 0, repeats.map(([id, n]) => `${id}×${n}`).join(', '));
  const inc = byId.get('t_incident_ask') || 0;
  ok(`the incident family opened ${inc} times, within its stages`, inc <= THREAD_MAP.t_incident_ask.stages.length);
  ok('no two open asks ever shared a word', shared === 0, sharedAt);
  for (let a = 1; a <= s.company.act; a++) {
    const n = opened.filter((o) => o.act === a).length;
    if (a < s.company.act || n) ok(`act ${a} asked something (${n})`, n >= 1);
  }
  ok('the run raised no errors', errs.length === 0, errs.slice(0, 3).join(' / '));
})();

console.log(`\n═══ wire: ${checks - fails}/${checks} checks passed ═══`);
process.exit(fails ? 1 : 0);
