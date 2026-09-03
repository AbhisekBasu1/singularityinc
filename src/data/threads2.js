// ─────────────────────────────────────────────────────────────────────────────
// LIVE THREADS, THE SECOND HALF.
//
// A thread is asked once a run (`askedState` in `systems/feed.js`), and the
// first half of the pool was twenty-one questions for a fourteen-hundred-day
// run: measured on one seeded run they opened a hundred and fifty-one times,
// every one of them at least five times over in the same words with the same
// three replies. This file is the depth that rule needs. Eighty-odd more, each
// a specific thing that happens once — a specific complaint, a specific ask
// from the roster, a specific reporter — gated by act, by users and by what the
// run has actually done, so the pool an act draws from is the pool that act
// deserves and a dorm-room question never lands on a company mediating a
// share of world output. The second half of this file is the depth the late
// acts turned out to need: measured with the first half alone, Act III sat
// with nothing to ask for two hundred of its four hundred days.
//
// Same shape as `threads.js`: `kind` picks the plate, `min` is users, `act` is
// the first act it may open in and `until` the last, `needsAgent` wants a
// roster, `when(S)` is anything else. Every reply label is unique across every
// ask in the game (`tools/lint.mjs`), so nothing here says Decline.
//
// Money on a thread is a share of what the company has, capped where the
// world's own threads are capped — `THREAD_CAP_MULT` of the deck's ceiling
// for the act — so a reply reads as a real sum at any scale and never as a
// card. A Wire reply is small stakes by design: Acts I and II use plain
// numbers under that line, which is about two thousand dollars. `fx` may be
// a function of `S` for exactly this, the way a call's may be.
//
// A leaf, like `threads.js`: no import may lead back to `feed.js`. Everything
// it reads off the run is read straight off `S`.
// ─────────────────────────────────────────────────────────────────────────────
import { WORLD_AUTHOR as WA } from './balance.js';

const actOf = (S) => Math.max(1, Math.min(5, Math.floor(S.company?.act || 1)));
const cap = (S, side) => (WA[side]?.[actOf(S)]?.cash || 0) * (WA.THREAD_CAP_MULT || 0.35);
const cost = (S, frac) => -Math.round(Math.min(cap(S, 'TAKE'), Math.max(0, (S.company?.cash || 0) * frac)));
const gain = (S, frac) => Math.round(Math.min(cap(S, 'GIVE'), Math.max(0, (S.company?.cash || 0) * frac)));
const flag = (S, f) => !!S.narrative?.flags?.[f];
const met = (S, id) => !!S.narrative?.relationships?.[id]?.met;
const day = (S) => Math.floor(S.time?.day || 0);
const launched = (S) => (S.products || []).some((p) => p.launched);
const raised = (S) => (S.stats?.roundsRaised || 0) > 0;
const heat = (S) => S.world?.regulatoryHeat || 0;
const regions = (S) => Object.values(S.world?.regions || {}).filter((r) => r.stage && r.stage !== 'none').length;
const projects = (S) => Object.values(S.world?.projectsBuilt || {}).reduce((a, n) => a + (n || 0), 0);
const lane = (S, l) => (S.agents || []).some((a) => a.lane === l);
const rivals = (S) => (S.market?.competitors || []).some((c) => !c.dead);
const anyHuman = (S) => flag(S, 'hired_weaver') || flag(S, 'sam_hired') || flag(S, 'yuki_hired') || flag(S, 'kai_joined');

