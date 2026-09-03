// ─────────────────────────────────────────────────────────────────────────────
// DIALOGS — the larger interactive sheets: recruiting, an agent's tooling, a
// new product line, a term sheet, and Ask ARIA. Each builds its body once and
// wires its controls inside the dialog element it was given, never on
// `document`, so a stale node elsewhere can never pick up a handler.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { fmt, money, pct } from '../engine/format.js';
import { esc, md, render } from './dom.js';
import * as MailApp from './os/mail.js';
import * as ContactsApp from './os/contacts.js';
import * as Modal from './modal.js';
import * as Shell from './shell.js';
import { toast, shake } from './toast.js';
import { play as sfx } from './audio.js';
import { createProduct } from '../systems/product.js';
import { hireAgent, buyTool, rollCandidate, maxAgents, hireCost } from '../systems/agents.js';
import { computeMods, agentStats } from '../systems/modifiers.js';
import { askAria } from '../systems/aria.js';
import { raiseOffer, acceptRound, negotiateOdds, ROUND_TYPES } from '../systems/economy.js';
import { ECON } from '../data/balance.js';
import { rand } from '../engine/rng.js';
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

// What a candidate would do on day one: the same `agentStats` the roster runs
// on, against a fresh agent's morale and autonomy. The honest figure, not the
// reported one — a Sycophant lies on its card once it is hired, not before.
function candidateStats(c) {
  const m = computeMods(S);
  return agentStats({ model: c.model, spec: c.spec, traits: c.traits || [], tools: [], level: 1,
    morale: 1, autonomy: 0.5, laneDays: 0, lane: SPECIALTIES[c.spec]?.lane || 'build' }, S, m);
}

