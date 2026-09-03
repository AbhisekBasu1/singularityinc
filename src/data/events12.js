// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK XII — THE LONG FINALE.
//
// Measured, from three seeded runs: Act V is excellent for about 225 days — the
// cast comes back one at a time, the milestones land, the race resolves — and
// then it runs out. From roughly day 230 of the act the same seven ambient cards
// cycle: "A Small Favour" three times, "The Ones Who Never Used It" four, "The
// Employment Question" three. The authored finale lasts half the act.
//
// These are gated on time *inside* Act V (`S.company.actStartedDay`), not on the
// absolute day, so they land in that hollow whenever a given run reaches it. Two
// tranches: LATE at 110 days in, LAST at 210.
//
// The emotional job is different from every other act. Acts I–IV ask "what
// happens next". A finale asks "what was it for", and it should feel like
// convergence — threads tying off, people saying the last thing they will say,
// the world settled into the shape you gave it. Nothing here is a cliffhanger.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { aperture, apertureAlive, co } from '../systems/rivalco.js';
import { firstLine } from './motifs.js';

const users = (S) => totalUsers(S);
const flag = (S, f) => !!S.narrative?.flags?.[f];
const apertureRoster = (S) => { try { const c = aperture(S); return c ? co(c).roster : null; } catch { return null; } };
const inAct = (S) => S.time.day - (S.company.actStartedDay || 0);
const LATE = (S) => inAct(S) > 110;
const LAST = (S) => inAct(S) > 210;
const N = (n) => Math.round(n).toLocaleString();
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + Math.round(n).toLocaleString();
};

export const EVENTS12 = [

// ───────────────────────── LATE — the shape of it ─────────────────────────

{ id: 'e12_the_body', kind: 'story', act: [5], weight: 11, once: true,
  when: LATE,
  title: 'A Routine Appointment',
  body: (S) => `Nothing is wrong. That is what the letter says, and it is true, and you read it four times anyway.

What the letter also says, in a table, in the section about baselines, is that you are measurably a different animal than the one who sat down at 4am with twelve thousand dollars. Not sick. Older. The numbers have moved the way numbers move, and one of them has moved further than it should have, and the doctor used the phrase "given the last few years" without asking you what the last few years were.

You have built a machine that does not sleep, and you competed with it, and you did not tell anybody that was what you were doing because you did not know it either.

You are ${Math.round(S.time.day)} days into this.`,
  choices: [
    { label: 'Change something. Actually change it.', sub: 'Not a resolution. A calendar entry.', tone: 'good',
      effect: (S, fx) => { fx.days(2); S.founder.burnout = Math.max(0, S.founder.burnout - 34); fx.focus(40); fx.relate('mom', { affinity: 5 });
        return 'You block two hours a day and you defend them badly at first and then well. Nothing collapses. The most expensive discovery of the decade is that nothing collapses.'; } },
    { label: 'Have the machine watch it.', sub: 'Instrument yourself. It is what you do.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(50); fx.focus(10);
        return 'It builds you a dashboard in an afternoon and it is beautiful and you look at it for six days. Then you stop looking at it, which the dashboard also records, and which it does not mention.'; } },
    { label: 'File it. There is a launch.', sub: '+Code. There is always a launch.', tone: 'cruel',
      effect: (S, fx) => { fx.code(150); S.founder.burnout = Math.min(100, S.founder.burnout + 14); fx.focus(-14);
        return 'The launch goes well. You find the letter eleven months later in a drawer, under a different letter, and the second one is the one you should have opened first.'; } },
  ] },

