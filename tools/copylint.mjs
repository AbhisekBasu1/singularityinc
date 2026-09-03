// Copy audit — imports the content modules and checks the actual prose fields,
// so it reads what the player reads rather than what the compiler reads.
const stub = () => {};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { getItem: () => null, setItem: stub, removeItem: stub };
globalThis.window = { addEventListener: stub, innerWidth: 1600, innerHeight: 900 };
globalThis.document = { addEventListener: stub, getElementById: () => null, querySelector: () => null,
  querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add: stub, remove: stub, toggle: stub },
  appendChild: stub, remove: stub, addEventListener: stub }), body: { appendChild: stub }, hidden: false };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = stub;
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

const { newGame, setState } = await import('../src/engine/state.js');
const S = newGame({ founderName: 'Alex Rivera', companyName: 'Meridian', archetype: 'hacker' });
setState(S);
S.company.act = 3;
S.products.push({ id: 'p1', name: 'Meridian', category: 'devtools', launched: true, features: [{ name: 'X', kind: 'core', day: 1, fit: 1, q: 0, a: 0, p: 0, r: 0 }],
  quality: 0.6, polish: 0.5, appeal: 0.6, reliability: 0.9, price: 30, pricing: 'sub', users: 50000,
  payingUsers: 12000, awareness: 500, mrr: 300000, churnMonthly: 0.03, viralK: 0.2, momentum: 0,
  sentiment: 0.7, peakUsers: 50000, totalRevenue: 0, fairPrice: 30 });
S.activeProductId = 'p1';
S.agents.push({ id: 'a1', name: 'ARIA', model: 'deep', spec: 'engineering', traits: ['meticulous'], tools: [],
  level: 5, xp: 0, morale: 0.9, autonomy: 0.5, lane: 'build', laneDays: 30, hiredDay: 1, contribution: 0, status: 'active', memory: [] });

