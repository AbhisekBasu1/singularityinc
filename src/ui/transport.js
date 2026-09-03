// ─────────────────────────────────────────────────────────────────────────────
// THE TRANSPORT — one door onto the clock.
//
// Pause, the four speeds, the two keys that step between them and the run to
// the next decision all come through here, so every housing's readout agrees
// about what the founder asked the clock to do. Temporary decision holds live
// in the loop and never write `S.settings.paused`: if the pause button is lit,
// it is because the founder used a transport control — or, since §C2, because
// they went to Settings and asked in advance to be stopped for this exact
// thing. Nothing else may write that bit, and all five of those toggles are
// off until somebody turns one on.
//
// The run to the next decision is a seek: the founder's own speed is put
// aside, the clock runs at the top speed, and the first thing that would have
// asked for them — a card, a thread, a letter, an incident, a research node
// finishing, the phone, a new act — stops it. The speed comes back and the
// clock holds, so what stopped it is on screen and nothing is running behind
// it. The founder's hand always wins: any speed key or Space during a seek
// ends it with whatever they pressed.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../engine/state.js';
import { TIME } from '../data/balance.js';
import { clamp } from '../engine/format.js';
import * as Shell from './shell.js';
import { toast } from './toast.js';

// What ended a founder-requested run to the next decision.
const REASONS = {
  incident: 'An incident.',
  thread: 'A thread in the Wire is waiting on you.',
  letter: 'A letter arrived.',
  runway: 'Runway is low.',
  cash: 'Cash went negative.',
  rogue: 'An agent shipped without asking.',
  card: 'A card is on the table.',
  research: 'Research finished.',
  call: 'The phone.',
  act: 'A new act.',
  ending: '',
};

let seeking = false;
let prev = null;               // { speed, paused } from before the seek
// §A22. The auto-throttle: what the clock was doing before a card, a ring or a
// thread arrived at 3× or 5×.
let throttled = null;          // { speed, reason }

const paint = () => { try { Shell.paintTopbar(); Shell.paintStatus(); } catch { /* headless */ } };
const maxSpeed = () => TIME.SPEEDS.length;

export function isPaused() { return !!S?.settings?.paused; }
export function isSeeking() { return seeking; }

// ── The founder's hand ──────────────────────────────────────────────────────

export function setPaused(v) {
  if (!S) return;
  if (seeking) cancelSeek();
  throttled = null;
  S.settings.paused = !!v;
  paint();
}

export function togglePause() {
  if (!S) return;
  const was = !!S.settings.paused;
  if (seeking) cancelSeek();
  throttled = null;
  S.settings.paused = !was;
  paint();
}

export function setSpeed(i) {
  if (!S) return;
  if (seeking) cancelSeek();
  throttled = null;
  S.settings.paused = false;
  S.settings.speed = clamp(Math.round(Number(i) || 1), 1, maxSpeed());
  paint();
}

// `-` and `=`: down through the speeds to a stop, and up from a stop to the
// speed that was showing. A stopped clock stepping up resumes rather than
// resuming *and* accelerating, which is what the hand meant.
export function stepSpeed(dir) {
  if (!S) return;
  if (seeking) cancelSeek();
  throttled = null;
  const cur = clamp(S.settings.speed || 1, 1, maxSpeed());
  if (dir > 0) {
    if (S.settings.paused) S.settings.paused = false;
    else S.settings.speed = Math.min(maxSpeed(), cur + 1);
  } else if (!S.settings.paused) {
    if (cur <= 1) S.settings.paused = true;
    else S.settings.speed = cur - 1;
  }
  paint();
}

// ── The run to the next decision ────────────────────────────────────────────

export function seek() {
  if (!S) return { ok: false, reason: 'no game' };
  if (seeking) { stopSeek(); paint(); return { ok: true, stopped: true }; }
  if (S.narrative?.activeEvent) return { ok: false, reason: 'A card is on the table. Answer it first.' };
  if (S.calls?.active) return { ok: false, reason: 'You are on the phone.' };
  if (S.tutorialHold || S.modalBlocking) return { ok: false, reason: 'Finish what is open first.' };
  prev = { speed: S.settings.speed || 1, paused: !!S.settings.paused };
  seeking = true;
  S.settings.paused = false;
  S.settings.speed = maxSpeed();
  paint();
  return { ok: true };
}

