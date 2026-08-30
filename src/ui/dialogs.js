// ─────────────────────────────────────────────────────────────────────────────
// DIALOGS — the larger interactive sheets: recruiting, an agent's tooling, a
// new product line, a term sheet, and Ask ARIA. Each builds its body once and
// wires its controls inside the dialog element it was given, never on
// `document`, so a stale node elsewhere can never pick up a handler.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { fmt, money, pct } from '../engine/format.js';
import { esc, md } from './dom.js';
import * as Modal from './modal.js';
import * as Shell from './shell.js';
import { toast } from './toast.js';
import { play as sfx } from './audio.js';
import { createProduct } from '../systems/product.js';
import { hireAgent, buyTool, rollCandidate, maxAgents, hireCost } from '../systems/agents.js';
import { askAria } from '../systems/aria.js';
import { raiseOffer, acceptRound, ROUND_TYPES } from '../systems/economy.js';
import { CATEGORIES } from '../data/products.js';
import { AGENT_TOOLS, MODELS, SPECIALTIES, TRAIT_MAP } from '../data/agents.js';
import { productName } from '../data/names.js';
import { CHARACTERS } from '../data/characters.js';
import { emit } from '../engine/bus.js';

// ── A second product line ──────────────────────────────────────────────────
export function showNewProduct() {
  const cost = 25000 * Math.pow(2.4, S.products.length - 1);
  const el = Modal.dialog({ title: 'New product line', wide: true,
    body: `<div class="small dim mb16">A second product diversifies revenue and opens new markets — but splits your build capacity. Cost: <b class="c-amber">${money(cost)}</b>.</div>
      <div class="grid grid-auto" style="gap:10px">${CATEGORIES.map((c) => `
        <button class="pick-card" style="--pick-color:${c.color}" data-newprod="${c.id}">
          <div class="pick-icon" style="color:${c.color}">${c.icon}</div>
          <div class="pick-name">${esc(c.name)}</div>
          <div class="pick-desc">${esc(c.tagline)}</div>
        </button>`).join('')}</div>`,
    actions: [] });
  el.querySelectorAll('[data-newprod]').forEach((b) => b.addEventListener('click', () => {
    if (S.company.cash < cost) { toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' }); return; }
    S.company.cash -= cost;
    const p = createProduct(S, { name: productName(), category: b.dataset.newprod });
    S.activeProductId = p.id;
    Modal.closeModal();
    toast({ icon: '◈', title: `Started **${p.name}**`, sub: 'A second bet. Build it.', kind: 'good' });
    Shell.paintMain();
  }));
}

// ── Recruiting ─────────────────────────────────────────────────────────────
let candidates = null;

export function openRecruit() {
  if (S.agents.length >= maxAgents(S)) {
    toast({ icon: '⚠', title: 'Roster is full.', sub: 'Research more orchestration capacity.', kind: 'bad' });
    return;
  }
  candidates = [rollCandidate(S), rollCandidate(S), rollCandidate(S)];
  showRecruit();
}

function showRecruit() {
  const cost = hireCost(S);
  const el = Modal.dialog({ title: 'Recruiting', wide: true,
    body: `<div class="small dim mb16">Three candidates. Same price. Traits are permanent — read them carefully.
      <span class="dim">Cost: <b class="c-amber">${money(cost)}</b>.</span></div>
      <div class="grid grid-3" style="gap:10px">
        ${candidates.map((c, i) => {
          const model = MODELS[c.model], spec = SPECIALTIES[c.spec];
          return `<button class="pick-card" style="--pick-color:${model.color}" data-cand="${i}">
            <div class="row g8"><span class="agent-avatar" style="--agent-color:${model.color};--agent-bg:${model.color}18;width:32px;height:32px;flex:0 0 32px;font-size:14px">${spec.icon}</span>
              <div><div class="pick-name" style="font-size:14px;font-family:var(--mono)">${esc(c.name)}</div>
              <div class="tiny dim">${esc(spec.name)} · <span style="color:${model.color}">${esc(model.name)}</span></div></div></div>
            <div class="col g4 mt8">
              ${c.traits.map((tid) => { const t = TRAIT_MAP[tid];
                return `<div class="trait-chip ${t.good ? 'good' : 'bad'}" style="white-space:normal;text-align:left">
                  <b>${t.icon} ${esc(t.name)}</b> — ${esc(t.desc)}</div>`; }).join('')}
            </div>
          </button>`;
        }).join('')}
      </div>
      <div class="row g8 mt16"><button class="btn btn-ghost btn-sm" data-reroll>⟳ Reroll all (free)</button></div>`,
    actions: [] });
  el.querySelectorAll('[data-cand]').forEach((b) => b.addEventListener('click', () => {
    const c = candidates[Number(b.dataset.cand)];
    const r = hireAgent(S, c);
    if (r.ok) {
      Modal.closeModal();
      toast({ icon: '◉', title: `**${c.name}** is online.`, sub: `${SPECIALTIES[c.spec].name} · ${MODELS[c.model].name}`, kind: 'good' });
      Shell.paintMain(); Shell.paintNav();
    } else if (r.reason === 'cash') toast({ icon: '$', title: 'Not enough cash.', kind: 'bad' });
  }));
  el.querySelector('[data-reroll]')?.addEventListener('click', () => {
    candidates = [rollCandidate(S), rollCandidate(S), rollCandidate(S)];
    showRecruit();
  });
}

// ── An agent's tooling ─────────────────────────────────────────────────────
export function showAgentTools(agentId) {
  const a = S.agents.find((x) => x.id === agentId);
  if (!a) return;
  const avail = AGENT_TOOLS.filter((t) => !t.req || S.research.done[t.req]);
  const el = Modal.dialog({ title: `${a.name} — tooling`, wide: true,
    body: `<div class="grid grid-2" style="gap:10px">${avail.map((t) => {
      const owned = a.tools.includes(t.id);
      return `<div class="panel" style="padding:13px;border-color:${owned ? 'rgba(0,229,160,.3)' : 'var(--line)'}">
        <div class="row between mb4"><span class="row g6"><span class="c-cyan">${t.icon}</span><span class="bold small">${esc(t.name)}</span></span>
          ${owned ? '<span class="pill green">installed</span>' : `<span class="mono tiny">${money(t.cost)}</span>`}</div>
        <div class="tiny dim">${esc(t.desc)}</div>
        ${owned ? '' : `<button class="btn btn-sm btn-block mt8" data-buytool="${t.id}" ${S.company.cash < t.cost ? 'disabled' : ''}>Install</button>`}
      </div>`; }).join('') || '<div class="empty">No tools researched yet.</div>'}</div>`,
    actions: [] });
  el.querySelectorAll('[data-buytool]').forEach((b) => b.addEventListener('click', () => {
    const r = buyTool(S, a.id, b.dataset.buytool);
    if (r.ok) { Modal.closeModal(); toast({ icon: '⚙', title: `Installed on ${a.name}`, kind: 'good' }); Shell.paintMain(); }
  }));
}

// ── A term sheet ───────────────────────────────────────────────────────────
export function showRaise(roundId) {
  const rt = ROUND_TYPES.find((x) => x.id === roundId);
  if (!rt) return;
  const offer = raiseOffer(S, rt);
  Modal.dialog({ title: `${rt.name} term sheet`, wide: false,
    body: `<div class="col g12">
      <div class="small dim">${esc(rt.desc)}</div>
      <div class="grid grid-2" style="gap:10px">
        <div class="stat-tile"><div class="stat-tile-label">Raise</div><div class="stat-tile-value c-green">${money(offer.amount)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Post-money</div><div class="stat-tile-value c-amber">${money(offer.post)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Dilution</div><div class="stat-tile-value c-red">${pct(offer.dilution, 1)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">You keep</div><div class="stat-tile-value">${pct(S.company.equity.founder * (1 - offer.dilution), 1)}</div></div>
      </div>
      <div class="tiny dim">Money buys time and speed. It costs a permanent share of everything that follows — including the ending.</div>
    </div>`,
    actions: [
      { label: 'Walk away', cls: 'btn-ghost', fn: () => emit('round:walked', { round: rt }) },
      { label: 'Push for better terms', cls: '', fn: () => {
        const better = { ...offer, amount: offer.amount * 1.15, dilution: offer.dilution * 0.82 };
        const ok = Math.random() < 0.55 + S.founder.skills.sales * 0.02;
        if (ok) { acceptRound(S, better, { negotiated: true }); toast({ icon: '⌗', title: 'They blinked.', sub: `${money(better.amount)} at ${pct(better.dilution, 1)} dilution.`, kind: 'good' }); }
        else { toast({ icon: '⚠', title: 'They walked.', sub: 'The round is off. Try again later.', kind: 'bad' });
          S.narrative.cooldowns['_raise_' + rt.id] = S.time.day + 60;
          emit('round:failed', { round: rt, reason: 'negotiation' }); }
        Shell.paintMain(); Shell.paintTopbar();
      } },
      { label: 'Sign', cls: 'btn-primary', fn: () => {
        acceptRound(S, offer);
        toast({ icon: '⌗', title: `${rt.name} closed`, sub: `${money(offer.amount)} in the bank.`, kind: 'good', ms: 5000 });
        Shell.paintMain(); Shell.paintTopbar();
      } },
    ] });
}

// ── Ask ARIA ───────────────────────────────────────────────────────────────
export function showAria() {
  const r = askAria(S);
  const char = CHARACTERS.aria;
  sfx('prompt');
  Modal.dialog({ title: 'ARIA', wide: true,
      body: `<div class="row g14 mb16" style="align-items:flex-start">
          ${char?.img ? `<div class="event-portrait" style="width:52px;height:52px;flex:0 0 52px;border-color:${char.color}44">
            <img src="${char.img}" alt="" onerror="this.parentElement.style.display='none'"/></div>` : ''}
          <div class="small" style="color:var(--ink-2);line-height:1.6;font-style:italic">${esc(r.opener)}</div>
        </div>
        <div class="col g10">
          ${r.findings.map((f, i) => `
            <div class="panel" style="padding:13px;border-left:2px solid ${sevColor(f.severity)}">
              <div class="row g8 mb4">
                <span class="mono tiny" style="color:${sevColor(f.severity)};font-weight:700">${String(i + 1).padStart(2, '0')}</span>
                <span class="small bold">${esc(f.title)}</span>
              </div>
              <div class="tiny dim" style="line-height:1.6">${md(f.text)}</div>
            </div>`).join('') || '<div class="empty">Nothing material. That is rarer than it sounds.</div>'}
        </div>
        <div class="small dim mt16" style="font-style:italic;line-height:1.6">${esc(r.closer)}</div>`,
      actions: [{ label: 'Thanks', cls: 'btn-primary' }] });
}

function sevColor(s) {
  return s >= 85 ? 'var(--red)' : s >= 65 ? 'var(--amber)' : s >= 40 ? 'var(--cyan)' : 'var(--ink-3)';
}
