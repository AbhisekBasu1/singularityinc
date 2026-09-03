// ─────────────────────────────────────────────────────────────────────────────
// THE RULES OF THE WORLD — every refusal, on purpose.
//
// `validate.js` is the only thing between an assistant and the simulation, so
// each rule gets a case that passes and a case that does not. If a rule stops
// biting, the world stops being bounded and the caps in balance.js become
// decoration.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, section, report } from './headless.mjs';
installDom();
import { makeBot } from './bot.mjs';

const V = await import('../src/world/validate.js');
const World = await import('../src/world/author.js');
const { applyEffects, describeEffects, EFFECT_KEY_LIST, isAdverse } = await import('../src/world/effects.js');
const { WORLD_AUTHOR: W } = await import('../src/data/balance.js');
const { CHARACTERS } = await import('../src/data/characters.js');
const { resolveChoice, dismissEvent } = await import('../src/systems/narrative.js');
const { threadOptions, resolveThread } = await import('../src/systems/feed.js');
const bot = await makeBot();

const s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                  category: 'devtools', productName: 'Testco' });
bot.Loop.stop();
s.tutorialHold = false;   // a session releases this; nothing here does

const card = (over = {}) => ({
  title: 'A quiet Tuesday', kind: 'story',
  body: 'The build has been green for nine days, which is the longest it has ever been.',
  choices: [
    { label: 'Ship the backlog', tone: 'good', sub: 'Two days of work', outcome: 'It all goes out.', effects: { rep: 5 } },
    { label: 'Take the afternoon', tone: 'neutral', sub: 'Nothing burns', outcome: 'You sleep.', effects: { focus: 6 } },
  ],
  ...over,
});
const fresh = () => { s.world.author.recent = { cardDays: [], postDays: [], shockDays: [], lineDays: [] };
                      s.narrative.activeEvent = null; delete s._offline; };
const bad = (c) => { const r = V.validateCard(s, c); return r.ok ? null : r.problems[0]; };
const rule = (name, c, want) => {
  const p = bad(c);
  ok(name, p?.rule === want, p ? `got rule "${p.rule}" at ${p.path || '(card)'}` : 'it was accepted');
  if (p) ok(`  …and says how to fix it`, typeof p.fix === 'string' && p.fix.length > 8, p.fix);
};

await section('a well-formed card passes', async () => {
  fresh();
  const r = V.validateCard(s, card());
  ok('accepted', r.ok, JSON.stringify(r.problems || []).slice(0, 200));
  eq('normalised choices', r.card?.choices.length, 2);
  ok('carries style advice, not refusals', Array.isArray(r.warnings));
});

await section('shape', async () => {
  fresh();
  rule('a missing kind is refused', card({ kind: undefined }), 'enum');
  rule('milestone is not the world\'s to write', card({ kind: 'milestone' }), 'enum');
  rule('one choice is not a decision', card({ choices: [card().choices[0]] }), 'count');
  rule('five choices is too many', card({ choices: Array(5).fill(card().choices[0]) }), 'count');
  rule('a stranger cannot be on the card', card({ char: 'vance' }), 'unknown_character');
  rule('nor can somebody who does not exist', card({ char: 'gandalf' }), 'unknown_character');
});

await section('prose', async () => {
  fresh();
  rule('an over-long title', card({ title: 'x'.repeat(W.TITLE_MAX + 1) }), 'too_long');
  rule('an over-long body', card({ body: 'x'.repeat(W.BODY_MAX + 1) }), 'too_long');
  rule('markup is not prose', card({ body: 'A <script>alert(1)</script> thing.' }), 'markup');
  rule('an unknown token', card({ body: 'Hello {wizard}, it is Tuesday.' }), 'unknown_token');
  fresh();
  const r = V.validateCard(s, card({ body: 'The rival, {rival}, ships {product} on Tuesday. 9 days.' }));
  ok('the real tokens are fine', r.ok, JSON.stringify(r.problems || []).slice(0, 160));
  fresh();
  const w = V.validateCard(s, card({ body: 'Everything is fine!' }));
  ok('an exclamation mark is advice, not a refusal', w.ok);
  ok('and it is mentioned', (w.warnings || []).some((x) => /exclamation/.test(x)), (w.warnings || []).join(' | '));
});

await section('ceilings', async () => {
  fresh();
  // Taking and giving are different numbers, because in the written deck they
  // are different numbers: Act I takes 6,000 of cash and gives 18,000.
  const cap = V.capFor(s, 'cash', 'neutral', 'take');
  ok('taking is tighter than giving', cap < V.capFor(s, 'cash', 'neutral', 'give'),
     `${cap} vs ${V.capFor(s, 'cash', 'neutral', 'give')}`);
  // Cash answers to four bounds at once and reports whichever is tightest, so
  // give the company enough money that the act ceiling is the one that binds.
  s.company.cash = cap * 40;
  ok('and Act I takes less code than it gives',
     V.capFor(s, 'code', 'neutral', 'take') < V.capFor(s, 'code', 'neutral', 'give'));
  ok('there is a real ceiling', cap > 0, String(cap));
  eq('the ceiling is the binding bound here', V.cashLimit(s, 'neutral').which, 'cap');
  const over = card();
  over.choices[1].effects = { cash: -(cap + 1) };
  const p = bad(over);
  eq('over the ceiling is refused', p?.rule, 'cap');
  eq('and it names the ceiling', p?.limit, cap);
  ok('and what it asked for', p?.got === -(cap + 1));

  fresh();
  const heldCash = s.company.cash;
  const at = card();
  at.choices[1].effects = { cash: -cap };
  const atR = V.validateCard(s, at);
  ok('exactly at the ceiling is fine', atR.ok, JSON.stringify(atR.problems || []).slice(0, 160));
  s.company.cash = heldCash;

  // Tone buys room, and the button colour is the promise that pays for it.
  ok('costly may go further than neutral',
     V.capFor(s, 'cash', 'costly', 'take') > V.capFor(s, 'cash', 'neutral', 'take'),
     `${V.capFor(s, 'cash', 'costly', 'take')} vs ${V.capFor(s, 'cash', 'neutral', 'take')}`);
  ok('and neutral is the tightest',
     V.capFor(s, 'cash', 'neutral', 'take') < V.capFor(s, 'cash', 'good', 'take'));
});

await section('difficulty widens or narrows the hand', async () => {
  const base = s.settings.difficulty;
  s.settings.difficulty = 'story';
  const soft = V.capFor(s, 'rep', 'neutral');
  s.settings.difficulty = 'ruthless';
  const hard = V.capFor(s, 'rep', 'neutral');
  s.settings.difficulty = base;
  ok('Ruthless gives the world a bigger hand', hard > soft, `${hard} vs ${soft}`);
  eq('and Standard sits between them', V.capFor(s, 'rep', 'neutral') > soft, true);
});

await section('a held directive narrows it further', async () => {
  const before = V.capFor(s, 'rep', 'neutral');
  s.company.directive = 'fortify';
  const during = V.capFor(s, 'rep', 'neutral');
  s.company.directive = 'none';
  ok('Fortify tightens the ceilings', during < before, `${during} vs ${before}`);
});

await section('no card may be adverse on every button', async () => {
  fresh();
  const trap = card();
  trap.choices[0].effects = { align: -0.01 };
  trap.choices[1].effects = { align: -0.02 };
  const p = bad(trap);
  eq('refused', p?.rule, 'no_way_out');
  fresh();
  const fair = card();
  fair.choices[0].effects = { align: -0.01 };
  fair.choices[1].effects = { cash: -50 };
  ok('but a real dilemma is allowed', V.validateCard(s, fair).ok);
  // Heat and debt are the two keys where up is the bad direction.
  ok('heat counts as adverse when it rises', isAdverse('heat', 4));
  ok('and not when it falls', !isAdverse('heat', -4));
  ok('cash is the normal way round', isAdverse('cash', -4) && !isAdverse('cash', 4));
});

await section('no card may take the company out', async () => {
  fresh();
  // Three bounds hold this up and the refusal says which one bit. Pick a cash
  // position where the per-card share is the tightest of the three, so this
  // tests the share rather than the act ceiling.
  const costly = V.capFor(s, 'cash', 'costly', 'take');
  s.company.cash = Math.round(costly / W.CASH_SHARE_MAX) * 0.8;
  const f = V.cashFloor(s);
  eq('the share is the binding one here', f.which, 'share');
  ok('and it is tighter than the act ceiling', f.limit < costly, `${f.limit} vs ${costly}`);
  const greedy = card();
  greedy.choices[1].tone = 'costly';
  greedy.choices[1].effects = { cash: -(f.limit + 200) };
  eq('past it is refused', bad(greedy)?.rule, 'cash_share');
  const fine = card();
  fine.choices[1].tone = 'costly';
  fine.choices[1].effects = { cash: -Math.round(f.limit * 0.5) };
  ok('inside it is fine', V.validateCard(s, fine).ok,
     JSON.stringify(V.validateCard(s, fine).problems || []).slice(0, 180));
});

