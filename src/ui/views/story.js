// ── STORY ──────────────────────────────────────────────────────────────────
// The run as a narrative: a timeline of every decision, and the people in it.
import { esc, md, bar } from '../dom.js';
import { runChart } from '../chart.js';
import { fmt, money, gameDateShort, pct } from '../../engine/format.js';
import { CHARACTERS, arcLabel } from '../../data/characters.js';
import { ACTS, CALLS } from '../../data/balance.js';
import { canCall, busyLine } from '../../systems/calls.js';
import { kept, memoryOf } from '../../systems/keep.js';

const KIND_COLOR = { story: 'var(--violet)', crisis: 'var(--red)', opportunity: 'var(--green)',
  character: 'var(--cyan)', milestone: 'var(--amber)', call: 'var(--cyan)' };
const KIND_LABEL = { story: 'story', crisis: 'crisis', opportunity: 'opportunity',
  character: 'character', milestone: 'milestone', call: 'call' };

// Rough act boundaries, reconstructed from the journal's day stamps.
function actOf(day, S) {
  const marks = S.company.actMarks || {};
  let act = 1;
  for (let a = 2; a <= 5; a++) if (marks[a] !== undefined && day >= marks[a]) act = a;
  return act;
}

export function render(S) {
  const j = S.narrative.journal;
  const chars = Object.entries(S.narrative.relationships)
    .filter(([id, r]) => r.met && CHARACTERS[id])
    .map(([id, r]) => ({ ...CHARACTERS[id], ...r, id }))
    .sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity));

  const tones = { good: 0, risky: 0, cruel: 0, costly: 0, neutral: 0 };
  for (const e of j) tones[e.tone || 'neutral'] = (tones[e.tone || 'neutral'] || 0) + 1;

  return `
  <div class="view-head">
    <div><div class="view-title">Story</div>
      <div class="view-sub">${S.stats.eventsResolved} decisions. None of them were undone.</div></div>
    <div class="row g8">
      <span class="pill">${chars.length} people</span>
      <span class="pill">${j.length} entries</span>
    </div>
  </div>

  ${runChart(S)}

  <div class="grid split-side">
    <div class="panel" data-tut="timeline">
      <div class="panel-head">
        <span class="panel-title">Timeline</span>
        <span class="tiny dim">most recent first</span>
      </div>
      <div class="panel-body">
        ${j.length === 0 ? `<div class="empty">Nothing has happened yet.<br/>It will.</div>` :
        `<div class="timeline">${j.slice(0, 80).map((e) => {
          const c = e.char ? CHARACTERS[e.char] : null;
          const col = KIND_COLOR[e.kind] || 'var(--line-2)';
          return `<div class="tl-entry${e.author === 'world' ? ' by-world' : ''}">
            <div class="tl-rail"><span class="tl-dot" style="background:${col};box-shadow:0 0 9px ${col}"></span></div>
            <div class="tl-body">
              <div class="row between g8">
                <span class="row g8" style="min-width:0">
                  <span class="tl-day mono">DAY ${e.day}</span>
                  <span class="tl-kind" style="color:${col}">${KIND_LABEL[e.kind] || ''}</span>
                </span>
                ${c ? `<span class="tiny" style="color:${c.color}">${c.icon} ${esc(c.name)}</span>` : ''}
                ${e.author === 'world' ? `<span class="by-world-tag" data-tip="Your assistant wrote this card and the game applied its costs, inside the ceilings in <b>balance.js</b>.">written by the world</span>` : ''}
                ${e.author === 'kept' ? `<span class="by-world-tag kept-tag" data-tip="A card you kept from an earlier timeline, dealt by the written deck.">kept</span>` : ''}
                ${e.author === 'board' ? `<span class="by-world-tag board-tag" data-tip="A motion carried in the boardroom. Somebody in the chair moved it and the game applied it, inside the same ceilings a card from the world gets.">board</span>` : ''}
                ${keepableEntry(S, e) ? `<button class="btn btn-sm btn-ghost keep-small" data-act="keep-card" data-v="${esc(e.id)}@${e.day}" data-tip="${e.runtime ? 'Keep it: the written deck deals it in every timeline after this.' : 'Keep the memory: a later timeline is dealt this moment back, with the road you did not take beside it.'}" data-tip-title="${e.runtime ? 'Keep this card' : 'Keep this memory'}">⊕ keep</button>` : ''}
              </div>
              <div class="tl-title">${esc(e.title)}</div>
              <div class="tl-choice">▸ ${esc(e.choice)}</div>
              ${e.outcome ? `<div class="tl-outcome">${md(e.outcome)}</div>` : ''}
              ${e.effects?.length ? `<div class="row wrap g4 mt6">
                ${e.effects.filter(([, v]) => Math.abs(v) > 0.001).slice(0, 6).map(([k, v]) =>
                  `<span class="tl-eff ${v > 0 ? 'pos' : 'neg'}">${esc(effLabel(k))} ${v > 0 ? '+' : ''}${fmt(v, 1)}</span>`).join('')}
              </div>` : ''}
            </div>
          </div>`;
        }).join('')}</div>`}
      </div>
    </div>

    <div class="col g12">
      <div class="panel">
        <div class="panel-head" data-tut="decide"><span class="panel-title">How you decide</span></div>
        <div class="panel-body col g10">
          ${toneRow('Careful', tones.good, j.length, 'var(--green)', 'The option that costs you now and pays later.')}
          ${toneRow('Bold', tones.risky, j.length, 'var(--amber)', 'High variance. Sometimes spectacular.')}
          ${toneRow('Expensive', tones.costly, j.length, 'var(--cyan)', 'You paid cash to make a problem go away.')}
          ${toneRow('Ruthless', tones.cruel, j.length, 'var(--red)', 'Effective. There was a cost, and it was not yours.')}
          ${toneRow('Measured', tones.neutral, j.length, 'var(--ink-3)', 'The middle path.')}
          <div class="divider" style="margin:4px 0"></div>
          <div class="tiny dim">${verdict(tones, j.length)}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="panel-title">People</span>
          <span class="tiny dim">${chars.length} known</span></div>
        <div class="panel-body col g10">
          ${chars.length === 0 ? `<div class="empty">You have not met anyone yet.</div>` :
          chars.map((c) => `
            <div class="char-card" style="padding:12px">
              ${c.img ? `<div class="char-portrait" style="width:44px;height:44px;flex:0 0 44px;border-color:${c.color}44">
                   <img src="${c.img}" alt="" onerror="this.parentElement.style.display='none'"/></div>`
                : `<div class="char-avatar" style="color:${c.color};background:${c.color}14;font-size:17px;width:40px;height:40px;flex:0 0 40px">${c.icon}</div>`}
              <div style="min-width:0;flex:1">
                <div class="row between g8"><span class="char-name" style="font-size:13px">${esc(c.name)}</span>
                  ${c.kind === 'ai' ? '<span class="pill violet" style="font-size:9px">AI</span>' : ''}</div>
                <div class="char-role">${esc(c.role)}</div>
                <div class="char-arc" style="color:${c.color};font-size:11px">${esc(arcLabel(c.id, c.arc))}</div>
                <div class="affinity-bar" data-tip="${esc(affinityNote(c.affinity))}" data-tip-title="Standing">
                  ${affinityPips(c.affinity)}
                  <span class="tiny dim" style="margin-left:6px">${c.affinity >= 0 ? '+' : ''}${Math.round(c.affinity)}</span>
                </div>
              </div>
              ${callKey(S, c.id)}
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function isKept(S, shape) {
  return kept(S).some((k) => k.title === shape?.title && k.body === shape?.body);
}

