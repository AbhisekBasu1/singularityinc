// ─────────────────────────────────────────────────────────────────────────────
// WHAT THEY ARE DOING RIGHT NOW — one line per lane, per shift of the day.
//
// The roster has always been a rack of cards with numbers on them: output,
// upkeep, morale, a lane tab. Nothing on that screen ever said what any of them
// was *doing*, which is the one thing a founder would actually look at a roster
// to find out. These are the sentences that answer it.
//
// Copy only. `src/systems/activity.js` picks which one, from the day and the
// agent's id — never from the RNG, because the roster repaints seven times a
// second and a render path that draws from the shared stream desynchronises
// every event and market roll after it.
//
// Rules for a line here. It is present tense and it is small: a task, not an
// achievement. It never states a quantity — the tiles beside it hold every
// number on this screen and a sentence that invents one is a sentence that
// disagrees with them. And it is the agent's own register, which is flat: these
// are machines reporting, not people narrating.
// ─────────────────────────────────────────────────────────────────────────────

export const LANE_WORK = {
  build: [
    'Threading a retry through the write path.',
    'Rewriting the part of the parser nobody has touched since launch.',
    'Chasing a failure that only happens on the third run.',
    'Splitting a file that had grown to nine hundred lines.',
    'Wiring the new endpoint to the thing that was already there.',
    'Deleting a helper it turned out nothing called.',
    'Reading the diff back before it opens the branch.',
    'Waiting on a test suite that takes eleven minutes.',
    'Reproducing the report from Tuesday, exactly.',
    'Naming things. It has been on the third one a while.',
  ],
  growth: [
    'Reading the last two hundred support threads in a row.',
    'Grouping the churned accounts by what they stopped doing first.',
    'Drafting the mail nobody wants to send.',
    'Watching a session recording at half speed.',
    'Counting how many people get to step three.',
    'Writing the same sentence four ways to see which one lands.',
    'Cross-checking a claim on the site against the product.',
    'Following one account from signup to silence.',
    'Sorting the trial list by the day they stopped opening it.',
  ],
  research: [
    'Reproducing a result that was published last month.',
    'Sweeping a hyperparameter it does not expect to matter.',
    'Reading a paper, slowly, twice.',
    'Building the smallest version of the thing that could work.',
    'Checking the baseline before believing the number.',
    'Writing down why the last approach failed, in full.',
    'Rerunning an ablation because the first one was too clean.',
    'Waiting for a job that will finish at three in the morning.',
  ],
  ops: [
    'Watching a graph that has not moved and will not say why.',
    'Rotating a credential that expires on Thursday.',
    'Replaying yesterday\'s traffic against the new build.',
    'Writing the runbook for the thing that broke once.',
    'Tightening an alert that fires too often to read.',
    'Checking backups by restoring one, which nobody does.',
    'Draining a node and putting it back.',
    'Reading the log from the ten minutes before it recovered.',
  ],
  moonshot: [
    'Building something it has not explained yet.',
    'Following a thread the roadmap does not have.',
    'Testing an idea that will probably not survive the week.',
    'Reading in a field this company has no business in.',
    'Prototyping the version that would be embarrassing to show.',
    'Chasing a hunch about the shape of the problem.',
    'Writing a proposal it may or may not send you.',
  ],
};

// Nobody assigned, or a lane that has no pool. It is still doing something.
export const IDLE_WORK = [
  'Waiting on an assignment.',
  'Reading the codebase from the top.',
  'Idle, at full cost.',
];

// The line the strip shows *instead*, when the log says something happened to
// this one today. Keyed by the kind `logAgent` records.
export const AFTER = {
  lane: 'Reassigned this morning. Reading itself in.',
  autonomy: 'Its permissions changed today. Working to the new line.',
  hire: 'First day. Reading everything before it touches anything.',
  incident: 'On the incident. Everything else is waiting.',
};

// What the strip calls the state of the bar, in mono. Not a percentage: the
// tiles carry the numbers and this is the shift, not the output.
export const PHASES = ['starting', 'in it', 'deep in it', 'wrapping up'];
