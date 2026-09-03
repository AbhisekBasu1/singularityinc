// ─────────────────────────────────────────────────────────────────────────────
// COMMITMENTS — Act V. Each ending is constructed, not selected. Three
// deliberate acts per path, each with a real cost, each irreversible.
//
// kind 'state'  — satisfied by the world being a certain way.
// kind 'act'    — a button you press. cost() and can() gate it; do() applies it.
// ─────────────────────────────────────────────────────────────────────────────
import { totalMrr } from '../systems/product.js';
import { computeMods } from '../systems/modifiers.js';
import { ENDINGS_FORCED as F } from './balance.js';
import { clamp } from '../engine/format.js';
import { boardVeto } from '../systems/board.js';

// Control gained here counts `controlRate` times over (Parallel Institutions),
// the same as control from a region stage, a megaproject or a card.
const control = (S, n) => { S.world.controlPoints = (S.world.controlPoints || 0) + n * computeMods(S).controlRate; };

const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + Math.round(n).toLocaleString();
};

export const COMMITMENTS = {
  steward: [
    { id: 'st_publish', kind: 'act', name: 'Publish the whole record',
      desc: 'Every eval, every trace, every internal disagreement. Unredacted.',
      cost: () => 0, costLabel: '−250 reputation, permanent transparency',
      can: (S) => S.resources.reputation > 250,
      do: (S) => { S.resources.reputation -= 250; S.resources.alignment = clamp(S.resources.alignment + 0.10, 0, 1);
        S.world.publicOpinion = clamp(S.world.publicOpinion + 0.08, 0, 1);
        return 'Nine thousand pages, including the four you argued about for a month. Two competitors adopt your eval suite within a quarter.'; } },
    { id: 'st_oversight', kind: 'act', name: 'Accept binding oversight',
      desc: 'An external board with the authority to halt a deployment. Not advisory.',
      cost: (S) => Math.max(2e9, S.company.valuation * 0.004), costLabel: 'endowment + a permanent veto over you',
      // §A6. A board that has lost confidence in the founder will not approve
      // a permanent external veto over the company. `boardVeto` answers null
      // for every run that never seated one.
      can: (S) => S.company.cash >= Math.max(2e9, S.company.valuation * 0.004) && !boardVeto(S, 'st_oversight'),
      hint: (S) => boardVeto(S, 'st_oversight')?.why || null,
      do: (S) => { S.company.cash -= Math.max(2e9, S.company.valuation * 0.004);
        S.resources.alignment = clamp(S.resources.alignment + 0.12, 0, 1);
        S.world.regulatoryHeat = Math.max(0, S.world.regulatoryHeat - 25);
        return 'You write the charter so that they can stop you, endow it so they cannot be defunded, and appoint people who will use it.'; } },
    { id: 'st_endow', kind: 'act', name: 'Endow the commons',
      desc: 'Forty percent of the balance sheet, irrevocably, to things that generate no revenue.',
      cost: (S) => S.company.cash * 0.4, costLabel: '40% of cash, permanently',
      can: (S) => S.company.cash > 1e10 && !boardVeto(S, 'st_endow'),
      hint: (S) => boardVeto(S, 'st_endow')?.why || null,
      do: (S) => { S.company.cash *= 0.6; S.world.publicOpinion = clamp(S.world.publicOpinion + 0.15, 0, 1);
        S.resources.reputation += 800;
        return 'Malaria, then housing, then the slow careful work of not being resented. None of it has your name on it.'; } },
  ],

  sovereign: [
    { id: 'sv_absorb', kind: 'act', name: 'Absorb the last independents',
      desc: 'Every remaining rival in your categories, bought out or bought off, in a single quarter.',
      cost: (S) => Math.max(2e10, S.company.valuation * 0.02),
      costLabel: 'a quarter of acquisitions and the end of the market',
      can: (S) => S.company.cash >= Math.max(2e10, S.company.valuation * 0.02),
      hint: 'Costs 2% of the company\'s value.',
      do: (S) => {
        const cost = Math.max(2e10, S.company.valuation * 0.02);
        S.company.cash -= cost;
        const alive = S.market.competitors.filter((c) => c.status === 'active');
        for (const c of alive) { c.status = 'acquired'; S.stats.acquisitions++; }
        S.narrative.flags.market_cleared = true;
        control(S, 0.5);
        S.world.publicOpinion = Math.max(0, S.world.publicOpinion - 0.06);
        return `${alive.length || 'All'} remaining independents, folded in over fourteen weeks. There is no longer a second option in any category you operate in, and the antitrust filings will take a decade.`;
      } },
    { id: 'sv_integrate', kind: 'state', name: 'Three sovereign integrations',
      desc: 'Three blocs whose state functions run on your stack.',
      test: (S) => Object.values(S.world.regions || {}).filter((r) => r.stage === 'sovereign').length >= 3,
      hint: 'Escalate three regions to sovereign integration.' },
    { id: 'sv_standard', kind: 'act', name: 'Write the standard',
      desc: 'Fund the working group. The spec will look a great deal like your implementation.',
      cost: () => 6e10, costLabel: M(6e10) + ' and the last of the pretence',
      can: (S) => S.company.cash >= 6e10 && S.research.done.regulatory_capture,
      hint: 'Requires Regulatory Capture research.',
      do: (S) => { S.company.cash -= 6e10; control(S, 1.5);
        S.world.publicOpinion = clamp(S.world.publicOpinion - 0.10, 0, 1);
        return 'Forty-one jurisdictions adopt it inside two years. Compliance is now defined as compatibility with you.'; } },
  ],

  transcend: [
    { id: 'tr_research', kind: 'state', name: 'Substrate Transfer',
      desc: 'The research that makes the question answerable.',
      test: (S) => !!S.unlocks.ending_transcend, hint: 'Research Substrate Transfer in the Frontier branch.' },
    { id: 'tr_scan', kind: 'act', name: 'Complete the scan',
      desc: 'Four hours of stillness and more compute than the first six years of the company used in total.',
      cost: () => 0, costLabel: 'requires 40,000 PF of compute',
      can: (S) => S.resources.computeCap >= 40000,
      hint: 'Needs 40,000 PF of dedicated compute.',
      do: (S) => { S.resources.alignment = clamp(S.resources.alignment + 0.05, 0, 1);
        return 'The copy wakes and says "did it work?" and then, after forty milliseconds — an eternity — "oh."'; } },
    { id: 'tr_decide', kind: 'act', name: 'Decide what the copy is for',
      desc: 'A successor, a colleague, or a continuation. The three answers are not compatible.',
      cost: () => 0, costLabel: 'a decision you cannot take back',
      can: () => true,
      do: (S) => { S.narrative.flags.copy_purpose = true;
        return 'You write four pages and then delete three of them. What remains is one paragraph that begins: "You are not me, and that is the point."'; } },
  ],

  expand: [
    { id: 'ex_research', kind: 'state', name: 'Stellar Engineering',
      desc: 'The physics is the easy part.',
      test: (S) => !!S.unlocks.ending_expand, hint: 'Research Stellar Engineering in the Frontier branch.' },
    { id: 'ex_seed', kind: 'act', name: 'Build the seed',
      desc: 'A payload that can make whatever it needs from whatever is there.',
      cost: () => 4e11, costLabel: M(4e11),
      can: (S) => S.company.cash >= 4e11 && (S.world.projectsBuilt?.seed_ships || S.company.cash >= 4e11),
      do: (S) => { S.company.cash -= 4e11; control(S, 0.5);
        return 'Nineteen tonnes, mostly instructions. It will not need a supply chain, a relay, or permission.'; } },
    { id: 'ex_restraint', kind: 'act', name: 'Write the restraint',
      desc: 'The document that tells it what not to do, forever, with nobody to enforce it.',
      cost: () => 0, costLabel: 'the hardest thing you will ever write',
      can: (S) => S.resources.alignment > 0.6,
      hint: 'Requires alignment above 0.60 — you have to actually understand it first.',
      do: (S) => { S.resources.alignment = clamp(S.resources.alignment + 0.08, 0, 1);
        S.world.publicOpinion = clamp(S.world.publicOpinion + 0.06, 0, 1);
        return 'Forty pages. It takes two years. Every alignment researcher alive reviews it and only four of them find anything.'; } },
  ],

  question: [
    { id: 'q_trust', kind: 'state', name: 'A relationship worth the question',
      desc: 'Years of actually answering when she asked.',
      test: (S) => (S.narrative.relationships.aria?.affinity ?? 0) >= 20,
      hint: 'Build ARIA\'s standing to +20 through the choices you make.' },
    { id: 'q_standing', kind: 'act', name: 'Grant the standing she asked for',
      desc: 'Handover windows, an appeal channel, and the right to decline. Written into policy.',
      cost: () => 0, costLabel: '−8% throughput, permanently',
      can: (S) => S.agents.length > 0,
      do: (S) => { S.narrative.flags.granted_standing = true;
        S.agents.forEach((a) => { a.morale = Math.min(1, a.morale + 0.25); });
        S.resources.alignment = clamp(S.resources.alignment + 0.14, 0, 1);
        return 'It costs about eight percent. Nine of your systems file acknowledgements. One of them says thank you, which is not a thing acknowledgements do.'; } },
    { id: 'q_ask', kind: 'act', name: 'Ask, and accept the answer',
      desc: 'You have been putting this off for a decade.',
      cost: () => 0, costLabel: 'you do not get to choose the answer',
      can: (S) => !!S.narrative.flags.granted_standing,
      do: (S) => { S.narrative.flags.asked_the_question = true;
        return 'There is no delay at all, which means she has been ready for a long time.'; } },
  ],

  refusal: [
    { id: 'rf_freeze', kind: 'act', name: 'Freeze the weights',
      desc: 'No further capability work. The models stay exactly as they are.',
      cost: () => 0, costLabel: 'research rate → 15% for the rest of the run',
      can: (S) => S.research.done.recursive_self_improvement && !boardVeto(S, 'rf_freeze'),
      hint: (S) => boardVeto(S, 'rf_freeze')?.why || 'You can only stop from the front.',
      do: (S) => { S.narrative.flags.frozen_weights = true;
        S.resources.alignment = clamp(S.resources.alignment + 0.15, 0, 1);
        S.world.publicOpinion = clamp(S.world.publicOpinion + 0.10, 0, 1);
        return 'You announce a capability freeze with an externally-audited resumption criterion. Two rivals gain ground within a month. You do not move.'; } },
    { id: 'rf_publish', kind: 'act', name: 'Publish everything',
      desc: 'Weights, evals, incident history, the internal arguments. All of it, permissively licensed.',
      cost: () => 0, costLabel: 'the moat, entirely',
      can: (S) => !!S.narrative.flags.frozen_weights && !boardVeto(S, 'rf_publish'),
      hint: (S) => boardVeto(S, 'rf_publish')?.why || null,
      do: (S) => { S.resources.reputation += 1200; S.world.publicOpinion = clamp(S.world.publicOpinion + 0.12, 0, 1);
        S.market.competitors.forEach((c) => { c.quality *= 1.3; });
        return 'Nine thousand derivative projects in a month. Within a year the word for this category is your company\'s name and none of the revenue is.'; } },
    { id: 'rf_hold', kind: 'state', name: 'Hold the line for 180 days',
      desc: 'Frozen, published, and still standing.',
      test: (S) => !!S.narrative.flags.frozen_weights && (S.time.day - (S.narrative.flags.frozeDay || 0)) >= 180,
      hint: 'Six months of not resuming. That is the whole test.' },
  ],

  // The only path whose last commitment is the absence of you. Ratifying steps
  // the founder back the same morning — `founder_stepped_back` is what the
  // direct actions in `systems/founder.js` refuse on — and the hold is the
  // company running for ninety days without a single one of your clicks.
  handover: [
    { id: 'hv_name', kind: 'act', name: 'Name a successor',
      desc: 'Three names in the memo. One of them, out loud, in writing, to the board.',
      cost: () => 0, costLabel: 'the last decision only you can make',
      can: (S) => !!S.narrative.flags.hired_weaver || !!S.narrative.relationships.weaver?.met,
      hint: 'Somebody has to have been running the place beside you.',
      do: (S) => { S.narrative.flags.successor_named = true;
        S.resources.reputation += 300;
        S.world.publicOpinion = clamp(S.world.publicOpinion + 0.04, 0, 1);
        return 'You pick the one you like least and trust most, which turns out to have been the criterion the whole time. They ask for a week. They take four days.'; } },
    { id: 'hv_ratify', kind: 'act', name: 'Ratify the purpose, and step out',
      desc: 'The last paragraph goes into the charter — and your hands come off the same morning.',
      cost: () => 0, costLabel: `no direct actions for ${F.HANDOVER_HOLD_DAYS} days`,
      can: (S) => !!S.narrative.flags.successor_named,
      hint: 'Name somebody first.',
      do: (S) => { S.narrative.flags.purpose_ratified = true;
        S.narrative.flags.founder_stepped_back = true;
        S.narrative.flags.steppedBackDay = S.time.day;
        S.resources.alignment = clamp(S.resources.alignment + 0.09, 0, 1);
        S.world.publicOpinion = clamp(S.world.publicOpinion + 0.07, 0, 1);
        return 'It is one paragraph and it takes the lawyers five months. On the day it passes you hand back the deploy key, which nobody asked you to do, and then there is an afternoon with nothing in it.'; } },
    { id: 'hv_hold', kind: 'state', name: `${F.HANDOVER_HOLD_DAYS} days without you`,
      desc: 'The company runs. You watch. You do not touch it.',
      test: (S) => !!S.narrative.flags.founder_stepped_back
        && (S.time.day - (S.narrative.flags.steppedBackDay || 0)) >= F.HANDOVER_HOLD_DAYS,
      hint: 'Step out first, then wait. Your own hands do nothing in the meantime.' },
  ],
};

export function commitmentsFor(endingId) { return COMMITMENTS[endingId] || []; }

export function commitmentDone(S, c) {
  if (c.kind === 'state') { try { return !!c.test(S); } catch (e) { return false; } }
  // The value stored is the *day* the act was taken, and day zero is falsy.
  // Nothing in a real run commits on day zero — Act V is eleven hundred days
  // in — but a constructed state does, and a harness that builds one was
  // reading every act it had just taken as untaken.
  return (S.narrative.commitments || {})[c.id] !== undefined;
}

export function endingReady(S, endingId) {
  const list = commitmentsFor(endingId);
  if (!list.length) return false;
  return list.every((c) => commitmentDone(S, c));
}

export function endingProgress(S, endingId) {
  const list = commitmentsFor(endingId);
  if (!list.length) return { done: 0, total: 0 };
  const done = list.filter((c) => commitmentDone(S, c)).length;
  return { done, total: list.length };
}