// Every closed card in the Log offers a Keep, not only the ones an assistant
// wrote: a world card is kept whole, a written one as the memory of what you
// did with it. `memoryOf` is the same builder the outcome plate uses, and a
// card whose memory is already in the deck offers nothing.
function keepableEntry(S, e) {
  if (e.author === 'kept') return false;
  const shape = e.runtime || memoryOf(S, e);
  return !!shape && !isKept(S, shape);
}

// The phone, on every face. A greyed key says what it needs — the same note
// the Contacts app and the context menu print — and ARIA has no key, because
// she has a window.
function callKey(S, id) {
  if (id === 'aria') return '';
  const can = canCall(S, id);
  const busy = !can.ok && (can.reason === 'cooldown' || can.reason === 'cold') ? busyLine(S, id) : '';
  return `<span class="action-slot char-call" data-ctx="contact" data-id="${esc(id)}">
    <button class="btn btn-sm ${can.ok ? 'btn-primary' : 'btn-ghost'}" data-act="call" data-v="${esc(id)}" ${can.ok ? '' : 'disabled'}
      data-tip="${esc(busy || (can.ok ? `Costs ${CALLS.FOCUS_COST} focus. They remember what you say.` : can.note))}" data-tip-title="Call">☎<span class="char-call-note">${esc(can.ok ? '' : can.note)}</span></button>
  </span>`;
}

