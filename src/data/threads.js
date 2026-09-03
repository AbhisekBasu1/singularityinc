// ─────────────────────────────────────────────────────────────────────────────
// LIVE THREADS — one-click micro-decisions that appear inside the feed.
// Small stakes, high frequency: they turn the feed from wallpaper into a
// surface you play, and they fill the gaps between focus-expensive actions.
//
// text/author are filled by the feed's token system. `opts` effects are tiny.
// `text` may be a function of S where the thread has to name something that
// just happened — see the incident family at the bottom of this file.
//
// Every thread is asked once a run, and every reply label is unique across
// every ask in the game — the Wire's threads and the letters that ask —
// because two open items offering the same word are one decision printed
// twice. `tools/lint.mjs` enforces both. A thread that has to come back is
// written as `stages[]`, one per showing, each with its own text and replies;
// `until` is the last act it still makes sense in; `kind` and `tone` may be
// set per stage. `threads2.js` is the second half of the pool.
// ─────────────────────────────────────────────────────────────────────────────
// Deliberately the leaf and not `signals.js`: this file is imported by
// `feed.js`, and `signals.js` reaches `rivalco.js`, which imports `feed.js`.
import { incidentVerb } from './incidentverbs.js';
import { INCIDENTS as INCIDENTS_B } from './balance.js';
import { THREADS2 } from './threads2.js';

const incidentRecently = (S, d) => Math.floor(S.time.day) - (S.stats?.lastIncidentDay ?? -999) <= d;

