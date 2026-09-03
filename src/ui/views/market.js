// ── MARKET ─────────────────────────────────────────────────────────────────
import { esc, bar, meter, sparkline } from '../dom.js';
import { inviteLink, inviteReach } from '../../webmcp/origin.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { MACRO, RIVAL_PERSONALITIES, activeCompetitors, acquisitionPrice } from '../../systems/market.js';
import { availableRounds, raiseOffer, computeValuation, expenseBreakdown, dailyRevenue,
         ROUND_TYPES, roundBlocked, roundRefusedByBoard, explainValuation } from '../../systems/economy.js';
import { whyPanel, whyBlock } from '../why.js';
import { projectUpkeepRows } from '../../systems/projects.js';
import { regionUpkeepRows } from '../../systems/regions.js';
import { CATEGORY_MAP } from '../../data/products.js';
import { computeMods } from '../../systems/modifiers.js';
import { totalMrr, totalUsers } from '../../systems/product.js';
import { nemesisOf, nemesisState, grudgeBand, availableCounters, availableMoves, intelDiscount, intelReveals, activeGoal,
         pendingApproach, seesApproach } from '../../systems/nemesis.js';
import { GOAL_MAP } from '../../data/nemesis.js';
import { NEMESIS } from '../../data/balance.js';
import { apertureState, apertureRaceMult, apertureIntent } from '../../systems/rivalco.js';
import { PLAYS } from '../../data/rivalco.js';
import { boardReading } from '../../systems/board.js';
import { BOARD, ECON } from '../../data/balance.js';