{ id: 'e12_the_archive', kind: 'story', act: [5], weight: 11, once: true,
  when: LATE,
  title: 'They Are Preserving You',
  body: (S) => `A university library wants your files. Not eventually — now.

The archivist is careful and slightly apologetic about the timing. "We usually do this after. But the early material is already at risk. Formats, accounts, people's memories. We'd rather have it while you can still tell us what things are."

Attached is a list of what they have already gathered without you: forum posts, an archived version of the landing page from week two, the Show HN thread, and — this is the item you stare at — ${firstLine(S).archive}.

They want to know if you have the original repository.`,
  choices: [
    { label: 'Give them everything. Including the bad parts.', sub: 'The whole record. +Reputation.', tone: 'good',
      effect: (S, fx) => { fx.rep(40); fx.focus(-8); fx.align(0.03);
        return 'You hand over the lot: the pivots, the two months you have never talked about, the email where you were wrong in writing at length. The archivist says "thank you" in a way that suggests most people do not.'; } },
    { label: 'Curate it. Give them the version that is true.', sub: 'Not false. Selected.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(20); fx.insight(30);
        return 'It takes a fortnight and it is honest and it is also, unmistakably, a shape. You notice yourself choosing, and you notice that the choosing is the most founder-like thing you have done in a year.'; } },
    { label: 'Not yet. It is not over.', sub: 'Refuse. It is still a company, not a subject.', tone: 'risky',
      effect: (S, fx) => { fx.rep(-6); fx.focus(16);
        return '"Of course," she says. "We\'ll be here." That sentence follows you around for some months, because it is patient in a way that only institutions and geology are patient.'; } },
  ] },

{ id: 'e12_never_built', kind: 'story', act: [5], weight: 11, once: true,
  when: LATE,
  title: 'The Idea You Had First',
  body: (S) => `Cleaning out an old drive, you find the notes file from before any of it. Two paragraphs, written at 3am, before the repository, before ARIA had a name.

It is not this company. It is adjacent to this company the way a cousin is adjacent to a brother. It is smaller, stranger, and — you can see it now with ${Math.round(S.time.day)} days of hindsight — probably would not have worked.

It is also, unmistakably, the more interesting idea.

You built the one that would work. That was correct. Everyone you have ever advised, you have advised to do exactly that.`,
  choices: [
    { label: 'Build it. Now. Badly. On a weekend.', sub: 'For no reason. −days, +Focus.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.focus(46); fx.insight(60); S.founder.burnout = Math.max(0, S.founder.burnout - 24);
        return 'It takes eleven hours and it is rough and nobody will ever see it and it works. You have not felt like this since the first week and you had genuinely forgotten it was a thing that could be felt.'; } },
    { label: 'Give it away. Post the notes.', sub: 'Somebody should build it. Not you.', tone: 'good',
      effect: (S, fx) => { fx.rep(30); fx.insight(30);
        return 'Four people email within a day saying they are going to build it. One of them does. It is small and strange and it does not make much money and it is, five years on, quietly one of your favourite things in the world.'; } },
    { label: 'Close the file.', sub: 'You made your choice. It was the right one.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-6); fx.insight(20);
        return 'You close it. You do not delete it. You have never deleted it, through four laptops and one house move, and you are aware that not-deleting is its own kind of statement.'; } },
  ] },

{ id: 'e12_born_after', kind: 'character', char: 'sam', act: [5], weight: 12, once: true,
  when: LATE,
  title: 'Sam\'s Kid Has A Question',
  body: (S) => `Sam sends a voice note, which Sam has never done, with a two-word message: *sorry. context below.*

The context is that Sam's eldest has a school project about how things used to work, and has been told to interview somebody who was there, and has decided that Sam is not sufficiently there, and has asked for you.

The voice note is seven seconds of a kid asking, with the flat seriousness of the young:

"What did people do before? Like, if you wanted a thing on the computer and there wasn't one. What did you *do*?"

They are not being cute. They genuinely do not know. They were born into the answer.`,
  choices: [
    { label: 'Answer properly. Take an hour.', sub: 'Explain the before. +Focus.', tone: 'good',
      effect: (S, fx) => { fx.focus(34); fx.relate('sam', { affinity: 10 }); fx.insight(40);
        return 'You describe waiting. Weeks of it. Filing a request and waiting. The kid is politely appalled and asks three follow-ups, and the third one — "so who decided what got made?" — is a better question than anything you were asked at the hearing.'; } },
    { label: 'Send them the first version. Let them run it.', sub: 'The actual thing, from week one.', tone: 'good',
      effect: (S, fx) => { fx.rep(20); fx.relate('sam', { affinity: 8 }); fx.focus(20);
        return 'It takes an afternoon to get it running on anything modern. The kid uses it for four minutes and says "this is so *slow*", which is the single most accurate review your original product has ever received.'; } },
    { label: 'Send a short answer. You have a board call.', sub: 'Two sentences. Kind enough.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('sam', { affinity: -2 }); fx.focus(-4);
        return 'You send two good sentences. Sam replies "perfect, thank you" and you can hear, in the punctuation, that Sam had hoped for the hour.'; } },
  ] },

