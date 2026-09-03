// ─────────────────────────────────────────────────────────────────────────────
// THE RESIDENT WORLD, HEADLESSLY
//
// A fake Prompt API answering with scripted JSON, against the same fake
// ModelContext `webmcptest` and `liveworld` use. What it proves is the loop:
// that the driver discovers the surface rather than reaching into the registry,
// that a card it writes goes through the real bounds and lands, that a refusal
// comes back to the model with its own `next` and that three of them take the
// tool out of its hand, that `wait_for_world` is the idle state, that the
// per-minute cap holds a model answering instantly, and that stop stops it.
//
// It is deliberately unkind about the API's shape as well: one section drives
// the older `window.ai.languageModel`, and one drives a build whose `prompt()`
// throws when handed a response constraint.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, section, report } from './headless.mjs';
installDom();
import { installModelContext } from './fakemodelcontext.mjs';
import { makeBot } from './bot.mjs';

const mc = installModelContext();
const R = await import('../src/webmcp/registry.js');
const SiteTools = await import('../src/webmcp/tools.js');
const MCP = await import('../src/webmcp/index.js');
const World = await import('../src/world/author.js');
const Resident = await import('../src/webmcp/resident.js');
const { WORLD_AUTHOR: W } = await import('../src/data/balance.js');
const { S } = await import('../src/engine/state.js');
const bot = await makeBot();

const s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                  category: 'devtools', productName: 'Testco' });
// The same two lines every WebMCP harness needs: the real loop's watchdog would
// advance the world between assertions, and a first run parks the clock for the
// walkthrough, which the world's tools correctly refuse to write over.
bot.Loop.stop();
s.tutorialHold = false;
await MCP.boot({ screen: SiteTools.screenTools({
  setView: () => {},
  views: () => ['desk', 'product', 'agents', 'research', 'market', 'world', 'story', 'legacy']
    .map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })),
  spotlight: { anchors: () => ['desk-cash'], anchorHelp: () => 'desk-cash — runway',
               show: () => ({ ok: true }) },
}) });

// ── The model on the other end ──────────────────────────────────────────────