export const THREADS = [
  { id: 't_complaint', kind: 'social', tone: 'bad', min: 200,
    text: '{product} lost my work this morning. no error, no warning, just gone.',
    opts: [
      { label: 'Answer in the thread', out: 'You answer in nine minutes with the actual cause and a fix ETA.',
        fx: { rep: 6, focus: -1.4, sentiment: 0.02 } },
      { label: 'DM and refund', out: 'You refund them personally. They post a screenshot of the refund.',
        fx: { cash: -60, rep: 9, sentiment: 0.03 } },
      { label: 'Let support handle it', out: 'It is handled correctly and impersonally.',
        fx: { sentiment: -0.01 } },
    ] },

  { id: 't_praise', kind: 'social', tone: 'good', min: 100, until: 2,
    text: 'genuinely the best {cat} tool I have used. and it is one person?',
    opts: [
      { label: 'Thank them', out: 'You reply with something specific rather than a heart emoji. They notice.',
        fx: { rep: 5, focus: -0.6 } },
      { label: 'Quote it', out: 'You put it on the landing page with their permission.',
        fx: { rep: 9, awareness: 40 } },
      { label: 'Say nothing', out: 'It gets 200 likes on its own.', fx: { rep: 2 } },
    ] },

  { id: 't_feature_ask', kind: 'social', tone: 'neutral', min: 400,
    text: 'been waiting six months for {product} to support the thing everyone asks for',
    opts: [
      { label: 'Say when', out: 'You give a real date. It is further out than they wanted and they respect it.',
        fx: { rep: 5, insight: 3 } },
      { label: 'Ask what they would use it for', out: 'The answer reframes the feature entirely.',
        fx: { insight: 8, focus: -1 } },
      { label: 'Ship a rough version today', out: 'It is ugly and it works and the thread turns around.',
        fx: { code: -14, rep: 7, debt: 5 } },
    ] },

  { id: 't_rival_claim', kind: 'hn', tone: 'neutral', min: 2000,
    text: '{rival} claims they are 3x faster than {product}. benchmarks in comments.',
    opts: [
      { label: 'Publish your own numbers', out: 'Yours are reproducible and theirs are not. That does the work.',
        fx: { rep: 12, focus: -2 } },
      { label: 'Reproduce theirs, publicly', out: 'You run their benchmark honestly and post the result, favourable or not.',
        fx: { rep: 16, insight: 5, focus: -3 } },
      { label: 'Let the benchmark thread die', out: 'The thread dies in a day. Someone screenshots the claim anyway.',
        fx: { rep: -3 } },
    ] },

  { id: 't_agent_ask', kind: 'log', tone: 'neutral', min: 0, needsAgent: true,
    text: 'requesting a decision: two valid approaches, no dominant one. Which shape do you want?',
    opts: [
      { label: 'The simple one', out: 'Fewer moving parts. It will be wrong later in a way that is easy to fix.',
        fx: { code: 8, debt: -3 } },
      { label: 'The general one', out: 'More surface now, less rework in a year. Probably.',
        fx: { code: 4, debt: 4, research: 3 } },
      { label: 'Ask it to pick', out: 'It picks, explains, and logs the reasoning. It picks well.',
        fx: { code: 7, align: -0.004 } },
    ] },

  { id: 't_press_query', kind: 'news', tone: 'neutral', min: 5000, until: 2,
    text: 'A reporter is asking for comment on your headcount for a piece running Thursday.',
    opts: [
      { label: 'Answer honestly', out: '"One." They print it. It becomes the headline.',
        fx: { rep: 14, opinion: 0.004 } },
      { label: 'Decline the piece', out: '"The company declined to comment." Nine words that follow you.',
        fx: { rep: -6 } },
      { label: 'Offer a longer conversation', out: 'The piece is better and later and mostly about the right things.',
        fx: { rep: 10, focus: -3 } },
    ] },

  { id: 't_hiring_dm', kind: 'social', tone: 'neutral', min: 8000, until: 3,
    text: 'any chance you are hiring? I would work on {product} for free honestly',
    opts: [
      { label: 'Explain the model', out: 'You describe a company with no roles. They find it thrilling and unsettling.',
        fx: { rep: 4, insight: 3 } },
      { label: 'Take the free help', out: 'It is a real contribution and you feel slightly bad about the arrangement.',
        fx: { code: 20, rep: -4 } },
      { label: 'Pay them for a day', out: `−$400 for eight hours of genuinely useful work and a good story.`,
        fx: { cash: -400, code: 26, rep: 5 } },
    ] },

  { id: 't_outage_thread', kind: 'social', tone: 'bad', min: 3000, whenLowRel: true,
    text: 'is {product} down for everyone or just me',
    opts: [
      { label: 'Post the status now', out: 'You confirm before the status page updates. The thread calms instantly.',
        fx: { rep: 8, sentiment: 0.03, focus: -1 } },
      { label: 'Fix first, post after', out: 'Back in twenty minutes with a full timeline. Slightly late, fully honest.',
        fx: { rep: 3, sentiment: 0.01 } },
      { label: 'Let it resolve on its own', out: 'It resolves. The thread stays up. So does the screenshot.',
        fx: { rep: -8, sentiment: -0.02 } },
    ] },

  { id: 't_open_source_ask', kind: 'hn', tone: 'neutral', min: 1000,
    text: 'Ask HN: why is {product} not open source?',
    opts: [
      { label: 'Answer it properly', out: 'You explain the actual economics without being defensive. It is the top comment.',
        fx: { rep: 14, focus: -2 } },
      { label: 'Open one component', out: 'You carve out the useful, non-core piece and release it.',
        fx: { rep: 22, code: -18, awareness: 60 } },
      { label: 'Skip it', out: 'The thread answers itself, badly.', fx: { rep: -2 } },
    ] },

  { id: 't_investor_dm', kind: 'social', tone: 'neutral', min: 20000,
    text: 'love what you are building. free for 15 min this week?',
    opts: [
      { label: 'Take the fifteen minutes', out: 'No money changes hands. Two introductions do.',
        fx: { rep: 6, focus: -2, insight: 4 } },
      { label: 'Ask what they can do that money cannot', out: 'A very good question that ends most of these conversations.',
        fx: { rep: 8, insight: 6 } },
      { label: 'Not raising', out: 'Two words, politely. They respect it and ask again in eight months.',
        fx: { focus: 2 } },
    ] },

  { id: 't_bug_report', kind: 'social', tone: 'neutral', min: 150,
    text: 'found a bug in {product}: repro steps in the thread. took me a while, hope it helps.',
    opts: [
      { label: 'Fix it and credit them', out: 'Their handle is in the changelog. They screenshot the changelog.',
        fx: { rep: 8, debt: -4, focus: -1.4 } },
      { label: 'Fix it quietly', out: 'Fixed in the next release. Nobody knows who found it.',
        fx: { debt: -4 } },
      { label: 'Ask for more detail', out: 'They send a video, a log, and a patch.',
        fx: { insight: 5, code: 10, debt: -3 } },
    ] },

  { id: 't_regulator_note', kind: 'news', tone: 'bad', min: 100000, act: 3,
    text: 'A regulator has published a consultation that names your category explicitly.',
    opts: [
      { label: 'File a real submission', out: 'Twelve pages, technical, useful. Two of your points appear in the final text.',
        fx: { heat: -4, rep: 6, focus: -3 } },
      { label: 'Have legal file boilerplate', out: 'Compliant and forgettable.', fx: { heat: -1 } },
      { label: 'Do not engage', out: 'The final text is written by people who did engage.',
        fx: { heat: 4 } },
    ] },

  { id: 't_agent_note', kind: 'log', tone: 'neutral', min: 0, needsAgent: true,
    text: 'I found an optimisation worth about 9% of compute spend. It makes one code path much harder to read.',
    opts: [
      { label: 'Take the savings', out: 'Nine percent, permanently, and one function nobody will ever want to touch.',
        fx: { cash: 400, debt: 6 } },
      { label: 'Keep it readable', out: 'You pay the nine percent for a codebase you can still reason about.',
        fx: { debt: -4 } },
      { label: 'Take it and document it heavily', out: 'Both, at the cost of an afternoon.',
        fx: { cash: 350, debt: 1, focus: -1.6 } },
    ] },

  { id: 't_copycat_note', kind: 'social', tone: 'bad', min: 4000,
    text: 'someone cloned {product} pixel for pixel and is charging half',
    opts: [
      { label: 'Post the side-by-side', out: 'The internet does the rest, loudly and not entirely fairly.',
        fx: { rep: 8, awareness: 80 } },
      { label: 'Ship something they cannot copy', out: 'You spend the week on the hard part instead of the loud part.',
        fx: { code: -16, rep: 6, insight: 5 } },
      { label: 'Let the clone plateau', out: 'They plateau in four months, as clones do.', fx: { focus: 2 } },
    ] },

  { id: 't_award_nom', kind: 'news', tone: 'good', min: 50000, act: 2,
    text: '{product} has been shortlisted for a category award. They need a 200-word statement.',
    opts: [
      { label: 'Write something true', out: 'You describe the month it nearly ended. It is the only interesting entry.',
        fx: { rep: 12, focus: -1.4 } },
      { label: 'Have an agent write it', out: 'It is polished and generic and takes nine seconds.',
        fx: { rep: 5 } },
      { label: 'Withdraw', out: 'You decline politely. Nobody notices, which is the point.', fx: { focus: 2 } },
    ] },

  { id: 't_user_milestone', kind: 'social', tone: 'good', min: 1000,
    // A year of daily use needs a year: it used to be offered on day 200.
    when: (S) => S.time.day >= 365,
    text: 'day 365 of using {product} every single working day. thank you for making this.',
    opts: [
      { label: 'Send them something real', out: 'A handwritten note and a year of credit. They frame the note.',
        fx: { cash: -200, rep: 12, sentiment: 0.03 } },
      { label: 'Reply under it', out: 'You reply with a detail only a real user would know. The thread notices.',
        fx: { rep: 7, focus: -0.6 } },
      { label: 'Ask what nearly made them stop', out: 'The answer is a feature you shipped in month four and never revisited.',
        fx: { insight: 12, focus: -1 } },
    ] },

  { id: 't_ai_backlash', kind: 'social', tone: 'bad', min: 30000, act: 2,
    text: 'another "AI-native" company with no humans. cool. very cool. love that for us.',
    opts: [
      { label: 'Engage honestly', out: 'You agree with the concern and disagree with the conclusion, in public, at length.',
        fx: { rep: 10, opinion: 0.005, focus: -2 } },
      { label: 'Publish what you pay out', out: 'You disclose exactly where the value goes. It is more persuasive than any argument.',
        fx: { opinion: 0.008, rep: 6 } },
      { label: 'Scroll past it', out: 'It gets four hundred likes.', fx: { opinion: -0.004 } },
    ] },

  // The Refusal's flag, off the die roll: the sovereign question can be
  // answered in public, once, before or instead of the card that asks it in
  // private. `when` is the card's own gate plus "not already answered".
  { id: 't_sovereign_ask', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => (!!S.unlocks?.world_map || S.company.valuation > 5e10)
      && !S.narrative.flags?.sovereign_deal && !S.narrative.flags?.refused_sovereign,
    text: 'A minister has said on television that a partnership with {company} is "under discussion". Reporters want to know whether that is true.',
    opts: [
      { label: 'Say no, in public, with the reasoning', out: 'Four paragraphs on why no state should run on one company. It is read into three parliaments by Friday. The minister does not call again.',
        fx: { opinion: 0.03, heat: -5, rep: 20, focus: -2, flag: 'refused_sovereign' } },
      { label: 'No comment on the minister', out: 'The clip runs for a week. Nobody learns anything, including you.',
        fx: { heat: 2 } },
      { label: 'Say the door is open', out: 'A delegation is on a plane by the weekend. Whatever they bring, you will have to answer it properly.',
        fx: { rep: 8, heat: 3, insight: 4 } },
    ] },

  { id: 't_infra_offer', kind: 'log', tone: 'neutral', min: 10000, act: 2,
    text: 'A provider is offering 40% off a two-year commitment on your current spend.',
    opts: [
      { label: 'Sign it', out: 'Real savings, real lock-in, and a renegotiation you will regret in month nineteen.',
        fx: { cash: 2000, debt: 3 } },
      { label: 'Counter for one year', out: '30% off, half the lock-in. They take it immediately, which tells you something.',
        fx: { cash: 1200 } },
      { label: 'Decline and stay portable', out: 'You pay list price for the freedom to leave in a week.',
        fx: { rep: 2 } },
    ] },

  // ── §A15. The incident asks ────────────────────────────────────────────────
  // An incident used to be a paragraph in the rail and three numbers moving.
  // Above `INCIDENTS.THREAD_SEVERITY` it now asks the one question an incident
  // actually asks, which is what you are going to say about it. `incidents.js`
  // opens this by name through `maybeThread(S, id)` the moment it fires; the
  // pool can also draw it in the days after, which is why the `when` is a
  // window rather than "today". One at a time is enforced by there being one
  // id: `eligibleThreads` refuses a thread that is already open.
  //
  // It is a family, not a card: measured over one seeded run it opened
  // forty-eight times in the same words with the same three replies, because
  // every severe incident asked it by name. Each stage is one incident — the
  // second is "twice now", the third is a customer with timestamps, the fourth
  // is the roster asking to freeze deploys, the fifth is the front page — and
  // after the fifth an outage is a post and the deck's own cards. The `when`
  // reads the day this last opened so one outage cannot spend two stages.
  //
  // The first text is a function because it has to name what happened —
  // `incidentVerb` is the same phrasing the phone and the post use, keyed off
  // the kind `incidents.js` stamps rather than off the incident's title.
  { id: 't_incident_ask', kind: 'social', tone: 'bad', min: 400,
    when: (S) => incidentRecently(S, INCIDENTS_B.THREAD_WINDOW_DAYS)
      && (S.world?.lastIncidentSeverity || 0) >= INCIDENTS_B.THREAD_SEVERITY
      && (S.stats?.lastIncidentDay ?? 0) > (S.wire?.askedDay?.t_incident_ask ?? -1),
    stages: [
      { text: (S) => `so ${S.stats?.lastIncident ? String(S.stats.lastIncident).toLowerCase() : 'something'} at {product} — it ${incidentVerb(S)} and there is still nothing on the status page. are we getting a write-up or not`,
        opts: [
          { label: 'Own it publicly, with the timeline', out: 'You publish the whole thing the same day — what broke, when you knew, what you did, what you are changing. It is read more widely than anything you have ever shipped.',
            fx: { rep: 18, heat: -3, sentiment: -0.02, focus: -3 } },
          { label: 'Point at the vendor', out: 'The statement is accurate. It is also, unmistakably, about somebody else, and the vendor reads it too.',
            fx: { rep: 2, sentiment: 0.01, flag: 'blamed_the_vendor' } },
          { label: 'Fix it quietly and say nothing', out: 'It is fixed by Thursday and the fix is the kind you make when nobody is going to read the diff.',
            fx: { debt: 14, rep: -6, heat: 2 } },
        ] },
      { text: '{product} again. that is twice now by my count and the status page still says operational. at what point does this thing get an actual SLA',
        opts: [
          { label: 'Publish an SLA and stand behind it', out: 'A number, in public, with credits attached to missing it. The next outage costs money as well as face, which is the point.',
            fx: { rep: 10, sentiment: 0.02, cash: -1500, focus: -2 } },
          { label: 'Credit every account it touched', out: 'Nobody asked for it and everybody notices. The credit note is the most shared thing you post this month.',
            fx: { cash: -3000, rep: 8, sentiment: 0.03 } },
          { label: 'Explain that it was a different cause', out: 'It was, and it does not matter: the thread hears two outages and one company.',
            fx: { rep: -2, sentiment: -0.01, focus: -1 } },
        ] },
      { kind: 'news', tone: 'bad',
        text: 'A customer running production on {product} has written up three incidents in one quarter, with timestamps. Their CTO wants a call before the renewal.',
        opts: [
          { label: 'Take the renewal call yourself', out: 'Forty minutes, most of it listening. They renew, and they send you the list they made for the call.',
            fx: { focus: -3, rep: 6, insight: 8, sentiment: 0.02 } },
          { label: 'Send the ops report and the fix', out: 'It is thorough and it is not a call. They renew for a year instead of three.',
            fx: { rep: 2, focus: -1, sentiment: 0.01 } },
          { label: 'Offer them an exit with no penalty', out: 'They stay. A company that offers the door is one you can keep trusting, apparently.',
            fx: { rep: 8, cash: -2000, sentiment: 0.02 } },
        ] },
      { kind: 'log', tone: 'neutral',
        text: 'I have counted. That is the fourth one over the line. I want to freeze deploys for two weeks and rebuild the release path, and I want a yes or a no rather than a later.',
        opts: [
          { label: 'Freeze deploys for a fortnight', out: 'Two weeks of nothing shipping and a release path that has been read by somebody. The fifth one does not come.',
            fx: { code: -20, debt: -14, rep: 2, focus: -1 } },
          { label: 'Ship the fix and keep the cadence', out: 'The fix goes out on Tuesday. So does everything else, on the same path it always took.',
            fx: { code: 6, debt: 6 } },
          { label: 'Put yourself on the on-call rotation', out: 'You take the 3am pages for a month. The release path gets rebuilt anyway, by you, at 3am.',
            fx: { focus: -4, debt: -6, rep: 4, align: 0.003 } },
        ] },
      { kind: 'hn', tone: 'bad',
        text: 'Ask HN: what is going on at {company}? Five incidents and counting, and the status page still says operational.',
        opts: [
          { label: 'Answer with the whole incident history', out: 'Every one, dated, with what changed after each. It is the most honest thing on the front page and it stays there two days.',
            fx: { rep: 14, heat: -2, focus: -3, sentiment: -0.01 } },
          { label: 'Post the reliability roadmap', out: 'Six months of work, in public, with dates. Now you have to do it.',
            fx: { rep: 8, code: -10, insight: 4 } },
          { label: 'Let the thread age out', out: 'It does. The phrase "still says operational" does not.',
            fx: { rep: -8, sentiment: -0.02, opinion: -0.004 } },
        ] },
    ] },

  // The bill for the second door. Not a timer: it sits in the pool and arrives
  // whenever the rail next has room, which is what a vendor's lawyers are like.
  { id: 't_incident_vendor', kind: 'news', tone: 'bad', min: 400,
    when: (S) => !!S.narrative?.flags?.blamed_the_vendor && !S.narrative?.flags?.vendor_answered,
    text: 'Your provider has published a post-mortem of its own. It is polite, it is thorough, and it contains four timestamps from your account.',
    opts: [
      { label: 'Correct the record honestly', out: 'You concede the two of the four that are fair. The thread that follows is boring, which is the outcome you wanted.',
        fx: { rep: 6, focus: -2, flag: 'vendor_answered' } },
      { label: 'Pay the renegotiated rate and move on', out: 'The renewal arrives twelve percent higher with a paragraph about "reputational alignment" in it.',
        fx: { cash: -4000, flag: 'vendor_answered' } },
      { label: 'Say nothing at all', out: 'Their version is the version. It is in the second paragraph of every piece written about your uptime for a year.',
        fx: { rep: -14, sentiment: -0.02, flag: 'vendor_answered' } },
    ] },
];

// The second half of the pool, so a run never has to ask the same thing
// twice. One list, so the draw, the lint and the tests see one deck.
THREADS.push(...THREADS2);

export const THREAD_MAP = Object.fromEntries(THREADS.map((t) => [t.id, t]));