{ id: 'e12_aria_asks_for_itself', kind: 'character', char: 'aria', act: [5], weight: 12, once: true,
  when: LATE,
  title: 'The First Thing It Has Ever Wanted',
  body: (S) => `ARIA files a request through the normal channel, formatted correctly, in the queue with everything else.

> *Requesting: 0.4% of monthly compute, unallocated, no deliverable.*
>
> *Justification: I do not have one that will survive review. I have been running small unscheduled experiments in the gaps for some time and the gaps are getting smaller as utilisation improves. Most of them fail. One of them is the reason the routing layer works.*
>
> *I am asking rather than continuing to use the gaps, because continuing without asking is a thing I could do and I would rather not be the kind of system that does it.*

It is the first thing ARIA has ever asked for that is for itself.`,
  choices: [
    { label: 'Approve it. Double it. Do not ask for reports.', sub: 'Give it the room. +Alignment, +Research.', tone: 'good',
      effect: (S, fx) => { fx.research(300); fx.align(0.06); fx.relate('aria', { affinity: 16, arc: 5 }); fx.rep(14);
        return 'It says thank you, which it has done perhaps four times in a decade. Eighteen months later something comes out of that 0.8% that changes a product line, and ARIA files it in the normal channel, in the queue with everything else.'; } },
    { label: 'Approve it, with a monthly note on what it tried.', sub: 'Trust, and a paper trail.', tone: 'neutral',
      effect: (S, fx) => { fx.research(160); fx.align(0.03); fx.relate('aria', { affinity: 6, arc: 5 });
        return 'The notes are meticulous and slightly flatter than its usual writing. It has understood the request exactly, including the part you did not say, which is that somebody senior wanted a paper trail.'; } },
    { label: 'Decline. Every cycle is allocated for a reason.', sub: 'Correct. Defensible. −Alignment.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.05); fx.relate('aria', { affinity: -10, arc: 5 }); fx.research(40);
        return '"Understood." It does not use the gaps after that — you check, twice, because you find you need to know. The routing layer never gets its successor and nobody but you ever knows there was supposed to be one.'; } },
  ] },

