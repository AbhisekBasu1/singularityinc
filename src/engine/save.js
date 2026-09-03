// ─────────────────────────────────────────────────────────────────────────────
// SAVE — localStorage persistence, migration, export/import.
// ─────────────────────────────────────────────────────────────────────────────
import { S, setState, SAVE_VERSION, newGame } from './state.js';
import { reseed, rngState, setRngState } from './rng.js';
import { markDirty } from '../systems/modifiers.js';
import { emit, silence } from './bus.js';
import { createProduct } from '../systems/product.js';
import { hireAgent, rollCandidate } from '../systems/agents.js';
import { spawnCompetitor } from '../systems/market.js';

// ── Slots ───────────────────────────────────────────────────────────────────
// Three runs, side by side. The key for slot 1 is the key this game has always
// used, so the save already in somebody's browser *is* slot 1 and there is
// nothing to migrate — a scheme that renamed it would have thrown away every
// run in existence to gain a number in a filename. Legacy and settings stay
// where they are and are deliberately shared: legacy is what survives a
// timeline, and three timelines in three slots are still one player's.
const KEY = 'singularity_inc_save_v1';
const LEGACY_KEY = 'singularity_inc_legacy_v1';
const SETTINGS_KEY = 'singularity_inc_settings_v1';
const SLOT_KEY = 'singularity_inc_slot_v1';

export const SLOTS = [1, 2, 3];

function keyFor(slot) {
  const n = SLOTS.includes(Number(slot)) ? Number(slot) : 1;
  return n === 1 ? KEY : `${KEY}_s${n}`;
}

let activeSlot = 0;              // 0 = not read yet
export function currentSlot() {
  if (activeSlot) return activeSlot;
  let n = 1;
  try { n = Number(localStorage.getItem(SLOT_KEY)) || 1; } catch { n = 1; }
  activeSlot = SLOTS.includes(n) ? n : 1;
  return activeSlot;
}

// Which run the next `save()` and `load()` are about. Written down, because the
// machine has to come back into the same slot after a reload.
export function setSlot(n) {
  const next = SLOTS.includes(Number(n)) ? Number(n) : 1;
  activeSlot = next;
  try { localStorage.setItem(SLOT_KEY, String(next)); } catch { /* private mode */ }
  return next;
}

/**
 * All three slots, for the login screen and the Settings rows. A slot whose
 * save will not parse comes back `corrupt` rather than throwing: one bad slot
 * must never take the other two off the screen with it.
 */
export function slots() {
  const cur = currentSlot();
  return SLOTS.map((n) => {
    let raw = null;
    try { raw = localStorage.getItem(keyFor(n)); } catch { raw = null; }
    const saved = raw ? peek(n) : null;
    return { n, active: n === cur, saved, empty: !raw, corrupt: !!raw && !saved };
  });
}

// Flags that describe what is happening *right now* rather than what is true
// about the run. `_agentDriven` persisted as true would switch off the
// real-time event floor for the whole of the next session.
const TRANSIENT = ['_agentDriven', '_offline', '_toolBusy', '_narrAcc', '_forecast', '_opsRelBonus',
                   '_specFx', '_lanes', '_review', '_infraEffect', '_infraRelBonus', '_mailAway',
                   'tutorialHold', 'modalBlocking'];

// One serialisation for the save slot and the export string. Never a
// hypothetical — `forecast` points the live binding at a throwaway copy while
// it runs, and the autosave timer, `beforeunload`, `visibilitychange` and the
// Settings export all read that binding — and never the flags that describe
// this moment rather than the run.
export function serialisable(state) {
  if (!state || state._forecast) return null;
  const copy = { ...state, meta: { ...state.meta, rngState: rngState() } };
  for (const k of TRANSIENT) delete copy[k];
  return copy;
}

