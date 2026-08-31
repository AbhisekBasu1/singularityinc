// ─────────────────────────────────────────────────────────────────────────────
// CAPS DERIVATION — what may the world do to you?
//
// The agent-authored world writes cards into the same deck the game ships with.
// Its limits must therefore come from the deck itself, not from a guess: for
// every authored choice, execute the effect against a representative state for
// that act and record the magnitude of everything it moved. The 80th percentile
// is what goes into WORLD_AUTHOR.CAPS — the world may write a typical card,
// never an outlier.
//
//   node tools/capsderive.mjs            print the table
//   node tools/capsderive.mjs --json     emit the CAPS literal for balance.js
//   REPS=9 node tools/capsderive.mjs     more samples per branching choice
//
// Seeded. A choice with a `chance()` inside it is executed REPS times from
// REPS different points of the stream and every execution is a sample, so the
// p80 sees both branches of "68% of the time the bet pays off" rather than
// whichever one a single run happened to land on.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom } from './headless.mjs';
installDom();

const { newGame, setState } = await import('../src/engine/state.js');
const { reseed } = await import('../src/engine/rng.js');
const REPS = Math.max(1, Number(process.env.REPS || 5));
const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode } = await import('../src/systems/founder.js');
const { startProject, availableProjects } = await import('../src/systems/projects.js');
const { EVENTS } = await import('../src/data/events.js');

// Seeded, and the bot's own card answers cycle rather than roll: the deck's
// `chance()` branches draw from the game's stream, so an unseeded run derived
// a different Act III compute grant every time it was printed.
const s = Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                              category: 'devtools', productName: 'Testco', seed: 4242 });

let answered = 0;
function play(days) {
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 3; i++) {
      if (s.founder.focus > 30 && s.company.cash > 200) actionPromptAI(s);
      else if (s.founder.focus > 5) actionWriteCode(s);
    }
    const p = s.products[0];
    for (let i = 0; i < 4; i++) { const r = Game.doShipFeature(s); if (!r.ok) break; }
    if (!p.launched && p.features.length >= 4) Game.doLaunch(s);
    if (!s.research.active) {
      const av = availableResearch(s).sort((a, b) => a.cost - b.cost);
      if (av.length) startResearch(s, av[0].id);
    }
    if (s.agents.length < maxAgents(s) && s.company.cash > hireCost(s) * 3) hireAgent(s, rollCandidate(s));
    if (s.narrative.activeEvent && !s.narrative.activeEvent.outcome) {
      const n = s.narrative.activeEvent.choices.length;
      resolveChoice(s, answered++ % n); dismissEvent(s);
    }
    const projs = availableProjects(s).filter((x) => x.available && s.company.cash > x.cost * 4);
    if (projs.length) startProject(s, projs[0].id);
    Loop.simulate(1);
  }
}

// A representative state per act, captured as a deep clone.
const states = {};
states[1] = JSON.parse(JSON.stringify(s));
play(120); states[2] = JSON.parse(JSON.stringify(s));
play(300); states[3] = JSON.parse(JSON.stringify(s));
play(460); states[4] = JSON.parse(JSON.stringify(s));
play(340); states[5] = JSON.parse(JSON.stringify(s));

// Effect keys the world-author vocabulary may use. `fx._log` names them slightly
// differently from the fx methods, so map both ways.
const LOG_TO_KEY = {
  cash: 'cash', code: 'code', insight: 'insight', reputation: 'rep', research: 'research',
  techDebt: 'debt', focus: 'focus', alignment: 'align', heat: 'heat', opinion: 'opinion',
  influence: 'influence', users: 'users', compute: 'compute',
};

// Split by direction, not by magnitude.
//
// The first version of this recorded |v| and used the p80 as a single ceiling.
// That is wrong, and the mistake is invisible until you look: most of what the
// authored deck does to `code`, `insight` and `research` is *give* them to you —
// they are rewards. Deriving a ceiling on damage from the size of the game's
// rewards let the world take 90 code out of an Act I company twice a fortnight,
// which is most of what it can make. Measured, that held every run in Act I or
// II for 1,800 days. So: what may the world take is derived from what the deck
// takes, and what it may give from what the deck gives.
const samples = { adverse: {}, kind: {} };
function record(act, key, v, adverse) {
  if (!Number.isFinite(v) || v === 0) return;
  const bag = adverse ? samples.adverse : samples.kind;
  ((bag[act] ??= {})[key] ??= []).push(Math.abs(v));
}

