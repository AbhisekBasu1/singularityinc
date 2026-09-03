// ─────────────────────────────────────────────────────────────────────────────
// THE LANDING — the first screen, below the hero.
//
// `src/ui/intro.js` owns the hero (the wordmark, the doors and the WebMCP
// panel, all of which it already had). This module owns everything under it:
// six movements inside the same `.stage` scroller, so `stageCue()` and every
// harness that looks for `.stage`, `.title-kicker` or `.title-webmcp` keep
// working exactly as they did.
//
// Three rules hold it together.
//
// - **It is a pure string function plus a mount.** `sections(ctx)` returns
//   HTML and reads nothing but data modules and the context it is handed;
//   `mount()` is the only side effect, and it starts the two live things (the
//   rain behind the hero and the cold open typing itself into a
//   terminal plate). Nothing here draws from the seeded RNG stream — the
//   rain behind the hero runs on its own LCG, which is not the game's.
// - **Every number is counted, never typed.** `counts()` reads the modules
//   that hold the things. `src/data/landing.js` carries the prose and states
//   no quantities at all, which is the only way the two cannot disagree.
// - **It does not import upward.** Data modules, `dom.js` and
//   `typewriter.js`. The WebMCP hand arrives through `ctx`, from `intro.js`,
//   for the same reason `src/ui/author.js` is handed its hand rather than
//   importing the surface: closing that cycle breaks tool execution, not
//   rendering, and it does it a long way from where it was written.
// ─────────────────────────────────────────────────────────────────────────────
import { esc } from './dom.js';
import { revealLines } from './typewriter.js';
import { ACT_LINES, SECTIONS, WORLD_PLATES, NO_ASSISTANT, FOOTER, RAIN_WORDS } from '../data/landing.js';
import { ACTS } from '../data/balance.js';
import { CHAR_LIST, arcLabel } from '../data/characters.js';
import { EVENTS } from '../data/events.js';
import { ENDINGS } from '../data/endings.js';
import { EPILOGUES } from '../data/epilogues.js';
import { LETTERS } from '../data/mail.js';
import { GLOSSARY } from '../data/manual.js';
import { TOTAL_STEPS } from '../data/tutorial.js';
import { DOCTRINES } from '../data/doctrines.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { CALLS } from '../data/calls.js';
import { TRAITS, MODELS } from '../data/agents.js';
import { PLATFORM } from '../data/platform.js';
import { FEATURE_KINDS } from '../data/products.js';

// ── The count ───────────────────────────────────────────────────────────────
// Read at render, out of the module that owns the thing. The title screen has
// claimed a wrong quantity before — "an unlimited supply of machines", for
// months, over a roster that caps — and the fix is the same one the WebMCP
// panel has always used: print `list.length`, never a word.
export function counts(hand) {
  const choices = EVENTS.reduce((n, e) => n + (e.choices?.length || 0), 0);
  const topics = Object.values(CALLS).reduce((n, t) => n + (t.topics?.length || 0), 0);
  const terms = GLOSSARY.reduce((n, g) => n + (g.items?.length || 0), 0);
  return {
    cards: EVENTS.length,
    choices,
    endings: ENDINGS.length,
    good: ENDINGS.filter((e) => e.tone === 'good').length,
    plates: new Set(ENDINGS.map((e) => e.plate || e.id)).size,
    epilogues: EPILOGUES.length,
    letters: LETTERS.length,
    people: CHAR_LIST.length,
    trees: Object.keys(CALLS).length,
    topics,
    tools: hand?.tools?.length || 0,
    doctrines: DOCTRINES.length,
    achievements: ACHIEVEMENTS.length,
    terms,
    steps: TOTAL_STEPS,
    traits: TRAITS.length,
    models: Object.keys(MODELS).length,
  };
}

// The strip under the doors. Five figures, all of them counted a line above.
export function readout(hand) {
  const c = counts(hand);
  const rows = [[c.cards, 'cards'], [c.endings, 'endings'], [c.letters, 'letters'],
    [c.people, 'people'], [c.tools, 'tools']];
  return `<div class="ld-readout reveal" aria-label="What is in the game">
    ${rows.map(([n, k]) => `<span class="ld-fig"><b>${n}</b> ${esc(k)}</span>`).join('<i aria-hidden="true">·</i>')}
  </div>`;
}

