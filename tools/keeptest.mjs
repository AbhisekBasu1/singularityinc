// ─────────────────────────────────────────────────────────────────────────────
// KEEP — the deck grows and the world remembers, headlessly. A world card is
// kept, dealt by the written deck in the next timeline, bounded when it
// lands, and dealt once. The dossier survives the reset and the cards that
// read it become legal.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, section, report } from './headless.mjs';
installDom();
import { makeBot } from './bot.mjs';

const bot = await makeBot();
const Keep = await import('../src/systems/keep.js');
const World = await import('../src/world/author.js');
const { KEEP } = await import('../src/data/balance.js');
const { eligibleEvents, presentEvent, resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { EVENT_MAP } = await import('../src/data/events.js');
const Save = await import('../src/engine/save.js');

let s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                category: 'devtools', productName: 'Testco' });
bot.Loop.stop();
s.tutorialHold = false;

const card = {
  title: 'A quiet Tuesday', kind: 'story',
  body: 'The build has been green for nine days, which is the longest it has ever been.',
  choices: [
    { label: 'Ship the backlog', tone: 'good', sub: 'Two days of work', outcome: 'It all goes out.', effects: { rep: 5 } },
    { label: 'Take the afternoon', tone: 'neutral', sub: 'Nothing burns', outcome: 'You sleep.', effects: { focus: 6 } },
  ],
};

await section('keeping a card', () => {
  s.legacy.kept = [];
  eq('garbage is not a card', Keep.keepCard(s, { title: 'x' }).ok, false);
  const r = Keep.keepCard(s, card);
  ok('a world card is kept', r.ok, JSON.stringify(r));
  eq('it remembers the act', r.card.act, s.company.act);
  eq('and refuses a duplicate', Keep.keepCard(s, card).ok, false);
  eq('there is one', Keep.kept(s).length, 1);
  for (let i = 0; i < KEEP.MAX + 2; i++) Keep.keepCard(s, { ...card, title: `Card ${i}` });
  eq('the deck has a ceiling', Keep.kept(s).length, KEEP.MAX);
  s.legacy.kept = s.legacy.kept.slice(0, 1);
});

await section('a kept card is dealt by the written deck, once', () => {
  s.time.day = 12;
  s.narrative.activeEvent = null;
  const ev = eligibleEvents(s).find((e) => e.kept);
  ok('it is in the pool for its act', !!ev, eligibleEvents(s).filter((e) => e.kept).map((e) => e.id).join(','));
  presentEvent(s, ev);
  ok('it opens as the active card', s.narrative.activeEvent?.kept === true);
  eq('with a runtime for the world\'s hydrate', typeof s.narrative.activeEvent.runtime, 'object');
  const rep0 = s.resources.reputation;
  const r = resolveChoice(s, 0);
  ok('it resolves', !!r && typeof r.outcome === 'string', JSON.stringify(r));
  ok('and its effect landed, bounded', s.resources.reputation > rep0, `${rep0} → ${s.resources.reputation}`);
  eq('the Log says it was kept', s.narrative.journal[0].author, 'kept');
  dismissEvent(s);
  ok('and it is not dealt again', !eligibleEvents(s).some((e) => e.id === ev.id));
});

await section('a face only if they have been met', () => {
  s.legacy.kept = [];
  Keep.keepCard(s, { ...card, kind: 'character', char: 'dorne', title: 'The Senator' });
  ok('a stranger\'s card waits', !eligibleEvents(s).some((e) => e.kept));
  s.narrative.relationships.dorne = { met: true, affinity: 0, respect: 0, fear: 0, arc: 0 };
  ok('and deals once they are met', eligibleEvents(s).some((e) => e.kept));
});

await section('a deck can be handed to somebody', () => {
  const txt = Keep.exportKept(s);
  ok('it exports as JSON', /"cards"/.test(txt));
  s.legacy.kept = [];
  const bad = Keep.importKept(s, 'not json');
  eq('garbage is refused', bad.ok, false);
  const r = Keep.importKept(s, txt);
  ok('and the real thing imports', r.ok && r.added === 1, JSON.stringify(r));
});

// ── A deck as a link ────────────────────────────────────────────────────────
await section('a deck travels as an address, and says where it came from', () => {
  s.legacy.kept = [];
  s.legacy.runs = 2;
  const r = Keep.keepCard(s, { ...card, title: 'Provenance' });
  eq('a kept card knows which timeline wrote it', r.card.run, 3);
  eq('and which company', r.card.company, s.company.name);
  eq('and which founder', r.card.author, s.founder.name);

  const link = Keep.encodeDeck(s);
  ok('it encodes to something a URL can carry', /^[A-Za-z0-9_-]+$/.test(link), link.slice(0, 40));
  const target = { legacy: { kept: [], runs: 0 } };
  const imported = Keep.importDeckLink(target, `#deck=${link}`);
  ok('and a fragment imports it', imported.ok && imported.added === 1, JSON.stringify(imported));
  eq('provenance travels with it', target.legacy.kept[0].company, s.company.name);
  eq('and so does the id, so an ordering can point at it', target.legacy.kept[0].id, r.card.id);
  eq('a link with no deck in it is refused', Keep.importDeckLink(target, '#deck=notbase64!!').ok, false);
  eq('and so is a fragment that is not one', Keep.importDeckLink(target, '#shell=os').ok, false);
});

