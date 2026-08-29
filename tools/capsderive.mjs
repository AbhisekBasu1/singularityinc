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
// ─────────────────────────────────────────────────────────────────────────────
import { installDom } from './headless.mjs';
installDom();

const { newGame, setState } = await import('../src/engine/state.js');
const Game = await import('../src/game.js');
const Loop = await import('../src/engine/loop.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { startResearch, availableResearch } = await import('../src/systems/research.js');
const { rollCandidate, hireAgent, maxAgents, hireCost } = await import('../src/systems/agents.js');
const { actionPromptAI, actionWriteCode } = await import('../src/systems/founder.js');
const { startProject, availableProjects } = await import('../src/systems/projects.js');
const { EVENTS } = await import('../src/data/events.js');

const s = Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                              category: 'devtools', productName: 'Testco' });

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
      resolveChoice(s, Math.floor(Math.random() * n)); dismissEvent(s);
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
  influence: 'influence', users: 'users',
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

let ran = 0, threw = 0;
for (const e of EVENTS) {
  const acts = e.act?.length ? e.act : [1, 2, 3, 4, 5];
  for (const act of acts) {
    const base = states[act];
    if (!base) continue;
    for (let ci = 0; ci < (e.choices?.length || 0); ci++) {
      const scratch = JSON.parse(JSON.stringify(base));
      setState(scratch);
      scratch.narrative.activeEvent = {
        id: e.id, title: e.title, kind: e.kind, char: e.char, body: '',
        choices: e.choices.map((c, i) => ({ i, label: c.label, sub: c.sub, tone: c.tone })),
        outcome: null,
      };
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
              'opinion', 'debt', 'research', 'influence', 'affinity'];

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
  console.log(`\n${ran} authored choices executed (${threw} threw)`);
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