// ── The movements ───────────────────────────────────────────────────────────
export function sections(ctx = {}) {
  return `<div class="ld" id="ld">
    ${coldSection(ctx)}
    ${castSection()}
    ${actsSection()}
    ${worldSection(ctx)}
    ${endingsSection()}
    ${housingsSection()}
    ${numbersSection(ctx)}
    ${footSection()}
  </div>`;
}

// Every movement opens the same way: a mono eyebrow, the line that carries it,
// the paragraph under that, and a rule. The rule is a real element with a
// background gradient rather than a border on one edge — `tools/oneside.mjs`
// is written to find exactly that shape, and it is right to.
function head(k) {
  const s = SECTIONS[k];
  return `<header class="ld-head">
    <div class="ld-eyebrow">${esc(s.label)}</div>
    <h2 class="ld-title">${esc(s.title)}</h2>
    <p class="ld-body">${esc(s.body)}</p>
    <div class="ld-rule" aria-hidden="true"></div>
  </header>`;
}

// ── 2. The machine is already awake ─────────────────────────────────────────
// The cold open, seen rather than gated. It types itself in a terminal plate
// the first time it is scrolled to, and the game plays it again as the first
// beat when Begin is pressed — where it belongs, and where it is not standing
// between a visitor and the button.
function coldSection(ctx) {
  const lines = ctx.cold || [];
  return `<section class="ld-sec ld-sec-cold" id="ld-cold">
    ${head('cold')}
    <div class="ld-term" data-lines="${lines.length}">
      <div class="ld-term-bar">
        <span class="ld-term-name">cold_open</span>
        <span class="ld-term-meta">${lines.length} lines</span>
      </div>
      <div class="ld-term-body" id="ld-cold-lines">${lines.map((l) => `<p class="tw-line">${esc(l)}</p>`).join('')}</div>
    </div>
  </section>`;
}

// ── 3. The people ───────────────────────────────────────────────────────────
function castSection() {
  const c = counts();
  return `<section class="ld-sec ld-sec-cast">
    ${head('cast')}
    <div class="ld-count">${c.people} of them
      <i>${esc(SECTIONS.cast.hint)}</i></div>
    <div class="ld-rail" role="list">
      ${CHAR_LIST.map(castPlate).join('')}
    </div>
    <p class="ld-note">${esc(SECTIONS.cast.note)}</p>
  </section>`;
}

function castPlate(p) {
  const face = p.img
    ? `<img class="ld-face" src="${esc(thumb(p.img))}" alt="" width="400" height="400" loading="lazy" decoding="async" />`
    : `<span class="ld-face ld-face-none" aria-hidden="true"><i>${esc(p.icon)}</i></span>`;
  return `<article class="ld-person" role="listitem" style="--ac:${esc(p.color)}">
    <div class="ld-portrait">${face}<span class="ld-tick" aria-hidden="true"></span></div>
    <div class="ld-person-id">
      <b>${esc(p.name)}</b>
      <span>${esc(p.role)}</span>
    </div>
    <div class="ld-arc">${esc(arcLabel(p.id, 0))}</div>
    <p class="ld-bio">${esc(p.bio)}</p>
  </article>`;
}

// The landing draws its own copies of the game's art: a portrait is a 400px
// square here and a 640px square in a card, and shipping the card's file for a
// thumbnail is most of a megabyte nobody asked for.
function thumb(src) {
  const name = String(src).split('/').pop().replace(/\.[a-z]+$/i, '');
  return `assets/landing/${name}.webp`;
}

// ── 4. Five acts ────────────────────────────────────────────────────────────
function actsSection() {
  const acts = ACTS.filter((a) => a.id > 0);
  return `<section class="ld-sec ld-sec-acts">
    ${head('acts')}
    <ol class="ld-acts">
      ${acts.map((a) => {
        const line = ACT_LINES.find((l) => l.id === a.id);
        return `<li class="ld-act">
          <div class="ld-act-rule" aria-hidden="true"><i></i></div>
          <article class="ld-act-plate">
            <img class="ld-act-img" src="assets/landing/act${a.id}.webp" alt="" width="1600" height="534" loading="lazy" decoding="async" />
            <div class="ld-act-text">
              <div class="ld-act-num">Act ${esc(a.short)}</div>
              <h3 class="ld-act-name">${esc(a.name)}</h3>
              <div class="ld-act-sub">${esc(a.sub || '')}</div>
              <p class="ld-act-line">${esc(line ? line.text : '')}</p>
            </div>
          </article>
        </li>`;
      }).join('')}
    </ol>
  </section>`;
}