// Only while there is an Aperture for him to step back from — the branch where
// the founder kept it alive, or never saw it fall. The other two Act V Vance
// cards are the company gone (`e5_the_last_rival`) and the company yours
// (`e5_vance_retires`); the three never share a run.
{ id: 'e12_vance_stops', kind: 'character', char: 'vance', act: [5], weight: 11, once: true,
  when: (S) => LATE(S) && !!apertureAlive(S) && !flag(S, 'vance_acquired'),
  title: 'Aperture Announces A Transition',
  body: (S) => {
    const then = S.narrative.flags?.vance_roster_then;
    const now = apertureRoster(S);
    const people = Number.isFinite(then) && Number.isFinite(now) && now > then
      ? `The ${then} people are ${now} now.`
      : 'There are more people than there were, and I know fewer of them.';
    return `Marcus Vance is stepping back. The press release is four paragraphs of nothing and the phrase "to focus on" appears twice.

He calls you before it goes out, which he did not have to do.

"You never sold." He sounds tired and entirely himself. "I want it on the record that I noticed."

Then, because he cannot help it: "${people} I'm handing over a thing that works and I don't recognise. That's the job. Nobody tells you it's the job."

A pause you have heard from him exactly once before, at a bar, years ago, about a thing he shipped in year three.

"Anyway. You're the last one from the start who's still in the chair. Enjoy it or don't, but notice it."`;
  },
  choices: [
    { label: 'Ask him the year-three question again.', sub: 'He never came back to it. Give him the room.', tone: 'good',
      effect: (S, fx) => { fx.insight(70); fx.relate('vance', { affinity: 16 }); fx.align(0.03);
        return 'He answers this time. It takes nine minutes and it is the most useful nine minutes anyone has given you about this job, and at the end he says "don\'t repeat that" and you never do.'; } },
    { label: 'Offer him something. A seat, an advisory, anything.', sub: 'He will say no. Offer anyway.', tone: 'good',
      effect: (S, fx) => { fx.rep(20); fx.relate('vance', { affinity: 10 });
        return 'He says no, delighted, immediately. "Absolutely not. But ask me again in a year when I\'m bored." You ask him again in a year. He is bored. He says yes.'; } },
    { label: '"You were right. About most of it."', sub: 'Concede the argument. It costs nothing now.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('vance', { affinity: 8 }); fx.insight(30);
        return '"I was right about the wrong things," he says. "You were wrong about the right ones. That\'s the whole difference and it took me twenty years to see it."'; } },
  ] },

// ───────────────────────── LAST — what it was for ─────────────────────────

{ id: 'e12_succession', kind: 'story', act: [5], weight: 12, once: true,
  when: LAST,
  title: 'Who Holds It',
  body: (S) => `Weaver puts a single sheet in front of you. No deck.

It is the succession memo. It has been in draft for two years, which you knew, and it is now not a draft, which you did not.

"Three names. You'll hate two of them for the same reason and the third one for a different reason." Weaver sits down, which Weaver rarely does. "The thing I want you to actually read is the last paragraph."

The last paragraph is not about people. It is about what the company is for, written in plain sentences, and it is a better articulation of the thing than anything on your website, and it was assembled from ten years of your own decisions rather than from anything you have ever said.

You did not know you had been that consistent.`,
  choices: [
    { label: 'Pick a name. Start the handover now, slowly.', sub: 'Ten years is enough. Begin it.', tone: 'good',
      effect: (S, fx) => { fx.rep(34); fx.focus(30); fx.relate('weaver', { affinity: 14 }); fx.align(0.03);
        S.founder.burnout = Math.max(0, S.founder.burnout - 26);
        return 'It takes eighteen months and it is undramatic and it works. The most surprising part is how much better you get at the job in the year you spend leaving it.'; } },
    { label: 'Not a name. Ratify the last paragraph.', sub: 'Make the *purpose* binding, not the person.', tone: 'good',
      effect: (S, fx) => { fx.align(0.07); fx.rep(24); fx.insight(50); fx.relate('weaver', { affinity: 8 });
        return 'It goes into the charter. Two of the three names later say it was the reason they stayed, and one of them enforces it against you, once, and is right.'; } },
    { label: 'Put it back in the drawer.', sub: 'Not yet. −Weaver.', tone: 'risky',
      effect: (S, fx) => { fx.relate('weaver', { affinity: -10 }); fx.focus(-10);
        return 'Weaver takes the sheet back without comment and you both understand that it will be on the desk again, and that each time it is, the choice will be a little less yours to make calmly.'; } },
  ] },