function showRecruit() {
  const cost = hireCost(S);
  const el = Modal.dialog({ title: 'Recruiting', wide: true,
    body: `<div class="small dim mb16">Three candidates. Same price. Traits are permanent — read them carefully.
      <span class="dim">Cost: <b class="c-amber">${money(cost)}</b>.</span></div>
      <div class="grid grid-3" style="gap:10px">
        ${candidates.map((c, i) => {
          const model = MODELS[c.model], spec = SPECIALTIES[c.spec];
          const st = candidateStats(c);
          return `<button class="pick-card" style="--pick-color:${model.color}" data-cand="${i}">
            <div class="row g8"><span class="agent-avatar" style="--agent-color:${model.color};--agent-bg:${model.color}18;width:32px;height:32px;flex:0 0 32px;font-size:14px">${spec.icon}</span>
              <div><div class="pick-name" style="font-size:14px;font-family:var(--mono)">${esc(c.name)}</div>
              <div class="tiny dim">${esc(spec.name)} · <span style="color:${model.color}">${esc(model.name)}</span></div></div></div>
            <div class="row g10 mt8 tiny mono dim">
              <span data-tip="Work units a day on its own lane, on day one.">⚡ ${fmt(st.output, 1)}/d</span>
              <span data-tip="Daily cost, before research that cuts upkeep.">$ ${money(st.upkeep)}/d</span>
              <span data-tip="Tech debt per work unit.">⚠ ${st.debt.toFixed(2)}</span>
            </div>
            <div class="tiny dim mt4">${esc(spec.desc)}</div>
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
  const odds = negotiateOdds(S);
  const better = { ...offer, amount: offer.amount * ECON.NEGOTIATE_AMOUNT_MULT, dilution: offer.dilution * ECON.NEGOTIATE_DILUTION_MULT };
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
      <div class="tiny dim">Pushing works about <b>${Math.round(odds * 100)}%</b> of the time at your sales skill: <b>${money(better.amount)}</b> at <b>${pct(better.dilution, 1)}</b> if they blink. If they walk, this round is off for ${ECON.NEGOTIATE_COOLDOWN_DAYS} days.</div>
    </div>`,
    actions: [
      { label: 'Walk away', cls: 'btn-ghost', fn: () => emit('round:walked', { round: rt }) },
      { label: `Push for better terms · ${Math.round(odds * 100)}%`, cls: '', fn: () => {
        // The seeded stream, not `Math.random`: a negotiation replays.
        const ok = rand() < odds;
        if (ok) { acceptRound(S, better, { negotiated: true }); toast({ icon: '⌗', title: 'They blinked.', sub: `${money(better.amount)} at ${pct(better.dilution, 1)} dilution.`, kind: 'good' }); }
        else { toast({ icon: '⚠', title: 'They walked.', sub: 'The round is off. Try again later.', kind: 'bad' });
          S.narrative.cooldowns['_raise_' + rt.id] = S.time.day + ECON.NEGOTIATE_COOLDOWN_DAYS;
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

// ── Paste something in ─────────────────────────────────────────────────────
// The game's own sheet where `prompt()` used to be: a save string, a kept
// deck. `submit(text)` answers `{ ok, reason? }`. On a refusal the sheet stays
// up with the reason under the field, so the paste is not lost; on success it
// closes itself. `onCancel` is for a caller that wants its own sheet back —
// the console's Settings dialog, which this one replaced on screen.
export function pasteDialog({ title, hint = '', verb = 'Import', placeholder = '', submit, onCancel }) {
  const el = Modal.dialog({ title, wide: false,
    body: `<div class="col g10">
      ${hint ? `<div class="small dim" style="line-height:1.6">${hint}</div>` : ''}
      <textarea class="paste-field" id="paste-field" rows="6" spellcheck="false" autocomplete="off"
        autocapitalize="off" placeholder="${esc(placeholder)}" aria-label="${esc(title)}"></textarea>
      <div class="tiny paste-err" id="paste-err" hidden></div>
    </div>`,
    actions: [
      { label: 'Cancel', cls: 'btn-ghost', keepOpen: !!onCancel, fn: () => onCancel?.() },
      { label: verb, cls: 'btn-primary', keepOpen: true, fn: () => {
        const field = document.getElementById('paste-field');
        let r;
        try { r = submit?.(field?.value || '') || { ok: false }; } catch (e) { r = { ok: false, reason: String(e?.message || e) }; }
        if (r.ok) { Modal.closeModal(); return; }
        const err = document.getElementById('paste-err');
        if (err) { err.textContent = r.reason || 'That did not read as anything the game can take.'; err.hidden = false; }
        if (field) { shake(field); try { field.focus(); } catch {} }
      } },
    ] });
  setTimeout(() => { try { document.getElementById('paste-field')?.focus(); } catch {} }, 30);
  return el;
}

// ── §I10. Mail and Contacts, in the console ─────────────────────────────────
// The workstation grew a whole app for each of these and the console had the
// Wire rail and nothing else, so half the game's surfaces existed for half the
// players. These are the *same* renders in a sheet: `os/mail.js` and
// `os/contacts.js` are pure string functions of state and neither imports the
// window manager, so the console can use them without learning what a window
// is. The delegated actions inside them are answered by `main.js` in this
// housing and by `os/shell.js` in the other — one code path either way.
//
// The body is patched rather than rebuilt, for the same reason every other
// live surface in this game is: a wholesale swap while the pointer is over a
// row throws the hover away.
export function showMailDialog() {
  const el = Modal.dialog({ title: 'The post', wide: true,
    body: `<div class="app-sheet ml-sheet" id="mail-sheet">${MailApp.render(S)}</div>`,
    actions: [{ label: 'Close', cls: 'btn-primary' }] });
  return el;
}
export function repaintMailDialog() {
  const host = document.getElementById('mail-sheet');
  if (host) render(host, MailApp.render(S));
  return !!host;
}

export function showContactsDialog() {
  const el = Modal.dialog({ title: 'Contacts', wide: true,
    body: `<div class="app-sheet ct-sheet" id="contacts-sheet">${ContactsApp.render(S)}</div>`,
    actions: [{ label: 'Close', cls: 'btn-primary' }] });
  return el;
}
export function repaintContactsDialog() {
  const host = document.getElementById('contacts-sheet');
  if (host) render(host, ContactsApp.render(S));
  return !!host;
}

// ── Ask ARIA ───────────────────────────────────────────────────────────────
export function showAria() {
  sfx('prompt');
  Modal.dialog({ title: 'ARIA', wide: true, body: ariaBody(),
      actions: [{ label: 'Thanks', cls: 'btn-primary' }] });
}

// Her read of the run, as markup. The console shows it in a dialog; the
// workstation gives her a window and repaints this into it.
export function ariaBody() {
  const r = askAria(S);
  const char = CHARACTERS.aria;
  return `<div class="row g14 mb16" style="align-items:flex-start">
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
        <div class="small dim mt16" style="font-style:italic;line-height:1.6">${esc(r.closer)}</div>`;
}

function sevColor(s) {
  return s >= 85 ? 'var(--red)' : s >= 65 ? 'var(--amber)' : s >= 40 ? 'var(--cyan)' : 'var(--ink-3)';
}