// ── 5. The world layer ──────────────────────────────────────────────────────
function worldSection(ctx) {
  const known = new Set((ctx.hand?.tools || []).map((t) => t.name));
  // A plate names the tools it is describing, and a name the surface does not
  // publish today is dropped rather than promised. `later` is the authority a
  // run has to earn, which is most of this list on day zero.
  const later = new Set((ctx.hand?.later || []).map(([n]) => n));
  const chip = (n) => `<span class="ld-tool${later.has(n) ? ' earned' : ''}">${esc(n)}</span>`;
  const plates = WORLD_PLATES.map((p) => {
    const names = p.tools.filter((n) => known.has(n) || later.has(n));
    return `<article class="ld-plate">
      <h3 class="ld-plate-title">${esc(p.title)}</h3>
      <p class="ld-plate-body">${esc(p.body)}</p>
      ${names.length ? `<div class="ld-tools">${names.map(chip).join('')}</div>` : ''}
    </article>`;
  }).join('');
  const c = counts(ctx.hand);
  return `<section class="ld-sec ld-sec-world">
    ${head('world')}
    ${c.tools ? `<div class="ld-count">${c.tools} tools, registered the moment the run begins</div>` : ''}
    <div class="ld-plates">${plates}</div>
    <article class="ld-plate ld-plate-quiet">
      <h3 class="ld-plate-title">${esc(NO_ASSISTANT.title)}</h3>
      <p class="ld-plate-body">${esc(NO_ASSISTANT.body)}</p>
      <div class="ld-contract">${esc(PLATFORM.app)} on ${esc(PLATFORM.presets)} &middot; ${esc(PLATFORM.browser)} &middot; or nothing</div>
    </article>
  </section>`;
}

// ── The endings ─────────────────────────────────────────────────────────────
// Eight photographs for sixteen endings, which is a deliberate economy: the
// ones added later borrow the plate of the one they rhyme with. So the grid is
// the plates, and the names under each are every ending that uses it.
function endingsSection() {
  const c = counts();
  const byPlate = new Map();
  for (const e of ENDINGS) {
    const k = e.plate || e.id;
    if (!byPlate.has(k)) byPlate.set(k, []);
    byPlate.get(k).push(e);
  }
  const tiles = [...byPlate].map(([plate, list]) => `<figure class="ld-end">
    <img src="assets/landing/end_${esc(plate)}.webp" alt="" width="640" height="400" loading="lazy" decoding="async" />
    <figcaption>${list.map((e) => `<span class="ld-end-name tone-${esc(e.tone)}">${esc(e.name)}</span>`).join('')}</figcaption>
  </figure>`).join('');
  return `<section class="ld-sec ld-sec-end">
    <header class="ld-head">
      <div class="ld-eyebrow">${esc(SECTIONS.endings.label)}</div>
      <h2 class="ld-title">${c.endings} endings. ${esc(SECTIONS.endings.title)}</h2>
      <p class="ld-body">${esc(SECTIONS.endings.body)}</p>
      <div class="ld-rule" aria-hidden="true"></div>
    </header>
    <div class="ld-ends">${tiles}</div>
    <p class="ld-note">${c.good} of them are good, and they are mutually exclusive. ${c.plates} photographs carry all ${c.endings}, plus ${c.epilogues} epilogues that read the run back to you.</p>
  </section>`;
}

// ── 6. Two housings, the numbers, the door out ──────────────────────────────
function housingsSection() {
  return `<section class="ld-sec ld-sec-house">
    ${head('housings')}
    <div class="ld-shots">
      <figure class="ld-shot">
        <img src="assets/readme/console.webp" alt="The console: one screen, with a rail of decisions down the right." width="1600" height="1000" loading="lazy" decoding="async" />
        <figcaption><b>The console</b> <span>at /</span></figcaption>
      </figure>
      <figure class="ld-shot">
        <img src="assets/readme/workstation.webp" alt="The workstation: a desktop with a menu bar, a dock and windows." width="1600" height="1000" loading="lazy" decoding="async" />
        <figcaption><b>The workstation</b> <span>at /computer/</span></figcaption>
      </figure>
    </div>
  </section>`;
}