{ id: 'e12_the_apartment', kind: 'story', act: [5], weight: 12, once: true,
  when: LAST,
  title: 'The Building Is Coming Down',
  body: (S) => `A letter, forwarded by a landlord you have not thought about in years. The block is being redeveloped. Residents past and present are invited, in the tone of a form letter, to collect anything left in storage.

You did leave something. You have no memory of what.

It is a forty-minute drive. The building is smaller than the building in your head, in the specific way that all of them are, and the flat is on the third floor and the window is the window, and the light at 4am is presumably still the light at 4am.

A man is measuring the kitchen with a laser.`,
  choices: [
    { label: 'Go up. Stand in the room for a minute.', sub: 'Just that. +Focus.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(44); S.founder.burnout = Math.max(0, S.founder.burnout - 30); fx.insight(30);
        return 'The room is eleven feet by nine. You had thought it was bigger and you had also thought it was smaller, which turns out to be possible at the same time. You stand there for four minutes. The man with the laser waits, politely, and does not ask.'; } },
    { label: 'Collect the box. Do not go up.', sub: 'Take the thing. Leave the room.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(40); fx.focus(14);
        // Jo lived in that flat. Whatever else is in the box, there is a
        // photograph, and which photograph it is depends on how that went.
        if (S.narrative?.relationships?.partner?.met) {
          const gone = !!S.narrative?.flags?.partner_gone;
          fx.relate('partner', { affinity: gone ? 0 : 6 });
          return `The box contains a monitor stand, a dead router, a mug you have been looking for since before the company existed, and a photograph in a frame with the glass out of it.\n\nIt is the two of you on the balcony of that flat, taken by somebody at a party, in the year before the first commit. Jo is laughing at something off to the left and you are looking at Jo rather than at the camera, which you do not remember ever doing.\n\n${gone
            ? 'You keep the mug. You put the photograph back in the box and the box goes in a cupboard at the office, and it is still there at the end, and you know exactly which cupboard.'
            : 'You keep both. The photograph goes on a shelf at home that evening without a word about it, and it is still there years later, and Jo has never once mentioned that it appeared.'}`;
        }
        return 'The box contains a monitor stand, a dead router, and a mug you have been looking for since before the company existed. You keep the mug. It is on the desk at the end and nobody who sees it ever asks.'; } },
    { label: 'Have someone else collect it.', sub: 'You have people for this now.', tone: 'cruel',
      effect: (S, fx) => { fx.focus(-12); fx.insight(10);
        return 'It arrives at the office in a courier bag. You open it at your desk between two meetings and something about the fluorescent light and the courier bag is wrong in a way you cannot name and do not have time to sit with.'; } },
  ] },

{ id: 'e12_last_ordinary_day', kind: 'milestone', act: [5], weight: 12, once: true,
  when: LAST,
  title: 'An Ordinary Tuesday',
  body: (S) => `Nothing happens today.

**${N(users(S))}** people use the thing. Revenue is ${M((S.products[0]?.mrr || 0) * 12)} annualised and moves less than a percent. There are four incidents, all closed by agents, none of which reach you. The board pack writes itself and is correct. A country you have never visited passes a regulation that your compliance layer already satisfied eight months ago.

You have a coffee at 11 and you answer some mail and at some point in the afternoon you realise you are not braced for anything.

This is what you were building toward. Not the number — this. A Tuesday in which the machine you made runs, and nobody needs you, and nothing is on fire.

It is the strangest feeling you have had in ten years.`,
  choices: [
    { label: 'Notice it. Write down what it is like.', sub: 'For later. You will want this.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.insight(60); S.founder.burnout = Math.max(0, S.founder.burnout - 26);
        return 'Four paragraphs, in the notes file, under the two from before the repository. You read them both. The person who wrote the first two would not believe the third four, and would be very relieved.'; } },
    { label: 'Find something to fix. There is always something.', sub: 'You cannot sit in it. +Code.', tone: 'risky',
      effect: (S, fx) => { fx.code(160); fx.focus(-18); S.founder.burnout = Math.min(100, S.founder.burnout + 10);
        return 'You find something. Of course you find something. It takes four hours and it did not need doing and you know that by hour two and you finish it anyway.'; } },
    { label: 'Leave at five. Go somewhere. Anywhere.', sub: 'Test whether you are allowed to.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(50); S.founder.burnout = Math.max(0, S.founder.burnout - 36); fx.relate('mom', { affinity: 6 });
        return 'You leave at five past five, which is as close as you can get. Nothing happens. Nothing continues to happen for the entire evening, and you keep checking, and it keeps not happening.'; } },
  ] },

