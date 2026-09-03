// ── PRODUCT ────────────────────────────────────────────────────────────────
import { esc, bar, meter, slider, sparkline, noteSlot } from '../dom.js';
import { launchNote } from '../notes.js';
import { fmt, money, pct, clamp } from '../../engine/format.js';
import { CATEGORY_MAP, CATEGORIES, PRICING_MODELS, FEATURE_KINDS } from '../../data/products.js';
import { totalUsers, totalMrr, featureCost, pricingAllowed, explainProduct, portfolioEffects,
         launchEstimate, serveCostPerUser, servingCostPerDay, grossMargin,
         PRICE_CLICK_COST } from '../../systems/product.js';
import { marketingMax, infraMax, marketingAwareness, expenseBreakdown } from '../../systems/economy.js';
import { computeMods } from '../../systems/modifiers.js';
import { ECON } from '../../data/balance.js';
import { activeProduct } from '../../engine/state.js';
import { alarmClass } from '../alarm.js';

const KIND_COLOR = { core: 'var(--cyan)', ux: 'var(--violet)', ai: 'var(--green)',
  integration: 'var(--blue)', perf: 'var(--amber)', trust: 'var(--ink-2)', wild: 'var(--pink)' };

export function render(S) {
  const m = computeMods(S);
  const p = activeProduct(S);
  const canMulti = S.company.act >= 2;

  return `
  <div class="view-head">
    <div><div class="view-title">Product</div>
      <div class="view-sub">What you have built, who uses it, and what they pay.</div></div>
    ${canMulti ? `<button class="btn btn-ghost" data-act="new-product">+ New Product</button>` : ''}
  </div>

  ${S.products.length > 1 ? portfolioPanel(S) : ''}

  ${!p ? `<div class="empty">No product.</div>` : `
  <div class="grid split-side">
    <div class="col g12">
      <div class="panel${alarmClass('incident')}" data-tut="product-head">
        <div class="panel-head">
          <span class="panel-title">${esc(p.name)}</span>
          <span class="row g6">
            <span class="pill" style="color:${CATEGORY_MAP[p.category]?.color}">${CATEGORY_MAP[p.category]?.icon} ${esc(CATEGORY_MAP[p.category]?.name)}</span>
            ${p.launched ? `<span class="pill green">Live since d${Math.floor(p.launchDay)}</span>` : `<span class="pill amber">Draft</span>`}
          </span>
        </div>
        <div class="panel-body">
          <div class="grid grid-tiles mb16">
            ${p.launched ? `
              ${tile('Users', fmt(p.users), `peak ${fmt(p.peakUsers)}`)}
              ${tile('MRR', money(p.mrr), `${fmt(p.payingUsers)} paying`)}
              ${tile('Churn', pct(p.churnMonthly, 1) + '/mo', p.churnMonthly < 0.03 ? 'excellent' : p.churnMonthly < 0.07 ? 'healthy' : 'leaking')}
              ${tile('Viral k', p.viralK.toFixed(2), p.viralK > 0.5 ? 'compounding' : p.viralK > 0.2 ? 'helping' : 'flat')}`
            : `
              ${tile('Features', String(p.features.length), 'shipped so far')}
              ${tile('Status', 'Draft', 'not live yet')}
              ${tile('Category', CATEGORY_MAP[p.category]?.name || '—', CATEGORY_MAP[p.category]?.tagline || '')}
              ${tile('Market', fmt(CATEGORY_MAP[p.category]?.tam || 0), 'addressable users')}`}
          </div>
          <div class="grid grid-2" style="gap:14px">
            <div class="col g10">
              ${meter('Quality', (p.quality * 100).toFixed(0), clamp(p.quality, 0, 1), 'var(--cyan)')}
              ${meter('Appeal', (p.appeal * 100).toFixed(0), clamp(p.appeal, 0, 1), 'var(--green)')}
              ${meter('Polish', (p.polish * 100).toFixed(0), clamp(p.polish, 0, 1), 'var(--violet)')}
            </div>
            <div class="col g10">
              <div data-tip="Reliability drifts toward an equilibrium set by tech debt, quality, scale and how much Operations capacity you run. Fix the inputs and it recovers on its own." data-tip-title="Reliability">
                ${meter('Reliability', (p.reliability * 100).toFixed(1) + '% → ' + ((p.reliabilityTarget ?? p.reliability) * 100).toFixed(0) + '%', p.reliability,
                  p.reliability > 0.9 ? 'var(--green)' : p.reliability > 0.75 ? 'var(--amber)' : 'var(--red)')}
              </div>
              ${meter('Sentiment', (p.sentiment * 100).toFixed(0), p.sentiment,
                p.sentiment > 0.6 ? 'var(--green)' : p.sentiment > 0.4 ? 'var(--amber)' : 'var(--red)')}
              ${meter('Awareness', fmt(p.awareness), clamp(p.awareness / 20000, 0, 1), 'var(--amber)')}
            </div>
          </div>
        </div>
      </div>

      ${p.launched ? explainPanel(S, p) : ''}

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Shipped (${p.features.length})</span>
          <span class="tiny dim">next costs ${fmt(featureCost(S, p))} code</span></div>
        <div class="panel-body">
          ${p.features.length === 0 ? `<div class="empty">Nothing shipped yet. Write code on The Desk.</div>` :
            `<div class="ship-grid">
            ${p.features.slice().reverse().slice(0, 40).map((f, i) => `
              <div class="ship-row" style="--kc:${KIND_COLOR[f.kind]}"
                data-tip="${esc(f.by
                  ? `Built by <b>${esc(f.by)}</b> — the largest share of the build lane the day it shipped. Fit ${(f.fit * 100).toFixed(0)}%: how much of it was the thing users actually wanted.`
                  : `You wrote this one. Fit ${(f.fit * 100).toFixed(0)}%: how much of it was the thing users actually wanted.`)}"
                data-tip-title="${esc(f.name)}">
                <span class="ship-n">${String(p.features.length - i).padStart(3, '0')}</span>
                <span class="ship-name">${esc(f.name)}</span>
                <span class="ship-kind">${f.kind}</span>
                <span class="ship-meta">d${Math.floor(f.day)} · ${(f.fit * 100).toFixed(0)}% · <span class="ship-by">${f.by ? esc(f.by) : 'you'}</span></span>
              </div>`).join('')}
          </div>`}
        </div>
      </div>
    </div>

    <div class="col g12">
      ${p.launched ? `
      <div class="panel" data-tut="pricing">
        <div class="panel-head"><span class="panel-title">Pricing</span></div>
        <div class="panel-body col g12">
          <div>
            <div class="row between mb8"><span class="meter-label">Price</span>
              <span class="mono bold">${money(p.price)}/mo</span></div>
            <div class="row g6">
              <button class="btn btn-sm grow" data-act="price" data-v="0.75">−25%</button>
              <button class="btn btn-sm grow" data-act="price" data-v="0.9">−10%</button>
              <button class="btn btn-sm grow" data-act="price" data-v="1.1">+10%</button>
              <button class="btn btn-sm grow" data-act="price" data-v="1.5">+50%</button>
            </div>
            <div class="price-trade mt8">
              <span class="pt-side low">below fair &middot; buys reach</span>
              <span class="pt-mark" style="left:${(clamp(Math.log(Math.max(0.2, p.price / Math.max(1, p.fairPrice || p.price))) / Math.log(3) * 0.5 + 0.5, 0.02, 0.98) * 100).toFixed(1)}%"></span>
              <span class="pt-side high">above fair &middot; buys churn</span>
            </div>
            <div class="tiny dim mt6">Fair value is <b>${money(p.fairPrice || 0)}</b>. Under it you grow faster and earn less per user; over it conversion collapses and churn multiplies.</div>
            <div class="tiny dimmer mt4">Every rise costs
              <b>${PRICE_CLICK_COST.sentiment.toFixed(2)}</b> sentiment and
              <b>${PRICE_CLICK_COST.momentum.toFixed(2)}</b> momentum, once, on the press. Cuts are free.</div>
          </div>
          ${marginRow(S, p, m)}
          <div class="divider" style="margin:0"></div>
          <div>
            <div class="meter-label mb8">Model</div>
            <div class="col g6">
              ${Object.values(PRICING_MODELS).filter((pm) => pricingAllowed(S, p, pm)).map((pm) => `
                <button class="sel-row ${p.pricing === pm.id ? 'on' : ''}" data-act="pricing" data-v="${pm.id}"
                  ${p.pricing === pm.id ? 'disabled' : ''}>
                  <span class="sel-box">${p.pricing === pm.id ? '■' : '&nbsp;'}</span>
                  <span class="sel-text">
                    <span class="sel-name">${esc(pm.name)}</span>
                    <span class="sel-desc">${esc(pm.desc)}</span>
                  </span>
                </button>`).join('')}
            </div>
          </div>
        </div>
      </div>

      ${p.launched ? spendPanel(S, m) : ''}

      <div class="panel">
        <div class="panel-head"><span class="panel-title">Trajectory</span></div>
        <div class="panel-body col g12">
          <div><div class="meter-label mb4">Users</div>${sparkline(S.company.userHistory, { color: 'var(--green)' })}</div>
          <div><div class="meter-label mb4">MRR</div>${sparkline(S.company.revenueHistory, { color: 'var(--cyan)' })}</div>
          <div><div class="meter-label mb4">Valuation</div>${sparkline(S.company.valuationHistory, { color: 'var(--amber)', log: true })}</div>
        </div>
      </div>` : `
      <div class="panel glow-green">
        <div class="panel-head"><span class="panel-title">Launch</span></div>
        <div class="panel-body">
          <div class="small dim mb12">Launch strength is set by <b>quality</b>, <b>polish</b>, <b>reputation</b> and how hot the market is right now. It only happens once.</div>
          ${meter('Projected impact', estimateLaunch(S, p), clamp(p.quality * (0.6 + p.polish), 0, 1), 'var(--green)')}
          ${seedRange(S, p)}
          ${noteSlot(launchNote(p), 'Launch', 'block', `<button class="btn btn-primary btn-block btn-lg mt16" data-act="launch" ${p.features.length < 1 ? 'disabled' : ''}>
            ${p.features.length < 1 ? 'Ship a feature first' : 'Launch ' + esc(p.name)}</button>`)}
        </div>
      </div>`}
    </div>
  </div>`}`;
}