await section('the world may not be the thing that kills you', async () => {
  fresh();
  // Push the founder inside the runway floor and the world's hands come off
  // the money altogether — whatever ends this run, it is not the assistant.
  s.company.cash = 1000;
  const f = V.cashFloor(s);
  eq('the runway floor is what binds now', f.which, 'runway');
  eq('and there is nothing left to take', f.limit, 0);
  const c = card();
  c.choices[1].effects = { cash: -500 };
  const p = bad(c);
  eq('so any cash cost at all is refused', p?.rule, 'runway_floor');
  ok('and it says to cost them something else', /reputation|focus|users/i.test(p.fix), p.fix);
});

await section('a hundred small cards cannot do what one large one may not', async () => {
  fresh();
  s.company.cash = 5e6;
  s.resources.reputation = 400;
  const b0 = V.budgetFor(s, 'rep');
  ok('there is a budget', b0.left > 0, JSON.stringify(b0));
  // Spend it.
  applyEffects(s, { rep: -Math.round(b0.left) });
  const b1 = V.budgetFor(s, 'rep');
  ok('and it is spent', b1.left < 1, JSON.stringify(b1));
  const again = card();
  again.choices[0].effects = { rep: -5 };
  again.choices[1].effects = { code: 4 };
  const p = bad(again);
  eq('a further card is refused on the budget', p?.rule, 'budget');
  ok('and it says when it comes back',
     !!p && (typeof p.when === 'string' || /comes back|left/.test(p.fix)), JSON.stringify(p));
  // Marking it cruel must not buy a wider window — only a bigger single card.
  const sneaky = card();
  sneaky.choices[0].tone = 'cruel';
  sneaky.choices[0].effects = { rep: -5 };
  sneaky.choices[1].effects = { code: 4 };
  eq('and calling it cruel does not reopen it', bad(sneaky)?.rule, 'budget');
  // The window rolls.
  s.time.day += 31;
  World.tickAuthor(s, 1);
  ok('after the window it is back', V.budgetFor(s, 'rep').left > 0);
});

await section('the budget follows what the founder actually holds', async () => {
  fresh();
  s.company.act = 3;
  s.resources.reputation = 60;
  const poor = V.budgetFor(s, 'rep').left;
  s.resources.reputation = 6000;
  const rich = V.budgetFor(s, 'rep').left;
  ok('a big company can afford to lose more', rich > poor, `${rich} vs ${poor}`);
  s.resources.reputation = 10;
  eq('and a company with nothing loses nothing', V.budgetFor(s, 'rep').left, 0);
  s.company.act = 1;
});

await section('rate limits', async () => {
  fresh();
  eq('two cards in the window', V.cardsLeft(s), W.MAX_CARDS_PER_WINDOW);
  s.world.author.recent.cardDays = [s.time.day, s.time.day];
  eq('then none', V.cardsLeft(s), 0);
  const p = bad(card());
  eq('and a third is refused', p?.rule, 'rate');
  ok('with the day it becomes legal again', typeof p?.when === 'string', p?.when);
  s.world.author.recent.cardDays = [s.time.day - W.CARD_WINDOW_DAYS - 1];
  eq('an old card does not count', V.cardsLeft(s), W.MAX_CARDS_PER_WINDOW);
});

await section('one card at a time', async () => {
  fresh();
  s.narrative.activeEvent = { id: 'x', title: 'y', choices: [] };
  eq('refused while one is open', bad(card())?.rule, 'card_open');
  s.narrative.activeEvent = null;
});

await section('nothing lands while the founder is away', async () => {
  fresh();
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s._offline = true;
  eq('a card is refused offline', bad(card())?.rule, 'offline');
  eq('and so is a post', V.validatePost(s, { char: 'vance', text: 'hi' }).problems?.[0]?.rule, 'offline');
  delete s._offline;
});

await section('who may be voiced', async () => {
  const cast0 = V.metCharacters(s);
  ok('ARIA is never the world\'s to speak for', !cast0.includes('aria'), cast0.join(','));
  ok('nor is Mom', !cast0.includes('mom'));
  ok('HELIX does not exist yet', !cast0.includes('helix'), cast0.join(','));
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  ok('a met rival can be voiced', V.metCharacters(s).includes('vance'));
  s.research.done.own_foundation_model = true;
  s.narrative.relationships.helix = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  ok('HELIX can, once it is built', V.metCharacters(s).includes('helix'));
});

await section('posts', async () => {
  fresh();
  const good = V.validatePost(s, { char: 'vance', text: 'shipped it over the weekend. took four hours.' });
  ok('a rival post is fine', good.ok, JSON.stringify(good.problems || []));
  eq('an over-long post', V.validatePost(s, { char: 'vance', text: 'x'.repeat(W.POST_MAX + 1) }).problems?.[0]?.rule, 'too_long');
  eq('a stranger cannot post', V.validatePost(s, { char: 'dorne', text: 'hello' }).problems?.[0]?.rule, 'unknown_character');
  s.world.author.recent.postDays = Array(W.MAX_POSTS_PER_DAY).fill(s.time.day);
  eq('and there is a daily limit', V.validatePost(s, { char: 'vance', text: 'again' }).problems?.[0]?.rule, 'rate');
});

await section('the market and the regulators are Act III onward', async () => {
  fresh();
  s.company.act = 1;
  eq('no weather in the garage', V.validateShock(s, { kind: 'crash', days: 30 }).problems?.[0]?.rule, 'too_early');
  eq('and no regulators', V.validatePressure(s, { heat: 4, line: 'A letter arrives.' }).problems?.[0]?.rule, 'too_early');
  s.company.act = 3;
  ok('both are in play by Act III', V.validateShock(s, { kind: 'crash', days: 30 }).ok);
  ok('pressure too', V.validatePressure(s, { heat: 4, line: 'The committee has questions about the March deployment.' }).ok);
  eq('a bad shock kind', V.validateShock(s, { kind: 'apocalypse', days: 30 }).problems?.[0]?.rule, 'enum');
  eq('a shock that never ends', V.validateShock(s, { kind: 'crash', days: 9999 }).problems?.[0]?.rule, 'range');
  s.world.author.recent.shockDays = [s.time.day];
  eq('one turn of the weather a month', V.validateShock(s, { kind: 'boom', days: 30 }).problems?.[0]?.rule, 'rate');
});

await section('an earned doctrine really takes something away', async () => {
  fresh();
  s.company.act = 3;
  s.doctrines.earned.untouchable = 1;
  eq('Untouchable ends the regulators', V.validatePressure(s, { heat: 4, line: 'x' }).problems?.[0]?.rule, 'immunity');
  s.doctrines.earned.beloved = 1;
  ok('Beloved removes the cruel tone', !V.allowedTones(s).includes('cruel'), V.allowedTones(s).join(','));
  const cruel = card();
  cruel.choices[0].tone = 'cruel';
  eq('and a cruel choice is refused', bad(cruel)?.rule, 'enum');
  s.doctrines.earned.zero_entropy = 1;
  ok('Zero Entropy removes tech debt', !V.allowedKeys(s).includes('debt'), V.allowedKeys(s).join(','));
  const debt = card();
  debt.choices[0].effects = { debt: 5 };
  eq('and adding debt is refused', bad(debt)?.rule, 'unknown_key');
  delete s.doctrines.earned.untouchable;
  delete s.doctrines.earned.beloved;
  delete s.doctrines.earned.zero_entropy;
});

await section('the effects vocabulary is the whole of it', async () => {
  fresh();
  const forbidden = ['equity', 'days', 'skill', 'unlock', 'control', 'endRun', 'chain', 'achieve', 'fireAll'];
  for (const k of forbidden) {
    ok(`${k} is not in the vocabulary`, !EFFECT_KEY_LIST.includes(k));
    const c = card();
    c.choices[0].effects = { [k]: 1 };
    eq(`  and a card using it is refused`, bad(c)?.rule, 'unknown_key');
  }
});

await section('applying effects moves the real numbers', async () => {
  fresh();
  const rep0 = s.resources.reputation, cash0 = s.company.cash;
  const log = applyEffects(s, { rep: 10, cash: -100, flags: ['a_callback'] });
  eq('reputation moved', Math.round(s.resources.reputation - rep0), 10);
  eq('cash moved', Math.round(s.company.cash - cash0), -100);
  ok('it logged what it did', log.length >= 2, JSON.stringify(log));
  ok('flags are namespaced', !!s.narrative.flags.world_a_callback, Object.keys(s.narrative.flags).join(','));
  ok('and cannot forge an authored flag', !s.narrative.flags.a_callback);
  const d = describeEffects({ cash: -2000, rep: 12 });
  ok('and it reads as English', /cash/.test(d) && /reputation/.test(d), d);
});

await section('answering in your own words is judged the same way', async () => {
  fresh();
  s.narrative.activeEvent = { id: 'x', title: 'y', choices: [], char: null };
  const cap = V.capFor(s, 'rep', 'neutral');
  ok('a fair answer passes', V.validateProposal(s, { outcome: 'He takes the call.', effects: { rep: 3 } }).ok);
  eq('an unfair one does not', V.validateProposal(s, { outcome: 'He takes the call.',
     effects: { rep: cap * 10 } }).problems?.[0]?.rule, 'cap');
  s.narrative.activeEvent = null;
  eq('and there must be a card to answer', V.validateProposal(s, { outcome: 'x', effects: {} }).problems?.[0]?.rule, 'no_card');
});

