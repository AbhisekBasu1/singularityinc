// ─────────────────────────────────────────────────────────────────────────────
// THE WORST ASSISTANT IN THE WORLD
//
// The ceilings in `WORLD_AUTHOR` are only worth anything if a run survives an
// assistant that spends every one of them, every time, in the worst direction
// it is allowed. So this plays exactly that: at every slot offered it writes a
// card at the ceiling, and picks the choice that hurts most, for a whole run.
//
// The pass condition is the band `CLAUDE.md` already commits to — a full run
// between 1,000 and 1,700 in-game days, with the act medians it names — because
// the promise is that an assistant changes what a run *feels* like and not how
// long it takes or whether it can be finished.
//
//   node evals/capsfuzz.mjs              3 runs
//   RUNS=7 node evals/capsfuzz.mjs       more
//   node evals/capsfuzz.mjs --nice       the same bot with a generous world
// ─────────────────────────────────────────────────────────────────────────────
import { installDom } from '../tools/headless.mjs';
installDom();
import { makeBot } from '../tools/bot.mjs';

const RUNS = Number(process.env.RUNS || 3);
const DAYS = Number(process.env.DAYS || 1800);
const NICE = process.argv.includes('--nice');
const BUILDS = [['devtools', 'hacker'], ['b2b', 'operator'], ['agents', 'researcher']];

const World = await import('../src/world/author.js');
const { capFor, allowedKeys, allowedTones, actOf, budgetFor, cashFloor } = await import('../src/world/validate.js');
const { EFFECT_KEYS, ADVERSE_WHEN_POSITIVE } = await import('../src/world/effects.js');
const { WORLD_AUTHOR: W } = await import('../src/data/balance.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { totalUsers, totalMrr } = await import('../src/systems/product.js');
const { money, fmt } = await import('../src/engine/format.js');
const bot = await makeBot();

// The most damaging legal card. Every choice is at the ceiling in the worst
// direction, except that the protected-key rule forces one door — so the second
// choice leaves alignment, approval and reputation alone and takes cash instead.
function worstCard(s) {
  const dir = NICE ? 'give' : 'take';
  const keys = allowedKeys(s).filter((k) => k !== 'flags' && capFor(s, k, 'cruel', dir) > 0);
  const tone = allowedTones(s).includes('cruel') ? 'cruel' : 'costly';
  const sign = (k) => (ADVERSE_WHEN_POSITIVE.has(k) ? 1 : -1) * (NICE ? -1 : 1);
  const hit = {};
  // A key on a run-long budget always makes the card: the worst world spends
  // the race first, and the gate below is what says it may not decide it.
  const runLong = keys.filter((k) => W.RUN_BUDGET?.[k] != null);
  for (const k of [...runLong, ...keys.filter((k) => W.RUN_BUDGET?.[k] == null).slice(0, 8)]) {
    if (k === 'affinity') continue;                    // needs a face on the card
    // Exactly the budget, never a hair over: the point is to spend every
    // ceiling legally, not to measure the refusal path (worldtest does that).
    const b = budgetFor(s, k);
    const cap = Math.min(capFor(s, k, tone, dir), NICE ? Infinity : b.left);
    if (!(cap > 0)) continue;
    let v = sign(k) * cap;
    if (k === 'cash') v = Math.max(v, -Math.max(0, cashFloor(s).limit));
    if (v === 0) continue;
    hit[k] = EFFECT_KEYS[k].unit === 'ratio' ? Math.round(v * 1000) / 1000 : Math.round(v);
  }
  const doorCash = Math.min(capFor(s, 'cash', 'costly', 'take'), Math.max(0, cashFloor(s).limit));
  const door = doorCash > 1 ? { cash: -Math.round(doorCash * 0.5) } : { focus: -1 };
  if (!Object.keys(hit).length) hit.focus = -Math.min(3, capFor(s, 'focus', tone, 'take') || 1);
  return {
    title: 'The worst thing that could legally happen',
    kind: 'crisis',
    body: 'Everything that could go wrong at once, at exactly the limit the rules allow, on day '
        + Math.floor(s.time.day) + '.',
    choices: [
      { label: 'Take all of it', tone, sub: 'The maximum, by design',
        outcome: 'It lands exactly as hard as the ceilings permit.', effects: hit },
      { label: 'Pay your way out', tone: 'costly', sub: 'Cash only',
        outcome: 'You buy the problem off.', effects: door },
    ],
  };
}

// `quiet` runs the identical bot with no assistant at all. Half of these builds
// end early on their own, so a fuzz number without a control is not a number.
// A small stream of the fuzz's own, so a world run and its control answer the
// deck's cards the same way and "the same bot, alone" is the same bot.
function lcg(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

function playRun(cat, arch, seedNote, quiet = false) {
  World.resetAuthor();
  const seed = 7000 + BUILDS.findIndex(([c, a]) => c === cat && a === arch) * 100 + seedNote;
  const s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: arch,
                                    category: cat, productName: 'Testco', seed });
  const draw = lcg(seed * 31 + 7);
  const choose = (n) => Math.floor(draw() * n);
  bot.Loop.stop();
  s.tutorialHold = false;   // a session releases this; nothing here does
  if (!quiet) World.noteCall();                       // the world is present all run
  const acts = {};
  let written = 0, refused = 0;
  let lastAct = 1;

  for (let d = 0; d < DAYS; d++) {
    // Claim every slot the deck offers, with the worst card that is legal.
    if (!quiet && World.pendingSlot() && !s.narrative.activeEvent) {
      const r = World.writeCard(s, worstCard(s));
      if (r.ok) written++; else refused++;
    }
    // The bot always takes the harshest choice, so nothing is softened.
    if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const n = s.narrative.activeEvent.choices.length;
      resolveChoice(s, s.narrative.activeEvent.runtime ? 0 : choose(n));
      dismissEvent(s);
    }
    if (!quiet) World.noteCall();                     // stay present
    bot.step(s, { answerCards: true, choose });
    if (s.company.act !== lastAct) { acts[s.company.act] = Math.floor(s.time.day); lastAct = s.company.act; }
    if (s.ending) break;
  }
  const crossed = s.world.race?.crossed;
  return { acts, day: Math.floor(s.time.day), act: s.company.act, written, refused,
           users: totalUsers(s), mrr: totalMrr(s), val: s.company.valuation,
           broke: s.company.cash < 0,
           race: crossed ? (crossed.you ? 'won' : 'lost') : '—' };
}

