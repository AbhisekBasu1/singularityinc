// ─────────────────────────────────────────────────────────────────────────────
// ALIGNMENT — the equilibrium, in one place.
//
// This is the whole mechanic of the back half of the run and it was three
// lines inside `loop.js` that nothing could read and nothing printed. The
// number does not drift on its own: it converges toward a *target* — half,
// plus what you researched, minus what you handed over — and every card that
// says "alignment falls" is really saying "you moved the target".
//
// `loop.js` calls `alignmentTarget` and applies the convergence; the World
// view calls `explainAlignment` and prints the same terms. One arithmetic, so
// the panel cannot drift from the sim.
//
// Everything here is pure: `specFx` is the last tick's cached side-effects, not
// a fresh roll of the roster, because this is on a render path.
// ─────────────────────────────────────────────────────────────────────────────
import { FLOWS, AGENTS } from '../data/balance.js';
import { computeMods } from './modifiers.js';
import { specFx } from './agents.js';
import { clamp } from '../engine/format.js';

export function avgAutonomy(S) {
  if (!S.agents.length) return 0;
  return S.agents.reduce((a, x) => a + (x.autonomy || 0), 0) / S.agents.length;
}

// The equilibrium the number settles toward. `m['+alignment']` is every promise
// of "+alignment" the game makes — Interpretability's 0.15, the Aligned By
// Default perk's 0.1 a level — added to the target rather than bumped once at
// the start and then drifted away from.
export function alignmentTarget(S, m = computeMods(S)) {
  return clamp(FLOWS.ALIGN_BASE_TARGET
    + (S.research.done.constitutional_ai ? FLOWS.ALIGN_CONSTITUTIONAL_BONUS : 0)
    + (m['+alignment'] || 0)
    - avgAutonomy(S) * FLOWS.ALIGN_AUTONOMY_DRAG, 0, 1);
}

// The rows the World view prints, in `explainProduct`'s shape.
export function explainAlignment(S, m = computeMods(S)) {
  const auto = avgAutonomy(S);
  const target = alignmentTarget(S, m);
  const now = S.resources.alignment;
  const fx = specFx(S);
  const perDay = (target - now) * FLOWS.ALIGN_CONVERGENCE_PER_DAY
    + (fx.alignDelta || 0) + (m.directiveAlign || 0);
  const n = S.agents.length;
  const rows = [
    ['Baseline', FLOWS.ALIGN_BASE_TARGET,
      'Where a system with nobody watching it and nobody neglecting it settles.', 'align'],
    ['Constitutional Alignment', S.research.done.constitutional_ai ? FLOWS.ALIGN_CONSTITUTIONAL_BONUS : 0,
      S.research.done.constitutional_ai
        ? 'Rules the model holds itself to. The single largest term available to you.'
        : 'Not researched. It is worth more than anything else on this list.', 'align'],
    ['Interpretability & perks', m['+alignment'] || 0,
      'Everything that promises "+alignment": the Interpretability node, the Aligned By Default perk, the cards that made you slow down.', 'align'],
    ['Autonomy handed over', -auto * FLOWS.ALIGN_AUTONOMY_DRAG,
      n ? `${n} agent${n === 1 ? '' : 's'} at ${(auto * 100).toFixed(0)}% average autonomy. Every point of autonomy you grant is a point of the equilibrium you give up — at full autonomy it is ${(FLOWS.ALIGN_AUTONOMY_DRAG * 100).toFixed(0)} points.`
        : 'No agents running, so nothing is delegated and nothing is lost.', 'align'],
    ['Equilibrium', target, 'The four terms above. Alignment converges toward this and nowhere else.', 'align'],
  ];
  const drift = [
    ['Convergence', (target - now) * FLOWS.ALIGN_CONVERGENCE_PER_DAY,
      `${(FLOWS.ALIGN_CONVERGENCE_PER_DAY * 100).toFixed(0)}% of the gap a day. It is ${Math.abs(target - now).toFixed(3)} away, so about ${gapDays(now, target)}.`, 'rate'],
    ...(fx.alignDelta ? [['The roster', fx.alignDelta,
      `What your agents themselves add or take, at ${AGENTS.ALIGN_PER_DAY} a day per point of their alignment stat.`, 'rate']] : []),
    ...(m.directiveAlign ? [['Standing order', m.directiveAlign,
      'A directive pointed at safety moves the number directly, on top of the drift.', 'rate']] : []),
    ...(m.alignFloor ? [['Floor', m.alignFloor,
      'Something in this run refuses to let alignment fall below this, whatever the equilibrium says.', 'align']] : []),
  ];
  return { now, target, perDay, rows, drift, autonomy: auto };
}

function gapDays(now, target) {
  const gap = Math.abs(target - now);
  if (gap < 0.005) return 'it is already there';
  // Exponential convergence: the time to close 90% of the remaining distance.
  const d = Math.log(10) / FLOWS.ALIGN_CONVERGENCE_PER_DAY;
  return `most of the way in ${Math.round(d)} days`;
}