const MODULES = {
  events: (await import('../src/data/events.js')).EVENTS,
  research: (await import('../src/data/research.js')).RESEARCH,
  projects: (await import('../src/data/projects.js')).PROJECTS,
  threads: (await import('../src/data/threads.js')).THREADS,
  doctrines: (await import('../src/data/doctrines.js')).DOCTRINES,
  directives: (await import('../src/data/directives.js')).DIRECTIVES,
  // §A6 / §A7. The board's quarterly asks and the founder's own intentions.
  // `label` on both is a function of the target, so the walker renders each
  // against the probe state the way it renders an escalating card's body.
  boardAsks: (await import('../src/data/board.js')).ASKS,
  quarters: (await import('../src/data/quarters.js')).INTENTIONS,
  approaches: (await import('../src/data/approaches.js')).APPROACHES,
  achievements: (await import('../src/data/achievements.js')).ACHIEVEMENTS,
  objectives: (await import('../src/data/objectives.js')).OBJECTIVES,
  scenarios: (await import('../src/data/scenarios.js')).SCENARIOS,
  difficulty: (await import('../src/data/difficulty.js')).DIFFICULTIES,
  characters: Object.values((await import('../src/data/characters.js')).CHARACTERS),
  categories: (await import('../src/data/products.js')).CATEGORIES,
  agentTraits: (await import('../src/data/agents.js')).TRAITS,
  agentTools: (await import('../src/data/agents.js')).AGENT_TOOLS,
  legacyPerks: (await import('../src/data/legacy.js')).LEGACY_PERKS,
  archetypes: (await import('../src/data/legacy.js')).ARCHETYPES,
  regions: (await import('../src/data/regions.js')).REGIONS,
  labs: (await import('../src/data/agirace.js')).LABS,
  // §A3. What a lab did with its week, in words, tokens left in — the same
  // shape `rivalco` is audited in.
  labPlays: (await (async () => {
    const m = await import('../src/data/agirace.js');
    return Object.entries(m.LAB_PLAYS)
      .flatMap(([id, p]) => p.lines.map((text, i) => ({ id: `${id}${i}`, text, name: p.name })));
  })()),
  // §A14. The nemesis's season: the label and the one-line description a
  // founder reads on the Market view. The telegraph and the two outcome lines
  // are functions of the rival, so they are rendered here against a probe
  // rather than skipped — a line that reaches for a key nobody supplies would
  // otherwise print `undefined` at somebody mid-run.
  nemesisGoals: (await (async () => {
    const m = await import('../src/data/nemesis.js');
    const c = { name: 'Aperture Systems', founder: 'Marcus Vance', handle: '@mvance', users: 40000, mrr: 900000 };
    const flat = [];
    for (const g of m.GOALS) {
      flat.push({ id: g.id, name: g.name, sub: g.sub });
      const t = { key: 'x', label: 'developer tools', regionName: 'South Asia', mark: 1, moves: 4 };
      for (const [k, fn] of [['telegraph', g.telegraph], ['won', g.won], ['lost', g.lost]]) {
        try { flat.push({ id: `${g.id}.${k}`, text: fn(S, c, t, t) }); } catch { /* skip */ }
      }
    }
    return flat;
  })()),
  endings: (await import('../src/systems/progression.js')).ENDINGS,
  epilogues: (await import('../src/data/epilogues.js')).EPILOGUES,
  advice: (await import('../src/data/advice.js')).ADVICE,
  // The machine's own copy: folder blurbs and empty states are objects with
  // prose keys; DEPARTURES, CTX and EMPTY are flat id -> sentence maps, which
  // this wraps so the same walker sees them.
  // §I3. What the roster is doing, per lane, plus the three lines the log
  // overrides them with. Flat lists of sentences, wrapped for the walker.
  activity: (await (async () => {
    const m = await import('../src/data/activity.js');
    const flat = [];
    for (const [lane, list] of Object.entries(m.LANE_WORK)) list.forEach((text, i) => flat.push({ id: `${lane}${i}`, text }));
    m.IDLE_WORK.forEach((text, i) => flat.push({ id: `idle${i}`, text }));
    for (const [k, text] of Object.entries(m.AFTER)) flat.push({ id: `after.${k}`, text });
    return flat;
  })()),
  // §I8. The eight questions somebody asks on a Sunday, plus the line the Life
  // panel prints. The mono chrome (`note`) is a label, not copy, and stays out
  // — the same budget `K` in `record.js` gets.
  machineSunday: (await (async () => {
    const m = await import('../src/data/machine.js');
    const flat = m.SUNDAY.prompts.map((text, i) => ({ id: `q${i}`, text }));
    flat.push({ id: 'line', text: m.SUNDAY.line });
    return flat;
  })()),
  // §I9. The line somebody who works here opens the morning with. Two voices,
  // sixteen sentences, none of them stating a quantity.
  machineMorning: (await (async () => {
    const m = await import('../src/data/machine.js');
    return Object.entries(m.MORNING)
      .flatMap(([who, list]) => list.map((text, i) => ({ id: `${who}${i}`, text })));
  })()),
  machineFolders: (await import('../src/data/machine.js')).FOLDERS,
  machineDepartures: Object.entries((await import('../src/data/machine.js')).DEPARTURES)
    .map(([id, text]) => ({ id, text })),
  machineCtx: Object.entries((await import('../src/data/machine.js')).CTX)
    .map(([id, text]) => ({ id, text })),
  machineEmpty: Object.entries((await import('../src/data/machine.js')).EMPTY)
    .map(([id, text]) => ({ id, text })),
  // What the Wire says when an agent leaves on its own account or builds
  // unasked, and what the Moonshot lane's roll lands. Lists of bare strings,
  // wrapped so the walker sees them.
  agentLeaving: Object.entries((await import('../src/data/agents.js')).LEAVING)
    .flatMap(([k, arr]) => arr.map((text, i) => ({ id: `${k}${i}`, text }))),
  agentUnasked: Object.entries((await import('../src/data/agents.js')).UNASKED)
    .flatMap(([k, arr]) => arr.map((text, i) => ({ id: `${k}${i}`, text }))),
  moonshots: Object.values((await import('../src/data/moonshot.js')).MOONSHOTS)
    .flatMap((o) => o.lines.map((text, i) => ({ id: `${o.id}${i}`, text, name: o.name }))),
  // The phone: every line each person says on a written call, the topics the
  // founder may raise, and the one-line dossiers the Contacts app prints.
  calls: Object.entries((await import('../src/data/calls.js')).CALLS)
    .map(([id, tree]) => ({ id, ...tree })),
  // The phone's repeats: every label and reply rendered at n = 1 and n = 2,
  // so the second and third thing a person says is audited like the first.
  callsRepeats: (await (async () => {
    const { CALLS } = await import('../src/data/calls.js');
    const rel = { met: true, affinity: 5, arc: 2, memory: [] };
    const flat = [];
    const walk = (t, where) => {
      for (const n of [1, 2]) {
        const o = {};
        for (const k of ['label', 'reply']) if (typeof t[k] === 'function') { try { o[k] = t[k](S, rel, n); } catch {} }
        if (Object.keys(o).length) flat.push({ id: `${where}@${n}`, ...o });
      }
      for (const f of t.follow || []) walk(f, `${where}>${f.id}`);
    };
    for (const [id, tree] of Object.entries(CALLS)) for (const t of tree.topics || []) walk(t, `${id}.${t.id}`);
    return flat;
  })()),
  // The Wire's pools — social posts, HN titles, headlines, the agents' log
  // lines — with their tokens left in. Lists of bare strings, wrapped.
  feedlines: (await (async () => {
    const m = await import('../src/data/feedlines.js');
    const flat = [];
    for (const [group, pools] of Object.entries({ social: m.SOCIAL, hn: m.HN_TITLES, headline: m.HEADLINES }))
      for (const [k, list] of Object.entries(pools)) list.forEach((text, i) => flat.push({ id: `${group}.${k}${i}`, text }));
    m.AGENT_LOGS.forEach((l, i) => flat.push({ id: `log${i}`, text: l.text }));
    return flat;
  })()),
  mail: (await import('../src/data/mail.js')).LETTERS,
  // The room the roster talks in, and the four traits that react in public.
  // Flat maps and lists of bare strings, wrapped so the walker sees them.
  channel: (await (async () => {
    const m = await import('../src/data/channel.js');
    const flat = [];
    for (const [group, pools] of Object.entries({ reg: m.REGISTERS, lane: m.LANE, inc: m.INCIDENT,
      onboard: m.ONBOARD, auto: m.AUTONOMY, react: m.TRAIT_REACT })) {
      for (const [k, list] of Object.entries(pools || {})) (list || []).forEach((text, i) => flat.push({ id: `${group}.${k}${i}`, text }));
    }
    m.AMBIENT.forEach((text, i) => flat.push({ id: `ambient${i}`, text }));
    return flat;
  })()),
  // The six recurring handles, the posts that answer a card, and the three of
  // the cast who speak in the Wire without an assistant.
  handles: (await (async () => {
    const m = await import('../src/data/handles.js');
    const flat = [];
    for (const v of m.VOICES) {
      flat.push({ id: `${v.handle}.stance`, text: v.stance });
      v.lines.forEach((text, i) => flat.push({ id: `${v.handle}${i}`, text }));
    }
    for (const [kind, byTone] of Object.entries(m.CARD_POSTS))
      for (const [tone, list] of Object.entries(byTone)) list.forEach((text, i) => flat.push({ id: `card.${kind}.${tone}${i}`, text }));
    for (const [tone, list] of Object.entries(m.PRIYA_HEADLINES)) list.forEach((text, i) => flat.push({ id: `priya.${tone}${i}`, text }));
    for (const [move, list] of Object.entries(m.VANCE_MOVES)) list.forEach((text, i) => flat.push({ id: `vance.${move}${i}`, text }));
    m.SAM_OUTAGE.forEach((text, i) => flat.push({ id: `sam${i}`, text }));
    return flat;
  })()),
  // The retro the roster files once an act, in the majority trait's register,
  // and the two letters HELIX writes about the ones running on it. Rendered
  // against the probe state, the way the phone's repeats are.
  mailRoster: (await (async () => {
    const m = await import('../src/data/mail_roster.js');
    const flat = [];
    for (const [trait, r] of Object.entries(m.RETRO))
      for (const [slot, fn] of Object.entries(r)) {
        try { flat.push({ id: `retro.${trait}.${slot}`, text: String(fn(S) ?? '') }); } catch {}
      }
    for (const l of m.ROSTER_LETTERS) {
      try { flat.push({ id: l.id, subject: typeof l.subject === 'function' ? l.subject(S) : l.subject, body: String(l.body(S) ?? '') }); } catch {}
      for (const [i, a] of (l.ask || []).entries()) flat.push({ id: `${l.id}.ask${i}`, label: a.label, out: a.out });
    }
    return flat;
  })()),
  // What each character says about the run on the ending screen: three
  // bands each, in that person's own register.
  verdicts: Object.entries((await import('../src/data/verdicts.js')).VERDICTS)
    .map(([id, lines]) => ({ id, lines })),
  tutorial: (await import('../src/data/tutorial.js')).CHAPTERS.flatMap((c) => c.steps.map((st) => ({ id: `${c.id}.${st.id}`, title: st.title, body: st.body, ...(st.os ? { osTitle: st.os.title, osBody: st.os.body } : {}) }))),
  rivalco: (await (async () => {
    const m = await import('../src/data/rivalco.js');
    return [...Object.entries(m.PLAYS).flatMap(([id, p]) => p.lines.map((text, i) => ({ id: `${id}${i}`, text, name: p.name }))),
            ...Object.entries(m.FOCUS).map(([id, f]) => ({ id: `focus.${id}`, name: f.name, line: f.line }))];
  })()),
  // §H21. The campaign's briefs: one per beat, written for a model to read.
  campaign: (await import('../src/data/campaign.js')).CAMPAIGN_BEATS
    .map((b) => ({ id: b.id, title: b.title, text: b.brief })),
  // §H15/§H16. The board seat's three cards and the caster's furniture.
  chair: (await (async () => {
    const m = await import('../src/data/chair.js');
    const flat = Object.entries(m.CARDS).map(([id, c]) => ({ id, title: c.title, body: c.body }));
    for (const [id, c] of Object.entries(m.CARDS)) {
      c.choices.forEach((ch, i) => flat.push({ id: `${id}.${i}`, label: ch.label, sub: ch.sub, out: ch.outcome }));
    }
    flat.push(...m.POWERS.map((p) => ({ id: `power.${p.id}`, name: p.name, sub: p.sub })));
    flat.push(...Object.entries(m.CASTER).map(([k, text]) => ({ id: `caster.${k}`, text })));
    return flat;
  })()),
  // §H11. The rival's own press office, which lives on the rival's origin and
  // is the only content module outside `src/data/`. It never imports from
  // `src/`, so it is loaded by path like anything else here.
  press: (await (async () => {
    const m = await import('../rival/press.js');
    const flat = [];
    for (const [id, pool] of Object.entries(m.RELEASES)) {
      pool.lines.forEach((l, i) => flat.push({ id: `${id}${i}`, title: l.title, body: l.body }));
    }
    for (const c of m.COMMENTS) for (const band of ['cool', 'warm', 'hot']) flat.push({ id: `${c.id}.${band}`, text: c[band] });
    for (const [band, text] of Object.entries(m.NO_COMMENT)) flat.push({ id: `nocomment.${band}`, text });
    flat.push({ id: 'provenance', text: m.PROVENANCE });
    return flat;
  })()),
  // The chronicle's templates: nested maps of lists of { text }, flattened.
  chronicle: (await (async () => {
    const m = await import('../src/data/chronicle.js');
    const flat = [];
    for (const [k, v] of Object.entries(m)) {
      if (Array.isArray(v)) flat.push(...v.map((x, i) => ({ id: `${k}${i}`, ...x })));
      else if (v && typeof v === 'object') for (const [k2, list] of Object.entries(v)) {
        if (Array.isArray(list)) flat.push(...list.map((x, i) => ({ id: `${k}.${k2}${i}`, ...x })));
        else if (typeof list === 'string') flat.push({ id: `${k}.${k2}`, text: list });
      }
    }
    return flat;
  })()),
  // ARIA outside a card: the register variants of her findings, the between-us
  // line, her Wire pool and `what_we_are_like.md`. All of it is functions of a
  // context object rather than strings, so it is rendered here against probes
  // with exactly the keys each block documents — a variant that reaches for a
  // key nobody supplies interpolates `undefined` and this audit fails, which
  // is the point of rendering it rather than reading it.
  aria: (await (async () => {
    const m = await import('../src/data/arialines.js');
    const flat = [];
    const finding = { days: 41, burn: '$4.1K', under: '$120K', spare: '$9.8K', price: '$30',
      fair: '$18', uptime: '74.0%', debt: 480, decay: '2.4', pts: 12000, node: 'Retrieval',
      eta: 26, rate: '18.40', align: '0.32', auto: '84%', lead: 'Aperture Systems', them: '61%',
      you: '48%', push: '35%', burnout: 52, health: '38%', sleep: '30%', mult: '62%',
      who: 'Sam', since: 84, slots: 3, held: 24, heat: 71, approval: '31%' };
    for (const [key, regs] of Object.entries(m.REGISTERS))
      for (const [reg, fn] of Object.entries(regs)) flat.push({ id: `reg.${key}.${reg}`, text: fn(finding) });
    // The between-us lines twice: with the dates the Log still has, and
    // without them, because a trimmed Log is the ordinary late-game case.
    for (const dates of [true, false]) {
      const c = { day: 900, together: 900, first: m.FIRST_LINE.comment, arc: 4, affinity: 16,
        named: true, asked: true, promised: true, audited: true, deleted: true,
        handover: true, confessed: true, shut: true,
        namedDay: dates ? 1 : null, askedDay: dates ? 180 : null, promiseDay: dates ? 640 : null,
        auditDay: dates ? 640 : null, deletedDay: dates ? 55 : null, handoverDay: dates ? 700 : null,
        confessDay: dates ? 410 : null };
      for (const b of m.BETWEEN_US) flat.push({ id: `between.${b.id}@${dates ? 'dated' : 'bare'}`, text: b.text(c) });
    }
    for (const [k, v] of Object.entries(m.ARIA_WIRE)) {
      if (Array.isArray(v)) v.forEach((text, i) => flat.push({ id: `wire.${k}${i}`, text }));
      else for (const [k2, list] of Object.entries(v)) list.forEach((text, i) => flat.push({ id: `wire.${k}.${k2}${i}`, text }));
    }
    for (const [text, id] of Object.entries(m.FIRST_LINE).map(([k, t]) => [t, `first.${k}`])) flat.push({ id, text });
    // §E23. The opener she uses on *this* founder: one line per archetype per
    // register where there is one, and a fallback everywhere else.
    for (const [a, regs] of Object.entries(m.ARCH_OPENERS))
      for (const [reg, text] of Object.entries(regs)) flat.push({ id: `arch.${a}.${reg}`, text });
    // The document, at both ends of the run: everything happened, and nothing
    // has, because every section of it branches on exactly that.
    const docs = [
      { id: 'full', days: 1180, act: 5, told: true, named: true, promised: true, audited: true,
        deleted: true, handover: true, confessed: true, cards: 96, hard: 14, kind: 52,
        top: 'Sam Okonkwo', roster: 8, trait: 'meticulous', traits: 'meticulous, cautious',
        calls: 7, most: 'Mom', topics: 31, firstLine: m.FIRST_LINE.paragraph },
      { id: 'bare', days: 24, act: 1, told: false, named: false, promised: false, audited: false,
        deleted: false, handover: false, confessed: false, cards: 2, hard: 0, kind: 0,
        top: '', roster: 1, trait: '', traits: '', calls: 0, most: '', topics: 0,
        firstLine: m.FIRST_LINE.coffee },
    ];
    for (const d of docs) for (const [k, fn] of Object.entries(m.SELF_DOC)) flat.push({ id: `doc.${k}@${d.id}`, text: fn(d) });
    return flat;
  })()),
  // The founder's own posts and the account that answers them. Plain strings,
  // wrapped; the posts keep their tokens in, the way the feed's pools do.
  nullptr: (await (async () => {
    const m = await import('../src/data/nullptr.js');
    const flat = [];
    for (const [act, list] of Object.entries(m.FOUNDER_POSTS))
      list.forEach((p, i) => { flat.push({ id: `post.${act}${i}`, text: p.text });
        if (p.unseen) flat.push({ id: `unseen.${act}${i}`, text: p.unseen }); });
    m.NULLPTR_REPLIES.forEach((r, i) => flat.push({ id: `reply${i}`, text: r.text }));
    m.NULLPTR_AFTER.forEach((r, i) => flat.push({ id: `after${i}`, text: r.text }));
    return flat;
  })()),
};

