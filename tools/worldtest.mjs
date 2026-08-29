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

report('world');