// The seek ends and the clock holds, with the founder's own speed back on the
// dial for when they press play.
function stopSeek() {
  if (!seeking) return false;
  seeking = false;
  if (prev) S.settings.speed = prev.speed;
  prev = null;
  S.settings.paused = true;
  return true;
}

// The founder touched the transport mid-seek: put their speed back and let the
// caller set whatever they pressed.
function cancelSeek() {
  if (!seeking) return;
  seeking = false;
  if (prev) S.settings.speed = prev.speed;
  prev = null;
}

export function stop() { if (stopSeek()) paint(); }

// ── Seek destinations ───────────────────────────────────────────────────────
// Something happened. It stops a run to the next decision because the founder
// explicitly asked to stop there. Ordinary play is never paused by a toast or
// a background threshold. Decision surfaces themselves are transient blockers
// in the loop and release the clock when they close.
export function hold(reason) {
  if (!S || S._offline || S._forecast || !S.meta?.realtime) return false;
  if (!seeking) return false;
  const line = REASONS[reason] || '';
  stopSeek();
  if (line) toast({ icon: '▸❚', title: 'Next decision.', sub: line, ms: 3600 });
  paint();
  return true;
}

// ── §A22 The auto-throttle ──────────────────────────────────────────────────
// A card, a ring or a thread is a decision, and a decision that opens at 5×
// with the clock still running behind it is a decision made under a timer
// nobody asked for. So the two fast speeds drop to 1× while one is on the
// table and come back when it is answered. `THROTTLE_FROM` is where it starts:
// 2× is a speed a founder can still read at.
//
// Three rules. A seek is the founder explicitly asking for the top speed, so
// it is never throttled. The founder's own hand always wins — every transport
// control clears the hold, so a speed set *during* a card is the speed that
// stays. And nothing is ever restored onto a paused clock.
const THROTTLE_FROM = 3;

export function isThrottled() { return !!throttled; }

export function throttle(reason) {
  if (!S || S._offline || S._forecast || !S.meta?.realtime) return false;
  if (S.settings.autoThrottle === false) return false;
  if (seeking || throttled) return false;
  const cur = clamp(S.settings.speed || 1, 1, maxSpeed());
  if (cur < THROTTLE_FROM || S.settings.paused) return false;
  throttled = { speed: cur, reason };
  S.settings.speed = 1;
  paint();
  return true;
}

// Give the speed back — but only if the founder has not touched the dial since,
// which every control above records by clearing the hold.
export function release() {
  if (!S || !throttled) return false;
  const was = throttled.speed;
  throttled = null;
  if ((S.settings.speed || 1) === 1 && !S.settings.paused) { S.settings.speed = was; paint(); }
  return true;
}

// ── §C2 The auto-pause, opt-in ──────────────────────────────────────────────
// The pause bit belongs to the founder, and a background notice may not write
// it. That rule is what `hold` above is built on and it is not being loosened
// here — it is being satisfied. A toggle in Settings is the founder saying, in
// advance, *stop the clock when this happens*, so the pause it produces is
// theirs in exactly the way the pause button's is. Which is also why every one
// of the five is **off** until somebody turns it on: a toggle nobody has
// touched writes nothing at all, and the game as shipped still never pauses
// itself.
//
// `S.settings.autoPause` is a flat map of the five, missing entirely on a save
// written before it existed — hence the optional read rather than a migration.
// Refused for the same worlds `throttle` refuses: a forecast, offline catch-up
// and a headless run have no clock a founder is watching. A seek is already on
// its way to a stop, so it is left to `hold`, which knows how to give the
// founder's own speed back.
export const AUTO_PAUSE = {
  incident: 'An incident.',
  wire: 'A thread or a letter is waiting on you.',
  runway: `Runway is under ${TIME.AUTOPAUSE_RUNWAY_DAYS} days.`,
  cash: 'Cash went negative.',
  rogue: 'An agent shipped without asking.',
};

export function wantsPause(kind) {
  return !!S?.settings?.autoPause?.[kind];
}

export function autoPause(kind) {
  if (!S || S._offline || S._forecast || !S.meta?.realtime) return false;
  if (!wantsPause(kind)) return false;
  if (seeking || S.settings.paused) return false;
  throttled = null;
  S.settings.paused = true;
  paint();
  const line = AUTO_PAUSE[kind] || '';
  if (line) toast({ icon: '❚❚', title: 'Stopped, as you asked.', sub: line, ms: 3600 });
  return true;
}

// A new run, or a loaded one: nothing is mid-seek.
export function reset() {
  seeking = false; prev = null; throttled = null;
}
