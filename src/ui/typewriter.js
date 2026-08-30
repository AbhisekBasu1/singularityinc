// ─────────────────────────────────────────────────────────────────────────────
// STAGED TEXT — reveals writing at a readable pace instead of pasting it.
// Character-by-character for short beats, line-by-line for prose.
// Every sequence is skippable: one click or key jumps to the end.
// ─────────────────────────────────────────────────────────────────────────────

const REDUCED = () => {
  try {
    if (document.documentElement?.classList?.contains('reduced-motion')) return true;
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) { return true; }   // no DOM (headless): resolve everything instantly
};

let activeSkip = null;

/** Skip whatever sequence is currently running. */
export function skipActive() { if (activeSkip) activeSkip(); }

export function isPlaying() { return !!activeSkip; }

/**
 * Type `text` into `el`, character by character.
 * Returns a promise that resolves when done (or when skipped).
 */
export function typeInto(el, text, { cps = 42, startDelay = 0 } = {}) {
  return new Promise((resolve) => {
    if (!el) return resolve();
    if (REDUCED()) { el.textContent = text; return resolve(); }
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    let timer = null;
    const finish = () => {
      clearTimeout(timer);
      el.textContent = text;
      el.classList.remove('typing');
      if (activeSkip === finish) activeSkip = null;
      resolve();
    };
    activeSkip = finish;
    const tick = () => {
      if (i >= text.length) return finish();
      // Pause a beat longer on sentence ends — it reads like breathing.
      const ch = text[i];
      i++;
      el.textContent = text.slice(0, i);
      const extra = /[.?!]/.test(ch) ? 260 : /[,;:—]/.test(ch) ? 120 : 0;
      timer = setTimeout(tick, 1000 / cps + extra);
    };
    timer = setTimeout(tick, startDelay);
  });
}

/**
 * Reveal an array of lines one at a time inside `container`.
 * `mode: 'type'` types each line; `mode: 'fade'` fades each in.
 */
export function revealLines(container, lines, { mode = 'fade', gap = 620, cps = 46 } = {}) {
  return new Promise((resolve) => {
    if (!container) return resolve();
    container.innerHTML = '';
    if (REDUCED()) {
      container.innerHTML = lines.map((l) => `<p class="tw-line shown">${l}</p>`).join('');
      return resolve();
    }
    const els = lines.map((l) => {
      const p = document.createElement('p');
      p.className = 'tw-line';
      if (mode === 'fade') p.innerHTML = l;
      container.appendChild(p);
      return { el: p, text: l };
    });
    let i = 0;
    let timer = null;
    const finish = () => {
      clearTimeout(timer);
      els.forEach(({ el, text }) => {
        if (mode === 'fade') el.innerHTML = text; else el.textContent = text;
        el.classList.add('shown');
      });
      if (activeSkip === finish) activeSkip = null;
      resolve();
    };
    activeSkip = finish;
    const next = async () => {
      if (i >= els.length) return finish();
      const { el, text } = els[i];
      i++;
      if (mode === 'type') {
        el.classList.add('shown');
        // typeInto claims activeSkip; restore ours so a skip finishes everything
        const prev = activeSkip;
        await typeInto(el, text.replace(/<[^>]+>/g, ''), { cps });
        if (activeSkip === null) activeSkip = prev;
        el.innerHTML = text;
      } else {
        el.classList.add('shown');
      }
      timer = setTimeout(next, gap);
    };
    next();
  });
}

/** Fade a set of already-rendered elements in, one after another. */
// `onShow(node)` fires as each node is revealed — in the same tick as the
// class, so anything that must not be reachable before it is on screen (a
// choice's tabindex, its aria-hidden) is lifted at exactly that moment.
export function stagger(nodes, { gap = 90, delay = 0, onShow } = {}) {
  const list = Array.from(nodes);
  const show = (n) => { n.classList.add('shown'); try { onShow?.(n); } catch {} };
  if (REDUCED()) { list.forEach(show); return Promise.resolve(); }
  return new Promise((resolve) => {
    list.forEach((n, i) => setTimeout(() => show(n), delay + i * gap));
    setTimeout(resolve, delay + list.length * gap + 260);
  });
}

export function wait(ms) {
  return new Promise((resolve) => {
    if (REDUCED()) return resolve();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); if (activeSkip === done) activeSkip = null; resolve(); }
    activeSkip = done;
  });
}