export function save(state = S, slot = currentSlot()) {
  const copy = serialisable(state);
  if (!copy) return false;
  try {
    const now = Date.now();
    state.meta.lastSaved = copy.meta.lastSaved = now;
    state.meta.lastRealTime = copy.meta.lastRealTime = now;
    localStorage.setItem(keyFor(slot), JSON.stringify(copy));
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state.legacy));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    emit('save');
    return true;
  } catch (e) {
    console.error('[save]', e);
    return false;
  }
}

export function hasSave(slot = currentSlot()) {
  try { return !!localStorage.getItem(keyFor(slot)); } catch { return false; }
}

// Who is in the saved run, without loading it. The workstation's login screen
// puts a real account tile on the first screen — a name, a company, an act and
// a day — and doing that by `load()` would migrate a save, reseed the RNG and
// emit `load` to every listener before the player had pressed anything.
export function peek(slot = currentSlot()) {
  try {
    const raw = localStorage.getItem(keyFor(slot));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      founderName: d.founder?.name || 'Founder',
      companyName: d.company?.name || 'Untitled',
      archetype: d.founder?.archetype || 'hacker',
      category: d.products?.[0]?.category || null,
      act: Math.max(1, Math.min(5, d.company?.act || 1)),
      day: Math.floor(d.time?.day || 0),
      savedAt: d.meta?.lastSaved || null,
      difficulty: d.settings?.difficulty || 'standard',
      slot: SLOTS.includes(Number(slot)) ? Number(slot) : 1,
    };
  } catch { return null; }
}

export function load(slot = currentSlot()) {
  const rngBefore = rngState();
  try {
    const raw = localStorage.getItem(keyFor(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const migrated = migrate(data);
    if (!migrated) return null;
    setState(migrated);
    restoreRng(migrated);
    markDirty();
    emit('load', migrated);
    return migrated;
  } catch (e) {
    setRngState(rngBefore);
    console.error('[load]', e);
    return null;
  }
}

export function loadLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveLegacy(legacy) {
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy)); return true; } catch { return false; }
}

export function clearSave(slot = currentSlot()) {
  try { localStorage.removeItem(keyFor(slot)); return true; } catch { return false; }
}

export function hardReset() {
  try {
    for (const n of SLOTS) localStorage.removeItem(keyFor(n));
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(SLOT_KEY);
    return true;
  } catch { return false; }
}

// ── Per-version transforms ─────────────────────────────────────────────────
// Structural fill (below) adds what is missing. A transform is for what fill
// cannot express: a field that moved, was renamed, or changed scale. Keyed by
// the version it upgrades *to*, applied in order, each one small enough to
// read in full.
const MIGRATIONS = {
  9: (s) => {
    // `_lastShipDay` was an undeclared top-level side-channel read by the
    // Relentless doctrine; it lives in `stats` now, where it is saved on purpose.
    if (typeof s._lastShipDay === 'number') (s.stats ??= {}).lastShipDay ??= s._lastShipDay;
    delete s._lastShipDay;
  },
  10: (s) => {
    // Weaver was hired under two names. `e11_weaver_arrives` stamped
    // `weaver_hired` and everything that reads the hire — the succession card,
    // Priya's headcount, the solo achievement — read `hired_weaver`. One flag.
    const f = s.narrative?.flags;
    if (f && f.weaver_hired) { f.hired_weaver = true; }
    if (f) delete f.weaver_hired;
  },
  11: (s) => {
    // Older saves know the run's seed but not how far through its random
    // stream they were. Starting at that seed preserves their old behaviour;
    // every save written from here on records the exact position.
    if (s.meta) s.meta.rngState ??= s.meta.seed;
  },
};

function restoreRng(state) {
  const seed = Number(state?.meta?.seed);
  const at = Number(state?.meta?.rngState);
  reseed(Number.isFinite(seed) ? seed >>> 0 : 0);
  if (Number.isFinite(at)) setRngState(at >>> 0);
}