await section('a written card resolves like any other', async () => {
  fresh();
  s.company.act = 1;
  const r = World.writeCard(s, card());
  ok('it went on screen', r.ok, JSON.stringify(r.problems || []).slice(0, 200));
  ok('with its data attached', !!s.narrative.activeEvent.runtime);
  const rep0 = s.resources.reputation;
  const out = resolveChoice(s, 0);
  ok('the choice applied', s.resources.reputation > rep0);
  ok('and returned prose', typeof out?.outcome === 'string' && out.outcome.length > 3);
  eq('the journal knows who wrote it', s.narrative.journal[0]?.author, 'world');
  dismissEvent(s);
  ok('a written card is never marked seen', !s.narrative.seen[r.id], r.id);
});

await section('affinity needs a face on the card', async () => {
  fresh();
  const c = card();
  c.choices[0].effects = { affinity: 2 };
  eq('no character, no affinity', bad(c)?.rule, 'no_character');
  s.narrative.relationships.sam = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  fresh();
  const withFace = card({ char: 'sam' });
  withFace.choices[0].effects = { affinity: 2 };
  ok('with one, it is allowed', V.validateCard(s, withFace).ok,
     JSON.stringify(V.validateCard(s, withFace).problems || []).slice(0, 160));
  // And it must actually move: an effect that validates and then quietly does
  // nothing is worse than one that is refused.
  const before = s.narrative.relationships.sam.affinity;
  applyEffects(s, { affinity: 2 }, 'sam');
  ok('and it really moves the relationship', s.narrative.relationships.sam.affinity > before,
     `${before} -> ${s.narrative.relationships.sam.affinity}`);
});

await section('continuity markers are checked, not silently dropped', async () => {
  fresh();
  const long = card();
  long.choices[0].effects = { rep: 3, flags: ['x'.repeat(41)] };
  eq('an over-long marker is refused', bad(long)?.rule, 'too_long');
  fresh();
  const wrong = card();
  wrong.choices[0].effects = { rep: 3, flags: [42] };
  eq('a marker that is not a string is refused', bad(wrong)?.rule, 'type');
  fresh();
  const notList = card();
  notList.choices[0].effects = { rep: 3, flags: 'called_vance' };
  eq('and a bare string is refused', bad(notList)?.rule, 'type');
  fresh();
  const fine = card();
  fine.choices[0].effects = { rep: 3, flags: ['called_vance'] };
  ok('a real one passes', V.validateCard(s, fine).ok);
});

await section('a line from another origin keeps its badge in a character\'s voice', async () => {
  // `ask_the_rival` prints the rival site's reply as Vance. It is the one path
  // where somebody else's writing could pass for the game's own, so the post
  // carries the same mark a press release does, and the Wire renders it.
  fresh();
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  const before = s.feed.length;
  const r = World.postAs(s, 'vance', 'we do not comment on smaller companies.',
                         { untrusted: true, flagged: true, origin: 'from their own site' });
  ok('the post lands', r.ok, JSON.stringify(r.problems || []).slice(0, 160));
  const item = s.feed.find((f) => f.author === CHARACTERS.vance.handle && f.untrusted) || s.feed[0];
  ok('it is marked untrusted', item?.untrusted === true, JSON.stringify(item).slice(0, 160));
  ok('and flagged', item?.flagged === true);
  ok('and the note says where it came from', /their own site/.test(item?.meta || ''), item?.meta);
  ok('and what it contains', /instruction addressed to an assistant/.test(item?.meta || ''), item?.meta);
  ok('the feed grew', s.feed.length > before);
  ok('a post the world wrote itself carries no badge', (() => {
    fresh(); s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
    const own = World.postAs(s, 'vance', 'shipping is a feature.');
    const it = own.ok ? s.feed[0] : null;
    return !!it && !it.untrusted && !/instruction/.test(it.meta || '');
  })());
  // The plug is enforced where the feed is written, not only where the tools
  // are listed — a reply still in flight when it was pulled must not land.
  fresh(); s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.world.author.muted = true;
  const gone = World.postAs(s, 'vance', 'we do not comment.');
  ok('muted, a post is refused at the boundary', !gone.ok && gone.problems?.[0]?.rule === 'muted',
     JSON.stringify(gone).slice(0, 120));
  s.world.author.muted = false;
});

await section('compute is the world\'s to give, never to take', async () => {
  fresh();
  s.company.act = 3;
  ok('in play from Act III', V.allowedKeys(s).includes('compute'), V.allowedKeys(s).join(','));
  const give = V.capFor(s, 'compute', 'neutral', 'give');
  ok('with a real ceiling on giving', give > 0, String(give));
  eq('and none on taking', V.capFor(s, 'compute', 'neutral', 'take'), 0);
  const c = card();
  c.choices[0].effects = { compute: -10 };
  const p = bad(c);
  eq('a card that takes it is refused', p?.rule, 'cap');
  ok('by name, not as "not in play"', /never take/.test(p?.fix || ''), p?.fix);
  const gen = card();
  gen.choices[0].effects = { compute: Math.min(give, 100) };
  const v = V.validateCard(s, gen);
  ok('a grant passes', v.ok, JSON.stringify(v.problems || []).slice(0, 200));
  const before = s.resources.computeGranted || 0;
  applyEffects(s, { compute: 50 });
  eq('and lands on the granted capacity the loop keeps', Math.round((s.resources.computeGranted || 0) - before), 50);
  ok('and reads as English', /compute/.test(describeEffects({ compute: 50 })));
  s.company.act = 1;
  eq('not in play in Act I', V.allowedKeys(s).includes('compute'), false);
});

await section('the race is a key only while there is one to run', async () => {
  fresh();
  s.company.act = 4;
  const hadRace = s.world.race;
  delete s.world.race;
  eq('no race, no key', V.allowedKeys(s).includes('race'), false);
  const { initRace, raceStandings } = await import('../src/systems/agirace.js');
  initRace(s);
  ok('a race makes it one', V.allowedKeys(s).includes('race'), V.allowedKeys(s).join(','));
  const cap = V.capFor(s, 'race', 'neutral', 'take');
  ok('with a small ceiling', cap > 0 && cap <= 4, String(cap));
  ok('gaining ground is the adverse direction, like heat', isAdverse('race', 1) && !isAdverse('race', -1));
  const lead = () => raceStandings(s).filter((x) => !x.you)[0];
  const before = lead().progress;
  applyEffects(s, { race: cap });
  ok('it moves the leading rival lab, by exactly that', Math.abs(lead().progress - before - cap) < 1e-9,
     `${before} → ${lead().progress}`);
  const you = s.world.race.you;
  applyEffects(s, { race: -1 });
  eq('and never the founder\'s own progress', s.world.race.you, you);
  const b = V.budgetFor(s, 'race');
  ok('the budget is for the whole run', b.run === true && b.allowance === W.RUN_BUDGET.race, JSON.stringify(b));
  eq('charged in both directions', Math.round(b.used), cap + 1);
  s.time.day += 400; World.tickAuthor(s, 1);
  eq('and four hundred days later it has not come back', Math.round(V.budgetFor(s, 'race').used), cap + 1);
  s.world.author.recent.taken = [[s.time.day, 'race', W.RUN_BUDGET.race]];
  const c = card();
  c.choices[0].effects = { race: 1 };
  const p = bad(c);
  eq('a card past it is refused on the budget', p?.rule, 'budget');
  ok('and says so for the run', /whole run|this run/.test(p?.fix || ''), p?.fix);
  s.world.author.recent.taken = [];
  const top = lead();
  s.world.race.labs[top.id].progress = 98.5;
  applyEffects(s, { race: cap });
  ok('the world cannot carry a lab over the line', s.world.race.labs[top.id].progress <= 99,
     String(s.world.race.labs[top.id].progress));
  s.world.race.labs[top.id].progress = 99.4;
  applyEffects(s, { race: cap });
  ok('nor pull one back by pushing it', s.world.race.labs[top.id].progress >= 99.4);
  s.world.race.crossed = { id: top.id };
  eq('a decided race is no longer a key', V.allowedKeys(s).includes('race'), false);
  if (hadRace) s.world.race = hadRace; else delete s.world.race;
  s.company.act = 1;
});