// Affinity is unbounded; the display is a saturating curve so late-game
// relationships still read as distinct rather than all maxed.
function affinityPips(a) {
  const mag = Math.min(1, Math.log10(1 + Math.abs(a)) / Math.log10(41));
  const lit = Math.round(mag * 7);
  const col = a >= 0 ? 'var(--green)' : 'var(--red)';
  return Array.from({ length: 7 }, (_, i) =>
    `<span class="aff-pip" style="${i < lit ? `background:${col}` : ''}"></span>`).join('');
}
function affinityNote(a) {
  if (a >= 30) return 'They would take a call from you at any hour.';
  if (a >= 12) return 'Genuine warmth. Earned.';
  if (a >= 4) return 'Positive. They think well of you.';
  if (a > -4) return 'Professional. Neither of you is sure yet.';
  if (a > -14) return 'Cool. Something happened.';
  return 'They will not forget, and they are not the forgiving kind.';
}

const EFF_LABEL = { cash: 'cash', code: 'code', insight: 'insight', reputation: 'rep',
  research: 'research', techDebt: 'debt', focus: 'focus', alignment: 'align', heat: 'heat',
  opinion: 'approval', influence: 'influence', users: 'users', equity: 'equity', days: 'days',
  control: 'control', rivals: 'rivals', compute: 'compute', race: 'rival frontier' };
function effLabel(k) {
  if (k.startsWith('rel:')) { const c = CHARACTERS[k.slice(4)]; return c ? c.name.split(' ')[0] : k.slice(4); }
  if (k.startsWith('skill:')) return k.slice(6);
  return EFF_LABEL[k] || k;
}

function toneRow(label, n, total, color, note) {
  const p = total > 0 ? n / total : 0;
  return `<div data-tip="${esc(note)}" data-tip-title="${esc(label)}">
    <div class="row between mb4"><span class="small">${label}</span>
      <span class="mono tiny" style="color:${color}">${n} · ${(p * 100).toFixed(0)}%</span></div>
    ${bar(p, color, { thin: true })}
  </div>`;
}

function verdict(t, total) {
  if (!total) return 'Nothing decided yet.';
  const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0];
  return ({
    good: 'You take the slow option more often than not. It compounds, and almost nobody notices it happening.',
    risky: 'You reach for the high-variance option. When it lands you look like a genius, and when it does not you are still here.',
    cruel: 'You choose the effective thing over the kind thing. It works. It keeps working. Something accumulates.',
    costly: 'You solve problems with money. It is a real strategy, and it stops being available exactly when you need it most.',
    neutral: 'You take the middle path. It is rarely wrong and rarely decisive.',
  })[top] || '';
}