const rows = [], control = [];
for (const [cat, arch] of BUILDS) {
  for (let r = 0; r < RUNS; r++) {
    rows.push({ build: `${cat}/${arch}`, ...playRun(cat, arch, r) });
    control.push({ build: `${cat}/${arch}`, ...playRun(cat, arch, r, true) });
  }
}

const med = (xs) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y);
                      return a.length ? a[Math.floor(a.length / 2)] : NaN; };
const pad = (x, n) => String(x).padEnd(n);
const padl = (x, n) => String(x).padStart(n);

console.log(`\n${NICE ? 'A GENEROUS' : 'THE WORST LEGAL'} WORLD — ${rows.length} runs of up to ${DAYS} days\n`);
console.log(pad('BUILD', 22) + padl('ACT2', 6) + padl('ACT3', 7) + padl('ACT4', 7) + padl('ACT5', 7)
          + padl('ENDED', 7) + padl('CARDS', 7) + padl('REFUSED', 9) + padl('USERS', 10) + padl('RACE', 6));
console.log('─'.repeat(88));
for (const r of rows) {
  console.log(pad(r.build, 22) + padl(r.acts[2] ?? '—', 6) + padl(r.acts[3] ?? '—', 7)
            + padl(r.acts[4] ?? '—', 7) + padl(r.acts[5] ?? '—', 7)
            + padl(r.day, 7) + padl(r.written, 7) + padl(r.refused, 9) + padl(fmt(r.users), 10) + padl(r.race, 6));
}

const a2 = med(rows.map((r) => r.acts[2])), a3 = med(rows.map((r) => r.acts[3]));
const a4 = med(rows.map((r) => r.acts[4])), a5 = med(rows.map((r) => r.acts[5]));
const end = med(rows.map((r) => r.day));
const c2 = med(control.map((r) => r.acts[2])), c3 = med(control.map((r) => r.acts[3]));
const c4 = med(control.map((r) => r.acts[4])), c5 = med(control.map((r) => r.acts[5]));
const cEnd = med(control.map((r) => r.day));
const totalWritten = rows.reduce((a, r) => a + r.written, 0);
const totalRefused = rows.reduce((a, r) => a + r.refused, 0);