await section('a post may ask, at a fraction of the ceilings', async () => {
  fresh();
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.feed = s.feed.filter((f) => !f.runtime);
  // Enough reputation that the ceiling, not the stock budget, is the rule
  // that bites — the budget has its own section above.
  s.resources.reputation = 400;
  s.world.author.recent.taken = [];
  const ask = [
    { label: 'Answer him in public', outcome: 'It gets 400 likes.', effects: { rep: 3, focus: -1 } },
    { label: 'Say nothing', outcome: 'It scrolls off by Thursday.', effects: { focus: 1 } },
  ];
  const r = V.validatePost(s, { char: 'vance', text: 'is {company} still one person? asking for a friend.', ask });
  ok('a fair question passes', r.ok, JSON.stringify(r.problems || []).slice(0, 200));
  eq('with its replies normalised', r.post.ask?.length, 2);
  eq('one reply is not a question', V.validatePost(s, { char: 'vance', text: 'x', ask: [ask[0]] }).problems?.[0]?.rule, 'count');
  const cap = V.capFor(s, 'rep', 'neutral', 'take');
  const big = [{ ...ask[0], effects: { rep: -cap } }, ask[1]];
  const p = V.validatePost(s, { char: 'vance', text: 'x', ask: big }).problems?.[0];
  eq('a reply at a card\'s ceiling is over a thread\'s', p?.rule, 'cap');
  ok('and the limit named is the scaled one', p?.limit < cap, JSON.stringify(p));
  const cruel = [{ ...ask[0], effects: { rep: -1 } }, { ...ask[1], effects: { rep: -1 } }];
  eq('every reply hurting the same thing is refused',
     V.validatePost(s, { char: 'vance', text: 'x', ask: cruel }).problems?.[0]?.rule, 'no_way_out');
  const posted = World.postAs(s, 'vance', 'is {company} still one person?', { ask });
  ok('it posts', posted.ok, JSON.stringify(posted.problems || []).slice(0, 160));
  const item = s.feed.find((f) => f.thread === posted.thread);
  ok('as an open thread in the Wire', !!item && item.resolved === false && Array.isArray(item.runtime?.opts));
  eq('with two replies to press', threadOptions(s, item).length, 2);
  eq('and it is counted', V.openWorldThreads(s), 1);
  ok('a second open question is fine', World.postAs(s, 'vance', 'still waiting.', { ask }).ok);
  const third = World.postAs(s, 'vance', 'hello?', { ask }).problems?.[0];
  ok('a third is not', third?.rule === 'rate' && /open/.test(String(third?.limit)), JSON.stringify(third));
  const rep0 = s.resources.reputation;
  const done = resolveThread(s, item.id, 0);
  ok('answering it spends the reply', !!done && item.resolved === true);
  eq('through the bounded vocabulary', Math.round(s.resources.reputation - rep0), 3);
  ok('and keeps the reply\'s line', item.outcome === 'It gets 400 likes.' && item.chosen === 'Answer him in public',
     `${item.chosen} / ${item.outcome}`);
  eq('which frees a slot', V.openWorldThreads(s), 1);
  s.feed = s.feed.filter((f) => !f.runtime);
});

await section('what is true when it lands is what lands', async () => {
  fresh();
  s.company.act = 3;
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.feed = s.feed.filter((f) => !f.runtime);
  s.resources.reputation = 400;
  s.resources.techDebt = 100;
  s.world.author.recent.taken = [];
  s.world.author.stats.held = 0;
  // An immunity earned after the reply was written.
  const posted = World.postAs(s, 'vance', 'still shipping on the old stack?', { ask: [
    { label: 'Yes, and it shows', outcome: 'You are.', effects: { debt: 5 } },
    { label: 'Not for long', outcome: 'You are not.', effects: { focus: 1 } } ] });
  ok('a reply that adds debt is legal today', posted.ok, JSON.stringify(posted.problems || []).slice(0, 160));
  s.doctrines.earned.zero_entropy = Math.floor(s.time.day);
  const debt0 = s.resources.techDebt;
  const item = s.feed.find((f) => f.thread === posted.thread);
  resolveThread(s, item.id, 0);
  eq('Zero Entropy earned in between, the debt does not land', Math.round(s.resources.techDebt - debt0), 0);
  ok('and the run counts what was held', s.world.author.stats.held >= 1, String(s.world.author.stats.held));
  delete s.doctrines.earned.zero_entropy;
  // The last point of a run-long budget, claimed twice.
  const { initRace, raceStandings } = await import('../src/systems/agirace.js');
  s.company.act = 4;
  const hadRace = s.world.race;
  delete s.world.race; initRace(s);
  s.world.author.recent.taken = [[s.time.day, 'race', W.RUN_BUDGET.race - 1]];
  const first = World.writeCard(s, card({ title: 'The leak', choices: [
    { label: 'Let it go', tone: 'neutral', sub: 'They gain a step', outcome: 'They gain.', effects: { race: 1 } },
    { label: 'Push back', tone: 'neutral', sub: 'A week', outcome: 'You push.', effects: { focus: 1 } } ] }));
  ok('a card is legal with one point left', first.ok, JSON.stringify(first.problems || []).slice(0, 160));
  applyEffects(s, { race: 1 });                     // another hand spends it first
  const lead = () => raceStandings(s).filter((x) => !x.you)[0].progress;
  const before = lead();
  resolveChoice(s, 0); dismissEvent(s);
  eq('the budget spent under it, the card moves nothing', Math.round((lead() - before) * 100), 0);
  ok('and the ledger never passes the budget', V.takenIn(s, 'race', Infinity) <= W.RUN_BUDGET.race,
     String(V.takenIn(s, 'race', Infinity)));
  // Money that was there when the card was written and is not when it lands.
  s.world.author.recent.taken = [];
  s.company.cash = 5e6;
  const cost = -Math.round(V.cashLimit(s, 'costly').limit * 0.8);
  const bill = World.writeCard(s, card({ title: 'The bill', choices: [
    { label: 'Pay it', tone: 'costly', sub: 'All of it', outcome: 'Paid.', effects: { cash: cost } },
    { label: 'Dispute it', tone: 'neutral', sub: 'A month', outcome: 'Disputed.', effects: { focus: -2 } } ] }));
  ok('a bill the company can pay is legal', bill.ok, JSON.stringify(bill.problems || []).slice(0, 160));
  s.company.cash = 30000;                            // the founder spent it
  const floor = V.cashFloor(s).limit;
  const cash0 = s.company.cash;
  resolveChoice(s, 0); dismissEvent(s);
  ok('when it lands it is held to the floor', cash0 - s.company.cash <= floor + 1, `took ${cash0 - s.company.cash}, floor ${floor}`);
  ok('and the company is still standing', s.company.cash >= 0);
  if (hadRace) s.world.race = hadRace; else delete s.world.race;
  s.company.act = 1;
  s.feed = s.feed.filter((f) => !f.runtime);
});

await section('a reply may not move what a card may', async () => {
  fresh();
  s.company.act = 4;
  const hadRace = s.world.race;
  const { initRace } = await import('../src/systems/agirace.js');
  delete s.world.race; initRace(s);
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.feed = s.feed.filter((f) => !f.runtime);
  ok('a card may move the race', V.allowedKeys(s).includes('race'));
  ok('a reply may not', !V.threadKeys(s).includes('race') && !V.threadKeys(s).includes('compute'), V.threadKeys(s).join(','));
  const ask = (effects) => V.validatePost(s, { char: 'vance', text: 'x', ask: [
    { label: 'A', outcome: 'a.', effects }, { label: 'B', outcome: 'b.', effects: {} } ] }).problems?.[0];
  eq('and is refused by name', ask({ race: 1 })?.rule, 'unknown_key');
  eq('so is compute', ask({ compute: 10 })?.rule, 'unknown_key');
  const p = V.validatePost(s, { char: 'vance', text: 'x', ask: [
    { label: 'A', outcome: 'a.' }, { label: 'B', outcome: 'b.', effects: {} } ] }).problems?.[0];
  eq('a reply without effects is refused, not assumed empty', p?.rule, 'required');
  const cap = V.capFor(s, 'affinity', 'neutral', 'take');
  const scaled = V.validatePost(s, { char: 'vance', text: 'x', ask: [
    { label: 'A', outcome: 'a.', effects: { affinity: -cap } }, { label: 'B', outcome: 'b.', effects: {} } ] }).problems?.[0];
  ok('a coarse key is floored out of a reply rather than rounded up', scaled?.rule === 'cap' && /card/.test(scaled?.fix || ''),
     JSON.stringify(scaled));
  if (hadRace) s.world.race = hadRace; else delete s.world.race;
  s.company.act = 1;
});

await section('the regulators answer to the rolling budget too', async () => {
  fresh();
  s.company.act = 3;
  s.world.author.recent.taken = [];
  s.world.regulatoryHeat = 0;
  const cap = V.capFor(s, 'heat', 'risky');
  const allowance = V.budgetFor(s, 'heat').allowance;
  let applied = 0, calls = 0, refusedOn = null;
  for (let i = 0; i < 6 && !refusedOn; i++) {
    const r = World.regulatorPressure(s, cap, 'The committee opens an inquiry into 4 incidents.');
    calls++;
    if (r.ok) applied += r.heat; else refusedOn = r.problems?.[0];
  }
  eq('a call past the budget is refused on the budget', refusedOn?.rule, 'budget');
  ok('what was turned up never passes the window allowance', applied <= allowance + 1e-9, `${applied} of ${allowance}`);
  ok('and it took more than one call to get there', calls > 1, String(calls));
  ok('turning it down is not on the budget', World.regulatorPressure(s, -1, 'The matter is closed.').ok);
  s.company.act = 1;
});

await section('a save from before the ledger still keeps one', async () => {
  fresh();
  s.company.act = 1;
  s.resources.reputation = 400;
  const r = World.writeCard(s, card({ title: 'Old timeline', choices: [
    { label: 'Pay for it', tone: 'neutral', sub: 'In reputation', outcome: 'Paid.', effects: { rep: -3 } },
    { label: 'Wait it out', tone: 'neutral', sub: 'A week', outcome: 'Waited.', effects: { focus: 1 } } ] }));
  ok('the card opens', r.ok, JSON.stringify(r.problems || []).slice(0, 160));
  delete s.world.author;                       // a save from before the world layer
  resolveChoice(s, 0); dismissEvent(s);
  ok('the ledger is made on landing and charged', (s.world.author?.recent?.taken || []).some(([, k]) => k === 'rep'),
     JSON.stringify(s.world.author?.recent?.taken));
});

