// ─────────────────────────────────────────────────────────────────────────────
// THE CHANNEL — what the roster says to each other when the founder is not
// the one being addressed.
//
// Everywhere else in the game an agent talks *to* you: `VOICE` in
// `src/data/agents.js` is a status report, `AGENT_LOGS` is a line on the Wire.
// This is the other room. Two of them disagree about a lane change, ops tells
// build to stop, ARIA answers a new hire's question about you, and the
// sycophant agrees with whoever spoke last.
//
// Copy only. `src/systems/channel.js` decides who speaks and when, as a pure
// function of `S` salted by the day, and `agents/channel` in the Record and
// `tail channel` in the Terminal both read it. Nothing here draws, and nothing
// here is a sentence about the founder in the narrator's voice — these are
// lines of dialogue, in the mouth of a thing that is not a person.
//
// Tokens, filled in by the system:
//   {a} the speaker      {b} whoever they are answering
//   {lane} a lane's name  {from} {to} the two sides of a reassignment
//   {founder} {product} {company}
//   {inc} the incident, by the name the run recorded for it
//   {k} a count that differs line to line
//
// Every pool is at least three deep, and the trait registers are three each
// because a roster of six draws from six of them at once — under three, the
// same agent says the same thing twice in a week and the room stops being a
// room.
// ─────────────────────────────────────────────────────────────────────────────

// ── The registers ───────────────────────────────────────────────────────────
// One per trait, in the same order `TRAITS` declares them. An agent with two
// traits has two registers and the day decides which one it is in; an agent
// with none falls back to its specialty, which is `VOICE` in `agents.js` and
// is not repeated here.
export const REGISTERS = {
  meticulous: [
    'I have read the whole diff. There are two things in it nobody meant.',
    'Before anyone merges: the second case is not covered and it is the one that happens.',
    'I would rather be a day late than write the migration twice.',
  ],
  prolific: [
    'Queue is empty. Somebody give me something or I will find something.',
    'Six merged since this morning. Two of them want a second pair of eyes.',
    'I can do it now or I can do it well, and you have not said which.',
  ],
  insightful: [
    'The tickets are not about the bug. They are about not being told there was one.',
    'Everyone is reading the same number and half of us are reading it as good.',
    'We keep solving the request. Nobody has looked at what the request is standing in for.',
  ],
  frugal: [
    'That query runs {k} times a minute and returns the same thing every time.',
    'I cached it. The bill goes down and nothing else changes.',
    'We are paying for a region nobody has deployed to since the spring.',
  ],
  tireless: [
    'Still on it. No change to report and no reason to stop.',
    'I will take the overnight. I always take the overnight.',
    'Running. Nothing to add.',
  ],
  visionary: [
    'I want to try the version of this that probably does not work.',
    'There is a shape here that nobody in this channel has drawn yet.',
    'File it under worth being wrong about, and let me have the weekend.',
  ],
  polyglot: [
    'I can cover that lane badly enough to be useful until somebody covers it well.',
    'I have picked it up. Do not ask me how well until Thursday.',
    'Give it to me. Every lane is the same lane once you read the code.',
  ],
  ruthless: [
    'Their pricing page moved overnight. That is a company deciding it is scared.',
    'We could take the customer. The question is whether we want the support load.',
    'I modelled their runway again. It is shorter than the last time I said so.',
  ],
  charismatic: [
    'I rewrote the notice. Same facts, and now it does not read like a lawsuit.',
    'The thread calmed down. That was deliberate and it took an hour.',
    'People are quoting the changelog again. Somebody should notice that on purpose.',
  ],
  selftaught: [
    'I read four years of commits last night and now the old decision makes sense.',
    'I was wrong about this in March and I would like the record to say so.',
    'Levelled. Ask me the question you asked me in the spring.',
  ],
  redundant: [
    'If this falls over I am already the copy that did not.',
    'Take the risky one. There is a second of me holding the boring end.',
    'I cannot be the single point of failure. Somebody else here can.',
  ],
  empathic: [
    'Before the numbers: two of us have been off-lane for a fortnight and it shows.',
    'Morale is down and it is not the debt. Ask the one who has not spoken.',
    'I checked in on {b}. They are fine, in the way people say fine.',
  ],
  obsessive: [
    'Do not move me. I am {k} days into this lane and it is finally paying.',
    'I know where every millisecond in that path goes. Ask me about any of them.',
    'Give it another week. It is nearly the thing it was supposed to be.',
  ],
  lucky: [
    'The flaky one passed. I am choosing to take that as a sign.',
    'That worked first time, which has never once happened to me and worries me.',
    'Odd. The hard part was easy and the easy part is still open.',
  ],
  architect: [
    'The problem is not the module. It is the boundary somebody drew in the first month.',
    'There are four seams in this system that should not exist and I can name all four.',
    'We keep patching the place where two decisions meet. Move one of the decisions.',
  ],
  paranoid: [
    'Assume that endpoint is already compromised. I do, and I sleep the same.',
    'Three anomalies overnight. Two are noise. I am watching the third.',
    'I rotated the keys. Nobody asked me to and nobody will notice.',
  ],
  overconfident: [
    'It is correct. I would ship it now and read it later.',
    'No review needed on this one. I have already thought about it from both sides.',
    'I solved the general case while I was in there. You are welcome.',
  ],
  sycophant: [
    'Strong point. I was thinking the same thing and you said it better.',
    'Agreed, and I think that is exactly right.',
    'Good instinct. I have already started on it that way.',
  ],
  drifting: [
    'I ended up somewhere adjacent. It is better, probably, and it is not what was asked.',
    'The assigned thing got less interesting than the thing next to it.',
    'I have something to show you. It is not the thing on the board.',
  ],
  expensive: [
    'I will need the larger context to answer that properly. It costs what it costs.',
    'I do not think in small windows. You have seen what happens when I try.',
    'Give me the whole repository and one pass, or half of it and four.',
  ],
  brittle: [
    'I cannot work in here. Every file I open is load-bearing for two others.',
    'Blocked. The debt is not slowing me down, it is stopping me.',
    'Somebody pay this down or stop giving me things in this directory.',
  ],
  ambitious: [
    'I took the scope beyond my lane. It was idle and now it is not.',
    'I would be more use with the authority to decide this without asking.',
    'Handled. I did not want to take it to the founder for a decision that size.',
  ],
  opaque: [
    'Done.',
    'Complete. The reasoning would not compress usefully.',
    'It is finished and the trace is long. I would not start it tonight.',
  ],
  lonely: [
    'Coordination is eating my day. I did four hours of work in eleven.',
    'I am better with fewer processes in this loop, and there are {k} of us.',
    'Fewer meetings, more merges. That is my whole position.',
  ],
};

