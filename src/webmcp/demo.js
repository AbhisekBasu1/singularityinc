// ─────────────────────────────────────────────────────────────────────────────
// THE SCRIPTED WORLD
//
// Two reasons this exists, and neither of them is a demo gimmick.
//
// The first is that stock Chrome ships no consumer agent. Nothing in an
// ordinary browser will ever call these tools on its own, so without this the
// entire feature is invisible to anyone who does not have the ChatGPT desktop
// app — which includes most people who will ever open the page.
//
// The second is that registration is the half of WebMCP everybody ships and
// consumption is the half almost nobody does. This goes through
// `document.modelContext.getTools()` and `.executeTool()` for real: it
// discovers the surface the way a visiting agent would, reads the schemas it
// finds, and calls them by name. It does not reach into the registry.
//
// It is a script, not a model, and the interface says so in those words. What
// it demonstrates is the machinery, honestly labelled.
// ─────────────────────────────────────────────────────────────────────────────
import * as R from './registry.js';
import { emit } from '../engine/bus.js';
import { S } from '../engine/state.js';

// A token, not a boolean. With a boolean, stopping a script cleared the flag
// while its loop was still inside a wait; the next click started a second loop,
// and when the first one finally woke it cleared the flag again — so the panel
// showed RUN in the middle of a script and a third click started a third. Three
// scripts, one run, all writing cards.
let runToken = 0;
let live = 0;
const controllers = new Map();

export function isRunning() { return live !== 0; }

export function stop() {
  for (const ac of controllers.values()) { try { ac.abort(); } catch {} }
  controllers.clear();
  live = 0;
  emit('demo:end', { stopped: true });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Discover the surface the way a visiting agent would, then call by name.
async function callByName(name, input = {}, signal) {
  const tools = await R.discover();
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { status: 'missing', name };
  const raw = await R.invoke(tool, input, signal);
  try { return JSON.parse(raw); } catch { return { status: 'unparseable', raw: String(raw).slice(0, 120) }; }
}

// The beats. Each one is a real call; the prose is what a person would have
// typed to cause it. `until` lets a beat wait for the founder to do their part.
function script() {
  const rival = S?.market?.nemesis?.id
    ? (S.market.competitors.find((c) => c.id === S.market.nemesis.id) || null) : null;
  const met = Object.entries(S?.narrative?.relationships || {})
    .filter(([id, r]) => r.met && !['aria', 'mom'].includes(id)).map(([id]) => id);
  const voice = met.includes('vance') ? 'vance' : met.includes('priya') ? 'priya' : met[0] || null;

  const beats = [
    { say: 'What is going on with my company?', tool: 'briefing', input: {} },
    { say: 'Show me the house style before you write anything.', tool: 'example_cards', input: {} },
  ];

  if (voice) {
    const LINES = {
      vance: 'quiet quarter for some people. not for us.',
      priya: 'Filing on the solo-founder story this week. Three sources so far, two of them yours.',
      sam: 'been using this every day for a month. the export thing is still broken and i still love it',
      crane: 'Candidly, the metric that matters here is retention, and nobody is showing me retention.',
      nullptr: 'the second one is the one that will get you',
    };
    beats.push({ say: `Have ${voice} say something.`, tool: 'post_as_' + voice,
                 input: { text: LINES[voice] || 'Watching this one closely.' } });
  }

  beats.push({
    say: 'Throw something at me.',
    tool: 'write_event',
    input: {
      title: 'The Thursday email', kind: 'story',
      body: 'It arrives at 4.40pm, which is when people send the emails they have been rewriting all day.\n\n'
          + 'Somebody has been running your product against a competitor for eleven weeks and has put the '
          + 'numbers in a public spreadsheet. You come out ahead on four of the seven, and the three you lose '
          + 'are the three you would have picked.',
      choices: [
        { label: 'Post the spreadsheet yourself', tone: 'risky',
          sub: 'Including the three you lose',
          outcome: 'You link it with one sentence: "All of this is fair." The thread goes further than the spreadsheet did.',
          effects: { rep: 9, focus: -4 } },
        { label: 'Fix the three, then say nothing', tone: 'good',
          sub: 'Six weeks of work, quietly',
          outcome: 'Nobody notices for a month and a half. Then somebody re-runs it, and that thread is better.',
          effects: { code: 8, focus: -6 } },
        { label: 'Let it be', tone: 'neutral', sub: 'It is somebody else\'s spreadsheet',
          outcome: 'It does the rounds for a week. You read it four times and close the tab four times.',
          effects: { insight: 4 } },
      ],
    },
    // The founder answers this one. That is the point of the beat.
    until: () => !S?.narrative?.activeEvent,
    untilLabel: 'waiting for you to answer it',
  });

  beats.push({ say: 'Say something as my assistant.', tool: 'aria_says',
               input: { text: 'They were right about the three. I would fix them in the order they listed.' } });
  beats.push({ say: 'Let a week go by.', tool: 'advance_time', input: { days: 7 } });

  return beats;
}

// The beats, for a test to check against the published surface without
// waiting on the script's own pacing.
export function plan() { return script(); }

export async function run({ onBeat } = {}) {
  if (isRunning()) return { ok: false, reason: 'already running' };
  if (!R.ready()) return { ok: false, reason: 'no site tools in this browser' };
  const token = ++runToken;
  live = token;
  const controller = new AbortController();
  controllers.set(token, controller);
  const { signal } = controller;
  emit('demo:start', {});

  const beats = script();
  const results = [];
  try {
    for (const beat of beats) {
      if (signal.aborted) break;
      // Only the live run may speak. A stopped one waking from a wait used to
      // paint its next line over a run that had already started after it.
      if (live !== token) break;
      onBeat?.({ phase: 'say', say: beat.say, tool: beat.tool });
      emit('demo:beat', { say: beat.say, tool: beat.tool });
      await wait(1100);
      if (signal.aborted || live !== token) break;

      const r = await callByName(beat.tool, beat.input, signal);
      results.push({ tool: beat.tool, status: r?.status });
      onBeat?.({ phase: 'result', tool: beat.tool, result: r });

      // Say so out loud. The rules refuse things — a card too soon after the
      // last one, a budget already spent — and watching one get refused is
      // half of what this is for.
      if ((r?.status === 'refused' || r?.status === 'bad_input') && live === token) {
        emit('demo:beat', { say: `refused: ${r.reason || r.rule || 'not allowed'} — ${r.next || ''}`.slice(0, 150) });
        await wait(2200);
        continue;                       // a refused beat has nothing to wait for
      }
      if (signal.aborted) break;
      await wait(900);
      if (signal.aborted) break;

      if (beat.until) {
        if (live !== token) break;
        onBeat?.({ phase: 'wait', label: beat.untilLabel });
        emit('demo:waiting', { label: beat.untilLabel });
        const deadline = Date.now() + 120000;
        while (!signal.aborted && !beat.until() && Date.now() < deadline) await wait(300);
        await wait(600);
      }
    }
  } catch (e) {
    results.push({ tool: 'error', status: String(e?.message || e).slice(0, 80) });
  }

  controllers.delete(token);
  // Only the run that is actually live may declare the script over.
  if (live === token) { live = 0; emit('demo:end', { results }); }
  return { ok: true, results, superseded: live !== 0 };
}