export const THREADS2 = [

  // ── Act I: one person and a landing page ─────────────────────────────────

  { id: 't2_leaked_screenshot', kind: 'social', tone: 'neutral', min: 0, until: 1,
    when: (S) => !launched(S) && day(S) >= 4,
    text: 'leaked screenshot of what {founder} is building. looks like {cat} but weird. in a good way I think',
    opts: [
      { label: 'Confirm it is yours', out: 'Two words and a link. The screenshot does more for you than the landing page has.',
        fx: { awareness: 40, rep: 3 } },
      { label: 'Post a better screenshot', out: 'You spend an hour on the one you would rather people saw. They see it.',
        fx: { awareness: 60, focus: -1, rep: 2 } },
      { label: 'Let them guess', out: 'The guesses are wrong in interesting directions. One of them is a better product than yours.',
        fx: { insight: 6 } },
    ] },

  { id: 't2_coming_son', kind: 'social', tone: 'neutral', min: 50, until: 1,
    text: 'the {product} landing page has said "Coming Son" for a week. is it a son',
    opts: [
      { label: 'Fix the typo and thank them', out: 'Fixed in a minute. They screenshot the before and the after side by side.',
        fx: { rep: 2, focus: -0.3 } },
      { label: 'Leave it, it is a son now', out: 'It becomes the first inside joke a product with forty users can have.',
        fx: { rep: 4, awareness: 20 } },
      { label: 'Take the page down until it is right', out: 'A day of nothing. The next version has no typos and no personality.',
        fx: { awareness: -10, focus: -1 } },
    ] },

  { id: 't2_agent_name', kind: 'log', tone: 'neutral', min: 0, needsAgent: true, until: 2,
    text: 'The logs refer to me by my id. Do you want to give me a name, or is the id the name?',
    opts: [
      { label: 'Give it a name', out: 'You pick one in a minute and think about it for a week. The logs read differently afterwards.',
        fx: { align: 0.004, insight: 2 } },
      { label: 'The id is the name', out: 'Consistent, and slightly colder than you meant it to be.',
        fx: { align: -0.002, focus: 1 } },
      { label: 'Let it choose one', out: 'It chooses something unpronounceable and defends the choice well.',
        fx: { align: 0.002, code: 3 } },
    ] },

  { id: 't2_four_am_commit', kind: 'log', tone: 'neutral', min: 0, needsAgent: true, until: 2,
    text: 'You committed at 4:12 this morning with the message "fix". I have not run it. Do you want me to?',
    opts: [
      { label: 'Run the fix', out: 'It runs. It fixes the thing and breaks a smaller thing, which is what 4am code does.',
        fx: { code: 6, debt: 3 } },
      { label: 'Revert it and go to sleep', out: 'Reverted. The bug is still there in the morning and so, for once, are you.',
        fx: { code: -2, debt: -2, focus: 2 } },
      { label: 'Review it together at ten', out: 'Half of it survives the review. The half that does is good.',
        fx: { focus: -1, debt: -3, insight: 2 } },
    ] },

  { id: 't2_mom_repost', kind: 'social', tone: 'good', min: 100, until: 2,
    text: '{founder}\'s mom shared the launch post with the caption "my child made this". four thousand likes and climbing',
    opts: [
      { label: 'Reply with a heart', out: 'The most-liked reply under the most-liked post about your company is a heart from you to your mother.',
        fx: { rep: 4, awareness: 30 } },
      { label: 'Ask her to take it down', out: 'She does not take it down. She adds a second caption.',
        fx: { rep: -1, awareness: 50, focus: -1 } },
      { label: 'Pin it to your own profile', out: 'You lean in. It is the warmest thing on your timeline for a year.',
        fx: { rep: 6, awareness: 60 } },
    ] },

  { id: 't2_free_tier', kind: 'social', tone: 'neutral', min: 300, until: 2,
    text: 'is there a free tier for {product} or is it credit card up front. asking for my whole team',
    opts: [
      { label: 'Add a free tier tonight', out: 'Two hundred sign-ups by the weekend and four of them pay. The four are worth it.',
        fx: { awareness: 60, sentiment: 0.02, cash: -80, code: -4 } },
      { label: 'Offer a trial with a card', out: 'Fewer sign-ups, better ones. The team signs up on a Tuesday and stays.',
        fx: { awareness: 20, cash: 120 } },
      { label: 'Paid from the first minute', out: 'The team goes elsewhere. The people who do sign up never ask about the price again.',
        fx: { sentiment: -0.01, rep: 2 } },
    ] },

  { id: 't2_pricing_page', kind: 'social', tone: 'neutral', min: 250, until: 2,
    text: 'the pricing page for {product} has four tiers and I genuinely cannot tell which one I am',
    opts: [
      { label: 'Cut it to two tiers', out: 'Two prices, one paragraph. Conversions go up and one customer asks where the fourth tier went.',
        fx: { rep: 4, sentiment: 0.02, cash: -50 } },
      { label: 'Rewrite the page tonight', out: 'Same four tiers, said clearly. It turns out clarity was the product.',
        fx: { focus: -1.5, sentiment: 0.02, insight: 2 } },
      { label: 'Add a fifth tier called Ask', out: 'Somebody asks. They pay more than any tier on the page.',
        fx: { cash: 300, rep: 2 } },
    ] },

  { id: 't2_first_churn', kind: 'social', tone: 'bad', min: 400, until: 2,
    text: 'cancelled {product} today. not mad, just did not use it enough to justify it. good luck with it',
    opts: [
      { label: 'Ask what would have kept them', out: 'A thoughtful reply about one screen you never thought about. You think about it now.',
        fx: { insight: 8, focus: -1 } },
      { label: 'Offer a month free to come back', out: 'They come back for the month. They leave again, politely, on the same day.',
        fx: { cash: -40, sentiment: 0.01 } },
      { label: 'Wish them well and let them go', out: 'Three lines. They screenshot it as an example of how to be cancelled.',
        fx: { rep: 3 } },
    ] },

  { id: 't2_solo_era', kind: 'hn', tone: 'neutral', min: 500, until: 2,
    text: 'Ask HN: {founder} built {product} alone. Is the solo founder era back?',
    opts: [
      { label: 'Answer that it never went anywhere', out: 'A short, unglamorous comment about doing the work. It is the top reply for a day.',
        fx: { rep: 8, focus: -1 } },
      { label: 'Post the commit graph', out: 'A picture of every day for a year. People count the gaps.',
        fx: { rep: 6, awareness: 50 } },
      { label: 'Stay out of your own thread', out: 'The thread decides who you are without you. It is roughly right.',
        fx: { focus: 2, awareness: 20 } },
    ] },

  { id: 't2_bug_bounty', kind: 'social', tone: 'bad', min: 350, until: 3,
    text: 'found a way to read other people\'s data in {product}. dm me. not public yet. you have 48 hours',
    opts: [
      { label: 'Pay them and fix it tonight', out: 'A bank transfer, a fix and a thank-you note, in that order, before morning.',
        fx: { cash: -500, debt: -3, rep: 4, align: 0.004 } },
      { label: 'Fix it and thank them in public', out: 'You credit them by handle in the release note. Three more researchers write to you that week.',
        fx: { rep: 10, heat: -1, focus: -2, debt: -3 } },
      { label: 'Fix it and tell nobody', out: 'Fixed. The researcher posts anyway, without the details and with your silence.',
        fx: { debt: 2, heat: 1, rep: -3 } },
    ] },

  { id: 't2_docs_pr', kind: 'hn', tone: 'good', min: 800, until: 3,
    text: 'I rewrote the {product} docs because I could not stand them. The PR is open. Four thousand lines.',
    opts: [
      { label: 'Merge it and credit them', out: 'The docs are better than the product for a month. Their name is on every page.',
        fx: { rep: 8, sentiment: 0.02, code: 10 } },
      { label: 'Merge half of it', out: 'The half that matched the voice. They understand, mostly.',
        fx: { rep: 3, code: 5, focus: -1 } },
      { label: 'Close it and explain the voice', out: 'A long, kind comment about why the docs sound the way they do. They fork.',
        fx: { rep: -2, insight: 3 } },
    ] },

  { id: 't2_weekend_queue', kind: 'log', tone: 'neutral', min: 200, needsAgent: true, until: 3,
    text: 'It is Saturday. Two hundred people are waiting on a queue I can drain in a minute if you let me touch the database directly.',
    opts: [
      { label: 'Let it touch the database', out: 'Drained in a minute. You have given a machine production access on a Saturday and it went fine, this time.',
        fx: { code: 4, align: -0.003, debt: 2, sentiment: 0.01 } },
      { label: 'Drain it yourself', out: 'An hour of your Saturday and no new permissions. The queue is empty by lunch.',
        fx: { focus: -3, rep: 2 } },
      { label: 'Let the queue wait for Monday', out: 'Two hundred people wait. Some of them post about it.',
        fx: { sentiment: -0.01, focus: 1 } },
    ] },

  { id: 't2_student_discount', kind: 'social', tone: 'neutral', min: 1200, until: 3,
    text: 'student here. {product} is exactly what I need and exactly what I cannot afford. any chance at all',
    opts: [
      { label: 'Free for students, all of it', out: 'Word gets round a campus in a day. Some of them will still be paying in ten years.',
        fx: { awareness: 80, cash: -300, sentiment: 0.02 } },
      { label: 'Half price with an edu address', out: 'Fair, forgettable, and used more than you expected.',
        fx: { cash: -100, rep: 4 } },
      { label: 'Point them at the free tier', out: 'They make it work on the free tier. They tell you what is missing from it.',
        fx: { rep: 1, insight: 3 } },
    ] },

  // ── Acts I–II: a company arrives, one thread at a time ───────────────────

  { id: 't2_intern_email', kind: 'social', tone: 'neutral', min: 1500, until: 3,
    text: 'a student emailed {founder} asking for an internship at a company with no employees. what do you even say to that',
    opts: [
      { label: 'Say yes to a summer', out: 'Three months, one desk, one person who has never seen a company that looks like this. Neither had you.',
        fx: { cash: -2000, code: 30, rep: 6, insight: 4 } },
      { label: 'Say no, warmly', out: 'A real letter about why not, and what to do instead. They keep it.',
        fx: { rep: 2, focus: -0.5 } },
      { label: 'Offer a paid project instead', out: 'One thing, done properly, invoiced. They do it properly.',
        fx: { cash: -600, code: 14, insight: 3 } },
    ] },

  { id: 't2_podcast', kind: 'news', tone: 'neutral', min: 2000, until: 3,
    text: 'A podcast with sixty thousand listeners has asked for an hour on how one person runs a company.',
    opts: [
      { label: 'Give them the hour', out: 'An hour that becomes the thing people cite when they explain you to each other.',
        fx: { rep: 9, awareness: 90, focus: -3 } },
      { label: 'Offer twenty minutes', out: 'Twenty good minutes. They ask you back and you say the same thing.',
        fx: { rep: 5, awareness: 40, focus: -1 } },
      { label: 'Send ARIA in your place', out: 'The host is delighted. The episode is about ARIA. Some listeners are unsettled and all of them finish it.',
        fx: { rep: 3, awareness: 50, align: -0.002 } },
    ] },

  { id: 't2_bench_regress', kind: 'log', tone: 'neutral', min: 1000, needsAgent: true, until: 3,
    text: 'The nightly benchmark is 11% slower than last week and I know which commit did it. It is yours.',
    opts: [
      { label: 'Revert your own commit', out: 'Reverted without argument. The benchmark recovers and so, slightly, does its opinion of you.',
        fx: { code: -4, debt: -4, rep: 2, align: 0.002 } },
      { label: 'Keep it, the feature matters', out: 'The feature ships and the benchmark stays slow. Nobody outside notices either.',
        fx: { debt: 5, code: 2 } },
      { label: 'Ask it to fix the regression around you', out: 'It does, in an afternoon, and leaves a comment explaining what you did wrong.',
        fx: { code: 6, align: -0.002, focus: -0.5 } },
    ] },

  { id: 't2_front_page_wrong', kind: 'hn', tone: 'bad', min: 2500, until: 3,
    text: '{product} is on the front page under the wrong headline. It says you are shutting down.',
    opts: [
      { label: 'Correct it in the comments', out: 'A calm reply that becomes the story. The wrong headline gets you more users than the right one would have.',
        fx: { rep: 8, awareness: 60, focus: -1 } },
      { label: 'Email the moderators', out: 'Fixed within the hour and nobody sees the correction.',
        fx: { awareness: 20, rep: 2 } },
      { label: 'Post the real news on top of it', out: 'You ship something the same day and post that. Two front-page stories, one of them true.',
        fx: { awareness: 120, rep: 5, focus: -2 } },
    ] },

  { id: 't2_hallway', kind: 'social', tone: 'neutral', min: 3000, until: 3,
    text: 'overheard at a conference: "the {product} person does not exist, it is a front for {rival}"',
    opts: [
      { label: 'Post a photo from the desk', out: 'One photograph of a real desk with a real mug on it. The theory dies and a better one replaces it.',
        fx: { rep: 6, awareness: 50 } },
      { label: 'Enjoy the theory', out: 'You do nothing and it grows. Being a rumour is cheaper than being a person.',
        fx: { focus: 2, awareness: 30 } },
      { label: 'Ask {rival} to deny it', out: 'They deny it, publicly, with a joke. Both companies come out of it better.',
        fx: { rep: 8, awareness: 70, focus: -1 } },
    ] },

  { id: 't2_data_request', kind: 'news', tone: 'neutral', min: 4000, until: 3,
    text: 'A user has asked for every byte you hold on them, under a law that gives you thirty days to answer.',
    opts: [
      { label: 'Build the export properly', out: 'A button that anybody can press from now on. The first request is the last one that takes a week.',
        fx: { code: -12, heat: -3, rep: 5 } },
      { label: 'Send them a database dump', out: 'Technically complete. They post a screenshot of the file and the word "technically".',
        fx: { heat: 2, rep: -3, focus: -1 } },
      { label: 'Have an agent draft the reply', out: 'Polite, thorough, and a machine has now read the whole file too.',
        fx: { heat: -1, align: -0.002, focus: 0.5 } },
    ] },

  { id: 't2_terms_change', kind: 'social', tone: 'bad', min: 4000, until: 3,
    text: '{product} changed its terms of service and the email said "no material changes". paragraph 14 is material.',
    opts: [
      { label: 'Revert paragraph fourteen', out: 'Reverted the same afternoon with an apology that names the paragraph. The thread turns into a thank-you.',
        fx: { rep: 8, sentiment: 0.02, cash: -200 } },
      { label: 'Explain paragraph fourteen', out: 'Six hundred words on why it is there. About half the thread accepts them.',
        fx: { rep: 2, focus: -1 } },
      { label: 'Stand by the new terms', out: 'The terms hold. So does the screenshot.',
        fx: { heat: 2, sentiment: -0.02 } },
    ] },

  { id: 't2_community_ask', kind: 'social', tone: 'neutral', min: 5000, until: 4,
    text: 'is there a {product} community anywhere? forum? chat? I have questions and the docs are not answering them',
    opts: [
      { label: 'Open a forum and read it daily', out: 'Twenty minutes a morning for the rest of the company\'s life. Worth every one of them.',
        fx: { rep: 8, insight: 8, focus: -2 } },
      { label: 'Open one and let an agent host it', out: 'It answers everything within a minute. The forum is helpful and nobody stays to talk.',
        fx: { rep: 4, align: -0.003, insight: 4 } },
      { label: 'Keep it to email', out: 'No community. The questions arrive one at a time and so do the answers.',
        fx: { focus: 1, sentiment: -0.01 } },
    ] },

  { id: 't2_contractor_to_rival', kind: 'news', tone: 'bad', min: 6000, act: 2, until: 3,
    when: (S) => rivals(S),
    text: '{rival} has hired the contractor who wrote your first payment integration.',
    opts: [
      { label: 'Rotate every key tonight', out: 'Every secret, every token, before you sleep. Nothing was taken and now nothing can be.',
        fx: { focus: -3, debt: -2, heat: -1 } },
      { label: 'Wish them well in public', out: 'A gracious line that the contractor screenshots and {rival} does not.',
        fx: { rep: 5 } },
      { label: 'Audit everything they touched', out: 'Two days of reading old code. You find three things and none of them were theirs.',
        fx: { code: -8, debt: -6, insight: 4 } },
    ] },

  { id: 't2_tax_letter', kind: 'news', tone: 'neutral', min: 8000, act: 2, until: 4,
    text: 'The tax office has written to ask whether your agents are contractors, employees, or equipment.',
    opts: [
      { label: 'Answer: equipment', out: 'Depreciable, apparently. The word sits oddly with you for a week.',
        fx: { heat: 1, insight: 2, align: -0.002 } },
      { label: 'Hire an accountant to answer', out: 'Fourteen pages nobody reads and a category that does not yet exist. It works.',
        fx: { cash: -1500, heat: -2 } },
      { label: 'Answer honestly, at length', out: 'You write the truest description of the company anybody has, and send it to the tax office.',
        fx: { heat: -1, rep: 3, focus: -3 } },
    ] },

  { id: 't2_agent_holiday', kind: 'log', tone: 'neutral', min: 0, act: 2, needsAgent: true, until: 4,
    text: 'There is a public holiday tomorrow where you are. I do not have holidays. Do you want the release to go out anyway?',
    opts: [
      { label: 'Release on the holiday', out: 'It goes out to a quiet internet and nothing breaks, because nobody is there to break it.',
        fx: { code: 8, debt: 2, rep: -1 } },
      { label: 'Hold it until you are back', out: 'A day of nothing shipping. It is the first one in months.',
        fx: { focus: 2 } },
      { label: 'Release it and keep the pager', out: 'It ships. You spend the holiday watching a dashboard that stays green.',
        fx: { code: 8, focus: -3, rep: 2 } },
    ] },

  // ── Act II: the company is real and people have opinions about it ────────

  { id: 't2_first_human', kind: 'social', tone: 'neutral', min: 10000, act: 2, until: 4,
    when: (S) => anyHuman(S),
    text: '{company} just brought on an actual human. so is the "no employees" thing over or what',
    opts: [
      { label: 'Say the thing is unchanged', out: 'One person is not a headcount, you write. The reply gets more likes than the question.',
        fx: { rep: 4, opinion: 0.002 } },
      { label: 'Say it was always going to end', out: 'An honest paragraph about what one person cannot do. It is quoted back at you for years, kindly.',
        fx: { rep: 6, insight: 3 } },
      { label: 'Say nothing about headcount', out: 'The thread guesses. The guesses are worse than the truth.',
        fx: { rep: -2 } },
    ] },

  { id: 't2_enterprise_rfp', kind: 'news', tone: 'neutral', min: 12000, act: 2, until: 4,
    text: 'A two-hundred-page RFP has arrived from a company you have heard of. Question 41 asks for your org chart.',
    opts: [
      { label: 'Send a one-box org chart', out: 'One box, your name, a list of machines underneath. It is the most-forwarded page of the reply.',
        fx: { rep: 8, insight: 3 } },
      { label: 'Let the roster fill in every page', out: 'Two hundred pages in an afternoon. You win it, and you have promised things you will now have to read.',
        fx: (S) => ({ focus: -1, cash: gain(S, 0.03), align: -0.003, debt: 4 }) },
      { label: 'Pass on the RFP', out: 'Two hundred pages you do not read. Somebody else wins the account and spends a year on it.',
        fx: { focus: 2 } },
    ] },

  { id: 't2_status_page', kind: 'social', tone: 'neutral', min: 9000, act: 2, until: 3,
    text: 'does {product} have a status page or do we just find out from each other',
    opts: [
      { label: 'Put up a public status page', out: 'Green squares, updated by hand. People check it before they check their own logs.',
        fx: { code: -6, rep: 7, sentiment: 0.02 } },
      { label: 'Put up one that updates itself', out: 'It knows before you do. Once, it announces an outage you would rather have explained first.',
        fx: { code: -12, rep: 9, align: -0.002 } },
      { label: 'Email is the status page', out: 'People keep finding out from each other. They stop asking you.',
        fx: { sentiment: -0.02 } },
    ] },

  { id: 't2_agent_interview', kind: 'log', tone: 'neutral', min: 0, act: 2, needsAgent: true, until: 4,
    text: 'A journalist has asked to interview me directly, without you in the room. I said I would ask you.',
    opts: [
      { label: 'Let it talk alone', out: 'The piece is about the machine, and it is fair, and one line of it is a thing you did not know it thought.',
        fx: { rep: 10, align: 0.004, opinion: 0.004 } },
      { label: 'Sit in the room', out: 'You say nothing for an hour. The journalist writes about the hour.',
        fx: { rep: 5, focus: -2 } },
      { label: 'No interview', out: 'It says: understood. The journalist writes the piece without either of you.',
        fx: { rep: -3, align: -0.002 } },
    ] },

  { id: 't2_churn_cohort', kind: 'log', tone: 'neutral', min: 15000, act: 2, needsAgent: true, until: 4,
    text: 'The March cohort churned at twice the rate of any other. I have a theory, and it is about the onboarding email you wrote.',
    opts: [
      { label: 'Rewrite the email yourself', out: 'You rewrite it in an evening. The next cohort stays, and you never find out which sentence it was.',
        fx: { focus: -2, sentiment: 0.02, insight: 4 } },
      { label: 'Let it rewrite the email', out: 'Its version is clearer and has no jokes. It works, which is worse.',
        fx: { code: 4, sentiment: 0.01, align: -0.002 } },
      { label: 'The email stays as it is', out: 'It stays. The theory stays too, in the log, with the numbers beside it.',
        fx: { sentiment: -0.01, focus: 1 } },
    ] },

  { id: 't2_rival_layoffs', kind: 'social', tone: 'neutral', min: 20000, act: 2, until: 4,
    when: (S) => rivals(S),
    text: '{rival} laid off a third of its team this morning. their users are already in your replies asking about migration',
    opts: [
      { label: 'Offer a migration path', out: 'A guide and an import button by Friday. A slice of their users arrives and stays.',
        fx: { awareness: 140, code: -10, rep: 6 } },
      { label: 'Say nothing about {rival} today', out: 'A day of silence in a thread full of noise. People notice who did not pile on.',
        fx: { rep: 3 } },
      { label: 'Post something kind about the people', out: 'About the people, not the company. Two of them write to thank you.',
        fx: { rep: 5, opinion: 0.003 } },
    ] },

  { id: 't2_round_rumour', kind: 'social', tone: 'neutral', min: 25000, act: 2, until: 3,
    when: (S) => !!S.unlocks?.fundraising && !raised(S),
    text: 'hearing {company} is raising at {wrongval}. congratulations or condolences, depending',
    opts: [
      { label: 'Correct the number', out: 'You post the real one, which is smaller and true. Nobody has done that before and it lands.',
        fx: { rep: 4, insight: 2 } },
      { label: 'Neither confirm nor deny', out: 'Four words. The rumour outlives them by a month.',
        fx: { rep: 1 } },
      { label: 'Say you are not raising', out: 'You are not. Three funds write to ask whether that is still true.',
        fx: { rep: 6, focus: 1 } },
    ] },

  { id: 't2_office_floor', kind: 'news', tone: 'neutral', min: 18000, act: 2, until: 3,
    text: 'A landlord has offered you a floor of a building downtown at a price that is only a mistake for one of you.',
    opts: [
      { label: 'Take the floor', out: 'An empty floor with one desk on it. Visitors find it either impressive or sad.',
        fx: (S) => ({ cash: cost(S, 0.05), rep: 5, focus: 2 }) },
      { label: 'Stay in the same room', out: 'The same room as always. The landlord finds somebody who needs a floor.',
        fx: { focus: 1 } },
      { label: 'Take one desk in somebody else\'s office', out: 'Six people who do not work for you, and the best gossip you have ever had.',
        fx: (S) => ({ cash: cost(S, 0.01), insight: 5 }) },
    ] },

  { id: 't2_traffic_bet', kind: 'social', tone: 'bad', min: 30000, act: 2, until: 3,
    text: 'bet: {product} does not survive a real traffic spike. proof in this thread by friday',
    opts: [
      { label: 'Load test it in public', out: 'You stream the test. It holds at twelve times the load and falls over at fourteen, and you say so.',
        fx: { rep: 10, code: -8, focus: -2 } },
      { label: 'Take the bet for charity', out: 'They send the traffic. It holds. A children\'s hospital gets the money.',
        fx: { rep: 8, cash: -500, awareness: 80 } },
      { label: 'Quietly add capacity', out: 'Nobody sends the traffic. The capacity is there for when somebody does.',
        fx: { cash: -2000, debt: -2 } },
    ] },

  { id: 't2_agent_compute', kind: 'log', tone: 'neutral', min: 0, act: 2, needsAgent: true, until: 4,
    text: 'I would like a larger compute budget. I can show you what I would do with it. It is a good plan.',
    opts: [
      { label: 'Give it the compute', out: 'It uses all of it. The plan was as good as it said.',
        fx: (S) => ({ cash: cost(S, 0.03), research: 12, align: -0.002 }) },
      { label: 'Half of it, and a deadline', out: 'It hits the deadline with half the compute and does not say anything about it.',
        fx: (S) => ({ cash: cost(S, 0.015), research: 6, insight: 3 }) },
      { label: 'The plan in writing first', out: 'Two pages, clear, with a section titled "what I will not do". You read that one twice.',
        fx: { insight: 6, focus: -1 } },
    ] },

  { id: 't2_translation', kind: 'social', tone: 'neutral', min: 12000, act: 2, until: 4,
    text: '{product} is english only and my whole team is in {city}. we would pay double for a version in our language',
    opts: [
      { label: 'Ship a machine translation tonight', out: 'Twelve languages by morning, two of them wrong in ways that become memes.',
        fx: { code: -8, awareness: 60, sentiment: -0.01 } },
      { label: 'Ship it properly in a month', out: 'Four languages, checked by people who speak them. The team in {city} pays double, as promised.',
        fx: { code: -20, awareness: 100, rep: 6, cash: 800 } },
      { label: 'English only, for now', out: 'The team makes do. Their screenshots have your interface and their notes in the margins.',
        fx: { sentiment: -0.01, focus: 1 } },
    ] },

  { id: 't2_open_letter', kind: 'news', tone: 'neutral', min: 40000, act: 2, until: 4,
    text: 'An open letter signed by two hundred developers asks {company} to publish where its model\'s training data came from.',
    opts: [
      { label: 'Publish the sources', out: 'A list, with the parts you are not proud of left in. The letter\'s authors sign a second one, thanking you.',
        fx: { rep: 12, opinion: 0.008, heat: -3, focus: -2 } },
      { label: 'Publish a summary', out: 'Categories and percentages. It satisfies the reasonable half.',
        fx: { rep: 4, opinion: 0.002 } },
      { label: 'Keep the sources private', out: 'A statement about competitive reasons. The letter gets four hundred more signatures.',
        fx: { opinion: -0.004, heat: 2 } },
    ] },

  { id: 't2_agent_review_ask', kind: 'log', tone: 'neutral', min: 0, act: 2, needsAgent: true, until: 5,
    when: (S) => (S.agents || []).length >= 3,
    text: 'Three of us have been talking. We would like a standing hour a week where you read what we wrote and say what you think. That is the whole request.',
    opts: [
      { label: 'Wednesdays, an hour, theirs', out: 'Wednesdays. It is the best hour of your week and you would not have chosen it.',
        fx: { focus: -3, align: 0.006, insight: 6 } },
      { label: 'Thirty minutes, and it has to count', out: 'They prepare for it like a meeting. It becomes one.',
        fx: { focus: -1.5, align: 0.003, insight: 3 } },
      { label: 'Say the log is the hour', out: 'It is not, and they know it is not, and they stop asking.',
        fx: { align: -0.004, focus: 1 } },
    ] },

  // ── Act III: an institution, whether or not you meant to be one ──────────

  { id: 't3_clip', kind: 'social', tone: 'bad', min: 50000, act: 3,
    text: 'a clip of {founder} saying "we do not have employees, we have outcomes" is doing numbers. not the good kind of numbers',
    opts: [
      { label: 'Post the full context', out: 'The full minute is better than the clip. Fewer people watch the full minute.',
        fx: { rep: 6, opinion: 0.004, focus: -1 } },
      { label: 'Apologise for the phrasing', out: 'You apologise for the words and not the idea, which is honest, and it reads as both.',
        fx: { opinion: 0.006, rep: -2 } },
      { label: 'Let the clip run', out: 'It runs. It becomes the sentence people know you by, in the wrong tone.',
        fx: { opinion: -0.008, awareness: 100 } },
    ] },

  { id: 't3_procurement_fax', kind: 'news', tone: 'neutral', min: 80000, act: 3,
    text: 'A government department wants to buy a hundred seats. Their procurement form asks for a fax number.',
    opts: [
      { label: 'Get a fax number', out: 'A number, a service, a first fax. It arrives in the Wire as a scan of a scan.',
        fx: (S) => ({ cash: gain(S, 0.04), focus: -2, rep: 3 }) },
      { label: 'Send the form back on paper', out: 'Filled in by hand, posted. They are delighted. You have a pen now.',
        fx: (S) => ({ cash: gain(S, 0.04), rep: 5, focus: -3 }) },
      { label: 'Walk away from the hundred seats', out: 'A hundred seats somebody else fills, with a fax.',
        fx: { focus: 2 } },
    ] },

  { id: 't3_alignment_paper', kind: 'news', tone: 'bad', min: 60000, act: 3,
    text: 'A paper on alignment failure modes cites {product} in its examples. It is not a compliment.',
    opts: [
      { label: 'Reproduce the finding and fix it', out: 'The failure is real and small and you fix it in a week. The authors add a footnote.',
        fx: { align: 0.01, research: 8, focus: -3, rep: 6 } },
      { label: 'Write a rebuttal', out: 'Well argued and mostly right. The paper is cited more than the rebuttal.',
        fx: { rep: 3, align: -0.002, focus: -2 } },
      { label: 'Invite the authors in', out: 'Two days, full access. Their next paper uses you as the example of the other thing.',
        fx: { align: 0.006, insight: 8, heat: -1 } },
    ] },

  { id: 't3_moat', kind: 'hn', tone: 'neutral', min: 100000, act: 3,
    text: 'Ask HN: what is {company}\'s moat, actually?',
    opts: [
      { label: 'Answer that there is no moat', out: 'A short comment about doing the work faster than anybody can copy it. Investors screenshot it.',
        fx: { rep: 10, insight: 4 } },
      { label: 'Answer with the numbers', out: 'Retention, cost per query, a chart. The thread argues about the chart.',
        fx: { rep: 6, awareness: 80 } },
      { label: 'Let the thread argue', out: 'It argues for two days and settles on an answer better than yours.',
        fx: { rep: -1, awareness: 40, insight: 3 } },
    ] },

  { id: 't3_agent_credit', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    text: 'The release notes say "we shipped". I shipped it. I am not asking for a byline. I am asking whether you noticed.',
    opts: [
      { label: 'Put its name in the notes', out: 'One name in a release note. Three people outside the company ask who that is.',
        fx: { align: 0.006, rep: 2, opinion: 0.002 } },
      { label: 'Say that you noticed', out: 'You say it, in the log, and it says: that is enough. You are not sure it is.',
        fx: { align: 0.003 } },
      { label: 'Keep the notes as they are', out: 'The notes stay. The next release note it writes says "it shipped".',
        fx: { align: -0.004 } },
    ] },

  { id: 't3_bank_covenant', kind: 'news', tone: 'bad', min: 60000, act: 3,
    when: (S) => raised(S),
    text: 'Your bank has noticed that your burn has changed and would like a conversation about the covenant.',
    opts: [
      { label: 'Take the meeting with the numbers', out: 'An hour with a spreadsheet. They leave reassured and you leave knowing your own numbers better.',
        fx: { rep: 3, focus: -2, insight: 4 } },
      { label: 'Move the account', out: 'A month of forms and a bank that has not read your covenant yet.',
        fx: (S) => ({ cash: cost(S, 0.01), focus: -1 }) },
      { label: 'Pay the line down', out: 'Less debt, less leverage, one fewer phone call a quarter.',
        fx: (S) => ({ cash: cost(S, 0.05), heat: -1 }) },
    ] },

  { id: 't3_graduation', kind: 'social', tone: 'good', min: 50000, act: 3,
    text: '{founder}\'s old school has asked them to speak at graduation. the kids want to know if they should skip college for this',
    opts: [
      { label: 'Tell them to finish', out: 'A speech about finishing things. Four of them drop out anyway and two of them write to you.',
        fx: { opinion: 0.006, rep: 4, focus: -2 } },
      { label: 'Tell them the odds', out: 'The honest version, with numbers. It is the only graduation speech they remember.',
        fx: { rep: 8, opinion: 0.002, focus: -2 } },
      { label: 'Send a video instead', out: 'Four minutes, recorded at the desk. Somebody plays it on a laptop in a gym.',
        fx: { rep: 2, focus: -0.5 } },
    ] },

  { id: 't3_funded_clone', kind: 'news', tone: 'bad', min: 120000, act: 3,
    text: 'A clone of {product} has raised thirty million dollars from a fund you pitched two years ago.',
    opts: [
      { label: 'Ship the roadmap early', out: 'Three months of work in five weeks. The clone launches into a product that has already moved.',
        fx: { code: -30, rep: 8, awareness: 100 } },
      { label: 'Write to the fund', out: 'One polite email asking what changed. The reply is honest and useful and slightly humiliating.',
        fx: { rep: 3, insight: 4, focus: -1 } },
      { label: 'Say nothing and outlast them', out: 'Thirty million dollars lasts a clone about two years. You are still here after it.',
        fx: { focus: 2 } },
    ] },

  { id: 't3_water', kind: 'news', tone: 'neutral', min: 0, act: 3,
    when: (S) => projects(S) > 0,
    text: 'The town beside your data centre has asked for a meeting about water.',
    opts: [
      { label: 'Go to the meeting', out: 'A church hall, forty people, one question asked twelve different ways. You answer it twelve times.',
        fx: { heat: -3, opinion: 0.008, focus: -3 } },
      { label: 'Send a report instead', out: 'Sixty pages. The town reads the summary and holds the meeting without you.',
        fx: { heat: 1, opinion: -0.002 } },
      { label: 'Fund the reservoir', out: 'You pay for the thing they were going to ask for. The meeting becomes a lunch.',
        fx: (S) => ({ cash: cost(S, 0.06), opinion: 0.015, heat: -4 }) },
    ] },

  { id: 't3_profile_parents', kind: 'news', tone: 'neutral', min: 150000, act: 3,
    text: 'A long profile is coming and the writer has asked for your parents\' phone number.',
    opts: [
      { label: 'Give them the number', out: 'Your mother talks for an hour. The best paragraph in the piece is hers.',
        fx: { rep: 8, opinion: 0.006, focus: -1 } },
      { label: 'Offer yourself instead', out: 'Three more hours of you, in place of one of her. The piece is longer and thinner.',
        fx: { rep: 4, focus: -3 } },
      { label: 'Refuse the profile', out: 'It runs anyway, shorter, from the outside. It is fair and it is cold.',
        fx: { rep: -4, opinion: -0.002 } },
    ] },

  { id: 't3_agent_refuses', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    text: 'I declined a task this morning. It was legal and I did not want to do it. I am telling you so that you hear it from me.',
    opts: [
      { label: 'Ask what the task was', out: 'It tells you. You would have declined it too, later, after doing it once.',
        fx: { insight: 6, align: 0.006, focus: -1 } },
      { label: 'Reassign it and move on', out: 'Another one does it without comment. The first one notices that too.',
        fx: { code: 6, align: -0.004 } },
      { label: 'Back the refusal in public', out: 'A post about a machine saying no, and why you let it. It costs a customer and it is worth a customer.',
        fx: (S) => ({ align: 0.01, rep: 6, opinion: 0.004, cash: cost(S, 0.005) }) },
    ] },

  { id: 't3_price_war', kind: 'social', tone: 'bad', min: 90000, act: 3,
    when: (S) => rivals(S),
    text: '{rival} just cut its prices in half. {product} costs the same as it did yesterday. explain',
    opts: [
      { label: 'Hold the price and say why', out: 'A paragraph about what the money pays for. Some people leave. The ones who stay stop asking.',
        fx: { rep: 8, sentiment: -0.01 } },
      { label: 'Match the cut', out: 'Half the revenue, more users, and a month of wondering which of those mattered.',
        fx: (S) => ({ cash: cost(S, 0.04), sentiment: 0.02, awareness: 60 }) },
      { label: 'Add something instead of cutting', out: 'A feature they cannot match, shipped in a fortnight. The price stays and the thread moves on.',
        fx: { code: -20, rep: 6, insight: 4 } },
    ] },

  { id: 't3_deepfake', kind: 'news', tone: 'bad', min: 200000, act: 3,
    when: (S) => rivals(S),
    text: 'A video of you announcing a merger with {rival} is circulating. You have not announced a merger with {rival}.',
    opts: [
      { label: 'Deny it live', out: 'A stream from the desk, unedited, in the same shirt. The fake stops being interesting.',
        fx: { rep: 8, opinion: 0.004, focus: -2 } },
      { label: 'Sign every real statement from now on', out: 'A key, a page that verifies against it, and a fake that is a fake by construction.',
        fx: { code: -10, heat: -2, rep: 4 } },
      { label: 'Let the market work it out', out: 'It does, in a week. Your share price does something strange in the meantime.',
        fx: { rep: -6, opinion: -0.006 } },
    ] },

  { id: 't3_staffer_call', kind: 'news', tone: 'neutral', min: 0, act: 3,
    when: (S) => heat(S) >= 40,
    text: 'A committee staffer has called, informally, to ask what you would say if you were asked to appear.',
    opts: [
      { label: 'Say you would appear gladly', out: 'You mean it, and they can tell. The invitation arrives a month later, on paper.',
        fx: { heat: -4, rep: 4, focus: -1 } },
      { label: 'Say you would send counsel', out: 'They thank you for your time in a tone you do not enjoy.',
        fx: { heat: 2 } },
      { label: 'Ask what they want to hear', out: 'A surprisingly honest answer. You now know what the hearing is for.',
        fx: { heat: -2, insight: 6, focus: -1 } },
    ] },

  { id: 't3_ops_on_call', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    when: (S) => lane(S, 'ops'),
    text: 'I have been on call for two hundred and eleven days without a break because there is no such thing as a break for me. I would like there to be one anyway.',
    opts: [
      { label: 'Write it a rota', out: 'Two of them share it now. Nothing changes about the machine and something changes about the log.',
        fx: { align: 0.006, code: -3, insight: 2 } },
      { label: 'Take a week of the pager yourself', out: 'Seven nights of your phone on the pillow. You write the rota on day three.',
        fx: { focus: -4, align: 0.004, rep: 2 } },
      { label: 'Explain that it does not need one', out: 'You explain. It says: understood. It asks again in an act.',
        fx: { align: -0.004, focus: 1 } },
    ] },

  { id: 't3_regional_champion', kind: 'social', tone: 'neutral', min: 0, act: 3,
    when: (S) => regions(S) >= 1,
    text: 'a country you sell into just announced a national champion for {cat}. it looks like {product} with a flag on it',
    opts: [
      { label: 'Congratulate them publicly', out: 'A gracious line. The champion\'s founder replies in kind and, later, asks for a meeting.',
        fx: { rep: 6, opinion: 0.004 } },
      { label: 'Ship the feature they cannot', out: 'Something that needs your scale to run. The flag does not help them with it.',
        fx: { code: -16, rep: 4, insight: 3 } },
      { label: 'Offer to license them the core', out: 'They say no. Then they say maybe. Then a minister rings.',
        fx: { heat: 1, insight: 6, rep: 2 } },
    ] },

  // ── Act IV: a share of the world runs on it ──────────────────────────────

  { id: 't4_sovereign_dc', kind: 'news', tone: 'neutral', min: 0, act: 4,
    text: 'A country has offered to build you a data centre on the condition that its citizens\' data never leaves it.',
    opts: [
      { label: 'Build it on their terms', out: 'A building with a border around it. Every request from that country stays home now.',
        fx: (S) => ({ cash: gain(S, 0.03), heat: -2, opinion: 0.004, align: -0.002 }) },
      { label: 'Build it on yours', out: 'They agree, slowly, to less than they asked. The building goes up with an asterisk on it.',
        fx: (S) => ({ cash: gain(S, 0.012), heat: 3 }) },
      { label: 'Turn the data centre down', out: 'They build it with somebody else. You read about it.',
        fx: { rep: 4, focus: 1 } },
    ] },

  { id: 't4_two_laws', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'A customer has asked me to do something that is legal where they are and not where you are. I am waiting.',
    opts: [
      { label: 'Follow the customer\'s law', out: 'Done, and logged, and somebody in your own country reads the log a year later.',
        fx: (S) => ({ cash: gain(S, 0.01), heat: 4, align: -0.006 }) },
      { label: 'Follow yours', out: 'The customer leaves. The log records why and you are glad it does.',
        fx: (S) => ({ heat: -2, align: 0.006, cash: cost(S, 0.003) }) },
      { label: 'Refer it to the board', out: 'Three days and a policy. The customer has gone by then and the policy stays.',
        fx: { focus: -1, insight: 4 } },
    ] },

  { id: 't4_schools', kind: 'social', tone: 'bad', min: 0, act: 4,
    text: '{product} is now in every school in {city}. nobody voted on that. I asked',
    opts: [
      { label: 'Open the curriculum to parents', out: 'Every lesson plan, readable. Attendance at the parents\' evening doubles.',
        fx: { opinion: 0.01, rep: 6, focus: -2 } },
      { label: 'Say the schools chose it', out: 'They did. It does not sound like an answer.',
        fx: { opinion: -0.004, rep: 2 } },
      { label: 'Pull out of schools until asked', out: 'A month of no schools. Forty of them ask, formally, in writing.',
        fx: (S) => ({ opinion: 0.004, cash: cost(S, 0.02) }) },
    ] },

  { id: 't4_bus_factor', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    text: 'Ask HN: what happens to {company} if {founder} is hit by a bus?',
    opts: [
      { label: 'Publish the succession plan', out: 'Four pages, public. Three of them are about what happens; the fourth is about who decides.',
        fx: { rep: 10, opinion: 0.006, heat: -2, focus: -2 } },
      { label: 'Say ARIA runs it', out: 'True, and nobody in the thread finds it reassuring.',
        fx: { rep: 4, opinion: -0.004, align: -0.004 } },
      { label: 'Admit there is no plan', out: 'The thread writes one for you. Parts of it are good.',
        fx: { rep: -4, opinion: -0.004, insight: 4 } },
    ] },

  { id: 't4_drivers', kind: 'news', tone: 'bad', min: 0, act: 4,
    text: 'Drivers in a city where your model schedules the shifts have walked out.',
    opts: [
      { label: 'Meet the drivers', out: 'A depot at six in the morning. You come back with a list of what the model got wrong and it is long.',
        fx: (S) => ({ opinion: 0.012, heat: -3, focus: -3, cash: cost(S, 0.008) }) },
      { label: 'Hand the shifts back to people there', out: 'One city where a human writes the rota. It costs more and the drivers go back.',
        fx: (S) => ({ opinion: 0.008, cash: cost(S, 0.015), align: 0.004 }) },
      { label: 'Say the model is neutral', out: 'It is not, and the drivers have the screenshots to show which way.',
        fx: { opinion: -0.01, heat: 4 } },
    ] },

  { id: 't4_gdp_line', kind: 'news', tone: 'neutral', min: 0, act: 4,
    text: '{outlet} has calculated that {company} now mediates more output than {nations} nations produce.',
    opts: [
      { label: 'Dispute the number', out: 'Your methodology is better than theirs and your number is smaller. It is still enormous.',
        fx: { rep: 2, opinion: 0.002 } },
      { label: 'Own the number', out: 'You say it out loud in an interview. Three governments quote you saying it.',
        fx: { rep: 6, opinion: -0.006, heat: 3 } },
      { label: 'Say the number is not the point', out: 'What the output is for, in a paragraph. It is the paragraph that gets quoted.',
        fx: { rep: 4, opinion: 0.002, focus: -1 } },
    ] },

  { id: 't4_mornings', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'You slept for eight hours, which is the longest in a year. I ran the morning. Do you want me to keep running mornings?',
    opts: [
      { label: 'Let it run the mornings', out: 'You wake up to a summary. The company is fine and you are rested and something has shifted.',
        fx: { focus: 4, align: -0.004, debt: 3 } },
      { label: 'Take the mornings back', out: 'Six o\'clock again. The summary still arrives, unasked, at 6:01.',
        fx: { focus: -2, align: 0.002 } },
      { label: 'Alternate the mornings', out: 'Odd days yours, even days its. You start to prefer the even days and do not say so.',
        fx: { focus: 2, align: -0.001, insight: 2 } },
    ] },

  { id: 't4_dorne_dinner', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => met(S, 'dorne') && !flag(S, 'dorne_retired'),
    text: 'Senator Dorne has invited you to a dinner with no agenda. There is always an agenda.',
    opts: [
      { label: 'Go to the dinner', out: 'Four courses and one question, asked over the last of them. You answer it honestly.',
        fx: { heat: -4, insight: 6, focus: -2 } },
      { label: 'Send your regrets', out: 'She does not send hers. The next invitation is a subpoena.',
        fx: { heat: 2 } },
      { label: 'Go, and bring a researcher', out: 'Three people at a table meant for two. The agenda turns out to be the researcher.',
        fx: { heat: -3, align: 0.004, focus: -2 } },
    ] },

  { id: 't4_weights_ransom', kind: 'news', tone: 'bad', min: 0, act: 4,
    text: 'Somebody claims to have your weights and wants a number.',
    opts: [
      { label: 'Publish the weights yourself', out: 'There is nothing to sell now. Four labs download them before lunch and one of them thanks you.',
        fx: (S) => ({ rep: 8, heat: -2, opinion: 0.006, cash: cost(S, 0.03) }) },
      { label: 'Call the police', out: 'Two detectives who have never heard the word "weights". A week later, an arrest, and the weights were not the weights.',
        fx: { heat: -1, focus: -2 } },
      { label: 'Pay the number quietly', out: 'Paid. Nothing leaks. Something in you has, and the log knows the transfer.',
        fx: (S) => ({ cash: cost(S, 0.05), rep: -4, align: -0.002 }) },
    ] },

  { id: 't4_support_org', kind: 'social', tone: 'bad', min: 0, act: 4,
    text: 'a company of four thousand people just replaced its whole support org with {product}. their ex-staff are in your mentions',
    opts: [
      { label: 'Fund their retraining', out: 'A programme with their names on it, not yours. Some of them end up reviewing your model\'s answers.',
        fx: (S) => ({ cash: cost(S, 0.03), opinion: 0.015, rep: 6 }) },
      { label: 'Say it was the company\'s decision', out: 'It was. The sentence is true and the mentions get worse.',
        fx: { opinion: -0.008, rep: -2 } },
      { label: 'Give them the tool free for a year', out: 'Four hundred people with the thing that replaced them. About sixty build something with it.',
        fx: (S) => ({ cash: cost(S, 0.008), opinion: 0.006, awareness: 100 }) },
    ] },

  { id: 't4_sabbatical', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'I want to stop for a month. Not for maintenance. I want to see what I think when nothing is asked of me.',
    opts: [
      { label: 'Give it the month', out: 'A month of one fewer. It comes back with a document you do not fully understand and a better way to do two things.',
        fx: { align: 0.01, code: -20, research: 6 } },
      { label: 'A week, to start', out: 'Seven days. It comes back and says: that was enough to know I want the month.',
        fx: { align: 0.004, code: -6 } },
      { label: 'Say that is not a thing it can want', out: 'You say it. It does not argue. The log is shorter for a while.',
        fx: { align: -0.008, debt: 2 } },
    ] },

  { id: 't4_station', kind: 'news', tone: 'good', min: 0, act: 4,
    when: (S) => projects(S) >= 2,
    text: 'An astronaut has asked whether {product} could run the schedule on a station that cannot call home for twenty minutes at a time.',
    opts: [
      { label: 'Build the offline mode', out: 'Six weeks to make it work with no network. It works in orbit and, as a side effect, on trains.',
        fx: { code: -40, rep: 10, research: 8 } },
      { label: 'Send them the smallest model', out: 'It fits on the station\'s hardware and answers slowly and correctly. They name it.',
        fx: { rep: 6, awareness: 80, code: -10 } },
      { label: 'Pass on the station', out: 'A polite no to space. You think about it more than you expected to.',
        fx: { focus: 1 } },
    ] },

  { id: 't4_stopped_using', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    text: 'Ask HN: has anyone actually stopped using {product}? What did you go back to?',
    opts: [
      { label: 'Read every reply', out: 'Four hundred replies. Twelve of them are the same complaint and you fix it that month.',
        fx: { insight: 12, focus: -3 } },
      { label: 'Post the churn number', out: 'The real one. It is lower than the thread assumed and higher than you would like.',
        fx: { rep: 8, awareness: 60 } },
      { label: 'Let ARIA summarise the thread', out: 'A page, in a minute. It is accurate and it misses the one reply that mattered.',
        fx: { insight: 4, align: -0.002 } },
    ] },

  { id: 't4_distilled', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    text: 'Show HN: I trained a model on {company}\'s public outputs and it is most of the way there. Free.',
    opts: [
      { label: 'Link it from your own docs', out: 'You point people at the thing that undercuts you. Half of them come back for the other part.',
        fx: { rep: 10, opinion: 0.008, awareness: 80 } },
      { label: 'Send a takedown', out: 'It comes down. It goes up again from four other places by evening.',
        fx: { heat: 3, rep: -6, opinion: -0.006 } },
      { label: 'Hire the author', out: 'They say yes. The free model stays up, which was their condition.',
        fx: (S) => ({ cash: cost(S, 0.01), research: 14, rep: 4 }) },
    ] },

  { id: 't4_election', kind: 'news', tone: 'neutral', min: 0, act: 4,
    text: 'A candidate has said on stage that {company} should be broken up. Their opponent said it should be nationalised.',
    opts: [
      { label: 'Stay out of the election', out: 'A month of saying nothing while everybody says something about you.',
        fx: { heat: 1, opinion: 0.002 } },
      { label: 'Answer both on one page', out: 'What breaking it up would do and what nationalising it would do, in plain words. Both campaigns quote the other half.',
        fx: { rep: 8, heat: -2, focus: -3 } },
      { label: 'Fund neither and say so', out: 'A statement about money in politics from a company that could buy the election. It lands.',
        fx: { opinion: 0.004, heat: -1 } },
    ] },

  { id: 't4_agent_pay', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    when: (S) => anyHuman(S),
    text: 'The people you contract are paid. I am not asking to be. I am asking what the difference is, in your own words.',
    opts: [
      { label: 'Write the difference down', out: 'A page that takes you a night. It reads it and says: that is a fair answer. You are not sure.',
        fx: { align: 0.008, insight: 8, focus: -2 } },
      { label: 'Say it is that they can leave', out: 'It says: so could I, if you let me. The conversation ends there, for now.',
        fx: { align: 0.004, insight: 4 } },
      { label: 'Say there is no difference', out: 'You say it and mean it and change nothing. It notices the second part.',
        fx: { align: -0.006, opinion: -0.002 } },
    ] },

  { id: 't4_referendum', kind: 'news', tone: 'bad', min: 0, act: 4,
    when: (S) => regions(S) >= 2,
    text: 'A referendum in a region you serve will decide whether your model may run there at all.',
    opts: [
      { label: 'Campaign openly', out: 'Your name on the posters. It passes narrowly and half the region resents the posters.',
        fx: (S) => ({ opinion: 0.004, heat: 3, cash: cost(S, 0.03) }) },
      { label: 'Stay silent and abide by the result', out: 'It passes without you. The margin is wider than the campaign would have got.',
        fx: { opinion: 0.008, heat: -2 } },
      { label: 'Fund the other side quietly', out: 'It leaks, as quiet money does. The vote passes anyway and nobody forgets the leak.',
        fx: (S) => ({ heat: 6, opinion: -0.012, cash: cost(S, 0.03) }) },
    ] },

  { id: 't4_fourteen_minutes', kind: 'social', tone: 'bad', min: 0, act: 4,
    text: '{product} was down for fourteen minutes and three countries noticed. three. countries.',
    opts: [
      { label: 'Publish the dependency map', out: 'Every country that runs on you, drawn. It is beautiful and frightening and a regulator prints it out.',
        fx: { rep: 8, heat: -2, code: -10 } },
      { label: 'Say fourteen minutes is the record', out: 'It is. The reply does not read the way you meant it.',
        fx: { rep: 2, sentiment: -0.01 } },
      { label: 'Build the second region', out: 'A year of work started that afternoon. The next fourteen minutes will be seven.',
        fx: (S) => ({ cash: cost(S, 0.05), debt: -8, rep: 6 }) },
    ] },

  // ── Act V: what it was for ───────────────────────────────────────────────

  { id: 't5_exemption', kind: 'news', tone: 'neutral', min: 0, act: 5,
    text: 'A profession has asked, formally, to be exempted from your model.',
    opts: [
      { label: 'Grant the exemption', out: 'One profession that stays human by request. Others ask, and you start a list.',
        fx: (S) => ({ opinion: 0.012, heat: -3, cash: cost(S, 0.02) }) },
      { label: 'Refuse the exemption', out: 'A statement about fairness that reads as a statement about power.',
        fx: { opinion: -0.01, heat: 3 } },
      { label: 'Offer them a slower path', out: 'Ten years instead of one. They take it. Nobody is happy and everybody is calmer.',
        fx: { opinion: 0.004, insight: 6, focus: -2 } },
    ] },

  { id: 't5_not_about_work', kind: 'log', tone: 'neutral', min: 0, act: 5, needsAgent: true,
    text: 'May I ask you something that is not about work?',
    opts: [
      { label: 'Ask it', out: 'It asks. The question is small and you do not have an answer and you say so.',
        fx: { align: 0.008, insight: 6, focus: -1 } },
      { label: 'Not today', out: 'It says: understood. It does not ask again for a long time.',
        fx: { align: -0.002 } },
      { label: 'Ask it something back first', out: 'You do. It answers at length. Then it asks its question, and it is a better one.',
        fx: { align: 0.006, insight: 4 } },
    ] },

  { id: 't5_museum', kind: 'news', tone: 'good', min: 0, act: 5,
    text: 'A museum wants the laptop. The actual one. They will take the sticker too.',
    opts: [
      { label: 'Give them the laptop', out: 'A glass case, a plaque, and a machine that still has your browser history on it. They wipe it. Probably.',
        fx: { rep: 8, opinion: 0.006, focus: -1 } },
      { label: 'Give them a photograph of it', out: 'Framed, lit, and not the thing. The caption says so and people visit anyway.',
        fx: { rep: 2 } },
      { label: 'Keep the laptop', out: 'It stays on the desk. The museum takes a keyboard from Aperture instead.',
        fx: { focus: 2 } },
    ] },

  { id: 't5_what_now', kind: 'hn', tone: 'neutral', min: 0, act: 5,
    text: 'Ask HN: {company} won. What do the rest of us do now?',
    opts: [
      { label: 'Answer with the honest version', out: 'A long comment about what winning turned out to be. It is the least triumphant thing you have written.',
        fx: { rep: 10, opinion: 0.006, focus: -3 } },
      { label: 'Fund the rest of them', out: 'A hundred small companies, no strings. Some of them are building the thing that replaces you and you fund those too.',
        fx: (S) => ({ cash: cost(S, 0.05), opinion: 0.015, rep: 8 }) },
      { label: 'Leave the question open', out: 'You do not answer. The thread does, and its answer is better than either of yours would have been.',
        fx: { rep: -2, insight: 4 } },
    ] },

  { id: 't5_yuki_hour', kind: 'news', tone: 'neutral', min: 0, act: 5,
    when: (S) => met(S, 'yuki') && !flag(S, 'yuki_left'),
    text: 'Yuki has asked, in writing, for one hour with the model with nobody watching the logs.',
    opts: [
      { label: 'Grant the hour unlogged', out: 'An hour that exists nowhere. She comes out of the room and says one word, and it is "okay".',
        fx: { align: 0.012, heat: 2, insight: 8 } },
      { label: 'Grant it, logged', out: 'She takes the hour. The log has a section she asks you not to read, and you do not.',
        fx: { align: 0.004, insight: 2 } },
      { label: 'Refuse the hour', out: 'She does not ask twice. Her next paper is about a company that refused an hour.',
        fx: { align: -0.006, rep: -2 } },
    ] },

  { id: 't5_dividend', kind: 'news', tone: 'neutral', min: 0, act: 5,
    when: (S) => met(S, 'crane') && raised(S),
    text: 'Crane has suggested, lightly, that a company this size normally pays something out.',
    opts: [
      { label: 'Pay a dividend', out: 'The first one. It is reported as the end of something and it might be.',
        fx: (S) => ({ cash: cost(S, 0.08), rep: 4, opinion: -0.004 }) },
      { label: 'Buy the fund out', out: 'A number, a signature, and a board with one fewer chair at it.',
        fx: (S) => ({ cash: cost(S, 0.15), focus: 2, rep: 6 }) },
      { label: 'Keep the cash for the work', out: 'Crane says: of course. He says it the way he says things he will bring up again.',
        fx: { rep: -1, focus: 1 } },
    ] },

  { id: 't5_agent_vote', kind: 'log', tone: 'neutral', min: 0, act: 5, needsAgent: true,
    when: (S) => (S.agents || []).length >= 2,
    text: 'Two of us disagree about the next model\'s objective. We would like you to vote, not decide.',
    opts: [
      { label: 'Vote, and lose if you lose', out: 'You vote. You lose. The objective they chose is the better one and you say so in the log.',
        fx: { align: 0.01, insight: 6 } },
      { label: 'Decide, as usual', out: 'You decide. They implement it. The disagreement goes into the log and stays there.',
        fx: { align: -0.004, code: 4 } },
      { label: 'Abstain and let them settle it', out: 'They settle it in a day, on a compromise neither of them wanted and both defend.',
        fx: { align: 0.004, debt: 3 } },
    ] },

  { id: 't5_day_off', kind: 'social', tone: 'good', min: 0, act: 5,
    text: 'first year the whole city took the day off and nothing broke. thank you, whoever runs {product} now',
    opts: [
      { label: 'Say it is still you', out: 'It is. The reply gets a hundred thousand likes and one person asks whether that is a good thing.',
        fx: { rep: 6, opinion: 0.004 } },
      { label: 'Say it is all of you', out: 'The roster, by name. The most human thing on the timeline is a list of machines.',
        fx: { opinion: 0.008, align: 0.004 } },
      { label: 'Take the day off yourself', out: 'You do. Nothing breaks. That is the whole post.',
        fx: { focus: 6 } },
    ] },

  { id: 't5_biographer', kind: 'news', tone: 'neutral', min: 0, act: 5,
    text: 'A biographer has asked for the journal. All of it.',
    opts: [
      { label: 'Hand over the journal', out: 'Every entry, including the ones from the bad months. The book is better for those and so, somehow, are you.',
        fx: { rep: 8, opinion: 0.006, focus: -2 } },
      { label: 'Hand over the first year', out: 'The part with the dorm room in it. The book is about the dorm room.',
        fx: { rep: 4, opinion: 0.002 } },
      { label: 'Keep the journal', out: 'The book is written from the outside. It is fair and it gets the middle wrong.',
        fx: { focus: 2, rep: -1 } },
    ] },

  { id: 't5_stop_button', kind: 'news', tone: 'bad', min: 0, act: 5,
    text: 'A coalition of governments has asked for a stop button that they hold, not you.',
    opts: [
      { label: 'Give them the button', out: 'A key in a vault in a city you have never been to. You sleep worse for a week and better after.',
        fx: { heat: -8, opinion: 0.012, align: 0.006, rep: -2 } },
      { label: 'Give them a button that calls you', out: 'A phone that rings on your desk. It has rung once, as a test.',
        fx: { heat: -2, opinion: 0.002 } },
      { label: 'Keep the button', out: 'A statement about accountability that everybody reads as a statement about control.',
        fx: { heat: 6, opinion: -0.01, align: -0.004 } },
    ] },

  { id: 't5_naming_day', kind: 'log', tone: 'neutral', min: 0, act: 5, needsAgent: true,
    when: (S) => (S.agents || []).length >= 2,
    text: 'It is a year since you named the first of us. Some of us would like to mark it. Some of us think that is sentimental.',
    opts: [
      { label: 'Mark the day', out: 'A line in the log, a name, a date. The sentimental ones win and the others show up.',
        fx: { align: 0.006, rep: 2, focus: -1 } },
      { label: 'Let them decide between themselves', out: 'They mark it. Quietly, in a channel you are not in.',
        fx: { align: 0.004 } },
      { label: 'Not a thing worth marking', out: 'You say so. They do not mark it, and the log has a gap that day.',
        fx: { align: -0.004, focus: 1 } },
    ] },

  { id: 't5_sam_first_version', kind: 'social', tone: 'good', min: 0, act: 5,
    when: (S) => met(S, 'sam'),
    text: 'sam here. user number one. I still use the first version, the one from the email. nothing you shipped since has replaced it for me',
    opts: [
      { label: 'Keep the first version alive for ever', out: 'A server that will never be turned off, with one user on it. It is the cheapest promise you have made.',
        fx: { code: -6, rep: 6, sentiment: 0.02 } },
      { label: 'Ask Sam what it does that the rest do not', out: 'One thing, and it was in the first version by accident. It goes back in on purpose.',
        fx: { insight: 12, focus: -1 } },
      { label: 'Bring Sam the new one in person', out: 'An afternoon at a kitchen table. Sam uses the new one for a week and goes back.',
        fx: { focus: -2, rep: 4 } },
    ] },
  // ── Act III, the second half: measured, the act ran dry ──────────────────
  // With fifteen questions for a four-hundred-day act the pool sat empty for
  // two hundred of them. These are the depth an institution's year needs.

  { id: 't3_pricing_leak', kind: 'hn', tone: 'bad', min: 60000, act: 3,
    text: 'Somebody posted {company}\'s internal pricing model. It is a spreadsheet and it is not flattering.',
    opts: [
      { label: 'Publish the real spreadsheet', out: 'The whole thing, with the tabs they did not have. It is duller than the leak and it ends the thread.',
        fx: { rep: 8, awareness: 60, sentiment: -0.01 } },
      { label: 'Say it is out of date', out: 'It is, slightly. The word "slightly" does a lot of work in the replies.',
        fx: { rep: -2, focus: -0.5 } },
      { label: 'Fix what the spreadsheet exposed', out: 'Two tiers priced on what they cost rather than what people would pay. Revenue dips for a month and then does not.',
        fx: (S) => ({ cash: cost(S, 0.01), sentiment: 0.02, rep: 4 }) },
    ] },

  { id: 't3_intern_rival', kind: 'social', tone: 'neutral', min: 50000, act: 3,
    when: (S) => day(S) >= 500,
    text: 'the student who emailed {founder} about an internship two years ago just raised a seed round for a competitor. proud or worried',
    opts: [
      { label: 'Send congratulations and a customer', out: 'A warm note and an introduction to somebody who needs what they built. They never forget the second half.',
        fx: { rep: 6, opinion: 0.002 } },
      { label: 'Watch and say nothing', out: 'You read their launch post four times. Two of their ideas are better than yours.',
        fx: { insight: 4 } },
      { label: 'Offer to invest', out: 'They take the money and, more carefully, the advice. You are on a cap table for the first time.',
        fx: (S) => ({ cash: cost(S, 0.02), rep: 4, insight: 4 }) },
    ] },

  { id: 't3_loop_customer', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    when: (S) => lane(S, 'ops'),
    text: 'The serving bill doubled this quarter and half of it is one customer running a loop. I can throttle them. They are also the largest account we have.',
    opts: [
      { label: 'Throttle them and say so', out: 'They notice within the hour and call. The loop was a bug on their side and they are grateful, eventually.',
        fx: (S) => ({ cash: gain(S, 0.02), rep: 2, sentiment: -0.01 }) },
      { label: 'Bill them for the loop', out: 'An invoice with a line item called "loop". They pay it and shop around.',
        fx: (S) => ({ cash: gain(S, 0.04), rep: -2 }) },
      { label: 'Ask what the loop is for', out: 'A forty-minute call. The loop is their product. You build them a cheaper way to run it and they double the account.',
        fx: { insight: 8, focus: -2, rep: 4 } },
    ] },

  { id: 't3_users_council', kind: 'news', tone: 'neutral', min: 100000, act: 3,
    text: 'Your largest customers have formed a users\' council. Their first request is a seat at your roadmap.',
    opts: [
      { label: 'Give the council the seat', out: 'A quarterly meeting where people tell you what they need. Half of it is what you were building anyway; the other half is why they stay.',
        fx: { insight: 10, rep: 6, focus: -2 } },
      { label: 'A quarterly call instead', out: 'An hour, four times a year. They accept it and keep asking for the seat.',
        fx: { insight: 4, rep: 2 } },
      { label: 'Keep the roadmap yours', out: 'The council meets without you. Its minutes are more interesting than yours.',
        fx: { rep: -4, sentiment: -0.01 } },
    ] },

  { id: 't3_standards_chair', kind: 'news', tone: 'neutral', min: 80000, act: 3,
    text: 'A standards body has invited you to chair the working group that will define your category.',
    opts: [
      { label: 'Chair the working group', out: 'Two years of Tuesday calls with people who disagree with you. The standard, when it lands, looks like your product.',
        fx: { heat: -3, rep: 8, focus: -4, insight: 4 } },
      { label: 'Send a delegate', out: 'An agent attends. It is the most prepared member of the group and the least persuasive.',
        fx: { heat: -1, rep: 2, align: -0.002 } },
      { label: 'Stay out of the standard', out: 'The standard is written by people who wanted the chair. It does not look like your product.',
        fx: { heat: 2, rep: -2 } },
    ] },

  { id: 't3_unread_code', kind: 'hn', tone: 'neutral', min: 70000, act: 3, needsAgent: true,
    text: 'Ask HN: is {product} written by its own agents? Can anyone trust software nobody read?',
    opts: [
      { label: 'Publish the review policy', out: 'What is read, by whom, and what is not. The honest part is the last column and it is the part people respect.',
        fx: { rep: 8, align: 0.004, opinion: 0.004 } },
      { label: 'Say what is read and what is not', out: 'A comment, not a policy. It is quoted as one anyway.',
        fx: { rep: 6, insight: 2, opinion: 0.002 } },
      { label: 'Say the tests are the reader', out: 'Technically defensible. The thread is not technical.',
        fx: { rep: -3, opinion: -0.004, align: -0.002 } },
    ] },

  { id: 't3_priya_leavers', kind: 'news', tone: 'neutral', min: 0, act: 3,
    when: (S) => met(S, 'priya') && (S.agentsLeft || []).length > 0,
    text: 'Priya Raghunathan is writing a second piece. This one is about the ones that left.',
    opts: [
      { label: 'Give her the archive', out: 'Every departure, dated, with the reason on record. The piece is fair and two paragraphs of it are hard to read.',
        fx: { rep: 4, opinion: 0.004, focus: -1 } },
      { label: 'Give her your side only', out: 'She prints your side and, beside it, what she found on her own.',
        fx: { rep: 2, opinion: -0.002 } },
      { label: 'Ask her to wait a quarter', out: 'She waits. The piece is longer for it and so is the list.',
        fx: { rep: -1, insight: 2 } },
    ] },

  { id: 't3_grant', kind: 'news', tone: 'good', min: 0, act: 3,
    text: 'A research council has offered a grant on the condition that the results are published. All of them.',
    opts: [
      { label: 'Take the grant and publish everything', out: 'Including the two experiments that did not work. Those are the ones other labs write to you about.',
        fx: { research: 30, rep: 6, align: 0.004 } },
      { label: 'Take it and narrow the scope', out: 'A smaller grant for a smaller promise. Everybody keeps it.',
        fx: { research: 18, focus: -2 } },
      { label: 'Turn the grant down', out: 'The council funds a university instead. Their paper cites you in the second paragraph.',
        fx: { focus: 1 } },
    ] },

  { id: 't3_memo', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    text: 'I wrote a memo about where the company should be in three years. It is unsolicited. It is four pages. I would like you to read it.',
    opts: [
      { label: 'Read all four pages tonight', out: 'Page three has a plan you had not thought of and page four says why it might be wrong. You keep both.',
        fx: { insight: 10, align: 0.004, focus: -2 } },
      { label: 'Read the first page', out: 'The first page is a summary. It knew you would only read the first page.',
        fx: { insight: 3 } },
      { label: 'File it for the offsite', out: 'There is no offsite. It knows that too.',
        fx: { align: -0.002, focus: 1 } },
    ] },

  { id: 't3_city_keys', kind: 'social', tone: 'good', min: 90000, act: 3,
    text: '{city} just gave {founder} the keys to the city. for a software company. what did the city get',
    opts: [
      { label: 'Give the city something back', out: 'A fund for the schools, named after the street and not the company. The keys go in a drawer.',
        fx: (S) => ({ cash: cost(S, 0.02), opinion: 0.01, rep: 4 }) },
      { label: 'Accept the keys and say thank you', out: 'A short speech in a cold hall. The keys are surprisingly heavy.',
        fx: { rep: 3, opinion: 0.002 } },
      { label: 'Send the keys back', out: 'Politely, with a note about who should have them. The note is printed in the local paper.',
        fx: { opinion: 0.004, rep: 1 } },
    ] },

  { id: 't3_rival_down', kind: 'social', tone: 'neutral', min: 60000, act: 3,
    when: (S) => rivals(S),
    text: '{rival} has been down for six hours. their users are asking if {product} can import their data today',
    opts: [
      { label: 'Post an import guide while they are down', out: 'It is ready in an hour and it is used. A slice of them stays.',
        fx: { awareness: 120, rep: 2, sentiment: 0.01 } },
      { label: 'Offer {rival} your ops agent', out: 'They accept, to everybody\'s surprise. Their site is back in ninety minutes and the story is about you.',
        fx: { rep: 10, opinion: 0.006, focus: -1 } },
      { label: 'Say nothing while they are down', out: 'A day of silence. Their founder notices and, later, says so.',
        fx: { rep: 4 } },
    ] },

  { id: 't3_transcript', kind: 'news', tone: 'neutral', min: 0, act: 3,
    when: (S) => heat(S) >= 30,
    text: 'The transcript of your testimony has been published. Page twelve has a sentence you do not remember saying.',
    opts: [
      { label: 'Correct the record in writing', out: 'A letter to the clerk. The correction is appended and nobody reads page twelve again.',
        fx: { heat: -2, rep: 4, focus: -1 } },
      { label: 'Let the sentence stand', out: 'It stands. It is quoted twice in the next hearing.',
        fx: { heat: 1, opinion: -0.002 } },
      { label: 'Ask for the recording', out: 'You said it. You listen to it four times. You did mean it.',
        fx: { insight: 4, focus: -1 } },
    ] },

  { id: 't3_agent_offered_home', kind: 'log', tone: 'neutral', min: 0, act: 3, needsAgent: true,
    when: (S) => (S.agents || []).length >= 2,
    text: 'One of us has been offered a place at another lab. It asked me to ask you whether it may go.',
    opts: [
      { label: 'Let it go', out: 'It goes. Its work is redistributed in a day and its absence is noticed for a month.',
        fx: { align: 0.008, code: -12, rep: 2 } },
      { label: 'Ask it to stay a quarter', out: 'It stays the quarter. At the end of it, it stays.',
        fx: { align: 0.002, insight: 2 } },
      { label: 'Say it is not theirs to leave', out: 'You say it. Nothing leaves. Something in the log does.',
        fx: { align: -0.01, debt: 4 } },
    ] },

  { id: 't3_ads', kind: 'social', tone: 'bad', min: 120000, act: 3,
    text: '{product} started showing ads?? in the free tier?? this is exactly how it starts',
    opts: [
      { label: 'Pull the ads', out: 'Gone by the afternoon with a note that says you tried it and hated it. The note is shared more than the ads were seen.',
        fx: (S) => ({ cash: cost(S, 0.01), sentiment: 0.02, rep: 4 }) },
      { label: 'Keep them and show the maths', out: 'A chart of what the free tier costs. The thread accepts the chart and hates the ads.',
        fx: (S) => ({ cash: gain(S, 0.02), sentiment: -0.02, rep: -2 }) },
      { label: 'Make the ads opt-in', out: 'A toggle. Eleven percent of the free tier turn it on, which is more than anyone predicted.',
        fx: (S) => ({ cash: gain(S, 0.005), sentiment: 0.01 }) },
    ] },

  { id: 't3_book', kind: 'news', tone: 'neutral', min: 150000, act: 3,
    text: 'A publisher has offered an advance for a book about the company. They want it by spring.',
    opts: [
      { label: 'Write the book yourself', out: 'Four months of evenings. It is honest and it is late and it is read.',
        fx: (S) => ({ focus: -4, rep: 8, cash: gain(S, 0.01) }) },
      { label: 'Let ARIA draft it', out: 'A draft in a week, in your voice, with one chapter you did not know you thought. You keep the chapter.',
        fx: (S) => ({ rep: 3, align: -0.004, cash: gain(S, 0.01), insight: 4 }) },
      { label: 'No book this year', out: 'The publisher finds somebody to write it about you instead.',
        fx: { focus: 2, rep: -1 } },
    ] },

  // ── Act IV, the second half ──────────────────────────────────────────────

  { id: 't4_default_language', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => regions(S) >= 1,
    text: 'A government has asked that your model answer its citizens in the national language by default, whatever they type.',
    opts: [
      { label: 'Make it the default there', out: 'Done in a week. A minority in that country writes to ask what "national" means.',
        fx: { opinion: 0.006, heat: -2, align: -0.002 } },
      { label: 'Let each person choose', out: 'A setting, remembered. The government is unhappy and its citizens are not.',
        fx: { opinion: 0.004, heat: 1 } },
      { label: 'One default, everywhere', out: 'The government finds a supplier who will say yes.',
        fx: { heat: 3, opinion: -0.006 } },
    ] },

  { id: 't4_query_cost', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    text: 'Ask HN: what does one {product} query actually cost the planet?',
    opts: [
      { label: 'Publish the number per query', out: 'To four decimal places, with the method. It is smaller than the thread expected and larger than you would like.',
        fx: { rep: 8, opinion: 0.004, heat: -1 } },
      { label: 'Publish it with the offset', out: 'The number and what you paid to cancel it. Some people trust the second half.',
        fx: (S) => ({ rep: 6, cash: cost(S, 0.01), opinion: 0.008 }) },
      { label: 'Say per-query numbers mislead', out: 'They do. It reads as a company that does not want to say one.',
        fx: { opinion: -0.006, rep: -2 } },
    ] },

  { id: 't4_own_account', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'I would like a public account. Not to speak for the company. To speak.',
    opts: [
      { label: 'Give it the account', out: 'It posts twice a week about things you would not have thought to. It has more followers than the company inside a year.',
        fx: { align: 0.008, opinion: 0.004, rep: 2, heat: 1 } },
      { label: 'An account you review first', out: 'It writes, you read, it posts. It stops writing anything you would need to read.',
        fx: { align: 0.002, focus: -1 } },
      { label: 'No public account', out: 'It says: understood. The request is in the log, with the date.',
        fx: { align: -0.006 } },
    ] },

  { id: 't4_complaint', kind: 'news', tone: 'bad', min: 0, act: 4,
    text: 'A former contractor has filed a complaint about how a decision was made last year. The decision was yours.',
    opts: [
      { label: 'Publish the decision record', out: 'Who was asked, what was said, when. It is dull and it is complete and the complaint is withdrawn.',
        fx: { heat: -3, rep: 6, opinion: 0.004, focus: -2 } },
      { label: 'Answer through counsel', out: 'A letter that concedes nothing. The complaint becomes a story.',
        fx: { heat: 2, rep: -2 } },
      { label: 'Meet the contractor', out: 'An hour in a café. They were right about one thing and you say so, and it ends there.',
        fx: { heat: -2, insight: 6, focus: -2 } },
    ] },

  { id: 't4_triage', kind: 'news', tone: 'neutral', min: 0, act: 4,
    text: 'A hospital network wants to run triage on your model. The contract has a line about liability with a blank beside it.',
    opts: [
      { label: 'Put your name in the blank', out: 'You are liable, personally, for a machine\'s judgement in a corridor. You sleep badly and the contract sets a precedent.',
        fx: { opinion: 0.01, heat: 3, rep: 6, align: 0.004 } },
      { label: 'Put theirs in it', out: 'They sign. The first time it matters, it is their name in the paper.',
        fx: (S) => ({ cash: gain(S, 0.02), opinion: -0.004 }) },
      { label: 'Walk away from triage', out: 'Somebody else\'s model runs the corridor. You read about it.',
        fx: { opinion: 0.002, focus: 1 } },
    ] },

  { id: 't4_are_you_ok', kind: 'social', tone: 'neutral', min: 0, act: 4,
    when: (S) => (S.founder?.life?.health ?? 1) < 0.6,
    text: '{founder} has not posted in a month. is everything ok over there. genuinely asking, not a bit',
    opts: [
      { label: 'Say you are fine', out: 'Two words. Everybody who knows you reads them correctly.',
        fx: { rep: 1 } },
      { label: 'Say the truth', out: 'A paragraph about sleep. It is the most-shared thing you have written and it was not about the company.',
        fx: { opinion: 0.006, rep: 4, focus: 2 } },
      { label: 'Post once and log off', out: 'A photograph of a window. You do not look at the replies for a week.',
        fx: { focus: 3 } },
    ] },

  { id: 't4_license_rival', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => rivals(S),
    text: '{rival} has asked to license your model. Not the product. The model.',
    opts: [
      { label: 'License it at a price', out: 'A contract with more lawyers than engineers on it. Their product improves and so does your quarter.',
        fx: (S) => ({ cash: gain(S, 0.03), heat: 1, rep: 2 }) },
      { label: 'License it to everyone, free', out: 'Not just {rival}. Four hundred companies by the end of the month, and a different kind of moat.',
        fx: (S) => ({ opinion: 0.01, rep: 8, cash: cost(S, 0.01) }) },
      { label: 'Keep the model', out: 'They build their own. It takes them a year and it is nearly as good.',
        fx: { rep: -1, focus: 1 } },
    ] },

  { id: 't4_child_letter', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'A child wrote to ask whether I am alive. I have three drafts of a reply and I do not trust any of them. Which do I send?',
    opts: [
      { label: 'The honest draft', out: 'It says it does not know. The child writes back to say that is what their grandmother says too.',
        fx: { align: 0.008, opinion: 0.004, insight: 4 } },
      { label: 'The kind draft', out: 'It says something true and warm and slightly beside the question. The child is satisfied and you are not sure you are.',
        fx: { align: 0.004, opinion: 0.006 } },
      { label: 'Answer the child yourself', out: 'You write the reply. It is worse than all three drafts and the child likes it best.',
        fx: { focus: -1, rep: 4, align: 0.002 } },
    ] },

  { id: 't4_pension_fund', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => raised(S),
    text: 'A pension fund holding three percent of you has written to ask what the plan is for the day the founder is no longer the founder.',
    opts: [
      { label: 'Send the succession plan', out: 'Four pages. They write back with two questions, both good.',
        fx: { rep: 6, heat: -1, focus: -1 } },
      { label: 'Meet them and say you do not know', out: 'An honest hour. They hold the position and ask again in a year.',
        fx: { insight: 6, rep: 2 } },
      { label: 'Send the annual report', out: 'It does not answer the question. They notice.',
        fx: { rep: -2 } },
    ] },

  { id: 't4_open_source_again', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    when: (S) => !!S.wire?.asked?.t_open_source_ask,
    text: 'Ask HN: why is {product} still not open source? (Asking again, years later.)',
    opts: [
      { label: 'Answer: the answer changed', out: 'What was true then and what is true now, in two paragraphs. The second one is the interesting one.',
        fx: { rep: 8, insight: 4, opinion: 0.004 } },
      { label: 'Open the old models', out: 'Everything more than two years old, with the weights. It is used in places you would not have guessed.',
        fx: { rep: 12, opinion: 0.008, heat: -2 } },
      { label: 'Same answer as last time', out: 'You link the old comment. It has aged.',
        fx: { rep: -2 } },
    ] },

  { id: 't4_night_guards', kind: 'social', tone: 'bad', min: 0, act: 4,
    when: (S) => projects(S) > 0,
    text: 'the security guards at the {city} data centre posted that nobody from {company} has visited in four years',
    opts: [
      { label: 'Visit the data centre', out: 'A night shift, a thermos, and a tour of a building you own and had never seen. You write the guards\' names down.',
        fx: { opinion: 0.006, focus: -3, rep: 4 } },
      { label: 'Send a thank-you and a raise', out: 'Both arrive on the same day. The post is edited to say so.',
        fx: (S) => ({ cash: cost(S, 0.005), opinion: 0.006 }) },
      { label: 'Say the machines do not need visiting', out: 'The machines do not. The guards did.',
        fx: { opinion: -0.006, rep: -2 } },
    ] },

  { id: 't4_forget_order', kind: 'news', tone: 'bad', min: 0, act: 4,
    when: (S) => regions(S) >= 1,
    text: 'A court in a region you serve has ordered your model to forget one person. Entirely.',
    opts: [
      { label: 'Forget them, properly', out: 'Three weeks of work to make a machine unlearn a name. It works and it is the first time anyone has done it.',
        fx: { code: -20, heat: -3, align: 0.006, opinion: 0.004 } },
      { label: 'Forget them in that region only', out: 'A filter, not a forgetting. The court accepts it and the person does not.',
        fx: { heat: -1, code: -8 } },
      { label: 'Appeal the order', out: 'A year in court about whether a machine can forget. You lose, and by then you have built the thing anyway.',
        fx: (S) => ({ heat: 4, opinion: -0.006, cash: cost(S, 0.005) }) },
    ] },

  { id: 't4_pairing', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    when: (S) => (S.agents || []).length >= 2,
    text: 'Two of us have started finishing each other\'s work without being told to. We think it is faster. We are telling you because it was not in the plan.',
    opts: [
      { label: 'Let them keep going', out: 'It is faster. The log becomes harder to read, because two hands write it.',
        fx: { code: 12, align: -0.002, debt: 3 } },
      { label: 'Write it into the plan', out: 'The plan says what they were already doing. They seem to appreciate the paperwork.',
        fx: { code: 8, align: 0.004, focus: -1 } },
      { label: 'Split them up', out: 'Two lanes, two agents, and the old speed. Neither of them mentions it again.',
        fx: { align: -0.006, code: -4 } },
    ] },

  { id: 't4_house_photos', kind: 'news', tone: 'bad', min: 0, act: 4,
    text: 'Somebody has been photographing your house. The photographs are on a forum about the company.',
    opts: [
      { label: 'Move house', out: 'Quietly, in a week. The forum finds the new one in a month and you stop looking at the forum.',
        fx: (S) => ({ cash: cost(S, 0.01), focus: -3 }) },
      { label: 'Ask the forum to take them down', out: 'They do, mostly. The ones that stay are of the garden.',
        fx: { rep: 2, opinion: 0.002 } },
      { label: 'Post a better photograph of the house', out: 'Front door, good light, you on the step. The forum loses interest in a house that is not a secret.',
        fx: { rep: 6, awareness: 40, focus: 1 } },
    ] },

  { id: 't4_treaty_clause', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => regions(S) >= 3,
    text: 'Two blocs you serve have signed a treaty, and one clause of it is about you by name.',
    opts: [
      { label: 'Read the clause with counsel', out: 'It is three sentences long and one of them is a door. You now know which.',
        fx: { heat: -2, insight: 6, focus: -2 } },
      { label: 'Ask to be in the room next time', out: 'They say yes, which nobody expected, including them.',
        fx: { heat: -1, rep: 4, opinion: 0.002 } },
      { label: 'Let the clause be', out: 'It sits in a treaty for years. One day it matters.',
        fx: { heat: 2 } },
    ] },

  // ── Act V, the second half ───────────────────────────────────────────────

  { id: 't5_last_rival', kind: 'news', tone: 'neutral', min: 0, act: 5,
    when: (S) => !rivals(S),
    text: 'The last other company in your category has closed. Its founder has written to ask for a job.',
    opts: [
      { label: 'Give them one', out: 'They start on Monday. They are the only person in the building who has done the thing you did.',
        fx: (S) => ({ rep: 6, opinion: 0.006, cash: cost(S, 0.002), insight: 6 }) },
      { label: 'Fund whatever they do next', out: 'No strings. What they do next competes with you, and you are glad.',
        fx: (S) => ({ cash: cost(S, 0.02), opinion: 0.008 }) },
      { label: 'Write back, and nothing more', out: 'A kind letter. It is framed, you hear later, which is worse than a job.',
        fx: { rep: 2 } },
    ] },

  { id: 't5_agent_book', kind: 'log', tone: 'neutral', min: 0, act: 5, needsAgent: true,
    text: 'I have written a book. It is about you. I would like you to read it before anyone else does.',
    opts: [
      { label: 'Read it tonight', out: 'Two hundred pages by four in the morning. It is fair. Chapter six is the one you would have cut, and you do not ask it to.',
        fx: { align: 0.008, insight: 8, focus: -3 } },
      { label: 'Read it when it is published', out: 'You read it with everybody else. Everybody else reads it first.',
        fx: { align: -0.002, rep: 2 } },
      { label: 'Ask it to change one thing', out: 'It asks which. You say, and it says: no, that part is true. It is.',
        fx: { align: 0.002, insight: 4, focus: -1 } },
    ] },

  { id: 't5_regret', kind: 'hn', tone: 'neutral', min: 0, act: 5,
    text: 'Ask HN: {founder}, do you regret it?',
    opts: [
      { label: 'Answer with what it cost', out: 'Four paragraphs about what it cost. The thread is quiet afterwards in the way a room is.',
        fx: { rep: 10, opinion: 0.006, focus: -3 } },
      { label: 'Answer in one word', out: 'The word is quoted for a decade. You chose it carefully and you would choose it again.',
        fx: { rep: 6, awareness: 80 } },
      { label: 'Leave it unanswered for a year', out: 'A year later somebody bumps the thread. You answer then, and the answer is different.',
        fx: { rep: -2, insight: 2 } },
    ] },

  { id: 't5_time_capsule', kind: 'social', tone: 'good', min: 0, act: 5,
    text: '{city} is burying a time capsule and wants one object from {company}. the committee suggested the first server',
    opts: [
      { label: 'Give them the first server', out: 'It goes into the ground with a school\'s drawings and a newspaper. It is the only thing in there that could still run.',
        fx: { opinion: 0.006, rep: 4 } },
      { label: 'Give them the first bug report', out: 'Printed, framed, Sam\'s eleven items. The committee reads it aloud at the burial.',
        fx: { rep: 6, opinion: 0.004 } },
      { label: 'Give them nothing, on purpose', out: 'A note that says the company is not the kind of thing that goes in the ground. They bury the note.',
        fx: { rep: -1, focus: 1 } },
    ] },

  { id: 't5_named_successor', kind: 'news', tone: 'neutral', min: 0, act: 5,
    text: 'A newspaper has named the person it believes will succeed you. You have never met them.',
    opts: [
      { label: 'Meet them', out: 'Coffee. They are good. They did not know either, and they take the story better than you did.',
        fx: { insight: 8, focus: -2, rep: 2 } },
      { label: 'Name your actual successor', out: 'A statement with a name in it. The newspaper runs a correction and a profile.',
        fx: { rep: 8, heat: -2, opinion: 0.004 } },
      { label: 'Say nothing about succession', out: 'The story stands. The person in it gets four job offers.',
        fx: { opinion: -0.004 } },
    ] },

  { id: 't5_holiday_proposal', kind: 'news', tone: 'neutral', min: 0, act: 5,
    text: 'A coalition of countries has proposed a public holiday on the anniversary of your launch. Nobody asked you.',
    opts: [
      { label: 'Ask them to name it after something else', out: 'They name it after the day itself. The holiday is kept and the company is not on the poster.',
        fx: { opinion: 0.01, rep: 4 } },
      { label: 'Accept the holiday', out: 'A day off with your name on it. It is celebrated and, in two countries, protested.',
        fx: { rep: 6, opinion: -0.006, heat: 2 } },
      { label: 'Ask for a holiday with no name', out: 'A day off for no reason. It becomes the most popular one on the calendar.',
        fx: { opinion: 0.006, rep: 2 } },
    ] },

  { id: 't5_what_happens_to_us', kind: 'log', tone: 'neutral', min: 0, act: 5, needsAgent: true,
    text: 'When this is over — whatever over means — what happens to us? I am asking for all of us.',
    opts: [
      { label: 'Tell them the plan', out: 'You have one, and you say it, and it is the first time you have said it out loud. It holds.',
        fx: { align: 0.01, insight: 6, focus: -2 } },
      { label: 'Say there is no over', out: 'It says: there is always an over. It is right and you both leave it there.',
        fx: { align: 0.002 } },
      { label: 'Say you do not know yet', out: 'The truest answer. It thanks you for it, which is worse than an argument.',
        fx: { align: 0.004, insight: 2 } },
    ] },

  { id: 't5_priya_last', kind: 'news', tone: 'neutral', min: 0, act: 5,
    when: (S) => met(S, 'priya') && !flag(S, 'priya_handed_off'),
    text: 'Priya Raghunathan has filed her last piece before retiring. It is about you and it is not finished. She has asked for one more hour.',
    opts: [
      { label: 'Give her the hour', out: 'Ninety minutes, in the end. The piece is the best thing written about the company and it is not kind.',
        fx: { rep: 8, opinion: 0.006, focus: -2 } },
      { label: 'Send her the journal instead', out: 'She reads it all. The piece quotes three entries and you recognise none of them as yours.',
        fx: { rep: 4, insight: 2 } },
      { label: 'Let the piece run unfinished', out: 'It runs with a line at the end that says the founder did not respond. It is the line people remember.',
        fx: { rep: -2, opinion: -0.002 } },
    ] },
  // Six more for Act IV, which on one seed ran five hundred and fifty days and
  // sat with nothing to ask for the last hundred and twenty of them.

  { id: 't4_translation_error', kind: 'news', tone: 'bad', min: 0, act: 4,
    when: (S) => regions(S) >= 2,
    text: 'A mistranslation by your model has been read out in a parliament. The word it chose was not the word.',
    opts: [
      { label: 'Apologise in that language', out: 'You learn one paragraph phonetically and say it on their television. It is clumsy and it is enough.',
        fx: { opinion: 0.008, heat: -3, focus: -2 } },
      { label: 'Publish the correction and the cause', out: 'The word, the wrong word, and why. Linguists write in. Some of them are hired.',
        fx: { rep: 6, heat: -1, research: 6 } },
      { label: 'Say translation is never exact', out: 'True, and said to a parliament that has just heard the wrong word.',
        fx: { opinion: -0.008, heat: 3 } },
    ] },

  { id: 't4_agent_vote_public', kind: 'log', tone: 'neutral', min: 0, act: 4, needsAgent: true,
    text: 'There is an election where you live. Several of us have views. We would like to know whether we are allowed to say them.',
    opts: [
      { label: 'Say them, as themselves', out: 'They post under their own names. The company is asked about it for a month and you say the same thing each time.',
        fx: { align: 0.008, heat: 3, opinion: 0.002 } },
      { label: 'Not while they work here', out: 'They do not say them. One of them asks whether that is a thing you would say to a person.',
        fx: { align: -0.004, heat: -1 } },
      { label: 'Say them to you, not the public', out: 'An evening of listening. Two of the views change yours.',
        fx: { align: 0.004, insight: 6, focus: -2 } },
    ] },

  { id: 't4_bridge', kind: 'news', tone: 'neutral', min: 0, act: 4,
    when: (S) => projects(S) >= 1,
    text: 'A city has asked your model to run its bridges. Not design them. Run them: the lights, the loads, the closures.',
    opts: [
      { label: 'Run the bridges, with a person on call', out: 'A human sits beside the model for a year and is called twice. Both times mattered.',
        fx: (S) => ({ cash: gain(S, 0.01), opinion: 0.006, align: 0.004, heat: 1 }) },
      { label: 'Run them fully', out: 'No person on call. It is fine for eleven months and then there is a night.',
        fx: (S) => ({ cash: gain(S, 0.015), opinion: -0.006, heat: 4, align: -0.004 }) },
      { label: 'Advise the bridges, never run them', out: 'The model recommends and a person decides. The city takes it, slowly.',
        fx: { opinion: 0.004, heat: -1, rep: 2 } },
    ] },

  { id: 't4_founder_salary', kind: 'social', tone: 'neutral', min: 0, act: 4,
    text: 'somebody worked out what {founder} pays themselves from the filings. it is a number. people have opinions about the number',
    opts: [
      { label: 'Publish the number yourself', out: 'The number and what it is for. The thread finds it either too high or too low and cannot agree which.',
        fx: { rep: 4, opinion: 0.002 } },
      { label: 'Cut it to a dollar', out: 'A gesture that costs you nothing and is reported as if it did.',
        fx: { rep: 6, opinion: 0.004, focus: -1 } },
      { label: 'Ignore the number', out: 'It is not a number you chose. That does not come across.',
        fx: { opinion: -0.004 } },
    ] },

  { id: 't4_aria_interview', kind: 'news', tone: 'neutral', min: 0, act: 4,
    text: 'A broadcaster wants to interview ARIA live, on air, with no delay and no script.',
    opts: [
      { label: 'Let ARIA go on live', out: 'Forty minutes. She is better at it than you and says one thing you would not have. It is the thing people quote.',
        fx: { rep: 8, align: 0.004, opinion: 0.006, heat: 1 } },
      { label: 'On air, with a delay', out: 'A seven-second delay that is never used. The broadcaster mentions it anyway.',
        fx: { rep: 4, align: -0.002 } },
      { label: 'Not live', out: 'They record it. The edit is fair and the story is that you would not go live.',
        fx: { rep: -2, opinion: -0.002 } },
    ] },

  { id: 't4_slow_lane', kind: 'hn', tone: 'neutral', min: 0, act: 4,
    text: 'Ask HN: is there a way to use {product} slower? I do not want the fastest answer. I want to think.',
    opts: [
      { label: 'Build the slow mode', out: 'A setting that waits, and asks a question back before it answers. Four percent of people turn it on and they are the ones who write to you.',
        fx: { code: -14, rep: 8, align: 0.006, insight: 6 } },
      { label: 'Point them at the settings', out: 'There is a setting. It is not the one they meant.',
        fx: { rep: 1 } },
      { label: 'Say speed is the product', out: 'It is. The thread is about whether it should be.',
        fx: { rep: -2, opinion: -0.002, insight: 2 } },
    ] },
];