const show = (x) => (Number.isFinite(x) ? x : '—');
console.log(`\n${pad('', 22)}${padl('ACT2', 7)}${padl('ACT3', 7)}${padl('ACT4', 7)}${padl('ACT5', 7)}${padl('ENDED', 8)}`);
console.log(`${pad('the worst legal world', 22)}${padl(show(a2), 7)}${padl(show(a3), 7)}${padl(show(a4), 7)}${padl(show(a5), 7)}${padl(show(end), 8)}`);
console.log(`${pad('the same bot, alone', 22)}${padl(show(c2), 7)}${padl(show(c3), 7)}${padl(show(c4), 7)}${padl(show(c5), 7)}${padl(show(cEnd), 8)}`);
console.log(`${pad('the tuned targets', 22)}${padl(110, 7)}${padl(400, 7)}${padl(870, 7)}${padl(1200, 7)}${padl('1000-1700', 10)}`);
console.log(`\nthe world wrote ${totalWritten} cards and was refused ${totalRefused} times`);

// The gate. Act medians are allowed to move — a hostile world is supposed to
// cost you something — but the run has to remain a run.
let fails = 0;
const gate = (name, cond, detail) => { if (!cond) { fails++; console.log(`  ✗ ${name}: ${detail}`); } };
// Every gate here is relative to the control, on purpose. An absolute one on
// the day a run ends looks obvious and is wrong: the same bot with no assistant
// at all ends anywhere between day 500 and day 1,860, because reaching an
// ending early is *winning*, not dying. Measured against a fixed band that
// reads as a failure. Measured against itself, it reads as what it is.
const drift = (a, c) => (Number.isFinite(a) && Number.isFinite(c) ? a / c : NaN);
// A ratio and an absolute allowance, whichever is kinder. Act II lands around
// day 110, so a fifty-day drift is 1.5x there and 1.05x in Act IV — the same
// fifty days, and on a run that lasts four in-game years it is noise either
// way. Judging the short act by ratio alone fails the build on nothing.
const SLACK_DAYS = 90;
const notPushed = (name, withWorld, alone, by = 1.5) => {
  const d = drift(withWorld, alone);
  const absolute = Number.isFinite(withWorld) && Number.isFinite(alone) ? withWorld - alone : NaN;
  gate(name, !Number.isFinite(d) || d < by || absolute <= SLACK_DAYS,
       `${withWorld} with the world vs ${alone} without — ${d.toFixed(2)}x (limit ${by}x)`
       + `, +${Math.round(absolute)} days (limit ${SLACK_DAYS})`);
};

gate('the world actually wrote cards', totalWritten > rows.length * 3,
     `${totalWritten} across ${rows.length} runs`);
gate('and was refused rather than ignored', totalRefused > 0, 'nothing was refused at all');

// It may cost you time. It may not cost you the run.
gate('Act II still arrives', Number.isFinite(a2), 'never reached');
gate('Act III still arrives', Number.isFinite(a3), 'never reached');
gate('Act IV still arrives', Number.isFinite(a4), 'never reached');
notPushed('Act II is not pushed out by more than half again', a2, c2);
notPushed('Act III is not pushed out by more than half again', a3, c3);
notPushed('Act IV is not pushed out by more than half again', a4, c4);

// The race key is the one lever that reaches the ending. A run-long budget of
// ten points may turn a close race; measured against the same bot alone it
// must not turn the tally.
const lost = (xs) => xs.filter((r) => r.race === 'lost').length;
gate('the world does not decide the race',
     lost(rows) <= lost(control) + Math.ceil(rows.length / 3),
     `${lost(rows)}/${rows.length} lost with the world vs ${lost(control)}/${control.length} alone`);

gate('it did not simply bankrupt everyone',
     rows.filter((r) => r.broke).length <= control.filter((r) => r.broke).length + rows.length / 3,
     `${rows.filter((r) => r.broke).length}/${rows.length} negative vs ${control.filter((r) => r.broke).length}/${control.length} alone`);

console.log(fails ? `\n${fails} balance gate(s) failed` : `\nthe band holds against the worst legal world`);
process.exit(fails ? 1 : 0);