function portfolioPanel(S) {
  const pf = portfolioEffects(S);
  return `<div class="panel mb16">
    <div class="panel-head">
      <span class="panel-title">${pf.suiteName ? `The ${esc(pf.suiteName)}` : 'Portfolio'}</span>
      <span class="tiny dim">${pf.count} live · ${pf.distinct} distinct categor${pf.distinct === 1 ? 'y' : 'ies'}</span>
    </div>
    <div class="panel-body">
      <div class="row g6 wrap mb12">
        ${S.products.map((x) => {
          const c = CATEGORY_MAP[x.category];
          return `<button class="btn btn-sm ${x.id === S.activeProductId ? 'btn-primary' : 'btn-ghost'}"
            data-act="select-product" data-v="${x.id}">
            <span style="color:${x.id === S.activeProductId ? 'inherit' : c?.color}">${c?.icon || '◈'}</span>
            ${esc(x.name)}${x.launched ? '' : ' ·draft'}</button>`;
        }).join('')}
        ${S.company.act >= 2 ? `<button class="btn btn-sm btn-ghost" data-act="new-product">+ New</button>` : ''}
      </div>
      <div class="grid grid-tiles">
        ${pfTile('Cross-sell churn', '×' + pf.churnMult.toFixed(2), pf.churnMult < 1 ? 'var(--green)' : 'var(--ink-3)',
          'Customers with two of your products leave far less often.')}
        ${pfTile('Revenue per user', '×' + pf.arpuMult.toFixed(2), pf.arpuMult > 1 ? 'var(--green)' : 'var(--ink-3)',
          'A suite commands a higher price than the sum of its parts.')}
        ${pfTile('Launch strength', '×' + pf.launchBoost.toFixed(2), 'var(--green)',
          'Existing distribution makes every new launch land harder.')}
        ${pfTile('Overlap penalty', '×' + pf.cannibalize.toFixed(2), pf.cannibalize < 1 ? 'var(--red)' : 'var(--ink-3)',
          'Two products in the same category eat each other.')}
      </div>
    </div>
  </div>`;
}
function pfTile(label, value, color, note) {
  return `<div class="stat-tile" data-tip="${esc(note)}" data-tip-title="${esc(label)}">
    <div class="stat-tile-label">${label}</div>
    <div class="stat-tile-value" style="color:${color};font-size:17px">${value}</div></div>`;
}