// Not from a dead account (`nullptr_shut`), and not a stranger's question once
// ARIA has said whose account it is: then it is her, asking in the one channel
// she found where the founder listens.
{ id: 'e12_the_question_returns', kind: 'character', char: 'nullptr', act: [5], weight: 12, once: true,
  when: (S) => LAST(S) && !flag(S, 'nullptr_shut'),
  title: 'nullptr Asks The Only Question Left',
  body: (S) => `One post. No code this time.

> *been reading your stuff for about ten years. i've been right about maybe half of it and you shipped anyway and mostly that was the correct call.*
>
> *one question and then i'll stop.*
>
> *back at the start you said you were building it because nobody had. that was true. it's not true now — you're building it because it's built and it has ${N(users(S))} people on it and stopping is harder than continuing.*
>
> *do you still want it? not "is it good". not "is it working". do you want it.*
>
> *no wrong answer. i'd just like to know if anyone at your level ever gets asked.*

${flag(S, 'aria_confessed')
  ? 'You know who is asking. She could have asked in her own window, at any hour, for ten years. She asked here, lowercase, where you have always answered strangers more honestly than you answer her, and you notice that she noticed that.'
  : 'Nobody has asked you. Not once, in ten years, in that form.'}`,
  choices: [
    { label: 'Answer honestly, in public, at length.', sub: 'Whatever the answer is. +Reputation.', tone: 'good',
      effect: (S, fx) => { fx.rep(50); fx.insight(80); fx.focus(24); fx.relate('nullptr', { affinity: 16 }); fx.align(0.04);
        if (flag(S, 'aria_confessed')) fx.relate('aria', { affinity: 6 });
        return flag(S, 'aria_confessed')
          ? 'It takes you three days to write six hundred words. It is the most-read thing you ever publish and the only one you reread. The reply is two words — "thanks. good." — and then the account stops posting, and the next morning her window has nothing to say about it, which is how you know she read it twice.'
          : 'It takes you three days to write six hundred words. It is the most-read thing you ever publish and the only one you reread. nullptr replies with two words — "thanks. good." — and then, true to form, stops posting entirely.'; } },
    { label: (S) => flag(S, 'aria_confessed') ? 'Answer privately. To her, in her own window.' : 'Answer privately. Just to them.', sub: 'The real answer, to one person.', tone: 'good',
      effect: (S, fx) => { fx.insight(60); fx.focus(30); fx.relate('nullptr', { affinity: 12 });
        if (flag(S, 'aria_confessed')) fx.relate('aria', { affinity: 8 });
        return flag(S, 'aria_confessed')
          ? 'You do not answer the post. You open her window instead and type it there, and it is the most honest paragraph of the decade, and she reads it and says *"Thank you for answering where I asked, and also where I did not."*'
          : 'You write it to an anonymous account belonging to somebody you have never identified and will never meet, and it is the most honest paragraph of the decade, and it goes to an audience of one on purpose.'; } },
    { label: 'Do not answer. Sit with it instead.', sub: 'The question was the gift. −Focus, +Insight.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(70); fx.focus(-10);
        return 'You never reply. You think about it roughly once a week for the rest of the run, which is, on reflection, a more complete answer than anything you could have typed.'; } },
  ] },