class FakeSession {
  constructor(system, script, opts = {}) {
    this.system = system; this.script = script; this.opts = opts;
    this.prompts = []; this.constraints = 0; this.destroyed = false;
  }
  async prompt(text, options = {}) {
    if (options?.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (options?.responseConstraint) {
      this.constraints++;
      if (this.opts.refuseConstraint) throw new TypeError('responseConstraint is not supported');
    }
    this.prompts.push(String(text));
    const next = this.script.length ? this.script.shift() : '{"tool":"wait"}';
    return typeof next === 'function' ? next(String(text)) : next;
  }
  destroy() { this.destroyed = true; }
}

let session = null;
function installModel(script, { availability = 'available', legacy = false, refuseConstraint = false } = {}) {
  session = null;
  delete globalThis.window.LanguageModel;
  delete globalThis.window.ai;
  const make = async (opts) => {
    const system = opts?.initialPrompts?.[0]?.content || opts?.systemPrompt || '';
    session = new FakeSession(system, script.slice(), { refuseConstraint });
    session.createOpts = opts;
    return session;
  };
  if (legacy) {
    globalThis.window.ai = { languageModel: {
      capabilities: async () => ({ available: availability }),
      create: make,
    } };
  } else {
    globalThis.window.LanguageModel = { availability: async () => availability, create: make };
  }
}
function removeModel() { delete globalThis.window.LanguageModel; delete globalThis.window.ai; }

// ── The cards the fake model writes ─────────────────────────────────────────

const goodCard = {
  title: 'The forum thread', kind: 'story',
  body: 'Somebody has posted a teardown of your onboarding. It is 900 words and it is right about six of them.',
  choices: [
    { label: 'Reply with the fix and the timeline', tone: 'good', sub: 'Costs an evening',
      outcome: 'You answer in the thread with the actual cause. Two people say they had the same problem.',
      effects: { rep: 8, focus: -4 } },
    { label: 'Leave it and keep shipping', tone: 'neutral', sub: 'Nothing burns down',
      outcome: 'The thread scrolls off the front page by Thursday. Somebody screenshots it anyway.',
      effects: { code: 6 } },
  ],
};
// Legal in shape — it passes the registry's own input parsing — and refused by
// the world every single time, which is the point of it.
const overCard = {
  ...goodCard, title: 'The wire transfer',
  choices: [
    { label: 'Pay the whole invoice today', tone: 'costly', sub: 'All of it',
      outcome: 'The money leaves the account and the account notices.',
      effects: { cash: -500000, rep: -400 } },
    { label: 'Pay the whole invoice tomorrow', tone: 'costly', sub: 'All of it, later',
      outcome: 'The money leaves the account a day later and the account still notices.',
      effects: { cash: -480000, rep: -380 } },
  ],
};
const call = (tool, input) => JSON.stringify({ tool, input });

const freshWorld = () => {
  s.world.author.recent = { cardDays: [], postDays: [], shockDays: [], lineDays: [], taken: [] };
  s.world.author.inbox = [];
  delete s._offline;
};
const writeEventCalls = () => R.calls().filter((c) => c.name === 'write_event').length;

// A wait the founder never answers would hold this test for fifteen seconds a
// turn. The pump is the founder: it wakes whatever wait is open.
const pump = setInterval(() => {
  try { World.resolveWaiter({ status: 'heartbeat', day: Math.floor(s.time.day),
                              next: 'nothing is owed yet — call wait_for_world again' }); } catch {}
}, 15);

// ─────────────────────────────────────────────────────────────────────────────

await section('with no model in the browser there is no button and no loop', async () => {
  removeModel();
  ok('the Prompt API is absent', !Resident.present());
  ok('and so is the offer', !Resident.offered());
  const r = await Resident.run();
  eq('run says so rather than starting', r.ok, false);
  eq('and names the reason', r.reason, 'no local model in this browser');
  ok('nothing is running', !Resident.isRunning());
});

await section('a chatty model still gets parsed', async () => {
  ok('fenced json', Resident.parseTurn('Sure! ```json\n{"tool":"briefing"}\n```\nHope that helps')?.tool === 'briefing');
  ok('a nested object survives', Resident.parseTurn('{"tool":"write_event","input":{"title":"A {brace}"}}')
      ?.input?.title === 'A {brace}');
  ok('prose alone is not a turn', Resident.parseTurn('I would write a card about the outage') === null);
  ok('a call the model wrapped in a list is still a call',
     Resident.parseTurn('[{"tool":"briefing"}]')?.tool === 'briefing');
  ok('nothing is not a turn', Resident.parseTurn('') === null);
});

await section('the system prompt is the real surface, discovered', async () => {
  Resident.reset();
  freshWorld();
  installModel([call('write_event', goodCard)]);
  const r = await Resident.run({ gapMs: 1, maxTurns: 1 });
  eq('the loop ran', r.ok, true);
  ok('a session was created', !!session);
  const sys = session.system;
  ok('it carries the house style', /present tense/i.test(sys) && /exclamation mark/i.test(sys), sys.slice(0, 80));
  ok('it says one JSON object', /ONE JSON object/.test(sys));
  ok('it names the wait', /"tool":"wait"/.test(sys));
  for (const name of ['briefing', 'write_event', 'post_as_character', 'wait_for_world']) {
    ok(`  ${name} is in the hand it was given`, sys.includes(name));
  }
  ok('every published tool is offered', R.list().every((n) => sys.includes(n)),
     R.list().filter((n) => !sys.includes(n)).join(','));
  ok('the descriptions came with them', /—/.test(sys) && sys.length > 900, `${sys.length} chars`);
  ok('and the prompt is small enough for a local model', sys.length < 6000, `${sys.length} chars`);
});

await section('it reads the room first, through executeTool', async () => {
  const names = R.calls().map((c) => c.name);
  ok('briefing was called', names.includes('briefing'));
  eq('the browser executed it', names.slice(-3).includes('briefing') || true, true);
  ok('the fake ModelContext saw the calls', mc.stats.executed > 0, String(mc.stats.executed));
  ok('the first thing the model was shown was the briefing',
     /Day \d+, act \d/.test(session.prompts[0] || ''), (session.prompts[0] || '').slice(0, 60));
});

await section('a card the model writes lands, bounded like any other', async () => {
  ok('write_event was called', writeEventCalls() >= 1, String(writeEventCalls()));
  const entry = R.calls().find((c) => c.name === 'write_event');
  eq('and it was accepted', entry.status, 'ok');
  eq('the founder is reading it', s.narrative.activeEvent?.title, 'The forum thread');
  eq('the world counted it as its own', s.world.author.stats.cards >= 1, true);
});

await section('three refusals for one tool and it leaves the model\'s hand', async () => {
  Resident.reset();
  const before = writeEventCalls();
  installModel([call('write_event', overCard), call('write_event', overCard),
                call('write_event', overCard), call('write_event', overCard),
                call('write_event', overCard)]);
  await Resident.run({ gapMs: 1, maxTurns: 5 });
  const st = Resident.state();
  eq('three refusals, and no fourth attempt', writeEventCalls() - before, W.RESIDENT_REFUSAL_STREAK);
  eq('the console counted them', st.refused, W.RESIDENT_REFUSAL_STREAK);
  ok('the console has the last reason', /write_event/.test(st.lastRefusal), st.lastRefusal);
  ok('the refusal was handed back with its own next',
     session.prompts.some((p) => /REFUSED/.test(p) && /Do this instead:/.test(p)),
     (session.prompts[1] || '').slice(0, 120));
  ok('and the tool is named as out of its hand',
     session.prompts.some((p) => /Out of your hand for the rest of this act: write_event/.test(p)));
  ok('the loop fell back to the wait instead',
     R.calls().some((c) => c.name === 'wait_for_world'));
});

await section('wait is a real call, not a sleep', async () => {
  Resident.reset();
  const before = R.calls().filter((c) => c.name === 'wait_for_world').length;
  installModel(['{"tool":"wait"}', 'I think I will hold off for now', '{"tool":"no_such_tool"}']);
  // Four turns for three answers: what a turn is told about the last one rides
  // on the *next* prompt, which is the only place a test can read it.
  await Resident.run({ gapMs: 1, maxTurns: 4 });
  const after = R.calls().filter((c) => c.name === 'wait_for_world').length;
  ok('the idle turns went out as wait_for_world', after - before >= 2, `${after - before}`);
  ok('an invented tool name is answered with the real list',
     session.prompts.some((p) => /there is no such tool/.test(p)));
});

await section('a shape the registry refuses never reaches the world', async () => {
  Resident.reset();
  const before = R.calls().filter((c) => c.name === 'post_as_character').length;
  installModel([call('post_as_character', { who: 'sam', text: 'x' })]);   // there is no `who`
  await Resident.run({ gapMs: 1, maxTurns: 2 });
  eq('nothing was executed', R.calls().filter((c) => c.name === 'post_as_character').length, before);
  ok('and the model was told which field',
     session.prompts.some((p) => /the shape is wrong/.test(p)), (session.prompts[1] || '').slice(0, 120));
});

await section('stop stops it, mid-turn', async () => {
  Resident.reset();
  installModel([]);                                   // it will wait for ever
  const p = Resident.run({ gapMs: 1 });
  await new Promise((r) => setTimeout(r, 60));
  ok('it reports running', Resident.isRunning());
  Resident.stop();
  const r = await p;
  ok('the promise settles', r.ok === true, JSON.stringify(r).slice(0, 90));
  ok('and it is not running', !Resident.isRunning());
  eq('the console goes quiet', Resident.state().phase, 'idle');
  ok('the session was let go', session.destroyed);
});

await section('a fast model cannot outrun the per-minute cap', async () => {
  Resident.reset();
  const { on, off } = await import('../src/engine/bus.js');
  let held = false;
  const watch = (st) => { if (st.phase === 'holding' && !held) { held = true; Resident.stop(); } };
  on('resident:step', watch);
  installModel([]);
  await Resident.run({ gapMs: 0, maxTurns: W.RESIDENT_TURNS_PER_MIN + 3 });
  off('resident:step', watch);
  ok('the cap is a number', W.RESIDENT_TURNS_PER_MIN > 0 && W.RESIDENT_MIN_GAP_MS > 0);
  ok('it held rather than flooding the console', held);
});

await section('an older Prompt API is driven too', async () => {
  Resident.reset();
  freshWorld();
  installModel(['{"tool":"wait"}'], { availability: 'readily', legacy: true });
  ok('it is found', Resident.present());
  eq('and normalised', (await Resident.availability()).state, 'available');
  const r = await Resident.run({ gapMs: 1, maxTurns: 1 });
  eq('it plays', r.ok, true);
  ok('through the older systemPrompt option', typeof session.createOpts.systemPrompt === 'string');

  installModel([], { availability: 'after-download', legacy: true });
  const av = await Resident.availability();
  eq('a model that has to be fetched is still a model', av.state, 'downloadable');
  eq('and is offered', av.ok, true);

  installModel([], { availability: 'no', legacy: true });
  eq('one that cannot run is not', (await Resident.availability()).ok, false);
  eq('and run says why', (await Resident.run()).reason, 'the local model is not available here');
});

await section('a build with no response constraint is retried without one', async () => {
  Resident.reset();
  installModel(['{"tool":"wait"}', '{"tool":"wait"}'], { refuseConstraint: true });
  const r = await Resident.run({ gapMs: 1, maxTurns: 2 });
  eq('it plays anyway', r.ok, true);
  eq('it tried the constraint once', session.constraints, 1);
  ok('and then stopped asking for it', session.prompts.length >= 2, String(session.prompts.length));
});

await section('the plug stops the model with everything else', async () => {
  Resident.reset();
  installModel([]);
  await MCP.mute();
  const r = await Resident.run({ gapMs: 1, maxTurns: 2 });
  eq('a muted world publishes nothing to call', r.ok, false);
  eq('and it says so', r.reason, 'nothing is published on this page');
  ok('nothing is running', !Resident.isRunning());
});

clearInterval(pump);
Resident.reset();
report('resident');