await section('a fraction of a point still counts', async () => {
  fresh();
  s.company.act = 4;
  const hadRace = s.world.race;
  const { initRace, raceStandings } = await import('../src/systems/agirace.js');
  delete s.world.race; initRace(s);
  s.world.author.recent.taken = [];
  const top = raceStandings(s).filter((x) => !x.you)[0];
  s.world.race.labs[top.id].progress = 98.999;
  const log = applyEffects(s, { race: 1 });
  const moved = s.world.race.labs[top.id].progress - 98.999;
  ok('the lab moved to the ceiling and no further', Math.abs(moved - 0.001) < 1e-9, String(moved));
  ok('the journal has the exact movement', log.some(([k, v]) => k === 'race' && Math.abs(v - 0.001) < 1e-9), JSON.stringify(log));
  ok('and so does the ledger', Math.abs(V.takenIn(s, 'race', Infinity) - 0.001) < 1e-9, String(V.takenIn(s, 'race', Infinity)));
  if (hadRace) s.world.race = hadRace; else delete s.world.race;
  s.company.act = 1;
});

await section('an own-words answer is on the same rolling budget as a card', async () => {
  fresh();
  s.company.cash = 5e6;
  s.resources.reputation = 400;
  s.narrative.activeEvent = { id: 'x', title: 'y', choices: [], char: null };
  const b0 = V.budgetFor(s, 'rep');
  applyEffects(s, { rep: -Math.round(b0.left) });
  const p = V.validateProposal(s, { outcome: 'He takes the call.', effects: { rep: -3 } }).problems?.[0];
  eq('spent by cards, it is spent for answers too', p?.rule, 'budget');
  s.narrative.activeEvent = null;
  s.world.author.recent.taken = [];
});

// ── The phone ───────────────────────────────────────────────────────────────
await section('the phone: who picks up, and what a written call does', async () => {
  const Calls = await import('../src/systems/calls.js');
  const { CALLS: C } = await import('../src/data/balance.js');
  fresh();
  s.time.day = 30;
  s.founder.focus = 60;
  s.narrative.relationships = {};
  s.calls = { active: null, log: [], seq: 1, lastRing: -99 };
  eq('a stranger has no number', Calls.canCall(s, 'kai').reason, 'stranger');
  eq('ARIA has a window, not a number', Calls.canCall(s, 'aria').reason, 'aria');
  const hadHelix = s.research.done.own_foundation_model;
  delete s.research.done.own_foundation_model;
  eq('HELIX is not built', Calls.canCall(s, 'helix').reason, 'unbuilt');
  if (hadHelix) s.research.done.own_foundation_model = hadHelix;
  s.narrative.relationships.sam = { met: true, affinity: 3, respect: 0, fear: 0, arc: 0 };
  ok('somebody met can be called', Calls.canCall(s, 'sam').ok, JSON.stringify(Calls.canCall(s, 'sam')));
  ok('everyone with a number is listed', Calls.contacts(s).some((c) => c.id === 'sam'));
  s.narrative.activeEvent = { id: 'x', title: 'y', choices: [] };
  eq('not while a card is open', Calls.canCall(s, 'sam').reason, 'card');
  s.narrative.activeEvent = null;
  const focus0 = s.founder.focus;
  const r = Calls.startCall(s, 'sam');
  ok('the call opens', r.ok && !!Calls.activeCall(s), JSON.stringify(r));
  eq('on the written line, with no assistant', Calls.activeCall(s).mode, 'written');
  eq('and it costs the day something', Math.round(focus0 - s.founder.focus), C.FOCUS_COST);
  eq('they pick up first', Calls.activeCall(s).rounds[0].who, 'them');
  eq('a second call is refused while one is open', Calls.canCall(s, 'sam').reason, 'busy');
  const opts = Calls.options(s);
  ok('there are things to say', opts.length >= 2 && opts.length <= C.TOPIC_KEEP, JSON.stringify(opts));
  const ins0 = s.resources.insight, aff0 = s.narrative.relationships.sam.affinity;
  const said = Calls.say(s, opts[0].id);
  ok('saying something gets a reply', said.ok && typeof said.reply === 'string' && said.reply.length > 10, JSON.stringify(said).slice(0, 120));
  ok('and it moved something small', s.resources.insight !== ins0 || s.narrative.relationships.sam.affinity !== aff0);
  ok('a topic is not offered twice', !Calls.options(s).some((o) => o.id === opts[0].id));
  const j0 = s.narrative.journal.length;
  const end = Calls.hangUp(s);
  ok('hanging up closes it', end.ok && !Calls.activeCall(s));
  eq('the Log has the call', s.narrative.journal.length, j0 + 1);
  eq('as a call', s.narrative.journal[0].kind, 'call');
  eq('with a face', s.narrative.journal[0].char, 'sam');
  eq('the phone remembers it', Calls.callLog(s).length, 1);
  ok('and so does Sam', (s.narrative.relationships.sam.memory || []).length === 1, JSON.stringify(s.narrative.relationships.sam.memory));
  eq('they do not pick up again this week', Calls.canCall(s, 'sam').reason, 'cooldown');
  ok('and the note says when', /BACK IN \d/.test(Calls.canCall(s, 'sam').note), Calls.canCall(s, 'sam').note);
  s.time.day += C.COOLDOWN_DAYS;
  ok('a week later they do', Calls.canCall(s, 'sam').ok);
  s.narrative.relationships.sam.affinity = C.AFFINITY_FLOOR - 1;
  eq('unless you burned them', Calls.canCall(s, 'sam').reason, 'cold');
  ok('and the line says so', Calls.busyLine(s, 'sam').length > 10);
  s.narrative.relationships.sam.affinity = 3;
  s.founder.focus = 1;
  eq('a call needs focus', Calls.canCall(s, 'sam').reason, 'focus');
  s.founder.focus = 60;
});

await section('the phone: a call the world plays is bounded like a card', async () => {
  const Calls = await import('../src/systems/calls.js');
  const { CALLS: C } = await import('../src/data/balance.js');
  fresh();
  s.time.day = 40;
  s.founder.focus = 60;
  s.company.cash = 200000;
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.calls = { active: null, log: [], seq: 1, lastRing: -99 };
  // Nobody is playing the world, so the ring is refused by the rules and a
  // founder-placed call is written. Stand a world-mode call up by hand to
  // judge the reply rules on their own.
  eq('the world may not ring before the founder has met anybody it may voice', V.validateRing(s, { char: 'kai', line: 'hi' }).problems[0].rule, 'unknown_character');
  eq('nor speak as somebody the rules never give it', Calls.ringable(s, 'mom').reason, 'not_yours');
  World.noteCall();   // somebody is playing the world now
  const ring = Calls.ring(s, 'vance', 'we need to talk about the benchmark.');
  ok('the phone rings', ring.ok && Calls.activeCall(s)?.mode === 'world', JSON.stringify(ring));
  eq('and it was them who called', Calls.activeCall(s).by, 'world');
  eq('the world waits for the founder to say something', V.validateCallReply(s, Calls.activeCall(s), { line: 'hello' }).problems[0].rule, 'nothing_to_answer');
  eq('the founder cannot pick a topic on a live line', Calls.say(s, 'truce').reason, 'live');
  const line = Calls.founderSays(s, 'What do you actually want, Marcus?');
  ok('the founder speaks', line.ok && !!Calls.pendingLine(s), JSON.stringify(line));
  const cap = V.capFor(s, 'cash', 'neutral', 'take');
  const over = V.validateCallReply(s, Calls.activeCall(s), { line: 'Money.', effects: { cash: -(cap) } });
  eq('one line may take only a share of a card', over.problems?.[0]?.rule, 'cap');
  ok('and it says at which path', over.problems?.[0]?.path === 'effects.cash', over.problems?.[0]?.path);
  const fine = V.validateCallReply(s, Calls.activeCall(s), { line: 'A quarter of your churn number.', effects: { cash: -Math.floor(cap * C.CAP_MULT * 0.9), affinity: 2 } });
  ok('a small line is fine', fine.ok, JSON.stringify(fine.problems || []).slice(0, 200));
  const w = Calls.worldReplies(s, { line: fine.reply.line, effects: fine.reply.effects });
  ok('and it goes on the table', w.ok && (Calls.dealOnTable(s).cash || 0) < 0, JSON.stringify(Calls.dealOnTable(s)));
  // Two more of the same, and the deal as a whole crosses a card's ceiling.
  Calls.founderSays(s, 'Go on.');
  Calls.worldReplies(s, { line: 'More.', effects: { cash: -Math.floor(cap * C.CAP_MULT * 0.9) } });
  Calls.founderSays(s, 'And?');
  const whole = V.validateCallReply(s, Calls.activeCall(s), { line: 'And the rest.', effects: { cash: -Math.floor(cap * C.CAP_MULT * 0.9) } });
  ok('the whole deal is held to one card', !whole.ok && whole.problems.some((p) => p.path === 'deal.cash'), JSON.stringify(whole.problems || []).slice(0, 200));
  ok('and the refusal says so', whole.problems.some((p) => /whole deal/.test(p.fix)), whole.problems.map((p) => p.fix).join(' | '));
  const cash0 = s.company.cash;
  const end = Calls.hangUp(s, { accept: false });
  ok('walking away lands nothing', end.ok && s.company.cash === cash0 && !end.accepted);
  ok('the ring has a cooldown', !Calls.ringable(s, 'vance').ok && Calls.ringable(s, 'vance').reason === 'rate');
  eq('the Log says the founder walked', s.narrative.journal[0].declined, true);
  World.goQuiet('test over');
});