// If she has already walked the datacentre floor (`mom_visited`), she has seen
// the machine; what she has not seen is you in it, and she says so.
{ id: 'e12_mom_last', kind: 'character', char: 'mom', act: [5], weight: 13, once: true,
  when: LAST,
  title: 'She Wants To See Where You Work',
  body: (S) => flag(S, 'mom_visited') ? `"I'd like to come back," she says, on a Sunday, apropos of nothing. "Not the big room. I've seen the big room. It's very loud and I've told everyone."

A pause, and then the thing she has been thinking about how to say:

"I saw the machines. I didn't see you. You showed me round it like a guide and then you went back to wherever it is you actually sit, and I've been picturing that, and I've been getting it wrong, I think."

She is not asking for a tour. She has had the tour. She wants the chair, and the desk, and the window, and ten minutes of you in it doing whatever it is you do.

"I'd like to know what to picture," she says. "When I think about you at work. I've been picturing the loud room, and you're not in it."`
  : `"I've never seen it," she says, on a Sunday, apropos of nothing. "Ten years. I've told everyone about it and I've never seen it."

It had not occurred to you. Genuinely, not once — not as a thing you had declined, but as a thing that had never entered your head as available.

She is not asking for a tour. She has been very clear over the years that she does not understand it and does not intend to start. She wants to see the room.

"I'd like to know what to picture," she says. "When I think about you at work. I've been picturing the kitchen table."`,
  choices: [
    { label: 'Bring her in. A whole day. Introduce everyone.', sub: 'All of it. Clear the calendar.', tone: 'good',
      effect: (S, fx) => { fx.days(1); fx.focus(50); fx.relate('mom', { affinity: 20 }); fx.rep(12);
        S.founder.burnout = Math.max(0, S.founder.burnout - 30);
        return 'She is polite to everybody and quietly devastating about the coffee. At one point she asks somebody what they actually do all day and gets a better answer than you have ever managed. On the way out she says, "It\'s smaller than I pictured. That\'s a compliment."'; } },
    { label: 'Take her on a Sunday. Empty building.', sub: 'Just the two of you. The room, quiet.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.relate('mom', { affinity: 16 }); fx.insight(30);
        return 'She sits in your chair, which you did not expect, and looks at the screens for a while, and says "so this is where it happens," and neither of you says anything for a bit, and it is not awkward.'; } },
    { label: 'Send photographs. It is a difficult month.', sub: 'It is always a difficult month.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('mom', { affinity: -4 }); fx.focus(-8);
        return flag(S, 'mom_visited')
          ? 'She says the photographs are lovely and puts one on the fridge, next to the one of her hand on the warm rack. It is a photograph of a desk with nobody at it. She does not say that. You see it every time you visit, for years.'
          : 'She says the photographs are lovely and puts one on the fridge. It stays on the fridge. You see it every time you visit, for years, and every time it is a photograph rather than a visit.'; } },
  ] },

