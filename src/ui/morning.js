// ─────────────────────────────────────────────────────────────────────────────
// THE MORNING LINE — §I9.
//
// The welcome-back briefing has always been excellent and only ever fired after
// a week away. This is the same idea at the scale of a day: the first repaint
// of a session, and each in-game morning slow enough to read one, open with one
// sentence from somebody who works here.
//
// Two rules, and the first is the one that has bitten this codebase before.
//
//   · **Never the RNG.** `askAria` used to pick its opener with `pick()` on a
//     path the workstation repaints seven times a second, which changed the
//     sentence every frame *and* silently advanced the shared stream,
//     desynchronising every event draw after it. The line here is indexed by
//     the day: stable while you read it, different tomorrow, free.
//   · **Never a number.** A morning line that priced the runway would have to
//     derive it, and this is the one surface whose whole job is to be a
//     sentence. The copy in `MORNING` states no quantity at all.
//
// Weaver is only in the rotation once hired, which is the point: the mornings
// change because the company did.
// ─────────────────────────────────────────────────────────────────────────────
import { MORNING } from '../data/machine.js';
import { CHARACTERS } from '../data/characters.js';

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

function hasWeaver(S) {
  const f = S?.narrative?.flags || {};
  return !!(f.hired_weaver || S?.narrative?.relationships?.weaver?.met);
}

/**
 * Today's line, or null when there is nothing to say. Pure: two array lookups
 * and an integer.
 *
 *   { who, name, colour, text }
 */
export function morningLine(S) {
  if (!S) return null;
  const day = Math.floor(num(S.time?.day));
  const aria = Array.isArray(MORNING?.aria) ? MORNING.aria : [];
  const weaver = Array.isArray(MORNING?.weaver) ? MORNING.weaver : [];
  if (!aria.length && !weaver.length) return null;
  // Weaver takes every third morning once he is here, so ARIA stays the voice
  // of the machine and he is the voice of the company beside it.
  const useWeaver = weaver.length && hasWeaver(S) && day % 3 === 2;
  const pool = useWeaver ? weaver : (aria.length ? aria : weaver);
  const who = useWeaver ? 'weaver' : 'aria';
  const c = CHARACTERS[who] || null;
  const text = pool[Math.floor(day / 1) % pool.length];
  if (!text) return null;
  return { who, name: c?.name || (who === 'aria' ? 'ARIA' : 'Weaver'), colour: c?.color || 'var(--violet)', text };
}
