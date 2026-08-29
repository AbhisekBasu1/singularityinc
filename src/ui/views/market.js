// ── MARKET ─────────────────────────────────────────────────────────────────
import { esc, bar, meter, sparkline } from '../dom.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { MACRO, RIVAL_PERSONALITIES, activeCompetitors, acquisitionPrice } from '../../systems/market.js';
import { availableRounds, raiseOffer, computeValuation, expenseBreakdown, dailyRevenue, ROUND_TYPES } from '../../systems/economy.js';
import { CATEGORY_MAP } from '../../data/products.js';
import { computeMods } from '../../systems/modifiers.js';
import { totalMrr, totalUsers } from '../../systems/product.js';
import { nemesisOf, nemesisState, grudgeBand, availableCounters } from '../../systems/nemesis.js';

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
          ${Object.entries({ personal: 'Living', hosting: 'Hosting', agents: 'Agents', compute: 'Compute',
            energy: 'Energy', marketing: 'Marketing', infra: 'Infra', interest: 'Debt',
            compliance: 'Compliance' })
            .filter(([k]) => e[k] > 0.5)
            .map(([k, label]) => `<div class="row between small"><span class="dim">${label}</span>
              <span class="mono c-red">−${money(e[k])}</span></div>`).join('')}
        </div>
      </div>

      ${S.unlocks.fundraising ? `
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Fundraising</span>
          <span class="tiny dim">you own ${pct(S.company.equity.founder, 1)}</span></div>
        <div class="panel-body col g8">
          ${rounds.length === 0 ? `<div class="tiny dim">No rounds available at your current valuation. Grow, then come back.</div>` :
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
  if (!c) return sieges;
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

      ${n.moves.length ? `<div class="nem-moves">
        <div class="nem-k mb6">what they have done</div>
        ${n.moves.slice(0, 4).map((mv) => `<div class="nem-move">
          <span class="nem-day">d${mv.day}</span>
          <span class="nem-what">${esc(mv.name)}</span>
          <span class="nem-eff">${(mv.effects || []).map(([k, v]) =>
            `<i class="${v > 0 ? 'up' : 'down'}">${esc(k)}</i>`).join('')}</span>
        </div>`).join('')}
      </div>` : `<div class="tiny dimmer mt10">They have not moved against you yet.</div>`}

      <div class="nem-counters">
        <div class="nem-k mb6">what you can do back</div>
        ${availableCounters(S).map((k) => `
          <button class="counter ${k.ok ? '' : 'shut'}" data-act="counter" data-v="${k.id}" ${k.ok ? '' : 'disabled'}>
            <span class="ct-top">
              <span class="ct-name">${esc(k.name)}</span>
              <span class="ct-cost ${k.afford ? '' : 'over'}">${esc(k.costLabel)}</span>
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