function numbersSection(ctx) {
  const c = counts(ctx.hand);
  const tiles = [
    [c.cards, 'cards', 'in the deck'],
    [c.choices, 'choices', 'written across them'],
    [c.endings, 'endings', `on ${c.plates} photographs`],
    [c.epilogues, 'epilogues', 'that read the run back'],
    [c.letters, 'letters', 'in the post'],
    [c.topics, 'things to say', `across ${c.trees} phone trees`],
    [c.tools, 'world tools', 'the assistant may hold'],
    [c.doctrines, 'doctrines', 'you hold rather than buy'],
    [c.achievements, 'achievements', 'across every timeline'],
    [c.terms, 'glossary terms', 'hoverable everywhere'],
    [c.steps, 'walkthrough steps', 'in the machine itself'],
    [c.traits, 'agent traits', `on ${c.models} models`],
  ];
  return `<section class="ld-sec ld-sec-nums">
    ${head('numbers')}
    <div class="ld-rack">
      ${tiles.map(([n, k, sub]) => `<div class="ld-tile">
        <b>${n}</b><span>${esc(k)}</span><i>${esc(sub)}</i>
      </div>`).join('')}
    </div>
  </section>`;
}

function footSection() {
  return `<footer class="ld-foot">
    <div class="ld-foot-rule" aria-hidden="true"></div>
    <p class="ld-foot-line">${esc(FOOTER.line)}</p>
    <div class="ld-foot-row">
      <a class="ld-link" href="${esc(FOOTER.repo)}" target="_blank" rel="noopener">Source on GitHub</a>
      <span class="ld-foot-sep" aria-hidden="true">·</span>
      <span class="ld-foot-tag">${esc(FOOTER.licence)}</span>
      <span class="ld-foot-sep" aria-hidden="true">·</span>
      <span class="ld-foot-tag">${esc(FOOTER.built)}</span>
    </div>
  </footer>`;
}

// ═══ THE LIVE PARTS ═════════════════════════════════════════════════════════
// Two of them, and both stop when nobody can see them. A generation counter is
// what makes that safe: the opening replaces `#app` wholesale, and a timer or
// an observer that outlives its own page is a leak with a repaint attached.

let gen = 0;
let teardown = [];

export function unmount() {
  gen++;
  for (const off of teardown) { try { off(); } catch { /* already gone */ } }
  teardown = [];
}

export function mount(ctx = {}) {
  unmount();
  const mine = gen;
  startField(mine, ctx);
  startCold(mine);
}

const reduced = () => {
  try {
    if (document.documentElement?.classList?.contains('reduced-motion')) return true;
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch { return true; }
};

// ── Digital rain ────────────────────────────────────────────────────────────
// The canonical effect, and then ours.
//
// The canonical part is exactly the one everybody writes and it is right: a 2D
// canvas, one column per glyph width, and every frame the whole canvas is
// painted with a *low-alpha* fill instead of being cleared — so what was drawn
// last frame is still there, one step darker, and a trail happens for free.
// Then one new glyph at each column's head, the head advances, and a column
// past the bottom is put back at the top at random rather than on a schedule,
// which is what keeps the field from breathing in unison.
//
// Six things make it this game's rather than a wallpaper:
//
//   1. **No green.** Cyan through violet with the occasional emerald, which is
//      the palette of `assets/readme/` and of everything in `hud.css`. The head
//      glyph is near-white and the trail fades through the column's own colour.
//   2. **Depth.** Two layers on one canvas: a far one, smaller and slower and
//      dimmer, and a near one. One shared fade gives them both their trails and
//      the parallax does the rest.
//   3. **The game's own alphabet.** Mono capitals and digits, the icon glyphs
//      the interface actually prints, box-drawing, blocks, and the caret the
//      typewriter uses.
//   4. **Words.** Every few seconds a column drops something real read top to
//      bottom — an act, a tool the world holds, a card out of the deck — never
//      more than `MAX_WORDS` at once, so it is something a watcher catches
//      rather than a banner.
//   5. **Life.** A column stalls. A column flares and dies. A gust runs across
//      neighbours and fades.
//   6. **The type owns the frame.** A radial well behind the wordmark and the
//      doors, and a vignette to black at the edges — both gradients on a static
//      layer, because a filter over an animating canvas is the cliff
//      `styles/hud.css` has a rule about.
//
// `fillText` and `fillRect` and nothing else: no `shadowBlur`, no filter, no
// gradient built per frame. It stops when the tab is hidden or the hero
// scrolls out, and under `prefers-reduced-motion` it paints one still frame at
// low density and never runs again.

const RAIN = {
  near: { size: 15, gap: 15, cap: 120, speed: [7, 14], alpha: 0.80, dim: 0.95 },
  far: { size: 10, gap: 11, cap: 160, speed: [3.5, 8], alpha: 0.34, dim: 0.42 },
  // How much of the last frame is painted over. Lower is a longer trail, and
  // this is the one number that decides whether the field reads as rain or as
  // static: at 0.085 a five-row tail was down to six per cent inside half a
  // second and every glyph looked alone.
  fade: 0.055,
  head: '#e8f6ff',
  word: [6500, 12000],      // ms between word drops
  hold: 2.6,                // seconds a finished word stays legible
};
const MAX_WORDS = 2;
// Cyan, one in four violet, one in twelve emerald.
const RAIN_INK = [
  [77, 208, 225], [77, 208, 225], [77, 208, 225], [77, 208, 225],
  [77, 208, 225], [77, 208, 225], [77, 208, 225], [77, 208, 225],
  [139, 92, 246], [139, 92, 246], [139, 92, 246],
  [0, 229, 160],
];
const GLYPHS = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  + '⌬⌘◈↗⌗▦✦§⇄☼⌂◌❋⚔✎⛨⊹∞'
  + '─│┌┐└┘├┤┬┴┼═║╔╗╚╝'
  + '░▒▓█▌▐▀▄▍').split('');

