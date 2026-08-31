// ─────────────────────────────────────────────────────────────────────────────
// THE SHELL — the housing the game is played in, and the seam between two of them.
//
// There are two: the console (`shell-console.js`, the original — topbar, nav,
// main, feed rail, status line) and the workstation (`os/shell.js` — a desktop
// with a menu bar, a dock and windows). Everything else in the game talks to
// this file and never learns which one is up.
//
// `VIEWS` stays here on purpose. It is shared data rather than either housing's
// property, and `tools/tutorialtest.mjs` reads the view ids straight out of this
// file with a regex — keep the `{ id: 'x', name: …` shape.
//
// The import of the console below is circular (it imports VIEWS back from here)
// and that is safe: nothing in either module touches the other's bindings at
// evaluation time, only inside functions.
// ─────────────────────────────────────────────────────────────────────────────
import * as Console from './shell-console.js';

export const VIEWS = [
  { id: 'desk', name: 'The Desk', navName: 'Desk', icon: '⌂', section: 'Operator' },
  { id: 'product', name: 'Product', icon: '◈', section: 'Operator' },
  { id: 'agents', name: 'Agents', icon: '◉', section: 'Company', showLocked: true,
    lockHint: 'Unlocks once you have written a few prompts by hand and felt the bottleneck.',
    req: (s) => s.unlocks.agents_intro || s.agents.length > 0 || s.time.day > 3 },
  { id: 'research', name: 'Research', navName: 'R&D', icon: '⌬', section: 'Company' },
  { id: 'market', name: 'Market', icon: '↗', section: 'Company' },
  { id: 'world', name: 'World', icon: '⊕', section: 'Empire', showLocked: true,
    lockHint: 'Unlocks in **Act III**, when governments start returning your calls.',
    req: (s) => s.company.act >= 3 },
  { id: 'story', name: 'Story', icon: '✎', section: 'Archive' },
  { id: 'legacy', name: 'Legacy', icon: '∞', section: 'Archive' },
];

// One line each, for a dock tile's hover and a window's empty state. They are
// the `.view-sub` the views already print, kept here so a housing that never
// renders the view can still say what the app is for.
export const VIEW_BLURB = {
  desk: 'Your own hands, and where the day goes.',
  product: 'What you have built, who uses it, and what they pay.',
  agents: 'You do not hire people. You instantiate them.',
  research: 'Capability compounds. Everything else is temporary.',
  market: 'Conditions you do not control, and people who want what you have.',
  world: 'At this size the environment stops being weather and starts being politics.',
  story: 'Every decision, in order. None of them were undone.',
  legacy: 'What survives the timeline reset.',
};

// ── The seam ────────────────────────────────────────────────────────────────
let impl = Console;

export function use(next) {
  impl = next || Console;
  return impl;
}
export function active() { return impl; }
export function isOs() { return impl?.id === 'os'; }
// Screens this housing can be told to open that are not in `VIEWS` — the
// workstation's own apps. The WebMCP `show_module` tool derives its enum from
// what this returns, so an assistant playing the world can say "look in the
// record" and the machine does it. The console has none and says so.
export function extraViews(S) { return impl.extraViews ? impl.extraViews(S) : []; }

// The interface. Every one of these is a one-line delegate on purpose: the list
// *is* the contract, and a housing that grows a method without adding it here
// is a housing the game cannot reach.
export function buildShell() { return impl.buildShell(); }
export function setView(id) { return impl.setView(id); }
// A dock tile is a toggle. Only the workstation has a dock; the console has a
// nav rail, where "press the thing you are already on" correctly means stay.
export function toggleFromDock(id) {
  return impl.toggleFromDock ? impl.toggleFromDock(id) : impl.setView(id);
}
export function getView() { return impl.getView(); }
export function registerViews(m) { return impl.registerViews(m); }
export function endBoot() { return impl.endBoot(); }
export function markSaved() { return impl.markSaved(); }
export function registerWorldChip(fn) { return impl.registerWorldChip(fn); }
export function paintTopbar() { return impl.paintTopbar(); }
export function paintNav() { return impl.paintNav(); }
export function paintMain() { return impl.paintMain(); }
export function paintFeed() { return impl.paintFeed(); }
export function paintStatus() { return impl.paintStatus(); }

// Added for the workstation; the console answers them with the no-ops that keep
// `main.js` free of shell branches.
export function escape() { return impl.escape ? impl.escape() : false; }
export function viewByIndex(i) { return impl.viewByIndex ? impl.viewByIndex(i) : false; }
export function showWorldConsole() { return impl.showWorldConsole ? impl.showWorldConsole() : false; }
export function powerDown() { return impl.powerDown ? impl.powerDown() : Promise.resolve(); }
export function anchorAlias(sel) { return impl.anchorAlias ? impl.anchorAlias(sel) : sel; }
export function showing(id) { return impl.showing ? impl.showing(id) : impl.getView() === id; }
export function announcesCards() { return impl.announcesCards ? impl.announcesCards() : false; }
export function announceCard(ev) { return impl.announceCard ? impl.announceCard(ev) : Promise.resolve(); }
