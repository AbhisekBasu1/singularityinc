// ─────────────────────────────────────────────────────────────────────────────
// ALARMS — §I12. Something went wrong, on screen, where it went wrong.
//
// An incident, a negative balance and an agent shipping without asking were all
// toasts and nothing else: a notice in the corner, gone in six seconds, with no
// mark anywhere on the thing that had actually broken. A founder who was
// looking at the Research tree when the account went under found out about it
// from a card three days later.
//
// So the panel that owns the problem lights, briefly, in red. Three rules:
//
//   · **It is read in the render, not written to the DOM.** `render()` patches,
//     and `syncAttrs` removes attributes the new HTML does not mention — so a
//     class added by hand to a rendered node is erased on the next repaint,
//     which at seven a second is immediately. The views ask `lit()` and put the
//     class in the string, and it goes away on its own when the clock runs out.
//   · **No `box-shadow`.** Every plate in this codebase is a chamfered
//     `clip-path`, and a box-shadow on one draws a rectangle behind the cut. The
//     pulse is a border colour and a `drop-shadow` filter, which follow the cut.
//   · **Reduced motion still says it.** The animation is a pulse; under reduced
//     motion the frame simply holds red for the same window. What must never
//     happen is that the founder is told nothing.
//
// Nothing here is saved. An alarm describes this moment, and a save that came
// back with a red panel would be lying about which moment it was.
// ─────────────────────────────────────────────────────────────────────────────

const HOLD_MS = 2400;

const until = new Map();          // name -> wall-clock ms when it stops
let repaint = null;               // injected: the shell's paint, without importing it

/**
 * `main.js` hands this in, the way the world chip and the saved-ago line are
 * handed to the shell — this module must not import the shell, which imports
 * the console, which imports the views, which import this.
 */
export function registerRepaint(fn) { repaint = typeof fn === 'function' ? fn : null; }

/** Light one. Returns the name, so a caller can raise and pass it on in a line. */
export function raise(name, ms = HOLD_MS) {
  if (!name) return null;
  until.set(name, Date.now() + Math.max(200, ms));
  try { repaint?.(); } catch { /* headless */ }
  // The console does not repaint on a clock the way the workstation does, so
  // the end of the alarm is scheduled rather than waited for. One timer per
  // raise, and it only paints.
  setTimeout(() => { try { repaint?.(); } catch { /* gone */ } }, Math.max(200, ms) + 40);
  return name;
}

/** Is it lit right now? Cheap: one map read and a comparison. */
export function lit(name) {
  const t = until.get(name);
  if (!t) return false;
  if (t > Date.now()) return true;
  until.delete(name);
  return false;
}

/** The class a view puts in its string. Empty when nothing is wrong. */
export function alarmClass(name) { return lit(name) ? ' alarm' : ''; }

/** A new run, or a loaded one: nothing is on fire yet. */
export function clearAlarms() { until.clear(); }