// A small LCG, and not the game's. Nine lines, its own state, no imports.
function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// What falls, in words. Read out of the game rather than written here: the
// acts, the deck's own short titles, the hand the world holds at day zero, and
// the kinds of thing a founder ships. `RAIN_WORDS` in `src/data/landing.js` is
// the handful that belong to no list — the name of the thing, and the time it
// starts.
function rainWords(hand) {
  const out = [...RAIN_WORDS];
  for (const a of ACTS) if (a.id > 0) out.push(a.name.toUpperCase());
  for (const k of FEATURE_KINDS) if (k.name) out.push(k.name.toUpperCase());
  for (const t of hand?.tools || []) out.push(t.name);
  for (const e of EVENTS) {
    if (typeof e.title === 'string' && e.title.length >= 4 && e.title.length <= 18) out.push(e.title.toUpperCase());
  }
  return out;
}

export function fieldHtml() {
  return `<div class="ld-field" aria-hidden="true">
    <canvas id="ld-canvas"></canvas>
    <div class="ld-vignette"></div>
  </div>`;
}

// A real 2D context, or nothing. `tools/uitest.mjs` stubs `createElement` with
// a `getContext` that answers an object, so "is there a canvas" is not the
// question — "can it draw text" is.
function context2d(cv) {
  try {
    const ctx = cv?.getContext?.('2d');
    return ctx && typeof ctx.fillText === 'function' && typeof ctx.fillRect === 'function' ? ctx : null;
  } catch { return null; }
}