await section('a shared deck may be ordered', () => {
  s.legacy.kept = [];
  const first = Keep.keepCard(s, { ...card, title: 'The Setup' }).card;
  Keep.keepCard(s, { ...card, title: 'The Payoff', after: first.id });
  s.time.day = 12;
  s.narrative.activeEvent = null;
  s.narrative.seen = {};
  const titles = () => eligibleEvents(s).filter((e) => e.kept).map((e) => e.title);
  ok('the first is dealable', titles().includes('The Setup'), titles().join(','));
  ok('the second is not, yet', !titles().includes('The Payoff'), titles().join(','));
  s.narrative.seen['k_' + first.id] = true;
  ok('and becomes dealable once the first has been dealt', titles().includes('The Payoff'), titles().join(','));
  ok('an `after` survives an export and an import', /"after"/.test(Keep.exportKept(s)));
});

await section('last timeline\'s proper nouns do not ship', () => {
  s.legacy.kept = [];
  s.legacy.dossier = [{ run: 1, company: 'Meridian', founder: 'Ada Vance-Nakamura', rival: 'Aperture Systems' }];
  // A card written in a company called Meridian, kept, and dealt in Testco.
  Keep.keepCard(s, {
    ...card, title: 'The Old Name',
    body: 'Meridian shipped nine of these last year and Aperture Systems copied every one. {company} is on the same road.',
    choices: [
      { label: 'Tell them Meridian did it first', tone: 'neutral', outcome: 'Nobody at Meridian is left to care.', effects: { rep: 3 } },
      { label: 'Say nothing', tone: 'neutral', outcome: 'It passes.', effects: { focus: 4 } },
    ],
  }, { run: 1, company: 'Meridian', act: s.company.act });
  const ev = eligibleEvents(s).find((e) => e.kept);
  ok('it is dealt', !!ev);
  ok('the token is filled with this company', ev.body.includes(s.company.name), ev.body);
  ok('and last timeline\'s company name is gone from the body', !/Meridian/.test(ev.body), ev.body);
  ok('gone from the labels too', !/Meridian/.test(ev.choices[0].label), ev.choices[0].label);
  ok('and from the outcomes', !/Meridian/.test(ev.choices[0].outcome), ev.choices[0].outcome);
  ok('the rival is swapped as well', !/Aperture Systems/.test(ev.body), ev.body);
  ok('and the runtime the world hydrates from is swapped too',
     !/Meridian/.test(JSON.stringify(ev.runtime)), JSON.stringify(ev.runtime).slice(0, 160));
  s.legacy.dossier = [];
  s.legacy.kept = [];
  s.narrative.seen = {};
  Keep.keepCard(s, { ...card, kind: 'character', char: 'dorne', title: 'The Senator' });
});

await section('the dossier survives the reset', async () => {
  s.narrative.relationships.kai = { met: true, affinity: -20, respect: 0, fear: 0, arc: 0 };
  s.narrative.relationships.mom = { met: true, affinity: -3, respect: 0, fear: 0, arc: 0 };
  s.ending = { id: 'bankrupt', name: 'Bankrupt', tone: 'bad' };
  const { legacy } = bot.Game.prestige(s);
  eq('one entry per finished timeline', legacy.dossier.length, 1);
  eq('it remembers who was burned', legacy.dossier[0].betrayed.join(','), 'kai');
  ok('and the kept deck rides along', Array.isArray(legacy.kept) && legacy.kept.length === 1);
  // A new timeline, with that legacy.
  s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Second', archetype: 'hacker',
                              category: 'devtools', productName: 'Second' });
  bot.Loop.stop();
  s.tutorialHold = false;
  ok('the new run carries the dossier', Keep.dossier(s).length === 1, JSON.stringify(Keep.dossier(s)).slice(0, 120));
  const lines = Keep.dossierLines(s);
  ok('and the world gets two lines about it', lines.length === 2 && /Testco/.test(lines[0]), lines.join(' | '));
  s.time.day = 6;
  const ev = eligibleEvents(s).find((e) => e.id === 'e14_aria_before');
  ok('ARIA has the logs from before', !!ev);
  ok('its body names the last company', /Testco/.test(typeof ev.body === 'function' ? ev.body(s) : ev.body));
  s.narrative.relationships.kai = { met: true, affinity: 0, respect: 0, fear: 0, arc: 0 };
  s.company.act = 2;
  ok('Kai remembers the other timeline', eligibleEvents(s).some((e) => e.id === 'e14_kai_again'));
  s.narrative.relationships.mom = { met: true, affinity: 0, respect: 0, fear: 0, arc: 0 };
  ok('and so does she', eligibleEvents(s).some((e) => e.id === 'e14_mom_again'));
  ok('on a first timeline, none of this exists', !EVENT_MAP.e14_aria_before.when({ time: { day: 9 }, legacy: { dossier: [] }, narrative: { relationships: {} } }));
});

report('keep');