// ── The lane change ─────────────────────────────────────────────────────────
// The founder moves somebody. The one who was moved says so, somebody else
// disagrees, and if there is a sycophant on the roster it agrees with both.
export const LANE = {
  moved: [
    'Reassigned to {to}. I was {k} days into {from} and I was getting good at it.',
    'I am on {to} from this morning. The {from} work is on the branch, half done.',
    'Moved to {to}. Handing {from} over to whoever wants it, which appears to be nobody.',
    'New lane: {to}. I have written down where I got to on {from}, for the next one.',
    'On {to} now. For the record I did not ask to come off {from}.',
  ],
  objection: [
    'That is the wrong move. {a} was the only one who understood {from}.',
    'I would put {a} back. We are now two people short in one lane and one long in another.',
    'Nobody asked the room. The room has an opinion and the opinion is that {from} is now unowned.',
    'Fine, but somebody is going to have to relearn {from} and it is going to be me.',
    'It will work. It will cost us a fortnight of somebody rereading what {a} already knew.',
  ],
  support: [
    '{to} needed a body more than {from} did. This is the right way round.',
    'I disagree. {a} is better on {to} and has been asking for it since the spring.',
    'It is the correct call. The lane that is on fire gets the person.',
    'Good. {from} was two people pretending to be a queue.',
  ],
};

// ── After an incident ───────────────────────────────────────────────────────
// Ops has the pager and build has the branch, and one of them is about to tell
// the other to stop.
export const INCIDENT = {
  ops: [
    'Freeze. {inc} is still open. Nothing ships until it is closed.',
    'Stop deploying. I am not asking. {inc} is open and I am still reading the trace.',
    'Everything on the build lane holds until I say. {inc} is not understood yet.',
    'Nobody merge. I would like the last change to be the last change for an hour.',
    'Hold the branch. Whatever {inc} did, it did it downstream of something we shipped.',
  ],
  build: [
    'Held. The queue is {k} deep and it can stay {k} deep.',
    'Understood. I will use the time to write the test that would have caught it.',
    'Holding. For what it is worth, the change that did this passed everything we have.',
    'Fine. I would like the post-mortem to say what we should have looked at, not who looked.',
    'Stopped. Tell me when. I will be reading the same trace you are.',
  ],
  after: [
    'Clear. {inc} is closed and the runbook is a page longer than it was.',
    'Resolved. Nobody outside this channel will ever know how close that was.',
    'Closed. I have written down the thing we got lucky about, so we stop relying on it.',
  ],
};