// The rival labs' progress and granted compute are both written straight onto
// state by the deck (`l.progress *= 1.12`, `computeGranted += 300`), so the fx
// log never sees them. Diffed around each choice instead.
const labTop = (st) => {
  const r = st.world?.race;
  if (!r) return 0;
  return Math.max(0, ...Object.values(r.labs || {}).filter((l) => l.alive).map((l) => l.progress));
};

let ran = 0, threw = 0;
for (const e of EVENTS) {
  const acts = e.act?.length ? e.act : [1, 2, 3, 4, 5];
  for (const act of acts) {
    const base = states[act];
    if (!base) continue;
    for (let ci = 0; ci < (e.choices?.length || 0); ci++) for (let rep = 0; rep < REPS; rep++) {
      const scratch = JSON.parse(JSON.stringify(base));
      setState(scratch);
      reseed(4242 + act * 1000 + ci * 10 + rep);
      scratch.narrative.activeEvent = {
        id: e.id, title: e.title, kind: e.kind, char: e.char, body: '',
        choices: e.choices.map((c, i) => ({ i, label: c.label, sub: c.sub, tone: c.tone })),
        outcome: null,
      };
      const computeBefore = scratch.resources.computeGranted || 0;
      const labBefore = labTop(scratch);
      try {
        const r = resolveChoice(scratch, ci);
        ran++;
        for (const [k, v] of r?.effects || []) {
          const key = LOG_TO_KEY[k] || (k.startsWith('rel:') ? 'affinity' : null);
          if (!key) continue;
          // Heat and tech debt are the two where up is the bad direction.
          const adverse = (key === 'heat' || key === 'debt') ? v > 0 : v < 0;
          record(act, key, v, adverse);
        }
        const dCompute = (scratch.resources.computeGranted || 0) - computeBefore;
        if (dCompute) record(act, 'compute', dCompute, dCompute < 0);
        // A lab gaining ground is the adverse direction, like heat.
        const dLab = labTop(scratch) - labBefore;
        if (Math.abs(dLab) > 1e-9) record(act, 'race', dLab, dLab > 0);
      } catch { threw++; }
    }
  }
}
setState(s);

const pct = (arr, p) => {
  if (!arr?.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
};
// Round to something a human would write down.
function tidy(n) {
  if (!n) return 0;
  if (n < 0.005) return Math.round(n * 1000) / 1000;
  if (n < 1) return Math.round(n * 100) / 100;
  if (n < 100) return Math.round(n);
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

const KEYS = ['cash', 'rep', 'insight', 'code', 'focus', 'users', 'align', 'heat',
              'opinion', 'debt', 'research', 'influence', 'affinity', 'compute', 'race'];

const bagFor = (which) => (which === 'adverse' ? samples.adverse : samples.kind);

if (process.argv.includes('--json')) {
  const which = process.argv.includes('--kind') ? 'kind' : 'adverse';
  const bag = bagFor(which);
  const out = {};
  for (const act of [1, 2, 3, 4, 5]) {
    out[act] = {};
    for (const k of KEYS) out[act][k] = tidy(pct(bag[act]?.[k], 0.80));
  }
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`\n${ran} executions of authored choices, ${REPS} per choice (${threw} threw)`);
  const pad = (v, n) => String(v).padStart(n);
  for (const which of ['adverse', 'kind']) {
    const bag = bagFor(which);
    console.log(`\n── what the written deck ${which === 'adverse' ? 'TAKES' : 'GIVES'}, p80 ──`);
    console.log('KEY'.padEnd(11) + [1, 2, 3, 4, 5].map((a) => pad('ACT ' + a, 14)).join(''));
    console.log('─'.repeat(11 + 5 * 14));
    for (const k of KEYS) {
      let line = k.padEnd(11);
      for (const act of [1, 2, 3, 4, 5]) {
        const arr = bag[act]?.[k];
        line += pad(arr?.length ? `${tidy(pct(arr, 0.80))} (n${arr.length})` : '—', 14);
      }
      console.log(line);
    }
  }
}

process.exit(0);