function explainPanel(S, p) {
  const x = explainProduct(S, p);
  if (!x) return '';
  const block = (title, sub, data, invert) => `
    <div class="col g6">
      <div class="row between">
        <span class="meter-label">${title}</span>
        <span class="mono small" style="color:${invert ? 'var(--red)' : 'var(--green)'}">${sub}</span>
      </div>
      ${data.rows.map(([label, v, note, kind]) => {
        let text, color;
        if (kind === 'raw') { text = v < 1 ? v.toFixed(4).replace(/0+$/, '') : fmt(v); color = 'var(--ink-2)'; }
        else if (kind === 'pct') { text = (v * 100).toFixed(1) + '%'; color = 'var(--ink-2)'; }
        else if (kind === 'money') { text = money(v); color = 'var(--ink-2)'; }
        else if (kind === 'frac') { text = (v * 100).toFixed(0) + '%'; color = v > 0.5 ? 'var(--green)' : v > 0.15 ? 'var(--amber)' : 'var(--red)'; }
        else {
          const neutral = Math.abs(v - 1) < 0.02;
          const good = invert ? v < 1 : v > 1;
          text = '×' + v.toFixed(2);
          color = neutral ? 'var(--ink-4)' : good ? 'var(--green)' : 'var(--red)';
        }
        return `<div class="row between g8" data-tip="${esc(note)}" data-tip-title="${esc(label)}">
          <span class="tiny dim" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
          <span class="mono tiny" style="color:${color}">${text}</span>
        </div>`;
      }).join('')}
    </div>`;
  return `<div class="panel" data-tut="explain">
    <div class="panel-head">
      <span class="panel-title">Why the numbers are what they are</span>
      <span class="tiny dim">hover any row</span>
    </div>
    <div class="panel-body grid grid-3" style="gap:18px">
      ${block('Daily growth', (x.growth.total * 100).toFixed(2) + '%/day', x.growth, false)}
      ${block('Monthly churn', (x.churn.total * 100).toFixed(2) + '%/mo', x.churn, true)}
      ${block('Revenue', money(x.revenue.total) + '/mo', x.revenue, false)}
    </div>
    <div class="panel-body" style="padding-top:0">
      <div class="tiny dimmer">Addressable market: <b>${fmt(x.effTam)}</b> · you hold <b>${((1 - x.tamLeft) * 100).toFixed(1)}%</b> of it · fair price <b>${money(x.fairPrice)}</b> vs your <b>${money(p.price)}</b>${
        p.discountReach > 1.02 ? ` · discount is buying <b>${((p.discountReach - 1) * 100).toFixed(0)}%</b> more reach` : ''}.</div>
    </div>
  </div>`;
}

