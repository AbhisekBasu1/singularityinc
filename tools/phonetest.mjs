// The phone, end to end: every tree renders, the phone remembers what you said,
// a `once` topic is said once, the written world rings and the ring's own
// topics come first, and nothing rings offline, early, or while an assistant
// is playing the world.
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.localStorage = { _d: {}, getItem: () => null, setItem() {}, removeItem() {} };

const H = await import('./headless.mjs');
H.installDom?.();
const Game = await import('../src/game.js');
const Calls = await import('../src/systems/calls.js');
const { CALLS } = await import('../src/data/calls.js');
const { CHARACTERS } = await import('../src/data/characters.js');
const { CALLS: C } = await import('../src/data/balance.js');
const { setRngState } = await import('../src/engine/rng.js');
const MailMod = await import('../src/systems/mail.js');
const MailData = await import('../src/data/mail.js');
const Feed = await import('../src/systems/feed.js');
const { INCIDENTS: INCB } = await import('../src/data/balance.js');

let checks = 0, fails = 0;
const ok = (name, c, extra = '') => { checks++; if (!c) { fails++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); } };
const eq = (name, a, b) => ok(name, a === b, `${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
const section = (name, fn) => { console.log(`\n── ${name} ──`); try { fn(); } catch (e) { fails++; checks++; console.log(`  ✗ threw: ${e.message}\n     ${(e.stack || '').split('\n')[1]?.trim()}`); } };
const clean = (name, v) => ok(name, typeof v === 'string' && v.length > 0 && !/undefined|NaN|\[object/.test(v), JSON.stringify(v).slice(0, 120));

const fresh = () => {
  const s = Game.startNewGame({ founderName: 'Alex Test', companyName: 'Testco', archetype: 'hacker', category: 'devtools', productName: 'Testco' });
  for (const id of Object.keys(CHARACTERS)) if (id !== 'aria') s.narrative.relationships[id] = { met: true, affinity: 5, arc: 1, memory: [] };
  s.research.done.own_foundation_model = true;    // so HELIX has a line
  s.founder.focus = s.founder.focusMax = 60;
  s.time.day = 40;
  return s;
};

section('every tree renders, at every gate, with and without memory', () => {
  const S = fresh();
  const probes = [S, (() => { const L = fresh(); L.company.act = 4; L.time.day = 900; L.stats.lastIncidentDay = 899; L.stats.lastIncident = 'Cascade failure'; L.stats.lastIncidentKind = 'dependency'; L.stats.lastShipDay = 898; L.stats.lastRaiseDay = 895; L.agentsLeft = [{ name: 'RHEA', day: 897 }]; L.founder.life = { sleep: 0.3, health: 0.7, ties: {} }; L.world.regulatoryHeat = 60; L.resources.alignment = 0.3; L.world.race = { you: 10, labs: { a: { alive: true, progress: 40 } } }; return L; })()];
  for (const [id, tree] of Object.entries(CALLS)) {
    for (const P of probes) {
      const r = P.narrative.relationships[id];
      for (const k of ['pickup', 'busy', 'bye']) clean(`${id}.${k}`, tree[k](P, r));
      clean(`${id}.recall`, tree.recall(P, r, { since: 9, about: 'the thing', calls: 2, by: 'founder' }) + 'x');
      const walk = (t, where) => {
        // n = 0, 1, 2: the first, second and third time this is said. A variant
        // without a default for `n` renders "undefined" on the third.
        for (const n of [0, 1, 2]) {
          clean(`${where}.label n=${n}`, typeof t.label === 'function' ? t.label(P, r, n) : t.label);
          clean(`${where}.reply n=${n}`, typeof t.reply === 'function' ? t.reply(P, r, n) : t.reply);
          if (t.when) { try { t.when(P, r, n); checks++; } catch (e) { ok(`${where}.when survives`, false, e.message); } }
        }
        const fx = typeof t.fx === 'function' ? t.fx(P, r) : t.fx;
        ok(`${where}.fx is an object`, fx && typeof fx === 'object');
        for (const f of t.follow || []) walk(f, `${where}>${f.id}`);
      };
      for (const t of tree.topics) walk(t, `${id}.${t.id}`);
      for (const g of tree.rings || []) {
        try { g.when(P, r); checks++; } catch (e) { ok(`${id}.${g.id}.when survives`, false, e.message); }
        clean(`${id}.${g.id}.opening`, g.opening(P, r));
        for (const t of g.topics) walk(t, `${id}.${g.id}.${t.id}`);
      }
    }
  }
});

section('a topic said twice is not said the same way twice', () => {
  const S = fresh();
  S.company.act = 3; S.time.day = 500; S.market.priceSiege = 1;
  S.stats.lastIncidentDay = 499; S.stats.lastIncident = 'A Bad Piece'; S.stats.lastIncidentKind = 'bad_press';
  S.stats.lastShipDay = 498; S.stats.lastRaiseDay = 490; S.agentsLeft = [{ name: 'RHEA', day: 497 }];
  S.founder.life = { sleep: 0.3, health: 0.7, ties: {} }; S.world.regulatoryHeat = 60; S.resources.alignment = 0.3;
  S.world.race = { you: 10, labs: { a: { alive: true, progress: 40 } } };
  const text = (t, r, n) => { try { return String(typeof t.reply === 'function' ? t.reply(S, r, n) : t.reply); } catch (e) { return `THREW ${e.message}`; } };
  let total = 0, varied = 0;
  const same = [];
  for (const [id, tree] of Object.entries(CALLS)) {
    const r = S.narrative.relationships[id];
    // Rings come once a run, so their topics are said once; the standing
    // conversation and the reactive topics are what a founder hears again.
    const walk = (t, where) => {
      if (!t.once) {
        total++;
        if (text(t, r, 0) !== text(t, r, 1)) varied++; else same.push(where);
        for (const n of [0, 1, 2]) clean(`${where}.reply n=${n}`, text(t, r, n));
      }
      for (const f of t.follow || []) walk(f, `${where}>${f.id}`);
    };
    for (const t of tree.topics) walk(t, `${id}.${t.id}`);
  }
  ok(`at least 80% of repeatable topics change on the second ask (${varied}/${total})`, total > 0 && varied / total >= 0.8, same.join(', '));
  // The openers a founder actually calls about carry a third line.
  for (const [id, topic] of [['mom', 'eaten'], ['mom', 'explain'], ['mom', 'tired'], ['mom', 'proud'], ['sam', 'bug'], ['sam', 'why'], ['sam', 'thanks'], ['crane', 'metric'], ['crane', 'intro'], ['kai', 'old']]) {
    const t = CALLS[id].topics.find((x) => x.id === topic);
    const r = S.narrative.relationships[id];
    ok(`${id}.${topic} has a third line`, !!t && text(t, r, 2) !== text(t, r, 1) && text(t, r, 2) !== text(t, r, 0));
  }
  // An incident is framed by what it did, never by its title as a subject.
  const down = CALLS.sam.topics.find((x) => x.id === 'down');
  const line = text(down, S.narrative.relationships.sam, 0);
  ok('the incident is a verb on the phone', line.includes('was in the paper'), line);
  ok('and never a title used as a subject', !line.includes('A Bad Piece'), line);
  delete S.stats.lastIncidentKind;
  ok('a save without the kind gets the plain verb', text(down, S.narrative.relationships.sam, 0).includes('took the thing down'));
});

section('vance is lowercase on the phone', () => {
  const S = fresh();
  S.company.act = 3; S.market.priceSiege = 1; S.stats.lastShipDay = S.time.day;
  const r = S.narrative.relationships.vance;
  const v = CALLS.vance;
  const spoken = [];
  const walk = (t) => { for (const n of [0, 1, 2]) spoken.push(String(typeof t.reply === 'function' ? t.reply(S, r, n) : t.reply)); for (const f of t.follow || []) walk(f); };
  for (const t of v.topics) walk(t);
  for (const g of v.rings || []) { spoken.push(g.opening(S, r)); for (const t of g.topics) walk(t); }
  // Whatever sits inside his quotation marks is his; the narration around it is not.
  let quoted = 0; const cased = [];
  for (const s of spoken) for (const m of s.matchAll(/"([^"]+)"/g)) { quoted++; if (/[A-Z]/.test(m[1])) cased.push(m[1]); }
  ok('his lines were found', quoted > 30, String(quoted));
  ok('and none of them has a capital letter in it', cased.length === 0, cased.slice(0, 3).join(' | '));
  const bare = [];
  for (const aff of [-6, 0, 10]) for (const k of ['pickup', 'bye']) bare.push(v[k](S, { ...r, affinity: aff }));
  bare.push(v.recall(S, r, { since: 3, about: 'the truce', calls: 2, by: 'founder' }));
  ok('so are his pickup, his goodbye and what he remembers', bare.every((s) => !/[A-Z]/.test(s)), bare.filter((s) => /[A-Z]/.test(s)).join(' | '));
});

section('the phone remembers what you said', () => {
  const S = fresh();
  let r = Calls.startCall(S, 'sam');
  ok('the call opens', r.ok);
  const opts = Calls.options(S);
  ok('four topics are offered', opts.length === C.TOPIC_KEEP, `${opts.length}`);
  ok('none is marked as said before', opts.every((o) => !o.again));
  const first = opts.find((o) => o.id === 'bug') || opts[0];
  ok('saying a topic works', Calls.say(S, first.id).ok);
  eq('it is counted', Calls.timesSaid(S, 'sam', first.id), 1);
  Calls.hangUp(S);
  const m = Calls.memoryOf(S, 'sam');
  ok('the memory names what the call was about', m && m.topic === first.id && typeof m.about === 'string', JSON.stringify(m));
  S.time.day += 8;
  r = Calls.startCall(S, 'sam');
  const pickup = r.call.rounds[0].text;
  ok('the pickup carries the last call', pickup.includes(first.id === 'bug' ? 'about the bug' : 'Last time'), pickup);
  const again = Calls.options(S);
  const pos = again.findIndex((o) => o.id === first.id);
  ok('what was said before is offered last, or not at all', pos === -1 || pos === again.length - 1, JSON.stringify(again.map((o) => o.id)));
  ok('and marked as said before when it is', pos === -1 || again[pos].again);
  Calls.hangUp(S);
  S.time.day += C.RECALL_DAYS + 10;
  r = Calls.startCall(S, 'sam');
  ok('an old call is not brought up', !r.call.rounds[0].text.includes('about the bug') || S.time.day - m.since < 0, r.call.rounds[0].text);
  Calls.hangUp(S);
});

section('a once topic is said once, and a topic sized to the run is sized to the run', () => {
  const S = fresh();
  S.time.day = 400;
  let r = Calls.startCall(S, 'sam');
  ok('a year in, the anniversary is offered', Calls.options(S).some((o) => o.id === 'year'), JSON.stringify(Calls.options(S).map((o) => o.id)));
  ok('and can be said', Calls.say(S, 'year').ok);
  Calls.hangUp(S);
  S.time.day += 10;
  r = Calls.startCall(S, 'sam');
  ok('it is never offered again', !Calls.options(S).some((o) => o.id === 'year'));
  Calls.hangUp(S);

  // Crane's bridge: needs a short runway and some standing.
  S.company.cash = 2000;
  S.agents.push({ id: 'x', name: 'X', model: 'fast', spec: 'engineering', lane: 'engineering', traits: [], tools: [], level: 1, morale: 1, autonomy: 0.5, wage: 200, hiredDay: 1 });
  S.narrative.relationships.crane.arc = 1;
  S.time.day += 10;
  r = Calls.startCall(S, 'crane');
  const ids = Calls.options(S).map((o) => o.id);
  ok('a founder about to run out of money can ask for a bridge', ids.includes('bridge'), JSON.stringify(ids));
  const cash0 = S.company.cash;
  const said = Calls.say(S, 'bridge');
  ok('the bridge lands, sized to the burn', said.ok && S.company.cash > cash0 && S.company.cash - cash0 >= 6000, `${cash0} -> ${S.company.cash}`);
  ok('and leaves a flag', !!S.narrative.flags?.crane_bridge);
  Calls.hangUp(S);
  S.time.day += 10;
  Calls.startCall(S, 'crane');
  ok('you do not get a second bridge', !Calls.options(S).some((o) => o.id === 'bridge'));
  Calls.hangUp(S);
});

section('the written world rings', () => {
  const S = fresh();
  S.time.day = 60;
  S.products[0].users = 500; S.products[0].launched = true;
  S.stats.lastIncidentDay = 60; S.stats.lastIncident = 'Queue backlog';
  const due = Calls.pendingRings(S);
  ok('something is due', due.length > 0, JSON.stringify(due.map((d) => d.ring.id)));
  ok('the outage call is among them', due.some((d) => d.ring.id === 'sam_down'));
  S._offline = true;
  eq('nothing rings offline', Calls.tickRings(S, { force: true }), null);
  S._offline = false;
  Calls.registerCallWorld({ present: () => true });
  eq('nothing rings while an assistant plays the world', Calls.tickRings(S, { force: true }), null);
  Calls.registerCallWorld(null);
  const call = Calls.tickRings(S, { force: true });
  ok('the phone rings', !!call && call.by === 'them' && call.mode === 'written', JSON.stringify(call && { by: call.by, mode: call.mode, ring: call.ring }));
  ok('with an opening line', call.rounds[0].text.length > 10);
  const opts = Calls.options(S);
  const ringIds = (CALLS[call.char].rings.find((g) => g.id === call.ring)?.topics || []).map((t) => t.id);
  ok('the ring\'s own topics come first', opts.length > 0 && opts.every((o) => ringIds.includes(o.id)), JSON.stringify(opts.map((o) => o.id)));
  ok('one can be said', Calls.say(S, opts[0].id).ok);
  const after = Calls.options(S);
  ok('then the ordinary conversation follows', after.length > 0 && after.some((o) => !ringIds.includes(o.id)), JSON.stringify(after.map((o) => o.id)));
  const ended = Calls.hangUp(S);
  ok('the journal says they called', ended.ok && /called$/.test(S.narrative.journal[0].title), S.narrative.journal[0].title);
  ok('it is remembered as rung', !!S.calls.rang[call.ring]);
  eq('the same ring never comes twice', Calls.pendingRings(S).some((d) => d.ring.id === call.ring), false);
  eq('and the window holds', Calls.tickRings(S, { force: true }), null);
});

section('a ring waits for the company to be two weeks old', () => {
  const S = fresh();
  S.time.day = C.RING_MIN_DAY - 2;
  S.stats.lastIncidentDay = S.time.day; S.products[0].users = 500; S.products[0].launched = true;
  eq('too early', Calls.tickRings(S, { force: true }), null);
  ok('and says why', Calls.ringable(S, 'sam').reason === 'too_early');
});

section('the post: every letter reads, and the urgent one goes first', () => {
  const Mail = MailMod;
  const { LETTERS } = MailData;
  const probes = [fresh(), (() => { const L = fresh(); L.company.act = 4; L.time.day = 900; L.stats.lastIncidentDay = 899; L.stats.lastIncident = 'Cascade failure'; L.stats.lastShipDay = 898; L.stats.lastRaiseDay = 895; L.stats.roundsRaised = 2; L.company.rounds = [{ amount: 4e6, day: 895 }]; L.agentsLeft = [{ name: 'RHEA', model: 'deep', day: 899, memory: 'we shipped it' }]; L.founder.life = { sleep: 0.3, health: 0.7, ties: {} }; L.world.regulatoryHeat = 60; L.resources.alignment = 0.3; L.world.race = { you: 10, labs: { a: { alive: true, progress: 40 } } }; L.products[0].launched = true; L.products[0].users = 2e6; L.products[0].sentiment = 0.3; return L; })()];
  for (const l of LETTERS) {
    for (const P of probes) {
      try { l.when(P); checks++; } catch (e) { ok(`${l.id}.when survives`, false, e.message); }
      clean(`${l.id}.body`, l.body(P));
      for (const o of l.ask || []) { clean(`${l.id}.ask.label`, o.label); clean(`${l.id}.ask.out`, o.out); }
    }
  }
  const S = fresh();
  S.time.day = 100; S.company.act = 2; S.company.actStartedDay = 95;
  S.products[0].launched = true; S.products[0].users = 3000;
  S.stats.lastIncidentDay = 100; S.stats.lastIncident = 'Queue backlog';
  const due = LETTERS.filter((l) => l.when(S));
  ok('several letters are due at once', due.length >= 2, due.map((l) => l.id).join(','));
  ok('at least one of them is urgent', due.some((l) => l.urgent));
  const item = Mail.tickMail(S);
  ok('the urgent one is delivered first', item && LETTERS.find((l) => l.id === item.mail.id)?.urgent, item && item.mail.id);
  const second = Mail.tickMail(S);
  ok('and only one a day', second && second.mail.id !== item.mail.id && S.feed.filter((f) => f.type === 'mail').length === 2);
});

section('the post recurs, and the recurrence knows which one it is', () => {
  const Mail = MailMod;
  const { LETTER_MAP } = MailData;
  const bank = LETTER_MAP.m3_bank_statement;
  ok('the bank is a correspondent, not a letter', !!bank?.repeat && !bank.urgent, JSON.stringify(bank?.repeat));
  const S = fresh();
  S.time.day = 200; S.company.act = 2; S.company.actStartedDay = 150;
  S.products[0].launched = true; S.products[0].users = 60000; S.company.cash = 4e5;
  const a = Mail.deliver(S, bank);
  eq('the first statement is numbered 001', a.mail.subject, 'Statement 001');
  eq('and is counted', Mail.timesDelivered(S, bank.id), 1);
  const b = Mail.deliver(S, bank);
  eq('the second is numbered 002', b.mail.subject, 'Statement 002');
  ok('and it is a second item, not the same one edited', b.id !== a.id);
  clean('a statement reads', b.text);

  // The cadence, driven through the real tick rather than asserted on the
  // arithmetic: about one a month, and it stops at `max` rather than for ever.
  const T = fresh();
  T.time.day = 60; T.company.act = 2; T.company.actStartedDay = 55;
  T.products[0].launched = true; T.products[0].users = 60000; T.company.cash = 4e5;
  let statements = 0;
  for (let i = 0; i < 400; i++) { T.time.day += 1; const it = Mail.tickMail(T); if (it?.mail?.id === bank.id) statements++; }
  ok(`about one statement a month over 400 days (${statements})`, statements >= 9 && statements <= 14);
  for (let i = 0; i < 1800; i++) { T.time.day += 1; Mail.tickMail(T); }
  eq('and it stops at max', Mail.timesDelivered(T, bank.id), bank.repeat.max);

  // Away, a recurring letter lands once for the whole absence. Thirty ticks of
  // the day hook is thirty statements without this.
  const O = fresh();
  O.time.day = 100; O.company.act = 2; O.company.actStartedDay = 90;
  O.products[0].launched = true; O.products[0].users = 60000; O.company.cash = 4e5;
  O._offline = true;
  for (let i = 0; i < 90; i++) { O.time.day += 1; Mail.tickMail(O); }
  eq('one statement for a three-month absence', Mail.timesDelivered(O, bank.id), 1);
  delete O._offline;
  O.time.day += 40;
  let backAgain = 0;
  for (let i = 0; i < 40; i++) { O.time.day += 1; if (Mail.tickMail(O)?.mail?.id === bank.id) backAgain++; }
  ok('and the bank writes again once you are back', backAgain >= 1, String(backAgain));
});

section('a reply is owed, and it arrives', () => {
  const Mail = MailMod;
  const { LETTER_MAP } = MailData;
  const S = fresh();
  S.time.day = 60; S.products[0].launched = true; S.products[0].users = 3000;
  const sam = LETTER_MAP.m_sam_report;
  const answers = sam.ask.findIndex((o) => o.replyTo);
  ok('an answer owes a reply', answers >= 0);
  const item = Mail.deliver(S, sam);
  ok('the letter is a thread', !!item.thread);
  const follow = LETTER_MAP[sam.ask[answers].replyTo.id];
  ok('the follow-up exists', !!follow);
  eq('and reaches the inbox no other way', follow.when(S), false);
  Feed.resolveThread(S, item.id, answers);
  ok('answering queues it', S.mail.queued.some((q) => q.id === follow.id), JSON.stringify(S.mail.queued));
  let landed = null;
  for (let i = 0; i < 30 && !landed; i++) { S.time.day += 1; const it = Mail.tickMail(S); if (it?.mail?.id === follow.id) landed = it; }
  ok('and it lands within the month', !!landed, JSON.stringify(S.mail.queued));
  clean('the follow-up reads', landed?.text);
  eq('the queue is empty afterwards', S.mail.queued.length, 0);
});

section('the letter you wrote on day one', () => {
  const { LETTER_MAP } = MailData;
  const mine = LETTER_MAP.m4_from_yourself;
  const blank = LETTER_MAP.m4_blank_page;
  const S = fresh();
  S.company.act = 4; S.time.day = 900; S.company.actStartedDay = 899;
  eq('with nothing written, the blank page arrives', blank.when(S), true);
  eq('and the letter does not', mine.when(S), false);
  S.founder.letterToSelf = 'do not become the thing that answers every email';
  eq('with a line written, the letter arrives', mine.when(S), true);
  eq('and the blank page does not', blank.when(S), false);
  ok('the line is posted back verbatim', mine.body(S).includes(S.founder.letterToSelf), mine.body(S));
  S.company.actStartedDay = 880;
  eq('and only on the first morning of the act', mine.when(S), false);
});

section('the machines write from your own domain', () => {
  const Mail = MailMod;
  const { LETTER_MAP } = MailData;
  const S = fresh();
  S.time.day = 300; S.company.act = 2;
  S.stats.lastIncidentDay = 300; S.stats.lastIncident = 'Cascade failure'; S.stats.lastIncidentKind = 'dependency';
  S.agents.push({ id: 'o1', name: 'VESSEL', model: 'deep', spec: 'ops', lane: 'ops', traits: ['paranoid'],
                  tools: [], level: 2, morale: 1, autonomy: 0.5, wage: 200, hiredDay: 1 });
  const item = Mail.deliver(S, LETTER_MAP.m3_ops_postmortem);
  eq('the sender is an address at your own domain', item.mail.from, 'ops@testco');
  ok('and it names who filed it', item.mail.role.includes('VESSEL'), item.mail.role);
  ok('in that agent\'s register', item.text.includes('Assume for the moment'), item.text.slice(0, 80));
  S.agents.length = 0;
  const solo = Mail.deliver(S, LETTER_MAP.m3_ops_postmortem);
  ok('with nobody on ops, ARIA files it', solo.mail.role.includes('ARIA'), solo.mail.role);
});

// §A15. An incident above the severity line asks the founder what they are
// going to say about it — through the same one-click machinery the post uses,
// with the text naming what actually happened rather than the incident's title.
section('an incident asks, and the answer has a bill behind it', () => {
  const S = fresh();
  S.time.day = 300;
  S.products[0].launched = true;
  S.products[0].users = 40000;
  S.stats.lastIncidentDay = 300;
  S.stats.lastIncident = 'Upstream Outage';
  S.stats.lastIncidentKind = 'dependency';
  S.world.lastIncidentSeverity = INCB.THREAD_SEVERITY + 0.1;

  const opened = Feed.maybeThread(S, 't_incident_ask');
  ok('a severe incident opens a thread by name', !!opened && opened.thread === 't_incident_ask');
  clean('and the post reads', opened?.text);
  ok('and it names what happened rather than the title',
    opened.text.includes('took the thing down'), opened.text);
  ok('and it does not print the incident\'s name as a sentence subject',
    !/^A Bad Piece|^Upstream Outage/.test(opened.text), opened.text);

  eq('three answers', Feed.threadOptions(S, opened).length, 3);
  ok('one open thread of this kind at a time',
    !Feed.eligibleThreads(S).some((t) => t.id === 't_incident_ask'));
  ok('and a second call opens nothing', Feed.maybeThread(S, 't_incident_ask') === null);

  // Owning it publicly.
  const rep0 = S.resources.reputation, heat0 = S.world.regulatoryHeat = 30;
  const own = Feed.resolveThread(S, opened.id, 0);
  ok('owning it is answerable', !!own);
  ok('and it costs heat and buys reputation',
    S.resources.reputation > rep0 && S.world.regulatoryHeat < heat0,
    `${rep0} → ${S.resources.reputation}, ${heat0} → ${S.world.regulatoryHeat}`);

  // The quiet fix, and the vendor's bill.
  const S2 = fresh();
  S2.time.day = 300; S2.products[0].launched = true; S2.products[0].users = 40000;
  S2.stats.lastIncidentDay = 300; S2.stats.lastIncidentKind = 'breach';
  S2.world.lastIncidentSeverity = INCB.THREAD_SEVERITY + 0.1;
  const t2 = Feed.maybeThread(S2, 't_incident_ask');
  const debt0 = S2.resources.techDebt;
  Feed.resolveThread(S2, t2.id, 2);
  ok('the quiet fix costs debt and says nothing', S2.resources.techDebt > debt0,
    `${debt0} → ${S2.resources.techDebt}`);
  ok('and there is no bill waiting',
    !Feed.eligibleThreads(S2).some((t) => t.id === 't_incident_vendor'));

  const S3 = fresh();
  S3.time.day = 300; S3.products[0].launched = true; S3.products[0].users = 40000;
  S3.stats.lastIncidentDay = 300; S3.stats.lastIncidentKind = 'dependency';
  S3.world.lastIncidentSeverity = INCB.THREAD_SEVERITY + 0.1;
  const t3 = Feed.maybeThread(S3, 't_incident_ask');
  Feed.resolveThread(S3, t3.id, 1);
  ok('blaming the vendor is remembered', !!S3.narrative.flags.blamed_the_vendor);
  ok('and a bill is waiting in the pool',
    Feed.eligibleThreads(S3).some((t) => t.id === 't_incident_vendor'));
  const bill = Feed.maybeThread(S3, 't_incident_vendor');
  ok('which opens', !!bill);
  const cash0 = S3.company.cash;
  Feed.resolveThread(S3, bill.id, 1);
  ok('and costs money to settle', S3.company.cash < cash0, `${cash0} → ${S3.company.cash}`);
  ok('once', !Feed.eligibleThreads(S3).some((t) => t.id === 't_incident_vendor'));

  // Below the line, nothing is asked.
  const S4 = fresh();
  S4.time.day = 300; S4.products[0].launched = true; S4.products[0].users = 40000;
  S4.stats.lastIncidentDay = 300; S4.stats.lastIncidentKind = 'hallucination';
  S4.world.lastIncidentSeverity = INCB.THREAD_SEVERITY - 0.2;
  ok('a small incident asks nothing', Feed.maybeThread(S4, 't_incident_ask') === null);
  ok('and it is not in the pool either',
    !Feed.eligibleThreads(S4).some((t) => t.id === 't_incident_ask'));
});

console.log(`\n═══ phone: ${checks - fails}/${checks} checks passed ═══`);
process.exit(fails ? 1 : 0);