export function render(S) {
  const m = computeMods(S);
  const macro = MACRO[S.market.macro];
  const rivals = activeCompetitors(S);
  const e = expenseBreakdown(S, m);
  const r = dailyRevenue(S, m);
  const rounds = S.unlocks.fundraising ? availableRounds(S) : [];

  return `
  <div class="view-head">
    <div><div class="view-title">Market</div>
      <div class="view-sub">Conditions you do not control, and people who want what you have.</div></div>
    <div class="row g8">
      <span class="pill" style="color:${macro.color}">${macro.icon} ${macro.name}</span>
      <span class="pill">Hype ${(S.market.hype * 100).toFixed(0)}%</span>
    </div>
  </div>

  <div class="grid split-side">
    <div class="col g12">
      <div class="panel" data-tut="conditions">
        <div class="panel-head"><span class="panel-title">Conditions</span></div>
        <div class="panel-body col g12">
          <div class="small dim">${esc(macro.desc)}</div>
          ${meter('Sector hype', (S.market.hype * 100).toFixed(0) + '%', S.market.hype,
            S.market.hype > 0.66 ? 'var(--green)' : S.market.hype > 0.33 ? 'var(--amber)' : 'var(--red)')}
          ${meter('Saturation', (S.market.sectorSaturation * 100).toFixed(0) + '%', S.market.sectorSaturation, 'var(--red)')}
          <div class="tiny dim">Hype raises valuations, launch impact and organic growth. It also invites competitors.</div>
        </div>
      </div>

      ${nemesisPanel(S)}

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Competition</span>
          <span class="tiny dim">${rivals.length} active</span></div>
        <div class="panel-body">
          ${rivals.length === 0 ? `<div class="empty">Nobody is competing with you right now.<br/>Enjoy it.</div>` :
          `<div class="col g8">${rivals.sort((a, b) => b.threat - a.threat).map((c) => rivalRow(S, c)).join('')}</div>`}
        </div>
      </div>

      ${S.company.subsidiaries.length ? `
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Acquired</span></div>
        <div class="panel-body col g6">
          ${S.company.subsidiaries.map((s) => `<div class="row between small">
            <span>${esc(s.name)}</span><span class="mono dim">${money(s.price)} · d${Math.floor(s.day)}</span></div>`).join('')}
        </div>
      </div>` : ''}
    </div>

    <div class="col g12">
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Ledger</span>
          <span class="tiny mono ${r.total - e.total >= 0 ? 'c-green' : 'c-red'}">${r.total - e.total >= 0 ? '+' : ''}${money(r.total - e.total)}/day</span></div>
        <div class="panel-body col g6">
          <div class="row between small"><span class="c-green">Revenue</span><span class="mono">${money(r.revenue)}</span></div>
          ${r.interest > 1 ? `<div class="row between small"><span class="c-green">Interest</span><span class="mono">${money(r.interest)}</span></div>` : ''}
          <div class="divider" style="margin:4px 0"></div>
          ${Object.entries({ personal: 'Living', hosting: 'Hosting', serving: 'Serving',
            agents: 'Agents', compute: 'Compute', energy: 'Energy', upkeep: 'Upkeep',
            research: 'Research', marketing: 'Marketing', infra: 'Infra', interest: 'Debt',
            compliance: 'Compliance' })
            .filter(([k]) => e[k] > 0.5)
            .map(([k, label]) => `<div class="row between small"${LEDGER_TIP[k] ? ` data-tip="${esc(ledgerTip(S, k))}" data-tip-title="${label}"` : ''}>
              <span class="dim">${label}</span>
              <span class="mono c-red">−${money(e[k])}</span></div>`).join('')}
        </div>
      </div>

      ${S.unlocks.fundraising ? `
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Fundraising</span>
          <span class="tiny dim">you own ${pct(S.company.equity.founder, 1)}</span></div>
        <div class="panel-body col g8">
          ${roundRefusedByBoard(S) ? `<div class="tiny dim">The board will not sign a round this quarter.
            <span class="mono dimmer"> BOARD REFUSED &middot; ${roundRefusedByBoard(S).days}D</span></div>` :
            roundBlocked(S) ? `<div class="tiny dim">${esc(roundBlocked(S).why)}
            <span class="mono dimmer"> ${esc(roundBlocked(S).note)}</span></div>
            <button class="btn btn-sm" data-act="forfeit-doctrine" data-v="${esc(roundBlocked(S).id)}">Give it up and take a round</button>` :
            rounds.length === 0 ? `<div class="tiny dim">No rounds available at your current valuation. Grow, then come back.</div>` :
            rounds.map((rt) => {
              const o = raiseOffer(S, rt, m);
              return `<button class="action-btn" data-act="raise" data-v="${rt.id}">
                <div class="action-name" style="font-size:13px">${esc(rt.name)}</div>
                <div class="action-desc">${esc(rt.desc)}</div>
                <div class="action-cost"><span class="c-green">+${money(o.amount)}</span>
                  <span>at ${money(o.post)}</span><span class="c-red">−${pct(o.dilution, 1)}</span></div>
              </button>`;
            }).join('')}
          ${S.company.rounds.length ? `<div class="divider"></div>
            <div class="tiny dim mono col g4">${S.company.rounds.map((rd) => `
              <div class="row between"><span>${esc(rd.name)}</span><span>${money(rd.amount)} · ${money(rd.valuation)}</span></div>`).join('')}</div>` : ''}
        </div>
      </div>` : `
      <div class="panel">
        <div class="panel-body">
          <div class="bold mb8">Fundraising locked</div>
          <div class="small dim">Research <b>Pitch Craft</b> in the Capital branch to open the fundraising track — or bootstrap and keep all of it.</div>
        </div>
      </div>`}

      ${boardPanel(S)}

      ${valuationWhy(S, m)}

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Cap table</span></div>
        <div class="panel-body col g8">
          ${capRow('You', S.company.equity.founder, 'var(--green)')}
          ${S.company.equity.investors > 0.001 ? capRow('Investors', S.company.equity.investors, 'var(--amber)') : ''}
          ${S.company.equity.employees > 0.001 ? capRow('Team / options', S.company.equity.employees, 'var(--cyan)') : ''}
          ${S.company.equity.public > 0.001 ? capRow('Public float', S.company.equity.public, 'var(--violet)') : ''}
          <div class="divider" style="margin:4px 0"></div>
          <div class="row between"><span class="small">Your stake</span>
            <span class="mono bold c-green">${money(S.company.valuation * S.company.equity.founder)}</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

// §B1. The valuation is nine multiplicative terms, a saturation curve, a story
// floor, two strategic assets and a ceiling, and until this panel existed it
// was a number the game announced. Every row is a term `computeValuation`
// actually multiplies — `explainValuation` and the valuation itself run the
// same arithmetic — so a founder wondering why the round is worse this quarter
// can find the row that moved.
function valuationWhy(S, m) {
  const x = explainValuation(S, m);
  const t = x.terms;
  const onStory = t.story > t.arr * x.mult;
  return whyPanel(S, {
    id: 'valuation',
    title: 'Why the valuation is what it is',
    blocks: [
      whyBlock('The multiple', x.mult.toFixed(1) + '× ARR', x.rows),
      whyBlock('What it is applied to', money(x.total), x.floors),
    ],
    foot: `Annual run-rate <b>${money(t.arr)}</b> &middot; the stacked multiple is <b>${x.raw.toFixed(1)}×</b> and the market pays at most <b>${ECON.VALUATION_MULT_CAP}×</b>${
      onStory ? ` &middot; you are valued on the <b>story floor</b>, not on revenue — users, reputation and the team are worth more than what you bill.` : '.'}`,
  });
}

// §A6. The board, in the ledger column, beside the cap table that seated it.
// One line and one bar: confidence is the only number the board has, and every
// power it holds is a threshold on it, so it is the one thing a founder needs
// to be able to see slipping. Pure — `boardReading` reads state and computes
// nothing that is not already there.
function boardPanel(S) {
  const b = boardReading(S);
  if (!b) return '';
  const c = b.confidence;
  const colour = c >= BOARD.LOW * 2 ? 'var(--green)' : c >= BOARD.LOW ? 'var(--amber)' : 'var(--red)';
  const last = b.last;
  return `<div class="panel" data-tut="board">
    <div class="panel-head">
      <span class="panel-title">The Board</span>
      <span class="tiny dim">${b.seats} seat${b.seats === 1 ? '' : 's'} &middot; meets in ${b.nextIn}d</span>
    </div>
    <div class="panel-body col g8">
      ${meter('Confidence', b.word, clamp(c, 0, 1), colour)}
      ${b.locked ? `<div class="note-line mono tiny" style="color:var(--red)"
        data-tip="${esc(b.locked.why)}" data-tip-title="The board set it">BOARD ORDER &middot; ${b.locked.until}D</div>` : ''}
      ${!b.control ? `<div class="note-line mono tiny" style="color:var(--amber)"
        data-tip="Below ${Math.round(BOARD.CONTROL_EQUITY * 100)}% you cannot outvote the room. At the floor of its confidence, for ${BOARD.REMOVE_QUARTERS} quarters, it can remove you."
        data-tip-title="You do not hold control">NO CONTROL &middot; ${pct(S.company.equity.founder, 1)}</div>` : ''}
      ${last ? `<div class="row between small">
        <span class="dim">${esc(last.name)}</span>
        <span class="mono ${last.kept === true ? 'c-green' : last.kept === false ? 'c-red' : 'dim'}">${
          !last.accepted ? 'REFUSED' : last.kept === true ? 'KEPT' : last.kept === false ? 'MISSED' : 'OPEN'}</span>
      </div>` : `<div class="tiny dimmer">They have not asked for anything yet.</div>`}
      ${b.lowQuarters ? `<div class="tiny dim">${b.lowQuarters} quarter${b.lowQuarters === 1 ? '' : 's'} below the line. At ${BOARD.LOW_QUARTERS} they set the standing order.</div>` : ''}
    </div>
  </div>`;
}

function capRow(name, frac, color) {
  return `<div><div class="row between mb4"><span class="small">${name}</span>
    <span class="mono small">${pct(frac, 1)}</span></div>${bar(frac, color, { thin: true })}</div>`;
}

function rivalRow(S, c) {
  const pers = RIVAL_PERSONALITIES.find((p) => p.id === c.personality) || RIVAL_PERSONALITIES[0];
  const price = acquisitionPrice(S, c);
  const canBuy = S.unlocks.acquisitions;
  const pips = Math.round(clamp(c.threat, 0, 6));
  return `<div class="rival-row">
    <div style="min-width:0">
      <div class="rival-name">${esc(c.name)}</div>
      <div class="rival-sub">${pers.icon} ${pers.name} · ${esc(c.founder)}</div>
    </div>
    <div class="col" style="align-items:flex-end">
      <span class="mono small">${fmt(c.users)}</span><span class="tiny dim">users</span></div>
    <div class="col" style="align-items:flex-end">
      <span class="mono small">${money(c.mrr)}</span><span class="tiny dim">mrr</span></div>
    <div class="threat-pips" data-tip="${esc(pers.line)}" data-tip-title="Threat level">
      ${Array.from({ length: 6 }, (_, i) => `<span class="pip ${i < pips ? 'on' : ''}"></span>`).join('')}
    </div>
    ${canBuy ? `<button class="btn btn-sm" data-act="acquire" data-v="${c.id}" ${S.company.cash < price ? 'disabled' : ''}>
      Buy · ${money(price)}</button>` : '<span></span>'}
  </div>`;
}

// ── The feud ───────────────────────────────────────────────────────────────
// One rival, told as a person: who they are, where they stand against you,
// how much of their attention you occupy, and the last things they did.
function nemesisPanel(S) {
  const c = nemesisOf(S);
  const sieges = siegeStrip(S);
  if (!c) return sieges + aperturePanel(S);
  const n = nemesisState(S);
  const pers = RIVAL_PERSONALITIES.find((p) => p.id === c.personality) || RIVAL_PERSONALITIES[0];
  const band = grudgeBand(n.grudge);
  const ours = totalUsers(S), theirs = c.users;
  const ahead = ours >= theirs;
  const g = clamp(n.grudge / 3.4, 0, 1);

  return `${sieges}
  <div class="panel nemesis" style="--nc:${ahead ? 'var(--amber)' : 'var(--red)'}">
    <div class="panel-head">
      <span class="panel-title">The Feud</span>
      <span class="nem-band" data-tip="${esc(band.note)}" data-tip-title="Grudge">${esc(band.name)}</span>
    </div>
    <div class="panel-body">
      <div class="nem-top">
        <span class="nem-mark">${pers.icon}</span>
        <span class="nem-who">
          <span class="nem-name">${esc(c.name)}</span>
          <span class="nem-sub">${esc(c.founder)} &middot; ${esc(c.handle)} &middot; ${esc(pers.name)}</span>
        </span>
        <span class="nem-since">d${Math.floor(n.since)}</span>
      </div>
      <div class="nem-line">${esc(pers.line)}</div>

      <div class="nem-scales">
        ${scaleRow('users', fmt(ours), fmt(theirs), ours, theirs)}
        ${scaleRow('mrr', money(totalMrr(S)), money(c.mrr), totalMrr(S), c.mrr)}
      </div>

      <div class="nem-grudge">
        <span class="nem-k">grudge</span>
        <span class="nem-bar"><i style="width:${(g * 100).toFixed(0)}%"></i></span>
        <span class="nem-pct">${n.grudge.toFixed(1)}</span>
      </div>

      ${seasonRow(S)}

      ${n.moves.length ? `<div class="nem-moves">
        <div class="nem-k mb6">what they have done</div>
        ${n.moves.slice(0, 4).map((mv) => `<div class="nem-move">
          <span class="nem-day">d${mv.day}</span>
          <span class="nem-what">${esc(mv.name)}</span>
          <span class="nem-eff">${(mv.effects || []).map(([k, v]) =>
            `<i class="${v > 0 ? 'up' : 'down'}">${esc(k)}</i>`).join('')}</span>
        </div>`).join('')}
      </div>` : `<div class="tiny dimmer mt10">They have not moved against you yet.</div>`}

      ${intelReveals(S) ? `<div class="nem-moves">
        <div class="nem-k mb6" data-tip="Intelligence agents on Operations read what the rival can do next. The list is what they could actually do this week, not a guess." data-tip-title="What they are weighing">what they are weighing</div>
        ${availableMoves(S).map((mv) => `<div class="nem-move">
          <span class="nem-day">◉</span>
          <span class="nem-what">${esc(mv.name)} <span class="dim">&middot; ${esc(mv.sub)}</span></span>
        </div>`).join('') || '<div class="tiny dimmer">Nothing they can reach you with right now.</div>'}
      </div>` : ''}

      ${approachRow(S)}

      <div class="nem-counters">
        <div class="nem-k mb6">what you can do back${intelDiscount(S) ? ` <span class="dim" data-tip="Intelligence agents on Operations cut the cash side of every counter." data-tip-title="Intel">· intel −${Math.round(intelDiscount(S) * 100)}%</span>` : ''}</div>
        ${availableCounters(S).map((k) => `
          <button class="counter ${k.ok ? '' : 'shut'}" data-act="counter" data-v="${k.id}" ${k.ok ? '' : 'disabled'}>
            <span class="ct-top">
              <span class="ct-name">${esc(k.name)}</span>
              <span class="ct-cost ${k.afford ? '' : 'over'}">${esc(k.costLabel)}${k.cost?.cash ? ` &middot; ${money(k.cost.cash)}${k.discount ? ' after intel' : ''}` : ''}</span>
            </span>
            <span class="ct-desc">${esc(k.desc)}</span>
            ${!k.need ? '<span class="ct-why">not available right now</span>' : ''}
          </button>`).join('')}
      </div>

      <button class="btn btn-sm btn-block mt12" data-act="acquire" data-v="${c.id}"
        ${S.company.cash >= acquisitionPrice(S, c) ? '' : 'disabled'}>
        ${S.company.cash >= acquisitionPrice(S, c)
          ? `End it &middot; buy ${esc(c.name)} for ${money(acquisitionPrice(S, c))}`
          : `Buying them would cost ${money(acquisitionPrice(S, c))}`}
      </button>
    </div>
  </div>
  ${c.scripted ? '' : aperturePanel(S)}`;
}

// ── §A14 The season ────────────────────────────────────────────────────────
// What they are trying to do, for the next few months. Without Intelligence
// agents on Operations the founder gets the telegraph they posted and the
// pattern in the moves; with them, the objective outright and how far into the
// season it is. The record underneath is the seasons that have finished and
// who was right about each one.
function seasonRow(S) {
  const n = nemesisState(S);
  const goal = activeGoal(S);
  const past = (n.seasons || []).slice(0, 3);
  if (!goal && !past.length) return '';
  const revealed = intelReveals(S);
  const days = goal ? Math.max(0, Math.round(NEMESIS.SEASON_DAYS - (S.time.day - goal.startedDay))) : 0;
  return `<div class="nem-season">
    <div class="nem-k mb6" data-tip="A rival that draws from a pool with no objective is weather with a founder's name on it. They choose something to be doing each season, say enough about it in the Wire to give it away, and weight their moves toward it. Intelligence agents on Operations read the objective outright." data-tip-title="This season">what they are trying to do</div>
    ${goal ? `<div class="nem-goal ${revealed ? 'seen' : ''}">
      <span class="ng-mark">${revealed ? '◉' : '◌'}</span>
      <span class="ng-what">
        <span class="ng-name">${revealed ? esc(goal.name) : 'Something specific'}</span>
        <span class="ng-sub">${revealed ? esc(goal.sub) : 'They have said what it is. They have not said what they mean.'}</span>
      </span>
      <span class="ng-days mono">${days}d left</span>
    </div>` : ''}
    ${past.length ? `<div class="nem-record">
      ${past.map((s) => `<span class="nr-row ${s.won ? 'won' : 'lost'}">
        <span class="nr-day">d${s.day}</span>
        <span class="nr-what">${esc(GOAL_MAP[s.goal]?.name || s.goal)}</span>
        <span class="nr-out">${s.won ? 'they got it' : 'they did not'}</span>
      </span>`).join('')}
    </div>` : ''}
  </div>`;
}

// ── §H13 What is on the table this week ────────────────────────────────────
// An approach they have opened and not closed: a name they are in the middle
// of hiring, or a product they have decided to break. It is only here when the
// founder has bought the ability to see it — Intelligence agents on
// Operations, or a Vance warm enough to say so — because a window nobody can
// see is a window nobody can answer, and the counter under it says how.
function approachRow(S) {
  const p = pendingApproach(S);
  if (!p || !seesApproach(S)) return '';
  const days = Math.max(0, Math.ceil(p.counterUntil - S.time.day));
  return `<div class="nem-season">
    <div class="nem-k mb6" data-tip="A poach and a sabotage name their target days before they land. What you can do about it is the counter directly below, and it closes when the offer does." data-tip-title="On the table">what they have started</div>
    <div class="nem-goal seen">
      <span class="ng-mark">${p.answerable ? '◉' : '◌'}</span>
      <span class="ng-what">
        <span class="ng-name">${esc(p.kind === 'poach' ? `Hiring out of ${p.lane}` : `Mapping ${p.product}`)}</span>
        <span class="ng-sub">${p.countered
          ? 'You have answered it. It still lands, or it does not, on its own day.'
          : p.answerable ? 'There is still time to answer this.' : 'Too late to answer. It resolves on its own day.'}</span>
      </span>
      <span class="ng-days mono">${p.answerable ? `${days}d to answer` : 'closed'}</span>
    </div>
  </div>`;
}

// ── §H12 What they mean to do next ─────────────────────────────────────────
// Aperture writes its week down before it plays it. The founder reads it only
// with Intelligence agents on Operations; everybody else finds out on the day,
// the way everybody else always did.
function intentRow(S) {
  if (!intelReveals(S)) return '';
  const i = apertureIntent(S);
  if (!i) return `<div class="ap-row mt8"><span class="ap-k">next</span><span class="ap-res dim">nothing decided yet</span></div>`;
  const days = Math.max(0, Math.ceil(i.until - S.time.day));
  return `<div class="ap-row mt8">
    <span class="ap-k">next</span>
    <span class="ap-res" data-tip="They decide the week before they play it. Intelligence agents on Operations read the decision; without them you find out on the day." data-tip-title="What they mean to do">${esc(i.name)} <span class="dim">&middot; ${days > 0 ? `within ${days}d` : 'this week'}${i.by === 'chair' ? ' &middot; somebody chose it' : ''}</span></span>
  </div>`;
}

// ── The company behind the feud ────────────────────────────────────────────
// Aperture plays the same game. This is what it did with its week: who it
// hired, what it is researching, where it is pointed, and how much of that has
// become frontier capability. Everything here is state the rival actually
// holds, not a number the game made up about it.
// A second human. The link opens Vance's chair on another machine, through
// the dev server's relay; from `localhost` it reaches only this one, and the
// row says which.
function inviteRow(S) {
  const link = inviteLink(S);
  if (!link) return '';
  return `<div class="ap-invite" data-tip="Open this in a second window and somebody else plays Aperture's week — hire, ship, undercut, poach — and speaks as Vance in your Wire. From a network address it works from another machine; from localhost, only this one." data-tip-title="Two humans">
    <span class="ap-k">A SECOND HUMAN</span>
    <span class="ap-link mono">${esc(link)}</span>
    <button class="btn btn-sm btn-ghost" data-act="copy-invite" data-tip="Copy the link">Copy</button>
    <span class="tiny dim">reaches ${esc(inviteReach())}</span>
  </div>`;
}

function aperturePanel(S) {
  const a = apertureState(S);
  if (!a) return '';
  return `<div class="panel aperture ${a.alive ? '' : 'gone'}" data-tut="aperture">
    <div class="panel-head">
      <span class="panel-title">Aperture Systems</span>
      <span class="tiny dim">${a.alive ? esc(a.focusName) : esc(a.status)}</span>
    </div>
    <div class="panel-body">
      <div class="ap-grid">
        <div class="ap-cell"><span class="ap-k">funding</span><span class="ap-v">${money(a.funding)}</span></div>
        <div class="ap-cell"><span class="ap-k">roster</span><span class="ap-v">${a.roster}</span></div>
        <div class="ap-cell"><span class="ap-k">users</span><span class="ap-v">${fmt(a.users)}</span></div>
        <div class="ap-cell"><span class="ap-k">learned</span><span class="ap-v">${a.researchDone}</span></div>
      </div>
      <div class="ap-row">
        <span class="ap-k">researching</span>
        <span class="ap-res">${a.researching ? esc(a.researching) : '<span class="dim">nothing this week</span>'}</span>
      </div>
      ${a.researching ? bar(a.progress, 'var(--violet)', { thin: true }) : ''}
      <div class="ap-row mt8">
        <span class="ap-k">frontier</span>
        <span class="ap-res" data-tip="Their lab's speed in the race is what this company holds — the frontier nodes it has finished, the people running them, and the compute its money buys. The comparison is the same lab with none of it: a name, a building and last year's model." data-tip-title="What the company buys the lab">${a.capability} capability${a.capability > 0 ? ` · the lab runs ${Math.round((apertureRaceMult(S) - 1) * 100)}% faster than an empty one` : ''}</span>
      </div>
      ${a.blocs?.length ? `<div class="ap-row">
        <span class="ap-k">blocs</span>
        <span class="ap-res">${a.blocs.map((b) => esc(b.toUpperCase())).join(' · ')}${a.building ? ` <span class="dim">· building in ${esc(a.building)}</span>` : ''}</span>
      </div>` : a.building ? `<div class="ap-row">
        <span class="ap-k">blocs</span>
        <span class="ap-res dim">building in ${esc(a.building)}</span>
      </div>` : ''}
      <div class="ap-focus" data-tip="${esc(a.focusLine)}" data-tip-title="${esc(a.focusName)}">
        <span class="ap-k">pointed at</span><span>${esc(a.focusName)}</span>
      </div>
      ${intentRow(S)}
      ${a.plays.length ? `<div class="ap-plays">
        <div class="ap-k mb6">their week</div>
        ${a.plays.slice(0, 4).map((p) => `<div class="ap-play"><span class="ap-day">d${p.day}</span><span class="ap-kind">${esc(PLAYS[p.kind]?.icon || '·')}</span><span class="ap-text">${esc(p.text)}</span></div>`).join('')}
      </div>` : `<div class="tiny dimmer mt10">They have not made a move yet. They will.</div>`}
    </div>
  ${inviteRow(S)}
  </div>`;
}

function scaleRow(label, ourText, theirText, ourVal, theirVal) {
  const total = Math.max(1, ourVal + theirVal);
  const share = clamp(ourVal / total, 0, 1);
  return `<div class="nem-scale">
    <span class="nem-k">${label}</span>
    <span class="nem-mine">${ourText}</span>
    <span class="nem-track"><i class="nem-ours" style="width:${(share * 100).toFixed(1)}%"></i></span>
    <span class="nem-theirs">${theirText}</span>
  </div>`;
}

// Temporary pressure the feud creates. Loud while it lasts, gone when it ends.
function siegeStrip(S) {
  const bits = [];
  if (S.market.priceSiege > 0) bits.push(['Price war', Math.ceil(S.market.priceSiege), 'churn +22% while it holds']);
  if (S.market.channelLock > 0) bits.push(['Channel locked', Math.ceil(S.market.channelLock), 'organic growth −18%']);
  if (!bits.length) return '';
  return `<div class="siege">${bits.map(([n, d, why]) => `
    <div class="siege-row">
      <span class="siege-name">${esc(n)}</span>
      <span class="siege-why">${esc(why)}</span>
      <span class="siege-days">${d}d left</span>
    </div>`).join('')}</div>`;
}

// ── §A1 The ledger's new rows ───────────────────────────────────────────────
// Four lines arrived with scarcity and three of them are sums of things the
// founder chose, so each says what it is made of rather than printing a number
// and leaving the player to guess which decision produced it.
const LEDGER_TIP = {
  serving: 1, upkeep: 1, research: 1, compute: 1,
};
function ledgerTip(S, k) {
  if (k === 'serving') {
    return 'What your users cost to serve: per category, per user, above the '
      + 'allowance the flat hosting bill already covers. It does not move when '
      + 'you change the price — which is what makes the price a margin.';
  }
  if (k === 'upkeep') {
    const rows = [...projectUpkeepRows(S), ...regionUpkeepRows(S)]
      .sort((a, b) => b.daily - a.daily).slice(0, 6);
    if (!rows.length) return 'Everything you have built and everywhere you stand, kept running.';
    return 'Everything you have built and everywhere you stand, kept running. '
      + rows.map((r) => `${r.name}${r.n > 1 ? ' ×' + r.n : ''} ${money(r.daily)}`).join(' · ');
  }
  if (k === 'research') {
    return 'The labs. A day of research is a day of somebody’s cluster, and '
      + 'the deeper the node the dearer the day. Stop the tree and this stops.';
  }
  return 'Provisioned compute, billed on what you hold rather than what you use.';
}
