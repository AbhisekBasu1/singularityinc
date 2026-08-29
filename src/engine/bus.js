// Tiny synchronous event bus. Systems emit; UI listens.
const listeners = new Map();

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => off(evt, fn);
}

export function once(evt, fn) {
  const un = on(evt, (...args) => { un(); fn(...args); });
  return un;
}

export function off(evt, fn) {
  listeners.get(evt)?.delete(fn);
}

// Silence, for a simulation that is not happening.
//
// `forecast` runs the real reducers forward on a copy of the world to find out
// what would happen. Those reducers emit — achievements, act transitions, feed
// items, toasts — and every one of those listeners would fire for events in a
// future that is being thrown away a moment later. A counter rather than a
// boolean, so nesting cannot leave it stuck on.
let silenced = 0;
export function silence() { silenced++; return () => { silenced = Math.max(0, silenced - 1); }; }
export function isSilenced() { return silenced > 0; }

export function emit(evt, payload) {
  if (silenced) return;
  const set = listeners.get(evt);
  if (set) for (const fn of Array.from(set)) {
    try { fn(payload); } catch (e) { console.error(`[bus:${evt}]`, e); }
  }
  const any = listeners.get('*');
  if (any) for (const fn of Array.from(any)) {
    try { fn(evt, payload); } catch (e) { console.error('[bus:*]', e); }
  }
}

export function clearAll() { listeners.clear(); }