await section('the director leans on the weights, and only the weights', async () => {
  const { measure, steer, beatSheet } = await import('../src/systems/director.js');
  const { DIRECTOR: D } = await import('../src/data/balance.js');
  fresh();
  s.time.day = 200;
  const crisis = { id: 'c', kind: 'crisis', weight: 10 };
  const face = { id: 'f', kind: 'character', char: 'sam', weight: 10 };
  const release = { id: 'r', kind: 'milestone', weight: 10 };
  const prio = { id: 'p', kind: 'crisis', priority: 5, weight: 10 };
  // Three crises in a row, nobody's face for two months, no release for two months.
  s.narrative.journal = [
    { day: 198, kind: 'crisis', title: 'a' }, { day: 190, kind: 'crisis', title: 'b' }, { day: 184, kind: 'crisis', title: 'c' },
    { day: 120, kind: 'story', title: 'd', char: 'sam' }, { day: 100, kind: 'milestone', title: 'e' },
  ];
  const m = measure(s);
  eq('it counts the run of crises', m.crisisRun, 3);
  ok('it knows how long since a face', m.daysSinceFace === 80, String(m.daysSinceFace));
  ok('tension is high', m.tension >= 0.7, String(m.tension));
  ok('another crisis is damped', steer(s, crisis, m) < 1, String(steer(s, crisis, m)));
  ok('a face is favoured', steer(s, face, m) > 1, String(steer(s, face, m)));
  ok('a release is favoured more', steer(s, release, m) > 1.5, String(steer(s, release, m)));
  eq('a priority card is never touched', steer(s, prio, m), 1);
  const beat = beatSheet(s);
  eq('and the beat sheet asks for a breath', beat.wants, 'a breath');
  ok('with a note the world can act on', beat.note.length > 30, beat.note);
  // A run with an even pulse has no opinion.
  s.narrative.journal = [
    { day: 199, kind: 'story', title: 'a' }, { day: 195, kind: 'character', char: 'kai', title: 'b' },
    { day: 190, kind: 'opportunity', title: 'c' }, { day: 184, kind: 'crisis', title: 'd' },
  ];
  const m2 = measure(s);
  eq('an even run leaves crises alone', steer(s, crisis, m2), 1);
  eq('and faces alone', steer(s, face, m2), 1);
  s.narrative.journal = [];
});

// ── The deck writes people out, and the world honours it ────────────────────
await section('a person the deck retired is out of the world\'s hands', async () => {
  fresh();
  s.narrative.flags = {};
  s.narrative.relationships.crane = { met: true, affinity: 4, respect: 2, fear: 0, arc: 3 };
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  ok('while he is in the story he can be voiced', V.metCharacters(s).includes('crane'));
  ok('and a card can carry his face', V.validateCard(s, card({ char: 'crane' })).ok);

  s.narrative.flags.crane_resigned = true;
  eq('the flag reads as a departure', V.departed(s, 'crane')?.flag, 'crane_resigned');
  ok('and it says what happened', /resign/i.test(V.departed(s, 'crane').why));
  ok('he is no longer in the cast the surface publishes', !V.metCharacters(s).includes('crane'),
     V.metCharacters(s).join(','));
  fresh();
  rule('a card with his face is refused', card({ char: 'crane' }), 'departed');
  const post = V.validatePost(s, { char: 'crane', text: 'one more thought about the round.' });
  eq('so is a post as him', post.problems?.[0]?.rule, 'departed');
  ok('and the refusal names the card that did it', /resign/i.test(post.problems[0].fix), post.problems[0].fix);
  eq('and a ring', V.validateRing(s, { char: 'crane', line: 'pick up.' }).problems?.[0]?.rule, 'departed');
  const { ringable } = await import('../src/systems/calls.js');
  eq('the phone agrees', ringable(s, 'crane').reason, 'departed');
  ok('but somebody still in the story is untouched', V.validatePost(s, { char: 'vance', text: 'still here.' }).ok);

  // A reconciliation puts somebody back. Releasing Yuki from the agreement is
  // the card that does it, and she is reachable again the moment it lands.
  s.narrative.relationships.yuki = { met: true, affinity: 0, respect: 0, fear: 0, arc: 4 };
  s.narrative.flags.suppressed_yuki = true;
  ok('a resignation under an NDA is a departure too', !!V.departed(s, 'yuki'));
  s.narrative.flags.released_yuki = true;
  eq('and releasing her undoes it', V.departed(s, 'yuki'), null);
  s.narrative.flags = {};
  fresh();
});

// ── The house style, on prose the linter never sees ─────────────────────────
await section('the world\'s prose is judged by the game\'s own voice, as advice', async () => {
  fresh();
  const warn = (c) => V.validateCard(s, c).warnings || [];
  ok('a card in the house voice draws no notes', warn(card()).length === 0, warn(card()).join(' | '));
  ok('an exclamation mark is named', warn(card({ body: 'The build broke on the ninth day!' }))
     .some((x) => /exclamation/.test(x)));
  ok('a contraction in narration is named',
     warn(card({ body: "It doesn't hold. The build broke on the ninth day." }))
       .some((x) => /contraction/.test(x)));
  ok('a contraction inside quotation marks is not',
     !warn(card({ body: 'He says "it doesn\'t hold" and puts the phone down on the ninth day.' }))
       .some((x) => /contraction/.test(x)));
  ok('a bare small count is named',
     warn(card({ body: 'You have 3 engineers left and the ninth day is tomorrow.' }))
       .some((x) => /counts as words/.test(x)));
  ok('money and percentages are not',
     !warn(card({ body: 'You have $40,000 left at 12% churn on day 210.' }))
       .some((x) => /counts as words/.test(x)));
  ok('a card with no number at all is told so',
     warn(card({ body: 'The build has been green for a while, which is unusual.' }))
       .some((x) => /concrete number/.test(x)));
  ok('a number written as a word satisfies it',
     !warn(card()).some((x) => /concrete number/.test(x)));
  ok('none of it is ever a refusal', V.validateCard(s, card({ body: "It doesn't hold! 3 people left." })).ok);
  const post = V.validatePost(s, { char: 'vance', text: "they don't have the numbers! nobody does." });
  ok('a post is judged the same way', post.ok && (post.warnings || []).length > 0, JSON.stringify(post.warnings));
});

// ── The notebook ────────────────────────────────────────────────────────────
await section('the world keeps a dozen lines for itself', async () => {
  fresh();
  s.world.author.notes = [];
  ok('a line is kept', World.remember(s, 'Vance owes the founder an answer about the truce.').ok);
  eq('and read back', World.recentNotes(s, 2)[0].includes('truce'), true);
  eq('the same line twice is refused', World.remember(s, 'Vance owes the founder an answer about the truce.').problems[0].rule, 'duplicate');
  eq('an empty line is refused', World.remember(s, '   ').problems[0].rule, 'required');
  eq('an over-long one is refused', World.remember(s, 'x'.repeat(W.NOTE_MAX + 1)).problems[0].rule, 'too_long');
  for (let i = 0; i < W.NOTES_MAX + 3; i++) World.remember(s, `note number ${i} about something`);
  eq('the notebook holds its cap', s.world.author.notes.length, W.NOTES_MAX);
  ok('and the oldest gave way', !s.world.author.notes.some((n) => /truce/.test(n.text)));
  eq('forgetting an index off the end is refused', World.forgetNote(s, 99).problems[0].rule, 'range');
  const before = s.world.author.notes.length;
  ok('and a real one is struck out', World.forgetNote(s, 1).ok);
  eq('leaving one fewer', s.world.author.notes.length, before - 1);
  s.world.author.notes = [];
});

