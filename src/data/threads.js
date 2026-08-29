// ─────────────────────────────────────────────────────────────────────────────
// LIVE THREADS — one-click micro-decisions that appear inside the feed.
// Small stakes, high frequency: they turn the feed from wallpaper into a
// surface you play, and they fill the gaps between focus-expensive actions.
//
// text/author are filled by the feed's token system. `opts` effects are tiny.
// ─────────────────────────────────────────────────────────────────────────────

export const THREADS = [
  { id: 't_complaint', kind: 'social', tone: 'bad', min: 200,
    text: '{product} lost my work this morning. no error, no warning, just gone.',
    opts: [
      { label: 'Reply publicly', out: 'You answer in nine minutes with the actual cause and a fix ETA.',
        fx: { rep: 6, focus: -1.4, sentiment: 0.02 } },
      { label: 'DM and refund', out: 'You refund them personally. They post a screenshot of the refund.',
        fx: { cash: -60, rep: 9, sentiment: 0.03 } },
      { label: 'Let support handle it', out: 'It is handled correctly and impersonally.',
        fx: { sentiment: -0.01 } },
    ] },

  { id: 't_praise', kind: 'social', tone: 'good', min: 100,
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
      { label: 'Ignore it', out: 'The thread dies in a day. Someone screenshots the claim anyway.',
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

  { id: 't_press_query', kind: 'news', tone: 'neutral', min: 5000,
    text: 'A reporter is asking for comment on your headcount for a piece running Thursday.',
    opts: [
      { label: 'Answer honestly', out: '"One." They print it. It becomes the headline.',
        fx: { rep: 14, opinion: 0.004 } },
      { label: 'Decline', out: '"The company declined to comment." Nine words that follow you.',
        fx: { rep: -6 } },
      { label: 'Offer a longer conversation', out: 'The piece is better and later and mostly about the right things.',
        fx: { rep: 10, focus: -3 } },
    ] },

  { id: 't_hiring_dm', kind: 'social', tone: 'neutral', min: 8000,
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
      { label: 'Nothing', out: 'It resolves. The thread stays up. So does the screenshot.',
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
      { label: 'Take the call', out: 'No money changes hands. Two introductions do.',
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
      { label: 'Nothing', out: 'They plateau in four months, as clones do.', fx: { focus: 2 } },
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
    text: 'day 365 of using {product} every single working day. thank you for making this.',
    opts: [
      { label: 'Send them something real', out: 'A handwritten note and a year of credit. They frame the note.',
        fx: { cash: -200, rep: 12, sentiment: 0.03 } },
      { label: 'Reply publicly', out: 'You reply with a detail only a real user would know. The thread notices.',
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
      { label: 'Ignore it', out: 'It gets four hundred likes.', fx: { opinion: -0.004 } },
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
];

export const THREAD_MAP = Object.fromEntries(THREADS.map((t) => [t.id, t]));