function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  const v = data.meta?.version ?? 0;
  let s = data;
  if (v < SAVE_VERSION) {
    // Transforms first, on the raw save: the structural merge below fills a
    // missing field with its default, which would hide the one that moved.
    for (let to = v + 1; to <= SAVE_VERSION; to++) {
      try { MIGRATIONS[to]?.(data); } catch (e) { console.error('[migrate]', to, e); }
    }
    // Then the structural fill: merge onto a fresh state so new fields exist.
    const fresh = newGame({ legacy: data.legacy });
    s = deepMerge(fresh, data);
    s.meta.version = SAVE_VERSION;
  }
  return fill(s);   // a newer save than this build knows: try anyway
}

function fill(s) {
  // Transient holds must never survive a reload: a save written while the
  // walkthrough was up would otherwise come back with the clock frozen.
  delete s.tutorialHold;
  delete s.modalBlocking;
  // Guard against missing sub-objects from older/partial saves
  const fresh = newGame({ legacy: s.legacy });
  for (const k of Object.keys(fresh)) {
    if (s[k] === undefined) s[k] = fresh[k];
    else if (fresh[k] && typeof fresh[k] === 'object' && !Array.isArray(fresh[k])) {
      for (const k2 of Object.keys(fresh[k])) {
        if (s[k][k2] === undefined) s[k][k2] = fresh[k][k2];
      }
    }
  }
  // Arrays of objects are replaced wholesale by deepMerge and the two-level
  // fill above never looks inside them, so a field added to a product, an
  // agent or a competitor since the save was written was undefined in every
  // element — and `Math.max(undefined, x)` is NaN for the rest of the run.
  // Each element is filled from a template the real factory built, so the
  // shape can never drift from the code that creates new ones.
  backfillItems(s.products, (p) => template((t) => createProduct(t, { name: p.name || 'x', category: p.category })));
  backfillItems(s.agents, () => template((t) => {
    t.company.cash = 1e12;
    const r = hireAgent(t, rollCandidate(t));
    return r.ok ? t.agents[0] : null;
  }));
  backfillItems(s.market?.competitors, () => template((t) =>
    spawnCompetitor(t, { name: 'x', founder: 'x' })));
  return s;
}

// Run a factory on a throwaway game with the RNG and the bus put back after,
// so building a template costs the real run nothing — not a random draw, not
// a feed line.
function template(build) {
  const rng = rngState();
  const unsilence = silence();
  try { return build(newGame({})); }
  catch (e) { console.error('[migrate] template', e); return null; }
  finally { unsilence(); setRngState(rng); }
}

const IDENTITY = new Set(['id', 'name']);
function backfillItems(arr, makeTemplate) {
  if (!Array.isArray(arr)) return;
  let shared = null;
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const tpl = makeTemplate.length ? makeTemplate(item) : (shared ??= makeTemplate());
    if (!tpl) return;
    for (const k of Object.keys(tpl)) {
      if (IDENTITY.has(k) || item[k] !== undefined) continue;
      const v = tpl[k];
      item[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
  }
}

function deepMerge(base, override) {
  if (Array.isArray(override)) return override;
  if (override === null || typeof override !== 'object') return override ?? base;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k of Object.keys(override)) {
    const b = base?.[k], o = override[k];
    out[k] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o))
      ? deepMerge(b, o) : o;
  }
  return out;
}

// ── Export / import ────────────────────────────────────────────────────────
// Null when there is nothing honest to export: a forecast is running and the
// live binding is its clone.
export function exportSave(state = S) {
  const copy = serialisable(state);
  if (!copy) return null;
  const json = JSON.stringify(copy);
  return btoa(unescape(encodeURIComponent(json)));
}

// A save from a file or from the clipboard. The clipboard string is base64 and
// a downloaded file is the same string, but a founder who opens the file, or a
// tool that pretty-prints it, hands back raw JSON — so both are accepted, and
// which one it was is not the player's problem.
function parseSave(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  let data = null;
  if (t[0] === '{') { try { data = JSON.parse(t); } catch { return null; } }
  else { try { data = JSON.parse(decodeURIComponent(escape(atob(t)))); } catch { return null; } }
  return isGameSave(data) ? data : null;
}