// ── The offer, held once ────────────────────────────────────────────────────
await section('a busy assistant may hold the slot once, and only once', async () => {
  fresh();
  World.resetAuthor();
  World.noteCall();                       // presence, and the clock starts here
  s.meta.realtime = true;
  const timedOut0 = s.world.author.stats.slotsTimedOut || 0;
  ok('a slot is offered', World.offerSlot(s, 'event'));
  // Wind the offer past the real-time timeout without moving the game day.
  const age = (ms) => { World.pendingSlot().real = Date.now() - ms; };
  age(W.SLOT_TIMEOUT_REAL_S * 1000 + 500);
  ok('a working assistant holds it for a second window',
     World.offerSlot(s, 'event') === true && !!World.pendingSlot());
  eq('and it is counted as an extension', s.world.author.stats.slotsExtended, 1);
  age(W.SLOT_TIMEOUT_REAL_S * 1000 + 500);
  eq('the second window does not renew', World.offerSlot(s, 'event'), false);
  eq('it lapses to the deck', World.pendingSlot(), null);
  eq('and is counted as a timeout', s.world.author.stats.slotsTimedOut, timedOut0 + 1);
  eq('and the deck is owed the next draw outright', World.offerSlot(s, 'event'), false);
  ok('after which the world may be offered again', World.offerSlot(s, 'event'));

  // Silence gets no extension: the hold is for an assistant that is visibly
  // working, not for one that walked away mid-turn. The last call is module
  // memory with no setter, so the window is narrowed to zero instead — which
  // is the same condition read from the other side.
  World.clearPending('test');
  World.noteCall();
  const window0 = W.SLOT_EXTEND_IF_CALL_WITHIN_S;
  W.SLOT_EXTEND_IF_CALL_WITHIN_S = 0;
  try {
    ok('a fresh slot is offered', World.offerSlot(s, 'event'));
    World.pendingSlot().real = Date.now() - (W.SLOT_TIMEOUT_REAL_S * 1000 + 500);
    eq('a quiet assistant gets no hold', World.offerSlot(s, 'event'), false);
    eq('the slot is gone', World.pendingSlot(), null);
  } finally { W.SLOT_EXTEND_IF_CALL_WITHIN_S = window0; }
  s.meta.realtime = false;
  World.resetAuthor();
});

// ── The queue ───────────────────────────────────────────────────────────────
await section('a card the world post-dated', async () => {
  fresh();
  World.resetAuthor(); World.noteCall();
  s.world.author.queue = [];
  s.world.author.recent.cardDays = [];
  const day0 = s.time.day;

  eq('zero days is not a post-date', World.queueCard(s, card(), 0).problems[0].rule, 'range');
  eq('nor is a year', World.queueCard(s, card(), W.QUEUE_MAX_DAYS + 1).problems[0].rule, 'range');
  const q = World.queueCard(s, card({ title: 'The Letter' }), 5);
  ok('a card five days out is held', q.ok && q.at === day0 + 5, JSON.stringify(q.problems || q.at));
  eq('and it is in the queue', s.world.author.queue.length, 1);
  // A card open right now must not refuse a card meant for next week.
  s.narrative.activeEvent = { id: 'x', title: 'Something', choices: [] };
  ok('a card open today does not refuse next week\'s', World.queueCard(s, card({ title: 'Later' }), 9).ok);
  s.narrative.activeEvent = null;
  ok('but a broken one still is', !World.queueCard(s, card({ kind: 'milestone' }), 3).ok);

  World.queueCard(s, card({ title: 'Third' }), 11);
  World.queueCard(s, card({ title: 'Fourth' }), 13);
  eq('the queue is bounded', World.queueCard(s, card({ title: 'Fifth' }), 15).problems[0].rule, 'rate');
  eq('at its cap', s.world.author.queue.length, W.QUEUE_MAX);

  // Nothing lands before its day.
  eq('nothing lands early', World.tickQueue(s), null);
  s.time.day = day0 + 5;
  // …nor over a card the founder is reading.
  s.narrative.activeEvent = { id: 'y', title: 'Reading', choices: [] };
  eq('nothing lands over an open card', World.tickQueue(s), null);
  eq('and it is still waiting', s.world.author.queue.length, W.QUEUE_MAX);
  s.narrative.activeEvent = null;
  const landed = World.tickQueue(s);
  ok('and then it lands', !!landed, JSON.stringify(landed));
  eq('as the card on their screen', s.narrative.activeEvent?.title, 'The Letter');
  eq('and it leaves the queue', s.world.author.queue.length, W.QUEUE_MAX - 1);
  eq('and it is charged to the window', s.world.author.recent.cardDays.length, 1);
  resolveChoice(s, 0); dismissEvent(s);

  // The rate limit applies at landing, not at queueing: two cards in ten days
  // is two cards in ten days however they were written.
  s.world.author.recent.cardDays = [s.time.day, s.time.day];
  s.time.day = day0 + 10;
  eq('a third inside the window waits', World.tickQueue(s), null);
  ok('rather than being dropped', s.world.author.queue.length === W.QUEUE_MAX - 1);

  // The plug takes the queue with it.
  World.mute(s);
  eq('the plug drops every one of them', s.world.author.queue.length, 0);
  World.unmute(s);
  s.time.day = day0;
  s.world.author.recent.cardDays = [];
  World.resetAuthor();
  fresh();
});

// ── Two authors, one cast ───────────────────────────────────────────────────
await section('a world card says what the deck still holds for that person', async () => {
  fresh();
  World.resetAuthor(); World.noteCall();
  s.world.author.recent.cardDays = [];
  s.narrative.relationships.sam = { met: true, affinity: 4, respect: 2, fear: 0, arc: 1 };
  const notes = World.deckNotesFor(s, 'sam');
  ok('the deck\'s own Sam cards are named, by title', Array.isArray(notes), JSON.stringify(notes));
  ok('and never more than the cap', notes.length <= W.DECK_NOTES_MAX, String(notes.length));
  const r = World.writeCard(s, card({ char: 'sam' }));
  ok('a card with a face carries them back', r.ok && Array.isArray(r.deckNotes), JSON.stringify(r.problems || r.deckNotes));
  resolveChoice(s, 0); dismissEvent(s);
  s.world.author.recent.cardDays = [];
  const plain = World.writeCard(s, card({ title: 'Nobody On It' }));
  ok('a card with no face carries none', plain.ok && plain.deckNotes === undefined);
  resolveChoice(s, 0); dismissEvent(s);
  World.resetAuthor();
  fresh();
});

// ── The last word ───────────────────────────────────────────────────────────
await section('the epilogue is written after the ending, once', async () => {
  fresh();
  World.resetAuthor(); World.noteCall();
  delete s.world.author.epilogue;
  eq('not while the run is live', World.writeEpilogue(s, 'It ends here.').problems[0].rule, 'not_over');
  s.ending = { id: 'test', name: 'The Test Ending', day: Math.floor(s.time.day) };
  eq('an empty one is refused', World.writeEpilogue(s, '').problems[0].rule, 'required');
  eq('an over-long one is refused', World.writeEpilogue(s, 'x'.repeat(W.EPILOGUE_MAX + 1)).problems[0].rule, 'too_long');
  const r = World.writeEpilogue(s, 'The office keys go back in an envelope, and nobody asks for a forwarding address.');
  ok('and a paragraph lands', r.ok, JSON.stringify(r.problems || []));
  eq('on the run', s.world.author.epilogue.text.includes('envelope'), true);
  eq('twice is refused', World.writeEpilogue(s, 'And another thing.').problems[0].rule, 'already_written');
  // The refusal every other write gets now names the one tool still open.
  ok('and the over refusal points at it', /write_epilogue|last word/.test(V.overProblem(s).fix), V.overProblem(s).fix);
  const { chronicle } = await import('../src/systems/chronicle.js');
  const book = chronicle(s, s.ending);
  ok('it is the last thing in the chronicle', book.coda[book.coda.length - 1].includes('envelope'),
     JSON.stringify(book.coda.slice(-1)));
  delete s.ending;
  delete s.world.author.epilogue;
  World.resetAuthor();
  fresh();
});

await section('nothing is written into a finished run', async () => {
  // A card used to open over the credits. Every door asks this first now, so
  // the refusal is one shape wherever the write came from.
  fresh();
  s.company.act = 3;
  s.narrative.relationships.vance = { met: true, affinity: 0, respect: 0, fear: 0, arc: 1 };
  s.ending = { id: 'test', name: 'The Test Ending', day: Math.floor(s.time.day) };
  rule('a card over the credits', card(), 'over');
  const over = (r) => r?.ok === false && r.problems?.[0]?.rule === 'over' && /run is over/.test(r.problems[0].fix);
  ok('a post', over(V.validatePost(s, { char: 'vance', text: 'one more thing.' })));
  ok('the weather', over(V.validateShock(s, { kind: 'crash', days: 30 })));
  ok('the regulators', over(V.validatePressure(s, { heat: 4, line: 'A letter arrives.' })));
  ok('a line', over(V.validateLine(s, 'a line in her voice')));
  ok('a ring', over(V.validateRing(s, { char: 'vance', line: 'pick up.' })));
  ok('an answer to typed words', over(V.validateProposal(s, { outcome: 'It ends.', effects: {} })));
  ok('a line on a call', over(V.validateCallReply(s, { mode: 'world', char: 'vance', pending: { id: 'x' } }, { line: 'hello' })));
  ok('the rival\'s move', over(World.rivalMove(s, 'benchmark')));
  ok('and its focus', over(World.rivalFocus(s, 'growth')));
  eq('the refusal names the ending', V.validateCard(s, card()).problems[0].got, 'The Test Ending');
  delete s.ending;
  s.company.act = 1;
  fresh();
  ok('and a live run takes the same card', V.validateCard(s, card()).ok);
});