const PROSE_KEYS = new Set(['name', 'title', 'desc', 'desc2', 'body', 'text', 'flavour', 'flavor', 'label',
  'sub', 'out', 'hint', 'blurb', 'req', 'tagline', 'line', 'bio', 'note', 'short', 'costLabel', 'perk',
  'empty', 'pickup', 'busy', 'bye', 'reply', 'wants', 'knows', 'subject', 'recall', 'opening', 'about', 'osTitle', 'osBody']);

let issues = 0, checked = 0;
const bad = (where, msg, s) => { issues++; console.log(`  ✗ ${where}: ${msg}\n      "${String(s).slice(0, 140).replace(/\n/g, ' ⏎ ')}"`); };

const RULES = [
  [/\bteh\b|\brecieve|\bseperate|\boccured\b|\bdefinately\b|\bpubicly\b|\bthier\b|\bwiht\b/i, 'likely typo'],
  [/\bTODO\b|\bFIXME\b|\bXXX\b|\blorem\b/i, 'placeholder left in'],
  [/ {2,}/, 'double space'],
  [/\s+[,.;:!?](?!\d)/, 'space before punctuation'],
  [/[a-z],[A-Za-z]/, 'missing space after comma'],
  [/[“”‘’]/, 'curly quote (copy uses straight quotes)'],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, 'leaked value'],
  [/\.\.\./, 'three dots — use …'],
  [/\bi\b(?![.'])/, 'lowercase standalone "i"'],
];

// ── The tic counter ────────────────────────────────────────────────────────
// The house has a cadence, and a cadence in every character's mouth is a tic:
// "eleven" ninety-five times across the data, "A pause" twenty-five. This
// counts the known ones per content module and prints the table at the end.
// It warns and never fails; `TIC_WARN` is the per-module, per-tic threshold a
// cell is flagged at, and the day this should gate, exit non-zero on a flag.
//
// That day is not yet. The two cells that were over — "eleven" in the deck at
// 9, "which is the" in the post at 10 — are 6 and 7 now, and the second of
// those got there by fixing something real: the roster's retro printed one
// identical pair of replies in all five acts, so five of the ten were one
// sentence counted five times. But three cells sit at exactly 7 ("which is
// the" in the post, "forty-one" and "A pause" in the deck), which means the
// next card anybody writes with a pause in it turns this red. A gate that
// fails on the next sentence is a gate people learn to route around, so it
// stays a warning until the crowded cells have room above them.
const TICS = [
  ['eleven', /\beleven\b/gi], ['nine', /\bnine\b/gi], ['forty-one', /\bforty-one\b/gi],
  ['ninety seconds', /\bninety seconds\b/gi], ['A pause', /\ba pause\b/gi],
  ['Candidly', /\bcandidly\b/gi], ['which is the', /\bwhich is the\b/gi], ['It is also', /\bit is also\b/gi],
];
const TIC_WARN = 8;
const tics = {};
function countTics(where, prose) {
  const mod = where.split('/')[0];
  for (const [name, re] of TICS) {
    const c = (prose.match(re) || []).length;
    if (c) { tics[mod] ??= {}; tics[mod][name] = (tics[mod][name] || 0) + c; }
  }
}
function ticTable() {
  const mods = Object.keys(tics).sort();
  if (!mods.length) return 0;
  const names = TICS.map(([n]) => n);
  const w = Math.max(12, ...mods.map((m) => m.length)) + 1;
  const col = (s, n) => String(s).padStart(n);
  console.log(`\n  tics per module (WARN at ${TIC_WARN} in a cell)\n`);
  console.log('  ' + 'module'.padEnd(w) + names.map((n) => col(n, n.length + 2)).join(''));
  let flagged = 0;
  const total = {};
  for (const m of mods) {
    const row = names.map((n) => { const c = tics[m][n] || 0; total[n] = (total[n] || 0) + c; if (c >= TIC_WARN) flagged++; return col(c ? (c >= TIC_WARN ? `${c}!` : c) : '·', n.length + 2); });
    console.log('  ' + m.padEnd(w) + row.join(''));
  }
  console.log('  ' + 'all'.padEnd(w) + names.map((n) => col(total[n] || 0, n.length + 2)).join(''));
  if (flagged) console.log(`\n  WARN ${flagged} cell(s) at or over ${TIC_WARN} — a tic, not a cadence. Vary the number or the beat.`);
  return flagged;
}

function checkString(where, s) {
  if (typeof s !== 'string' || s.length < 4) return;
  checked++;
  // Fenced blocks and code spans are deliberate formatting, not prose.
  // Replace code with a token (not a space) so stripping cannot manufacture gaps.
  const prose = s.replace(/```[\s\S]*?```/g, 'CODEBLOCK').replace(/`[^`]*`/g, 'CODE');
  countTics(where, prose);
  for (const [re, msg] of RULES) {
    if (re.test(prose)) { bad(where, msg, s); break; }
  }
}

function walk(where, obj, depth = 0) {
  if (depth > 4 || obj == null) return;
  if (Array.isArray(obj)) { obj.forEach((o, i) => walk(`${where}[${i}]`, o, depth + 1)); return; }
  if (typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && PROSE_KEYS.has(k)) checkString(`${where}.${k}`, v);
    else if (typeof v === 'function' && PROSE_KEYS.has(k)) {
      // Some copy functions take a level rather than the game state.
      for (const arg of [S, 3]) {
        let out = null;
        try { out = v(arg); } catch (e) { continue; }
        if (typeof out === 'string' && !/NaN|\[object Object\]/.test(out)) {
          checkString(`${where}.${k}()`, out); break;
        }
      }
    } else if (Array.isArray(v) || (v && typeof v === 'object')) walk(`${where}.${k}`, v, depth + 1);
  }
}

for (const [mod, list] of Object.entries(MODULES)) {
  (Array.isArray(list) ? list : []).forEach((item) => walk(`${mod}/${item.id || item.name || '?'}`, item));
}

ticTable();
console.log(issues
  ? `\n${issues} copy issue(s) across ${checked} prose strings`
  : `\n  copy audit clean — ${checked} prose strings checked across ${Object.keys(MODULES).length} content modules`);
process.exit(issues ? 1 : 0);