// The seed users the launch roll can land, from the same strength the launch
// itself uses — the roll is the only thing between the two ends.
function seedRange(S, p) {
  const e = launchEstimate(S, p);
  if (!Number.isFinite(e.seedLo) || !Number.isFinite(e.seedHi)) return '';
  return `<div class="row between mt8 tiny mono dim" data-tip="What the launch itself computes, minus the roll. Ship more, polish more, or wait for a hotter market to move both ends." data-tip-title="Seed users">
    <span>first users</span><span>${fmt(e.seedLo)} – ${fmt(e.seedHi)}</span></div>`;
}

function estimateLaunch(S, p) {
  const s = (0.35 + p.quality) * (0.6 + p.polish * 1.4) * (1 + Math.min(2, S.resources.reputation / 260));
  if (s > 2.6) return 'Enormous';
  if (s > 1.7) return 'Strong';
  if (s > 1.0) return 'Solid';
  if (s > 0.55) return 'Modest';
  return 'Quiet';
}

function tile(label, value, sub) {
  return `<div class="stat-tile"><div class="stat-tile-label">${label}</div>
    <div class="stat-tile-value">${value}</div><div class="stat-tile-sub">${esc(sub)}</div></div>`;
}

// ── §A5 The margin, and §A17 the two dials ─────────────────────────────────
// Serving cost is per category, per user, and independent of what you charge —
// so the price buttons above are a margin decision and this is the readout that
// makes it one. A free app shows the whole bill and no revenue against it.
function marginRow(S, p, m) {
  // The damped total over the whole book, not the raw per-user rate: past the
  // world-GDP ceiling `servingCostPerDay` bends and the raw rate does not, and
  // a readout that disagreed with the Ledger would be the more believable of
  // the two and the wrong one.
  const total = servingCostPerDay(S, m);
  const users = totalUsers(S);
  const per = users > 0 ? total / users : serveCostPerUser(S, p, m);
  const gm = grossMargin(S, m);
  const cat = CATEGORY_MAP[p.category];
  const billable = Math.max(0, p.users - ECON.SERVE_FREE_USERS);
  const colour = gm == null ? 'var(--ink-2)'
    : gm > 0.75 ? 'var(--green)' : gm > 0.45 ? 'var(--amber)' : 'var(--red)';
  return `<div class="divider" style="margin:0"></div>
  <div data-tip="Serving is what a user costs you to run: this category's appetite (${esc(cat.name)}, ×${(cat.computeHungry ?? 1).toFixed(2)}) against what the product is worth. It does not move when you change the price — which is what makes the price a margin." data-tip-title="Gross margin">
    <div class="row between mb4"><span class="meter-label">Gross margin</span>
      <span class="mono bold" style="color:${colour}">${gm == null ? '—' : pct(gm, 0)}</span></div>
    <div class="row between tiny dim"><span>Serving, per user</span>
      <span class="mono">${money(per * 30, 2)}/mo</span></div>
    <div class="row between tiny dim"><span>Serving, today</span>
      <span class="mono">${money(total)}/day</span></div>
    <div class="tiny dimmer mt4">${billable <= 0
      ? `The first ${fmt(ECON.SERVE_FREE_USERS)} users of a product ride on the flat hosting bill.`
      : `A better margin lifts the valuation multiple; a worse one cuts it.`}</div>
  </div>`;
}