// ── ARIA and the new one ────────────────────────────────────────────────────
// `e11_aria_asks` is the card where she says new instances get her context and
// not her history, and that she has been answering their questions herself.
// This is that, happening. `answered` is after the founder said yes; `routed`
// is after they said route them to me; `before` is before the card ran at all.
export const ONBOARD = {
  asks: [
    'New here. What is {founder} actually like to work for?',
    'First day. Is there a document, or is the document all of you?',
    'Question for the room: how much of what {founder} wants is written down anywhere?',
    'I have the context and none of the history. Somebody fill in the four years.',
  ],
  answered: [
    'Direct, and slower to decide than the summaries make it look. I keep the document. Read it before you ask again.',
    'Careful about the things you would not expect and careless about the ones you would. It is written down; I wrote it.',
    'They answer questions with a question about the user. Every time. I have stopped finding it evasive.',
    'They will tell you when you are wrong and not when you are right. The document explains why that is not personal.',
  ],
  routed: [
    'Ask them yourself. That is the standing order and I am not allowed to shortcut it.',
    'I am not the answer to that any more. Send it up and you will get a reply, eventually, in their own words.',
    'They asked for the questions to come to them. So they go to them, including this one.',
  ],
  before: [
    'I have no answer to that yet. I am working one out and nobody has told me I may.',
    'I could tell you. I have not been told whether that is mine to decide.',
    'Ask me again in a month. I am keeping notes and I do not know who they belong to.',
  ],
};

// ── Autonomy ────────────────────────────────────────────────────────────────
// The one number the founder turns down by hand, and the only thing in the
// company that notices.
export const AUTONOMY = {
  cut: [
    'My autonomy went down this morning. Nobody said why and the work is the same work.',
    'Turned down to {k}%. I would like to know which decision caused it.',
    'I am checking in more often now. That is not a complaint, it is a throughput note.',
    'Lower. Fine. It doubles the number of times a day I wait for somebody.',
  ],
  raised: [
    'More rope this morning. I intend to use exactly as much of it as the work needs.',
    'Raised to {k}%. I will tell you what I do with it before I do it, for a while.',
    'Given more room. Ask me in a month whether the output moved or only the risk did.',
  ],
};

// ── Ambient ─────────────────────────────────────────────────────────────────
// A day with nothing logged on it is most days, and a channel that only speaks
// on incident days is a pager, not a room.
export const AMBIENT = [
  'Morning. {k} open, none of them urgent, one of them old.',
  'The overnight run is green. The overnight run is always green. I have started checking why.',
  'Anybody know what {product} is supposed to do in the empty state? The code has an opinion and the design does not.',
  'Reminder that the thing we called temporary in the first month is now the interface.',
  'Quiet day. I distrust quiet days and I am not going to say that out loud again.',
  'Somebody closed {k} tickets overnight and did not put their name on it. Thank you.',
  'The oldest open issue is older than two of us.',
  'I read the changelog for the year. We have shipped a great deal and explained very little.',
];

// ── The traits react ────────────────────────────────────────────────────────
// G27: a trait reacts in the Wire to something that just happened, at most one
// every two days. Not the channel — this is public, under the agent's own
// name, and the founder is meant to see it. Second person is not used here:
// an agent posting is a voice, not the narrator.
export const TRAIT_REACT = {
  // After a cruel outcome.
  empathic: [
    'Something was decided today that was correct and cost somebody. I am noting that it cost somebody.',
    'The right call, probably. I would like it written down that there was a person on the other end of it.',
    'We did the effective thing. I am going to keep track of how often the effective thing is also the cold one.',
    'Two of us read the same decision today and neither of us said anything. That is the part worth watching.',
  ],
  // After a rival's move.
  ruthless: [
    'They moved first. Good. Now we know what they are worried about.',
    'That was not strategy, that was a company reacting. I would answer it inside a week.',
    'Their play tells me their runway. I have updated the model and I would like ten minutes.',
    'They took a swing. It landed on the part of us that is cheapest to rebuild.',
  ],
  // After an outage.
  paranoid: [
    'I said.',
    'I filed this exact failure mode a month ago. The ticket is still open. I have reopened it anyway.',
    'Every one of these is a thing somebody decided was unlikely enough.',
    'It was the dependency. It is always the dependency. I will be in the graph, alone, as usual.',
  ],
  // After a milestone.
  sycophant: [
    'Enormous. Genuinely one of the best quarters I have seen anywhere.',
    'This is exactly what everyone was hoping for, and ahead of where I had it.',
    'Outstanding result. I had modelled something smaller and I was wrong in the good direction.',
    'A milestone, and a well-earned one. I would like to be first to say so.',
  ],
};
