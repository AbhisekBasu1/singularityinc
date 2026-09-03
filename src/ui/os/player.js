// ─────────────────────────────────────────────────────────────────────────────
// PLAYER — the ambient bed, as something running on the machine.
//
// The bed has been in this game since the beginning and no player has ever been
// told it exists: one toggle in Settings called "Ambient bed", which is the
// name an engineer gives a feature. It is generated — five states, one per act,
// slow filter movement and a distant bell — and what it actually is, in the
// fiction, is whatever the founder has on while they work.
//
// So it gets a window with a track name in it. That is the whole difference:
// the same switch, in the register of the thing rather than the setting.
//
// There is nothing to seek and nothing to skip, because there is no recording —
// so the app offers exactly what a generated bed can offer: stop it, change how
// loud it is, and silence the bells. A transport with a disabled ⏭ on it would
// be a lie about what this is.
//
// `render(S)` is pure of the game's state. It reads the audio module, which is
// this session rather than this run, and that is correct: what is playing is
// not something a save should remember.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from '../dom.js';
import { ambientState, ACT_TRACKS } from '../audio.js';
import { EMPTY, CTX } from '../../data/machine.js';
import { ROMAN } from './config.js';

const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch { return dflt; } };
const line = (k) => (EMPTY && typeof EMPTY[k] === 'string' ? EMPTY[k] : '');
const lore = (k) => (CTX && typeof CTX[k] === 'string' ? CTX[k] : '');

const DEAD = { playing: false, act: 1, name: '—', sub: '', bells: true, volume: 0, ready: false };

function state(S) {
  const act = Math.max(1, Math.min(5, S?.company?.act || 1));
  return safe(() => ambientState(() => act), null) || { ...DEAD, act };
}

export function render(S) {
  const st = state(S);
  const soundOff = S?.settings?.sound === false;
  const vol = Math.round((st.volume || 0) * 100);
  return `<div class="pl" data-ctx="player">
    <div class="pl-head">
      <span class="pl-k">Now playing</span>
      <span class="pl-count mono">ACT ${ROMAN[st.act] || st.act}</span>
    </div>
    <div class="pl-rule"></div>
    <div class="pl-body">
      <div class="pl-art ${st.playing ? 'on' : ''}" aria-hidden="true">
        ${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
      </div>
      <div class="pl-title">${esc(st.name)}</div>
      <div class="pl-sub">${esc(st.sub)}</div>
      ${soundOff ? `<div class="pl-note mono">SOUND IS OFF</div>` : ''}
      <div class="pl-keys">
        <button class="pl-key ${st.playing ? 'on' : ''}" data-act="player-play"
          aria-pressed="${st.playing}" data-tip="${st.playing ? 'Stop the bed' : 'Start the bed'}">
          ${st.playing ? '❚❚' : '▶'}</button>
        <button class="pl-key ${st.bells ? 'on' : ''}" data-act="player-bells"
          aria-pressed="${st.bells}" data-tip="The distant bell. The one part of this that is an event rather than a texture."
          data-tip-title="Bells">✧</button>
        <span class="pl-vol">
          <button class="pl-key" data-act="player-vol" data-v="down" aria-label="Quieter">−</button>
          <span class="pl-vol-track" aria-hidden="true"><i style="width:${vol}%"></i></span>
          <button class="pl-key" data-act="player-vol" data-v="up" aria-label="Louder">+</button>
          <span class="pl-vol-n mono">${vol}</span>
        </span>
      </div>
      <div class="pl-rule"></div>
      <div class="pl-list">
        ${ACT_TRACKS.map((t, i) => (i === 0 ? '' : `<div class="pl-row ${i === st.act ? 'on' : ''} ${i > st.act ? 'ahead' : ''}">
          <span class="pl-row-n mono">${ROMAN[i]}</span>
          <span class="pl-row-name">${i > st.act ? '—' : esc(t.name)}</span>
          <span class="pl-row-sub">${i > st.act ? 'not written yet' : esc(t.sub)}</span>
        </div>`)).join('')}
      </div>
      <div class="tiny dimmer mt12">${esc(lore('player'))}</div>
    </div>
  </div>`;
}

export function readoutFor(S) {
  const st = state(S);
  if (S?.settings?.sound === false) return 'SOUND OFF';
  if (!st.playing) return 'STOPPED';
  return `${st.name.toUpperCase()} · ${Math.round((st.volume || 0) * 100)}`;
}

export function menuFor(S) {
  const st = state(S);
  const off = S?.settings?.sound === false;
  return [
    { label: st.playing ? 'Stop' : 'Play', act: 'player-play', disabled: off, note: off ? 'SOUND IS OFF' : undefined },
    { label: 'Bells', act: 'player-bells', checked: st.bells, disabled: off, note: off ? 'SOUND IS OFF' : undefined },
    { sep: true },
    { label: 'Louder', act: 'player-vol', v: 'up', disabled: off, note: off ? 'SOUND IS OFF' : undefined },
    { label: 'Quieter', act: 'player-vol', v: 'down', disabled: off, note: off ? 'SOUND IS OFF' : undefined },
    { sep: true },
    { label: st.name, disabled: true, quiet: true },
  ];
}

export { line };