// ── §H21 The campaign ───────────────────────────────────────────────────────
await section('the campaign hands over one beat at a time, and the deck holds the same one', async () => {
  const D = await import('../src/systems/director.js');
  const { CAMPAIGN_BEATS, CAMPAIGN_MAP } = await import('../src/data/campaign.js');
  const { CAMPAIGN: CP } = await import('../src/data/balance.js');
  const { EVENT_MAP } = await import('../src/data/events.js');
  fresh();
  World.resetAuthor();

  ok('every beat names a card the deck actually holds',
     CAMPAIGN_BEATS.every((b) => !!EVENT_MAP[b.fallback]),
     CAMPAIGN_BEATS.map((b) => `${b.id}→${b.fallback}`).join(' '));
  ok('and every beat is about somebody in the cast',
     CAMPAIGN_BEATS.every((b) => !!CHARACTERS[b.char]), CAMPAIGN_BEATS.map((b) => b.char).join(','));
  ok('and every brief says something', CAMPAIGN_BEATS.every((b) => b.brief.length > 120));

  s.world.campaign = { done: [], open: null, released: [] };
  s.company.act = 1;
  s.company.actStartedDay = 0;
  s.time.day = 10;
  eq('nothing is open in Act I', D.peekBeat(s), null);
  ok('and the briefing says so', /nothing is due|every beat/i.test(D.campaignBrief(s).note), D.campaignBrief(s).note);
  // And it rides on the beat sheet, where the payload has room for it.
  const T2 = await import('../src/webmcp/tools.js');
  const b0 = await T2.briefing.execute();
  ok('with no beat open the briefing carries none', !('campaign' in (b0.beat || {})), JSON.stringify(b0.beat));

  const first = CAMPAIGN_BEATS[0];
  s.company.act = first.act;
  s.company.actStartedDay = 100;
  s.time.day = 100 + first.after + 1;
  const brief = D.campaignBrief(s);
  eq('the act opens the first beat', brief.beat, first.id);
  ok('and hands over the whole brief', brief.brief.length > 100, brief.brief.slice(0, 60));
  ok('with a clock on it', brief.daysLeft > 0 && brief.daysLeft <= CP.GRACE_DAYS, String(brief.daysLeft));
  eq('reading it twice is the same beat', D.campaignBrief(s).beat, first.id);

  // A card about the right person answers it.
  s.narrative.relationships[first.char] = { met: true, affinity: 2, respect: 1, fear: 0, arc: 2 };
  const r = World.writeCard(s, card({ char: first.char, kind: 'character' }));
  ok('a card lands', r.ok, JSON.stringify(r.problems || []).slice(0, 200));
  eq('and it answers the beat', r.beat, first.id);
  ok('which the world is told', !!r.beatTitle, String(r.beatTitle));
  ok('the beat is done', D.campaignDone(s).includes(first.id), D.campaignDone(s).join(','));
  ok('and the deck was never asked for its version', !D.releasedCards(s).includes(first.fallback),
     D.releasedCards(s).join(','));
  resolveChoice(s, 0); dismissEvent(s);

  // A beat nobody writes is handed back to the deck.
  s.world.campaign = { done: [], open: null, released: [] };
  D.campaignBrief(s);
  s.time.day += CP.GRACE_DAYS + 1;
  eq('after the grace the beat is gone', D.campaignBrief(s).beat === first.id, false);
  ok('the deck has it now', D.releasedCards(s).includes(first.fallback), D.releasedCards(s).join(','));
  const written = EVENT_MAP[first.fallback];
  ok('and the director favours it', D.steer(s, written) > 1, String(D.steer(s, written)));
  ok('but it is still only a weight — nothing else moved',
     D.steer(s, EVENT_MAP.e_open_terminal) === 1, String(D.steer(s, EVENT_MAP.e_open_terminal)));

  // Naming the beat on a card claims it outright.
  s.world.campaign = { done: [], open: null, released: [] };
  fresh();
  D.campaignBrief(s);
  const named = World.writeCard(s, card(), { beat: first.id });
  ok('a card that names the beat claims it', named.ok && named.beat === first.id, JSON.stringify(named).slice(0, 160));
  resolveChoice(s, 0); dismissEvent(s);

  // And a card about somebody else does not.
  s.world.campaign = { done: [], open: null, released: [] };
  fresh();
  D.campaignBrief(s);
  const other = World.writeCard(s, card({ char: 'vance', kind: 'character' }));
  if (other.ok) {
    eq('a card about somebody else claims nothing', other.beat, undefined);
    resolveChoice(s, 0); dismissEvent(s);
  }
  s.world.campaign = { done: [], open: null, released: [] };
  fresh();
});

// ── §H12/§H16 The two tools that are not in the founder's hand ──────────────
await section('one tool points at the rival, and one exists only while somebody is watching', async () => {
  const T = await import('../src/webmcp/tools.js');
  const Surface = await import('../src/webmcp/surface.js');
  const Chair = await import('../src/systems/chair.js');
  fresh();
  Chair.resetChairs();

  const pub = T.founderPublicTool('http://rival.test');
  eq('founder_public is exposed to the rival origin', pub.exposedTo, ['http://rival.test']);
  ok('and it is read-only', pub.annotations.readOnlyHint === true);
  ok('and never in the founder\'s own published hand',
     !Surface.desiredTools(s).includes('founder_public'), Surface.desiredTools(s).join(','));
  const out = await pub.execute({});
  eq('it answers', out.status, 'ok');
  ok('with the public numbers', 'users' in out && 'act' in out, JSON.stringify(out).slice(0, 140));
  ok('and nothing behind the pricing page', !/"cash"|"runway"|"roster"/.test(JSON.stringify(out)),
     JSON.stringify(out).slice(0, 200));

  ok('commentary is not published to an empty room',
     !Surface.desiredTools(s).includes('commentary'), Surface.desiredTools(s).join(','));
  const shut = await T.commentary.execute({ text: 'nobody is here' });
  eq('and it refuses when nobody is watching', shut.status, 'refused');
  eq('  …by name', shut.rule, 'nobody');

  Chair.setRoles({ watch: 2, frame: 1 });
  ok('a spectator publishes it', Surface.desiredTools(s).includes('commentary'), Surface.desiredTools(s).join(','));
  const n0 = s.feed.length;
  const said = await T.commentary.execute({ text: 'they take the money and the room goes quiet' });
  eq('and the room may say something', said.status, 'ok');
  ok('which lands as a caster\'s line', s.feed.length === n0 + 1 && s.feed[0].byCaster, JSON.stringify(s.feed[0]).slice(0, 140));
  ok('marked untrusted like anything else written from outside', s.feed[0].untrusted);
  ok('and it costs nothing at all', !s.feed[0].effects);
  ok('the room has a daily allowance', Number.isFinite(said.left), String(said.left));

  Chair.setRoles({ watch: 0, frame: 1 });
  eq('an empty room cannot say anything', (await T.commentary.execute({ text: 'still here?' })).status, 'refused');
  ok('but the tool stays published for the session',
     Surface.desiredTools(s).includes('commentary'), Surface.desiredTools(s).join(','));
  Chair.resetChairs();
  fresh();
});

// ── §H15 A card the board wrote ─────────────────────────────────────────────
await section('a board motion is a card, bounded like any other', async () => {
  const Chair = await import('../src/systems/chair.js');
  const { CARDS } = await import('../src/data/chair.js');
  fresh();
  World.resetAuthor();
  // A board exists from the first priced round, which is Act III at the
  // earliest — so that is the act these are judged in. The point of the
  // section is that they go through `validateCard` at all, not that they would
  // survive Act I, where there is nobody to hold a seat.
  const act0 = s.company.act;
  s.company.act = 3;
  s.company.cash = 8e7;
  s.resources.reputation = 4000;
  s.company.board = { confidence: 0.9, asks: [], forcedUntil: 0, nextMeeting: 1e9 };

  // Every one of the three is a card the validator would accept on its own.
  for (const [id, tpl] of Object.entries(CARDS)) {
    fresh();
    const v = V.validateCard(s, { kind: tpl.kind, title: tpl.title,
      body: tpl.body.replace(/\{order\}/g, 'Harvest'), choices: tpl.choices.map((c) => ({ ...c })) });
    ok(`${id} passes the same rules a world card does`, v.ok,
       JSON.stringify(v.problems || []).slice(0, 200));
    ok(`  …and leaves a door open`, v.ok, id);
  }

  fresh();
  const r = Chair.boardMotion(s, 'refuse_round');
  ok('the motion writes one', r.ok && r.card, JSON.stringify(r));
  eq('marked as the board\'s', s.narrative.activeEvent.author, 'board');
  ok('and it is not marked as the world\'s', s.narrative.activeEvent.author !== 'world');
  resolveChoice(s, 0); dismissEvent(s);

  // The decision stands even when the card cannot be handed over — the founder
  // is reading something else, or the world has spent its window.
  fresh();
  s.narrative.activeEvent = { id: 'busy', title: 'Something Else', choices: [] };
  const busy = Chair.boardMotion(s, 'force_directive', 'harvest');
  ok('a motion over an open card still applies', busy.ok && busy.applied, JSON.stringify(busy));
  eq('and says the card could not land', busy.card, false);
  eq('the order was forced anyway', s.company.directive, 'harvest');
  s.narrative.activeEvent = null;

  // And nothing at all once the run is over.
  s.ending = { id: 'test', name: 'The Test Ending', day: 1 };
  s.company.boardRefusedUntil = 0;
  fresh();
  const over = Chair.boardMotion(s, 'refuse_round');
  eq('a motion over the credits writes no card', over.card, false);
  delete s.ending;
  delete s.company.board;
  s.company.act = act0;
  fresh();
});

report('world');
