// ─────────────────────────────────────────────────────────────────────────────
// LIFE — the person, headlessly. Sleep follows the day, health follows sleep,
// warmth decays with silence and comes back with a call, and none of it can
// end a run on its own.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, near, section, report } from './headless.mjs';
installDom();
import { makeBot } from './bot.mjs';

const bot = await makeBot();
const Life = await import('../src/systems/life.js');
const Calls = await import('../src/systems/calls.js');
const { LIFE, FOUNDER } = await import('../src/data/balance.js');
const { resolveChoice, dismissEvent, presentEvent } = await import('../src/systems/narrative.js');
const { EVENT_MAP } = await import('../src/data/events.js');
const Save = await import('../src/engine/save.js');
const Founder = await import('../src/systems/founder.js');
const { APPROACH_MAP, shiftedBands } = await import('../src/data/approaches.js');

const s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                  category: 'devtools', productName: 'Testco' });
bot.Loop.stop();
s.tutorialHold = false;

await section('a fresh founder is rested', () => {
  const L = Life.lifeState(s);
  eq('sleep starts where the tuning says', L.sleep, LIFE.START_SLEEP);
  eq('and health', L.health, LIFE.START_HEALTH);
  eq('health above the threshold costs nothing', Life.healthMult(s), 1);
});

await section('sleep follows the day', () => {
  const L = Life.lifeState(s);
  s.founder.allocation = { build: 0.9, users: 0.05, growth: 0.03, learn: 0.02, rest: 0 };
  s.founder.focus = 60;
  const before = L.sleep;
  for (let i = 0; i < 20; i++) Life.tickLife(s, 1);
  ok('no rest at all, and sleep falls', L.sleep < before - 0.2, `${before} → ${L.sleep}`);
  ok('health follows, slower', L.health < LIFE.START_HEALTH && L.health > L.sleep, `${L.health} vs sleep ${L.sleep}`);
  s.founder.allocation = { build: 0.4, users: 0.1, growth: 0.1, learn: 0.05, rest: 0.35 };
  const low = L.sleep;
  for (let i = 0; i < 20; i++) Life.tickLife(s, 1);
  ok('a real rest share brings it back', L.sleep > low + 0.2, `${low} → ${L.sleep}`);
});

await section('health is the floor under focus', () => {
  const L = Life.lifeState(s);
  L.health = 0.1;
  const m = Life.healthMult(s);
  ok('unwell, focus comes back slower', m < 1 && m >= LIFE.HEALTH_FLOOR_MULT, String(m));
  L.health = 0.95;
  eq('well, it does not', Life.healthMult(s), 1);
  ok('and nothing here can end a run', !s.ending);
});

await section('warmth decays with silence and comes back with a call', () => {
  s.narrative.relationships.mom = { met: true, affinity: 4, respect: 0, fear: 0, arc: 0 };
  s.narrative.relationships.sam = { met: true, affinity: 4, respect: 0, fear: 0, arc: 0 };
  s.time.day = 40;
  const t = Life.touch(s, 'mom', 1);
  eq('contact warms the tie all the way', t.warmth, 1);
  for (let i = 0; i < LIFE.WARMTH_HALFLIFE; i++) Life.tickLife(s, 1);
  near('a half-life of silence halves it', Life.tieFor(s, 'mom').warmth, 0.5, 0.03);
  const rows = Life.ties(s);
  ok('every met person is a tie', rows.some((r) => r.id === 'mom') && rows.some((r) => r.id === 'sam'));
  ok('and a tie says what it is worth', rows.find((r) => r.id === 'mom').gives === 'sleep');
  // A call is contact.
  s.calls = { active: null, log: [], seq: 1, lastRing: -99 };
  s.founder.focus = 60; s.narrative.activeEvent = null;
  Life.tieFor(s, 'sam').warmth = 0.1;
  const r = Calls.startCall(s, 'sam');
  ok('the call opens', r.ok);
  Calls.hangUp(s);
  ok('and it warmed the tie', Life.tieFor(s, 'sam').warmth > 0.3, String(Life.tieFor(s, 'sam').warmth));
  // A card with a face is contact.
  const card = EVENT_MAP.e_mom_call;
  Life.tieFor(s, 'mom').warmth = 0.1;
  presentEvent(s, card);
  resolveChoice(s, 0); dismissEvent(s);
  ok('a card with a face is contact too', Life.tieFor(s, 'mom').warmth > 0.3, String(Life.tieFor(s, 'mom').warmth));
});

await section('a warm tie pays a small dividend in its own currency', () => {
  const L = Life.lifeState(s);
  Life.touch(s, 'mom', 1);
  L.sleep = 0.4;
  s.founder.allocation = { build: 0.5, users: 0.14, growth: 0.1, learn: 0.1, rest: LIFE.SLEEP_NEED };
  s.founder.focus = 60;
  const before = L.sleep;
  Life.tickLife(s, 1);
  ok('the Sunday call is worth sleep', L.sleep > before, `${before} → ${L.sleep}`);
  Life.tieFor(s, 'mom').warmth = 0.2;
  L.sleep = 0.4;
  Life.tickLife(s, 1);
  ok('a cold one is worth nothing', Math.abs(L.sleep - 0.4) < 1e-6, String(L.sleep));
});

await section('the words a panel prints are never empty', () => {
  for (const v of [0, 0.2, 0.5, 0.7, 0.9, 1]) {
    ok(`sleep ${v} has a word`, Life.sleepWord(v).length > 2);
    ok(`health ${v} has a word`, Life.healthWord(v).length > 2);
  }
  eq('a tie never touched says so', Life.warmthWord({ since: null }), 'quiet');
});