function startField(mine, ctxIn) {
  const cv = document.getElementById('ld-canvas');
  const ctx = context2d(cv);
  if (!cv || !ctx) return;

  const rnd = lcg((Date.now() ^ 0x9e3779b9) >>> 0);
  const words = rainWords(ctxIn?.hand);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0, h = 0, raf = 0, last = 0, running = false, live = 0;
  let layers = [];

  const glyph = () => GLYPHS[(rnd() * GLYPHS.length) | 0];

  const build = (spec) => {
    const n = Math.min(spec.cap, Math.max(6, Math.ceil(w / spec.gap)));
    const rows = Math.ceil(h / spec.size) + 2;
    return {
      spec,
      x: (i) => (i + 0.5) * (w / n),
      cols: Array.from({ length: n }, () => ({
        y: -rnd() * rows,
        t: rnd(),
        v: spec.speed[0] + rnd() * (spec.speed[1] - spec.speed[0]),
        rgb: RAIN_INK[(rnd() * RAIN_INK.length) | 0],
        stall: 0, gust: 0, word: null, cells: null, hold: 0,
      })),
      rows,
    };
  };

  const size = () => {
    const box = cv.getBoundingClientRect?.() || { width: 0, height: 0 };
    const nw = Math.max(1, Math.round(box.width || cv.clientWidth || 0));
    const nh = Math.max(1, Math.round(box.height || cv.clientHeight || 0));
    if (nw === w && nh === h) return false;
    w = nw; h = nh;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    layers = [build(RAIN.far), build(RAIN.near)];
    live = 0;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    return true;
  };

  // One column, one row further down. The head is near-white, the cell it just
  // left is the column's own colour, and the fade underneath does the rest.
  const step = (L, c, i) => {
    const s = L.spec;
    const x = L.x(i);
    const yh = c.y * s.size;
    const [r, g, b] = c.rgb;
    let ch = glyph();
    let bright = false;
    if (c.word) {
      ch = c.word.text[c.word.i++] || ch;
      bright = true;
      c.cells.push({ y: yh, ch });
      if (c.word.i >= c.word.text.length) { c.word = null; c.hold = RAIN.hold; live--; }
    }
    if (yh > -s.size && yh < h + s.size) {
      ctx.fillStyle = bright ? RAIN.head : `rgba(232,246,255,${s.alpha})`;
      ctx.fillText(ch, x, yh);
      // The two cells above, in the column's own colour: a white head over a
      // coloured body over a tail the fade is already darkening. Without them
      // the field is monochrome, because the head is the only thing drawn.
      ctx.fillStyle = `rgba(${r},${g},${b},${bright ? 1 : s.dim})`;
      ctx.fillText(glyph(), x, yh - s.size);
      ctx.fillStyle = `rgba(${r},${g},${b},${s.dim * 0.62})`;
      ctx.fillText(glyph(), x, yh - s.size * 2);
      // A glyph three or four back changes its mind. That is the mutation the
      // original has, at the cost of one more `fillText` on one column.
      if (rnd() < 0.14) {
        ctx.fillStyle = `rgba(${r},${g},${b},${s.dim * 0.4})`;
        ctx.fillText(glyph(), x, yh - s.size * (3 + ((rnd() * 4) | 0)));
      }
    }
    c.y += 1;
    // Past the bottom, and then only sometimes: a field that resets on a
    // schedule pulses, and a field that resets at random rains.
    if (yh > h && rnd() > 0.972) {
      c.y = -1 - rnd() * 6;
      c.v = s.speed[0] + rnd() * (s.speed[1] - s.speed[0]);
      c.rgb = RAIN_INK[(rnd() * RAIN_INK.length) | 0];
    }
  };

  const paint = (dt) => {
    ctx.fillStyle = `rgba(5,6,10,${RAIN.fade})`;
    ctx.fillRect(0, 0, w, h);
    for (const L of layers) {
      ctx.font = `${L.spec.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < L.cols.length; i++) {
        const c = L.cols[i];
        if (c.stall > 0) { c.stall -= dt; continue; }
        if (c.gust > 0) c.gust -= dt;
        // A column carrying a word slows down, because the whole point of it
        // is that somebody reads it on the way past.
        c.t += dt * c.v * (c.gust > 0 ? 2.6 : 1) * (c.word ? 0.62 : 1);
        let guard = 0;
        while (c.t >= 1 && guard++ < 4) { c.t -= 1; step(L, c, i); }
        // A word has to be readable all at once or it is not a word: the fade
        // would have eaten its first letter before its last one landed. So the
        // cells a word wrote are redrawn every frame while it is falling and
        // for `RAIN.hold` seconds after it lands, and then let go.
        if (c.cells) {
          const a = c.word ? 1 : Math.max(0, c.hold / RAIN.hold);
          if (!c.word) c.hold -= dt;
          if (a <= 0) { c.cells = null; continue; }
          ctx.fillStyle = `rgba(232,246,255,${a.toFixed(3)})`;
          for (const cell of c.cells) {
            if (cell.y > -L.spec.size && cell.y < h + L.spec.size) ctx.fillText(cell.ch, L.x(i), cell.y);
          }
        }
      }
    }
  };

  // Life: a column holds its breath, a column flares and starts over, and
  // every so often a gust runs across four or five neighbours.
  const stir = (dt) => {
    const L = layers[1];
    if (!L) return;
    if (rnd() < dt * 1.6) L.cols[(rnd() * L.cols.length) | 0].stall = 0.25 + rnd() * 0.8;
    if (rnd() < dt * 0.8) {
      const i = (rnd() * L.cols.length) | 0;
      const c = L.cols[i];
      ctx.font = `${L.spec.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = RAIN.head;
      for (let k = 0; k < 4; k++) ctx.fillText(glyph(), L.x(i), c.y * L.spec.size - k * L.spec.size);
      c.y = -1 - rnd() * 8;
    }
    if (rnd() < dt * 0.5) {
      const i = (rnd() * L.cols.length) | 0;
      for (let k = -2; k <= 2; k++) {
        const c = L.cols[(i + k + L.cols.length) % L.cols.length];
        if (c) c.gust = 0.5 + rnd() * 0.6;
      }
    }
  };

  let wordAt = 0;
  const drop = (now) => {
    if (live >= MAX_WORDS || !words.length || !layers.length) return;
    if (now < wordAt) return;
    wordAt = now + RAIN.word[0] + rnd() * (RAIN.word[1] - RAIN.word[0]);
    const L = layers[1];
    // A column near the top, put exactly on the first row. A column's head is
    // usually somewhere above the glass, and a word started there arrives
    // already missing its first letter — which is how THE NEW ONE read as
    // HE NEW ONE for an afternoon.
    const free = L.cols.filter((c) => !c.word && c.y < 3);
    const c = free.length ? free[(rnd() * free.length) | 0] : null;
    if (!c) return;
    c.y = 1;
    c.word = { text: words[(rnd() * words.length) | 0].split(''), i: 0 };
    c.cells = [];
    c.hold = RAIN.hold;
    live++;
  };

  const frame = (now) => {
    if (gen !== mine || !cv.isConnected) { stop(); return; }
    // A tab handed back after a minute in the background gives a huge delta;
    // clamp it or the whole field teleports on the frame it comes forward.
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    paint(dt);
    stir(dt);
    drop(now);
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || gen !== mine) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  size();

  // Reduced motion: one still frame, at a quarter of the density, and then
  // nothing at all.
  if (reduced()) {
    for (const L of layers) {
      ctx.font = `${L.spec.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < L.cols.length; i += 2) {
        const c = L.cols[i];
        c.y = 2 + rnd() * (L.rows - 4);
        for (let k = 0; k < 5; k++) {
          const yy = (c.y - k) * L.spec.size;
          if (yy < 0 || yy > h) continue;
          const [r, g, b] = c.rgb;
          ctx.fillStyle = k === 0 ? RAIN.head : `rgba(${r},${g},${b},${(L.spec.dim * (1 - k / 5)).toFixed(3)})`;
          ctx.fillText(glyph(), L.x(i), yy);
        }
      }
    }
    return;
  }

  let onScreen = true;
  const sync = () => { if (onScreen && !document.hidden) start(); else stop(); };
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  const onResize = () => { size(); };
  window.addEventListener('resize', onResize);

  let io = null;
  try {
    io = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      sync();
    }, { threshold: 0 });
    io.observe(cv);
  } catch { /* no IntersectionObserver: it simply runs while the page is visible */ }

  teardown.push(() => {
    stop();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    try { io?.disconnect(); } catch { /* already torn down */ }
  });
  sync();
}

// ── The cold open, typing ───────────────────────────────────────────────────
// It runs once, when the plate is first scrolled to, through the same
// `typewriter.js` every staged reveal in this game goes through — which is
// what makes it skip on a click and resolve instantly under reduced motion.
function startCold(mine) {
  const box = document.getElementById('ld-cold-lines');
  if (!box || typeof IntersectionObserver !== 'function') return;
  const lines = [...box.querySelectorAll('.tw-line')].map((p) => p.textContent);
  if (!lines.length) return;
  if (reduced()) { box.querySelectorAll('.tw-line').forEach((p) => p.classList.add('shown')); return; }

  let played = false;
  const io = new IntersectionObserver((entries) => {
    if (played || gen !== mine) return;
    if (!entries.some((e) => e.isIntersecting)) return;
    played = true;
    try { io.disconnect(); } catch { /* already torn down */ }
    box.closest('.ld-term')?.classList.add('live');
    revealLines(box, lines, { mode: 'fade', gap: 1400 });
  }, { threshold: 0.35 });
  io.observe(box);
  teardown.push(() => { try { io.disconnect(); } catch { /* already torn down */ } });
}