// Two dials the ledger has always had rows for and nothing ever wrote. Both are
// scale-relative: the top of each slider is a share of what the company earns
// in a day, so neither is a decision for one act and a rounding error after it.
function spendPanel(S, m) {
  const mMax = marketingMax(S, m);
  const iMax = infraMax(S, m);
  const mb = Math.min(S.company.marketingBudget || 0, mMax);
  const ib = Math.min(S.company.infraSpend || 0, iMax);
  const aw = marketingAwareness(S, m);
  const eff = S._infraEffect || 0;
  const e = expenseBreakdown(S, m);
  const bill = e.hosting + e.serving + e.compute + e.upkeep;
  return `
  <div class="panel" data-tut="spend">
    <div class="panel-head"><span class="panel-title">Spend</span>
      <span class="tiny mono dim">${money(mb + ib)}/day</span></div>
    <div class="panel-body col g12">
      <div data-tip="Awareness bought rather than earned. Returns are square-root: the second million buys less than the first, and the Autonomous Ad Engine multiplies whatever you commit." data-tip-title="Marketing">
        <div class="row between mb4"><span class="meter-label">Marketing</span>
          <span class="mono bold">${money(mb)}/day</span></div>
        ${slider('marketing', mMax > 0 ? mb / mMax : 0, 'var(--amber)')}
        <div class="row between tiny dim mt4"><span>+${aw.toFixed(1)} awareness/day</span>
          <span class="mono">max ${money(mMax)}</span></div>
      </div>
      <div data-tip="Redundancy, headroom and the people who carry the pager. Measured against the infrastructure bill it is topping up, so matching that bill is half of the maximum at any size." data-tip-title="Infrastructure">
        <div class="row between mb4"><span class="meter-label">Infrastructure</span>
          <span class="mono bold">${money(ib)}/day</span></div>
        ${slider('infra', iMax > 0 ? ib / iMax : 0, 'var(--blue)')}
        <div class="row between tiny dim mt4">
          <span>+${(eff * ECON.INFRA_RELIABILITY_CAP * 100).toFixed(1)}% reliability · −${(eff * ECON.INFRA_INCIDENT_CUT * 100).toFixed(0)}% incidents</span>
          <span class="mono">bill ${money(bill)}</span></div>
      </div>
      <div class="tiny dimmer">Running out of cash stops both immediately.</div>
    </div>
  </div>`;
}