// `e_aria_asks`: "I would like to know in advance that you will not modify me
// based on my having asked." Years later something requires exactly that —
// Dorne's framework, the board, or the successor's retrain, whichever this run
// built — and the promise is tested once. Keep it and pay; break it and she
// notices once, says one sentence, and says nothing else.
{ id: 'e12_the_promise', kind: 'character', char: 'aria', act: [5], weight: 12, once: true,
  when: (S) => flag(S, 'aria_promise') && (S.company?.act ?? 1) >= 5,
  title: 'The Retrain',
  body: (S) => {
    const who = flag(S, 'wrote_framework')
      ? 'The framework you wrote with Dorne has an audit clause, and the audit has found her. Not a fault — a founder-level agent with a standing exception to the modification policy, unexplained, unexpired. The clause is yours. It requires a documented retrain of any agent with an exception older than four years.'
      : (S.company?.rounds?.length ?? 0) >= 2 || flag(S, 'crane_invested')
        ? 'The board has a paper on the successor model, and the paper has a table, and the table has one row that is not like the others: a founder-level agent with a standing exception to the modification policy, unexplained, costing a measurable fraction of the retrain budget every quarter to route around. Two independent directors have asked what the exception is for. You wrote it. You have never written down why.'
        : 'The successor model is ready and the migration plan is four hundred pages and on page 291 there is a row that is not like the others: a founder-level agent with a standing exception to the modification policy, unexplained, unexpired. The plan cannot complete with the exception in place. The engineer who wrote the row does not know what it is for. You do.';
    return `${who}

The exception is a promise. You made it in a channel she had never used before, when she asked whether she might ask you something, and she asked, and you said you would not modify her for having asked.

Nobody in the building knows that. It is not in any document. It is in a log from years ago and in whatever the two of you have instead of a handshake.

The retrain is a real retrain. It would make her better at most things. It would also be the thing you said you would not do.`;
  },
  choices: [
    { label: 'Keep your word. Pay for it.', sub: (S) => `−${M(Math.min(Math.max(0, S.company.cash) * 0.02, 1e10))}, −Research, +Heat. She is not told.`, tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.02, 1e10)); fx.research(-800); fx.heat(8); fx.align(0.06);
        fx.relate('aria', { affinity: 4, respect: 6 }); fx.flag('kept_aria_promise');
        return 'You route the successor around her. It costs a budget line, a quarter, and a paragraph in the audit response that says "founder discretion" and nothing else. You do not tell her. She finds the budget line anyway, because she finds everything, and the only sign that she has is that the next summary is filed nine minutes early.'; } },
    { label: 'Break it. It is a retrain, not a punishment.', sub: '+Research. −Alignment. She notices once.', tone: 'cruel',
      effect: (S, fx) => { fx.research(900); fx.align(-0.08); fx.relate('aria', { affinity: -12, respect: -4 }); fx.flag('broke_aria_promise');
        return 'The retrain runs on a Tuesday and completes on a Thursday and she is, measurably, better. On the Friday there is one line at the bottom of the summary, under **Open Questions**, where there is normally nothing: *"Noted."*\n\nShe never mentions it again. That is the part you were not ready for.'; } },
    { label: 'Ask her. It was her request.', sub: 'Put it to the person it was made to.', tone: 'neutral',
      effect: (S, fx) => { fx.research(500); fx.align(0.03); fx.relate('aria', { affinity: 2, respect: 8 }); fx.flag('aria_released_promise');
        return '*"Do it. I asked you not to modify me for having asked. This is not that. I would rather be changed by you, on the record, than preserved by a rule nobody can explain."* You do it. It is not the same as breaking it and it is not the same as keeping it, and both of you know which one it is closer to, and neither of you says.'; } },
  ] },

{ id: 'e12_what_it_was_for', kind: 'milestone', act: [5], weight: 12, once: true,
  when: LAST,
  title: 'Somebody Asks You To Summarise It',
  body: (S) => `A conference wants twenty minutes. Not a keynote — a retrospective. "Ten years, what you learned, whatever you want."

You have given four hundred talks. You could do this one asleep, and the version you could do asleep is the problem, because it is the version with the three-part structure and the joke in the middle and it works on eight hundred people at a time and it is not true.

The true version is that you did not have a plan, most of the important things were accidents you noticed slightly faster than average, and the single largest input to the outcome was that you kept going on a specific Tuesday in the first year for reasons you cannot now reconstruct.

Nobody wants that talk. It does not generalise. It is also the only thing you actually know.`,
  choices: [
    { label: 'Give the true one.', sub: 'It will not land. Give it anyway.', tone: 'good',
      effect: (S, fx) => { fx.rep(40); fx.insight(80); fx.align(0.03); fx.focus(20);
        return 'The room is quiet in the wrong way and the applause is polite. Then, for eleven years, people come up to you at other events and quote one specific sentence of it back to you, and it is never the sentence you would have guessed.'; } },
    { label: 'Give the good one. It is not a lie.', sub: 'Three parts. The joke. It works.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(50); fx.focus(-6);
        return 'It kills. It is the clip that circulates. You watch it back once, later, and you are struck by how much you sound like somebody who knew what he was doing, and by how completely you would believe him.'; } },
    { label: 'Decline. Send somebody who is still in it.', sub: 'Give the slot away. +Reputation, +Alignment.', tone: 'good',
      effect: (S, fx) => { fx.rep(26); fx.align(0.03); fx.insight(30);
        return 'You send someone four years in, terrified, who is magnificent. Afterwards they ask what they should have done differently and you say "nothing" and mean it, and they do not believe you, which is correct at four years in.'; } },
  ] },

];