await section('life survives a save', () => {
  Life.lifeState(s).sleep = 0.61;
  Save.save(s);
  const back = Save.load();
  near('sleep round-trips', back.founder.life.sleep, 0.61, 1e-9);
  ok('ties round-trip', !!back.founder.life.ties.mom);
});

// ── §A19. Sleep as judgement ───────────────────────────────────────────────
// The thesis as mechanics: below the line the game stops explaining itself.
// Nothing here is allowed to damage a number — what goes is legibility.
await section('below the line the game stops explaining itself', () => {
  const L = Life.lifeState(s);
  L.sleep = 0.9;
  ok('rested, nothing is hidden', !Life.tired(s));
  eq('and the prompt takes no shift', Life.sleepShift(s), 0);

  const card = EVENT_MAP.e_mom_call;
  presentEvent(s, card);
  const rested = (s.narrative.activeEvent.choices || []).map((c) => c.sub);
  ok('a rested card prints what its answers cost', rested.some((x) => x && x.length > 2), JSON.stringify(rested));
  dismissEvent(s);

  L.sleep = LIFE.SLEEP_JUDGEMENT - 0.05;
  ok('under the line, tired', Life.tired(s));
  eq('and the prompt rolls at a penalty', Life.sleepShift(s), LIFE.SLEEP_SKILL_SHIFT);
  ok('which is a penalty and not a bonus', LIFE.SLEEP_SKILL_SHIFT < 0);

  presentEvent(s, card);
  const tiredSubs = (s.narrative.activeEvent.choices || []).map((c) => c.sub);
  ok('a tired card prints none of them', tiredSubs.every((x) => !x), JSON.stringify(tiredSubs));
  ok('but the answers are all still there',
    s.narrative.activeEvent.choices.length === rested.length
    && s.narrative.activeEvent.choices.every((c) => c.label && c.label.length > 2));
  dismissEvent(s);

  // The bands move toward messy, and only toward messy.
  const ap = APPROACH_MAP.describe;
  const good = (b) => b.filter((x) => x.kind === 'brilliant' || x.kind === 'good').reduce((a, x) => a + x.p, 0);
  const rest = shiftedBands(ap, 9, 0);
  const worn = shiftedBands(ap, 9, LIFE.SLEEP_SKILL_SHIFT);
  ok('tired, fewer good bands', good(worn) < good(rest), `${good(rest).toFixed(3)} → ${good(worn).toFixed(3)}`);
  near('and the distribution still sums to one', worn.reduce((a, x) => a + x.p, 0), 1, 1e-9);

  L.sleep = 0.9;
});

await section('the phone offers one topic fewer when you are tired', () => {
  const L = Life.lifeState(s);
  s.narrative.relationships.sam = { met: true, affinity: 6, respect: 2, fear: 0, arc: 1 };
  s.founder.focus = s.founder.focusMax;
  L.sleep = 0.9;
  Calls.hangUp(s);
  const r1 = Calls.startCall(s, 'sam');
  const rested = r1.ok ? Calls.options(s).length : 0;
  Calls.hangUp(s);
  L.sleep = LIFE.SLEEP_JUDGEMENT - 0.05;
  s.founder.focus = s.founder.focusMax;
  // The same person, the same day, so the only difference between the two
  // calls is the founder — `canCall` would otherwise refuse on the cooldown.
  delete s.narrative.relationships.sam.lastCallDay;
  const r2 = Calls.startCall(s, 'sam');
  const worn = r2.ok ? Calls.options(s).length : 0;
  Calls.hangUp(s);
  ok('both calls opened', r1.ok && r2.ok);
  ok('and the tired one offers fewer', worn === Math.max(2, rested - 1), `${rested} → ${worn}`);
  ok('but never fewer than two', worn >= 2, String(worn));
  L.sleep = 0.9;
});

await section('a collapse takes days, a ring and every streak', () => {
  const c = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                    category: 'devtools', productName: 'Testco' });
  bot.Loop.stop();
  c.tutorialHold = false;
  c.time.day = 300;
  c.founder.burnout = 99.9;
  c.founder.focus = 0;
  c.doctrines = { earned: {}, streak: { the_long_view: 88, relentless: 12 }, fail: {}, lapsed: {} };
  c.calls.active = { char: 'sam', by: 'them', done: false, used: [], rounds: [] };
  const day = c.time.day;
  Life.lifeState(c);
  Founder.tickFounder(c, 1);
  ok('the founder went down', c.founder.recovering === true);
  ok('it cost days', c.time.day >= day + LIFE.COLLAPSE_DAYS, `${day} → ${c.time.day}`);
  ok('the ring went unanswered', !c.calls.active);
  eq('and every streak is back to zero', c.doctrines.streak.the_long_view, 0);
  eq('all of them', c.doctrines.streak.relentless, 0);
  ok('and the run is still alive', !c.ending);

  // Never while the tab is shut: offline catch-up runs hundreds of these.
  const o = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                    category: 'devtools', productName: 'Testco' });
  bot.Loop.stop();
  o.tutorialHold = false;
  o.time.day = 300;
  o.founder.burnout = 99.9;
  o.founder.focus = 0;
  o.doctrines = { earned: {}, streak: { the_long_view: 88 }, fail: {}, lapsed: {} };
  o._offline = true;
  const oday = o.time.day;
  Founder.tickFounder(o, 1);
  ok('offline, the recovery still happens', o.founder.recovering === true);
  eq('but no days are taken', o.time.day, oday);
  eq('and no streak is broken', o.doctrines.streak.the_long_view, 88);
});

report('life');