// JSON being syntactically valid is not enough: importing an unrelated JSON
// file used to silently turn it into a mostly fresh run. These are fields that
// every released save has carried, while migration remains responsible for
// filling fields added by later builds.
function isGameSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!data.meta || typeof data.meta !== 'object' || !Number.isFinite(Number(data.meta.seed))) return false;
  if (!data.time || typeof data.time !== 'object' || !Number.isFinite(Number(data.time.day))) return false;
  if (!data.founder || typeof data.founder !== 'object' || typeof data.founder.name !== 'string') return false;
  if (!data.company || typeof data.company !== 'object' || typeof data.company.name !== 'string') return false;
  return !!data.settings && typeof data.settings === 'object'
    && !!data.resources && typeof data.resources === 'object'
    && Array.isArray(data.products);
}

export function importSave(b64) {
  const previous = S;
  const rngBefore = rngState();
  try {
    const data = parseSave(b64);
    if (!data) return false;
    const migrated = migrate(data);
    if (!migrated) return false;
    setState(migrated);
    restoreRng(migrated);
    markDirty();
    if (!save(migrated)) {
      setState(previous);
      setRngState(rngBefore);
      markDirty();
      return false;
    }
    emit('load', migrated);
    return true;
  } catch (e) {
    setState(previous);
    setRngState(rngBefore);
    markDirty();
    console.error('[import]', e);
    return false;
  }
}

// ── The file ────────────────────────────────────────────────────────────────
// The clipboard string is the portable one and it stays. A file is the other
// half of the same thing: a founder who wants to keep a run keeps a file, and
// a founder moving between machines without a clipboard between them needs
// one. Both carry the identical base64 payload, so a save copied from one and
// pasted into the other is the same save.

/** What the download is called. The company, the day, and nothing invented. */
export function saveFileName(state = S) {
  const co = String(state?.company?.name || 'singularity').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const day = Math.floor(state?.time?.day || 0);
  return `${co || 'singularity'}-day${day}.sav`;
}

/**
 * Hand the browser a file. An anchor with `download` and an object URL: no
 * server, no permission, and it works from a file:// page. Returns false when
 * there is nothing honest to write — a forecast is running — so the caller can
 * say so rather than downloading a hypothetical.
 */
export function downloadSave(state = S) {
  const str = exportSave(state);
  if (!str) return false;
  try {
    const blob = new Blob([str], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName(state);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked on the next turn of the loop: revoking synchronously races the
    // download in more than one browser.
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 4000);
    return true;
  } catch (e) { console.error('[download]', e); return false; }
}

/**
 * Take a file. `<input type=file>` with no form and no submit, opened by a
 * click the founder made — the only way a page is allowed to open a picker.
 * `onDone(ok, reason)` is called once.
 */
export function pickSaveFile(onDone) {
  const done = (ok, reason) => { try { onDone?.(ok, reason); } catch {} };
  let input;
  try {
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sav,.txt,.json,application/json,text/plain';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
  } catch { done(false, 'This browser will not open a file picker.'); return false; }
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) { done(false, null); return; }
    const reader = new FileReader();
    reader.onerror = () => done(false, 'That file could not be read.');
    reader.onload = () => {
      const ok = importSave(String(reader.result || ''));
      done(ok, ok ? null : 'That did not read as a save this game wrote.');
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input);
  input.click();
  return true;
}

// ── Autosave ───────────────────────────────────────────────────────────────
let autosaveTimer = null;
export function startAutosave(intervalMs = 12000) {
  stopAutosave();
  autosaveTimer = setInterval(() => { if (S?.settings.autosave) save(S); }, intervalMs);
  window.addEventListener('beforeunload', () => save(S));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(S); });
}
export function stopAutosave() { if (autosaveTimer) clearInterval(autosaveTimer); autosaveTimer = null; }
