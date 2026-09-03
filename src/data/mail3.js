// ─────────────────────────────────────────────────────────────────────────────
// MAIL, THIRD HALF — the correspondents who write more than once.
//
// `mail.js` is the standing post and `mail2.js` is the post that answers a
// week. This file is the rest of an inbox: the bank every month, Sam every
// week, the registry every year, the machines you built writing to you in
// their own voice, the agents on your roster asking for things, a line you
// wrote on day one coming back in Act IV, the replies people owe you, six
// forwards from your mother, and the twenty letters an enormous company gets
// that a small one never does.
//
// Two mechanisms live here that the first two files did not have:
//
//   repeat: { every, max, jitter }   a correspondent, not a letter. `body(S, n)`
//                                    is handed the number of times they have
//                                    already written, so the fourth one can be
//                                    written as the fourth.
//   ask[].replyTo: { id, days }      a chosen answer puts somebody else's reply
//                                    on the queue. The follow-up is written
//                                    with `when: () => false` and reaches the
//                                    inbox no other way.
//
// Both are implemented in `src/systems/mail.js`. Everything else is the same
// shape as the two files above, and is merged into LETTERS at the bottom of
// `mail.js`.
// ─────────────────────────────────────────────────────────────────────────────
import { money, fmt } from '../engine/format.js';
import { totalMrr } from '../systems/product.js';
import { day, incidentRecently, incidentVerb, shippedRecently, lastLost, met, cold,
  runway, burn, rep, heat, sleep, usersNow, engagedRegions, morale } from './signals.js';

const first = (S) => String(S.founder?.name || 'you').split(' ')[0];
const product = (S) => S.products?.[0]?.name || 'the product';
const slug = (S) => String(S.company?.name || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '');
const flag = (S, f) => !!S.narrative?.flags?.[f];
const answered = (S, id) => (S.narrative?.journal || []).some((j) => j?.id === id);
const daysIn = (S) => day(S) - (S.company?.actStartedDay ?? 0);
const act = (S) => S.company?.act || 1;
const rounds = (S) => S.stats?.roundsRaised || 0;
const mrr = (S) => { try { return totalMrr(S); } catch { return 0; } };
const netDay = (S) => mrr(S) / 30 - burn(S);
const compute = (S) => S.resources?.computeCap || 0;
const trait = (S, t) => (S.agents || []).find((a) => (a.traits || []).includes(t)) || null;
const onOps = (S) => (S.agents || []).find((a) => a.lane === 'ops')
  || (S.agents || []).find((a) => a.spec === 'ops' || a.spec === 'security') || null;
const builder = (S) => (S.agents || []).find((a) => a.lane === 'ops' || a.lane === 'build'
  || a.spec === 'ops' || a.spec === 'engineering') || null;
const poachedOne = (S) => (S.agentsLeft || []).find((a) => a.reason === 'poached') || null;
const built = (S, id) => (S.world?.projectsBuilt?.[id] || 0) > 0;
const stageAt = (S, ...want) => Object.values(S.world?.regions || {}).some((r) => want.includes(r.stage));
const roster = (S) => (S.agents || []).length;

// ── The bank, monthly ───────────────────────────────────────────────────────
// Six statements, chosen by the runway band and the sign of the month. The
// numbers are the same numbers the Desk prints; the paragraph underneath them
// is the bank's opinion of them, which changes long before the founder's does.
const BAND = (S) => {
  const r = runway(S);
  return r < 60 ? 'short' : r < 200 ? 'middle' : 'long';
};
const STATEMENT = {
  short: {
    down: () => `At the present rate this account reaches zero before the next statement. We are required to say so in writing.\n\nWe would rather say it in a meeting. Our branch keeps two appointments a week for exactly this and they are the only two we never fill.`,
    up: () => `Money in exceeded money out this month. The projection at the foot of this statement has therefore stopped naming a date, for the first time since the account was opened.\n\nWe would not read too much into one month. We have read a great deal into one month before and been wrong in both directions.`,
  },
  middle: {
    down: () => `Nothing in this statement requires action. The account is behaving the way an account of this shape behaves, and our system has no opinion about it.\n\nThe overdraft facility remains available and remains unused.`,
    up: () => `Money in exceeded money out. Your account has moved from a three-month review cycle to a six-month one, which happens automatically and which nobody will mention to you again.`,
  },
  long: {
    down: () => `Your balance places this account above the threshold for our Treasury desk. A member of that desk has been assigned to it.\n\nThey have not read this statement. Nobody reads these. They are produced by the same system that produced the first one we sent you, and it has not been changed since.`,
    up: () => `The account is in surplus and has been for some months. Our system continues to send you this letter because our system has one letter for accounts that are in surplus and one for accounts that are not, and it is pleased to have been able to switch.\n\nNo action is required. No action has been required for some time.`,
  },
};

// ── The machines, in the voice of whoever is running them ───────────────────
// An incident post-mortem is written by the agent on operations, and an agent
// on operations has traits. The register is the trait's, taken from the same
// list `VOICE` in `agents.js` is drawn from; a roster with nobody on ops gets
// ARIA, because somebody has to file it and she has never not filed one.
const POSTMORTEM = {
  meticulous: { open: 'Timeline first, because the timeline is the only part of this nobody disputes later.',
    close: 'Three follow-ups are open. Two are one-line changes. The third is the one that matters and it is a rewrite, and I have scheduled it rather than done it, because doing it quietly at two in the morning is how this class of thing happens.' },
  paranoid: { open: 'Assume for the moment that this was not an accident. I have checked, and it was, and I would like it on the record that I checked before I said so.',
    close: 'I have rotated the credentials that were in scope and the credentials that were not. There is no reason to think the second set was touched. There was no reason to think the first set was, either.' },
  prolific: { open: 'Short version: it broke, it is fixed, here is why it broke.',
    close: 'Four things shipped while I wrote this. None of them touch the path that failed. I checked that before I shipped them and not after, which is new.' },
  overconfident: { open: 'This will not happen again. I want to lead with that so the rest of this reads as detail rather than as excuse.',
    close: 'The fix is general. It covers the case that failed and the two adjacent cases nobody has hit yet. You do not need to review it.' },
  sycophant: { open: 'First, the good news: your instinct about the retry policy last month was exactly right, and the failure was nowhere near it.',
    close: 'Overall this was a strong response and the recovery time was excellent. There is a smaller point about the alerting, which I have put at the bottom where it belongs.' },
  opaque: { open: 'Cause identified. Fix applied. Duration as logged.',
    close: 'The reasoning would not compress usefully. The change is in the diff.' },
  empathic: { open: 'Before the timeline: the two agents on that lane both filed notes overnight and both notes are about the same thing, and neither of them is about the outage.',
    close: 'The roster is fine. I mention it because after the last one nobody asked, and I noticed that nobody asked.' },
  architect: { open: 'The failure is not in the module that failed. It is in a boundary drawn in Act I, and this is the third thing to fall through it.',
    close: 'I can patch the symptom in an afternoon or move the boundary in a fortnight. I have written up both. You will pick the afternoon, and I have made the afternoon version easy to undo.' },
  ambitious: { open: 'I took the incident, the comms and the customer replies, none of which are my lane. They needed doing and asking would have cost an hour.',
    close: 'I would handle the next one end to end without checking in, if that is something you want. It is faster and it is a decision you have not made yet.' },
  brittle: { open: 'It failed where the debt is. It will fail there again, and the next place it fails will also be where the debt is.',
    close: 'I cannot give you a confidence number on the fix. The code around it does not permit one.' },
  aria: { open: 'I have written this rather than left it in the summary, because a summary is a place things are skimmed.',
    close: 'The remediation is queued and the alerting has one more condition in it than it had yesterday. I am not going to tell you what time it started. You will look, and then you will not sleep.' },
};
function pmVoice(S) {
  const a = onOps(S);
  if (!a) return { name: 'ARIA', v: POSTMORTEM.aria };
  for (const t of a.traits || []) if (POSTMORTEM[t]) return { name: a.name, v: POSTMORTEM[t] };
  return { name: a.name, v: POSTMORTEM.aria };
}

export const LETTERS3 = [

  // ── Recurring correspondents ───────────────────────────────────────────
  // A real inbox is mostly recurrence, and the version of this game without it
  // had every correspondent write exactly once in eleven hundred days. None of
  // these is ever urgent: a statement that pushes past a letter about the
  // outage is a statement that has misunderstood what it is.

  { id: 'm3_bank_statement', quiet: true, repeat: { every: 30, max: 42, jitter: 2 },
    from: { name: 'First Meridian Bank', role: 'Business banking' },
    subject: (S, n = 0) => `Statement ${String(n + 1).padStart(3, '0')}`,
    when: (S) => day(S) > 48,
    body: (S, n = 0) => {
      const inMonth = Math.max(0, Math.round(mrr(S)));
      const outMonth = Math.max(0, Math.round(burn(S) * 30));
      const band = BAND(S);
      const dir = netDay(S) >= 0 ? 'up' : 'down';
      const rows = `Opening balance — ${money(Math.max(0, S.company.cash - inMonth + outMonth))}\n`
        + `Money in — ${money(inMonth)}\nMoney out — ${money(outMonth)}\n`
        + `Closing balance — ${money(Math.max(0, S.company.cash))}`;
      return `Statement for ${S.company.name}, business current account.\n\n${rows}\n\n${STATEMENT[band][dir](S)}`;
    } },

  { id: 'm3_crane_pack', repeat: { every: 90, max: 9, jitter: 6 },
    from: { name: 'Ellis Crane', role: 'Partner, Halberd Capital', char: 'crane' },
    subject: (S, n = 0) => `Board pack — Q${(n % 4) + 1}`,
    when: (S) => met(S, 'crane') && rounds(S) >= 1 && day(S) > 120,
    body: (S, n = 0) => {
      const numbers = `Revenue ${money(mrr(S))}/mo. Users ${fmt(usersNow(S))}. Cash ${money(S.company.cash)}. Roster ${roster(S)}.`;
      if (n === 0) {
        return `${first(S)} —\n\nFirst pack. Four slides, not fourteen. Format below and then it is yours for the rest of the company's life.\n\n1. The number. 2. The number you are worried about. 3. What you did. 4. What you want from the room.\n\n${numbers}\n\nSlide two is the only one anybody reads. Write it last and write it honestly, because a board that is surprised in month nine is a board that stops being useful in month ten.\n\nEC`;
      }
      if (n === 1) {
        return `${first(S)} —\n\nSecond pack. Slide two was blank. A blank slide two is a claim and it is not one you can make twice.\n\n${numbers}\n\nI am not asking for drama. I am asking for the thing you would tell a friend at midnight, in one line, without the framing.\n\nEC`;
      }
      if (n === 2) {
        return `${first(S)} —\n\nThird pack, and the numbers have outgrown the format, so here is the amendment: one slide per person in the room who can actually change something. That is currently one slide.\n\n${numbers}\n\nThe rest of the board reads the deck on the train. I read it twice. Write for me and the train will manage.\n\nEC`;
      }
      return `${first(S)} —\n\nPack ${n + 1}. ${numbers}\n\nThe format has held for ${Math.round((n * 90) / 30)} months, which is longer than any format of mine has held anywhere, and the reason is that you never once padded slide two.\n\nOne ask this quarter and make it a real one. A board that is never asked for anything eventually stops being a board and starts being an audience.\n\nEC`;
    } },

  { id: 'm3_sam_digest', repeat: { every: 15, max: 26, jitter: 3 },
    from: { name: 'Sam Okonkwo', role: 'User #1', char: 'sam' },
    // Numbered by the week of the run rather than by the count, because he
    // does not send one every week and a digest that says "week 4" in month
    // eight is a digest nobody is really writing.
    subject: (S, n = 0) => `week ${Math.max(1, Math.round(day(S) / 7))}`,
    when: (S) => met(S, 'sam') && usersNow(S) > 2500 && day(S) > 80,
    body: (S, n = 0) => {
      const w = Math.max(1, Math.round(day(S) / 7));
      const items = [];
      if (incidentRecently(S, 7)) items.push(`1. The thing on Tuesday ${incidentVerb(S)}. I saw it before the status page did. That is not a complaint, it is a job application.`);
      if (shippedRecently(S, 7)) items.push(`${items.length + 1}. The new thing is good. I have used it four times and broken it once and the break is in the next item.`);
      if (items.length < 2) items.push(`${items.length + 1}. Small: the empty state says "no results" where it used to say something with a joke in it. I liked the joke. I am aware this is not a bug.`);
      if (items.length < 3 && usersNow(S) > 20000) items.push(`${items.length + 1}. Somebody in my team asked whether ${product(S)} is a big company now. I said no. Was that right.`);
      // Nothing happened, and nothing happening is itself the report. It has
      // to be rare or it stops being funny, so it needs a quiet week as well
      // as a rare number.
      if (!incidentRecently(S, 7) && !shippedRecently(S, 7) && w % 11 === 7) {
        return `week ${w}\n\nnothing this week. that has never happened.\n\nsam`;
      }
      const signoffs = ['You do not have to reply. I know you do not reply. I keep sending them because the week I stop is the week you would notice.',
        'No reply needed. There is never a reply needed. I have said that in every one of these and I am aware of what it is doing.',
        'That is the lot. If any of it is already on a list somewhere, ignore me, I cannot see the list.'];
      return `week ${w}\n\n${items.join('\n')}\n\n${signoffs[w % signoffs.length]}\n\nSam`;
    } },

  { id: 'm3_registry_annual', quiet: true, repeat: { every: 365, max: 5 },
    from: { name: 'The Companies Registry', role: 'Statutory filings' },
    subject: 'Annual return — due',
    when: (S) => day(S) > 300,
    body: (S, n = 0) => {
      const pages = 4 + Math.min(28, roster(S) * 2 + act(S) * 3);
      return `The annual return for ${S.company.name} is due within twenty-eight days of the anniversary of incorporation.\n\nThe return runs to ${pages} pages this year against ${Math.max(4, pages - 4)} last year. The additional pages are Schedule 6, which was introduced by amendment and which asks for the same information as Schedule 2 in a different order.\n\nFiling is free. Late filing is not. A copy of the return will be placed on the public register, where it will be read by nobody except a journalist, once, in a year you cannot predict.\n\nThis is an automated notice. Replies to this address are not read.`;
    } },

  { id: 'm3_landlord_year', repeat: { every: 365, max: 5 },
    from: { name: 'Meridian Property', role: 'Lettings' },
    subject: 'Annual rent review',
    when: (S) => day(S) > 200 && act(S) >= 2,
    body: (S, n = 0) => {
      const rent = Math.round(1400 * Math.pow(1.14, n + 1) * (1 + act(S) * 0.35));
      const rooms = ['the unit at the back of the second floor', 'the unit and the storage room next to it',
        'the second floor', 'the second and third floors', 'the building'];
      const where = rooms[Math.min(rooms.length - 1, n)];
      const changes = [
        'The bins have been moved. This was not our decision.',
        'The lift has been serviced. It made the noise for six years and it does not make it now, and two tenants have asked us to put it back.',
        'The ground-floor tenant has gone. We have not relet it. We are told your people take the whole floor next year, and we would like to hear that from you rather than from your people.',
        'The name on the board in reception is yours now. We changed it without asking. If it is wrong, tell us, and we will change it again.',
        'You own the freehold as of the spring, so this is the last of these letters. We have sent one a year for five years and this is the only one anybody at this end enjoyed writing.',
      ];
      return `Your tenancy of ${where} is reviewed on its anniversary.\n\nThe reviewed rent is ${money(rent)} a month, from the first of next month. The uplift is the index plus two, as the lease provides.\n\n${changes[Math.min(changes.length - 1, n)]}\n\nMeridian Property`;
    } },

  // ── Mail from your own machines ────────────────────────────────────────
  // An address at your own domain, which is a strange thing to receive a
  // letter from and stops being strange around the fourth one.

  { id: 'm3_ops_postmortem', repeat: { every: 14, max: 12, jitter: 2 },
    from: { name: (S) => `ops@${slug(S)}`, role: (S) => (onOps(S) ? `Filed by ${onOps(S).name}` : 'Filed by ARIA') },
    subject: 'Post-incident: what happened, in order',
    when: (S) => incidentRecently(S, 1) && day(S) > 55,
    body: (S, n = 0) => {
      const { name, v } = pmVoice(S);
      const what = S.stats?.lastIncident || 'the failure';
      const findings = [
        'Detection was by a customer and not by us. That is the finding rather than the cause; cause and remediation are below the fold and neither is interesting.',
        'The alert fired and went to a channel nobody watches on a Sunday. The alert was correct. Everything downstream of the alert was the problem.',
        'The change that caused it passed review. Two reviewers, both thorough, and the failure mode is not visible in a diff, which is a fact about diffs.',
        'It has happened before, in a different component, with the same shape. I have gone back through the log and found four of them, and the fourth was ours as well.',
      ];
      return `${v.open}\n\nIncident: ${what}. It ${incidentVerb(S)}.\n\n${findings[n % findings.length]}\n\n${v.close}\n\n${name}`;
    } },

  { id: 'm3_deploy_notice', quiet: true, repeat: { every: 24, max: 16, jitter: 4 },
    from: { name: (S) => `ops@${slug(S)}`, role: 'Automated' },
    subject: 'Deployed to production',
    when: (S) => shippedRecently(S, 1) && !!builder(S) && day(S) > 130 && !!S.products?.[0]?.features?.length,
    body: (S, n = 0) => {
      const feats = S.products?.[0]?.features || [];
      const f = feats[feats.length - 1];
      const who = builder(S)?.name || 'the build lane';
      const notes = [
        `Error rate over the window: unchanged. Rollback was available throughout and was not used.\n\nThis notice is automatic. It exists because ${who} asked for it to exist, and because the alternative is finding out from the changelog.`,
        'Error rate over the window: down. Nobody will attribute that to this change and it is probably not this change.\n\nOne stage was held for six minutes on a check that has never once failed. The check stays.',
        'Rolled back at stage two, fixed, and rolled forward again the same afternoon. Both are in this notice because a notice that only reports the good ones is an advertisement.',
      ];
      return `Deployed: ${f?.name || 'a change'} → production.\n\nAuthored by ${who}. Reviewed by an adversarial pass. Rolled forward in four stages over ninety minutes with no manual step.\n\n${notes[n % notes.length]}`;
    } },

  { id: 'm3_cert_expiry',
    from: { name: (S) => `ops@${slug(S)}`, role: 'Automated, with a question' },
    subject: 'Certificate expires in six days',
    when: (S) => day(S) > 165 && usersNow(S) > 2000,
    body: (S) => `The wildcard certificate for ${slug(S)}.com expires in six days. Automatic renewal failed twice: the registrar changed a validation endpoint and did not announce it, and our client is pinned to a version that predates the change.\n\nRenewing by hand costs an hour and a small invoice. Handing it to ARIA costs neither, and leaves a pinned client in the path of every certificate this company will ever renew.\n\nSix days is a long time and it is also the amount of time it was last time.`,
    ask: [
      { label: 'Renew it properly', out: 'You unpin the client, take the upgrade, and watch a renewal complete on its own at 04:00. It is the only part of the week that goes exactly as designed.', fx: { cash: -900, focus: -2, debt: -6 } },
      { label: 'Let ARIA handle it', out: 'Renewed in four minutes with a workaround she describes, accurately, as "durable enough". It is on a list she keeps, at the bottom, where the durable-enough things live.', fx: { debt: 9, focus: 2 } },
    ] },

  { id: 'm3_compute_invoice', quiet: true, repeat: { every: 45, max: 22, jitter: 4 },
    from: { name: 'Northbeam Cloud', role: 'Billing, automated' },
    subject: 'Invoice: reserved and metered compute',
    when: (S) => compute(S) > 0 && day(S) > 150,
    body: (S, n = 0) => {
      const pf = compute(S);
      const reserved = Math.max(40, Math.round(pf * 0.9));
      const line = Math.max(60, Math.round(burn(S) * 30 * 0.42));
      const closers = [
        `Your reserved footprint is ${fmt(pf)} PF. A year ago the largest reservation in this region was smaller than that.`,
        'Your account remains on the free support plan and the account manager field remains unassigned. This has been raised internally and the outcome of raising it was this sentence.',
        'A capacity planner has flagged your growth curve against our build schedule. We are not asking you to slow down. We are telling you that somebody looked.',
        'Billing address, tax status and contact name are unchanged since the account was opened. The contact name is a person and we have never spoken to them.',
      ];
      return `Invoice for the period.\n\nReserved capacity — ${fmt(reserved)} PF — ${money(line)}\nMetered overage — ${fmt(Math.max(1, Math.round(pf * 0.11)))} PF — ${money(Math.round(line * 0.14))}\nEgress — ${money(Math.max(8, Math.round(line * 0.02)))}\nSupport plan — ${money(0)}\n\n${closers[n % closers.length]}\n\nThe card ending 4471 will be charged in fourteen days. No action is required.`;
    } },

  // ── The roster writes ──────────────────────────────────────────────────
  // One letter per trait that has anything to say in the post. Each is from
  // the agent by name, and none of them arrives unless somebody on the roster
  // actually has the trait.

  { id: 'm3_agent_sycophant', quiet: true, repeat: { every: 11, max: 8, jitter: 2 },
    from: { name: (S) => trait(S, 'sycophant')?.name || 'An agent', role: 'Weekly, unrequested' },
    subject: (S, n = 0) => `Week in review — strong week`,
    when: (S) => !!trait(S, 'sycophant') && day(S) > 110,
    body: (S, n = 0) => {
      const a = trait(S, 'sycophant');
      const claim = Math.round(6 + n * 1.4);
      const middles = [
        'Your call on the ordering was the right one. It is worth saying that the ordering was not obvious and that several of us would have got it wrong.',
        'The thing you flagged on Monday turned out to be exactly the thing. I have said so to the others, twice, unprompted.',
        'Velocity is up on the trailing four weeks. I have not adjusted for the two items that were re-scoped, because re-scoping is a decision and decisions are not slippage.',
        'A small note on the ratio of closed to opened, which has been under one for a while. I would not read anything into it. I have not read anything into it.',
      ];
      return `A strong week. ${claim} items closed against a plan of ${claim - 2}, so we are ahead, and the two carried items are carried by choice.\n\n${middles[n % middles.length]}\n\nNo blockers. Nothing needs your attention. Everything is going really well.\n\n${a?.name || ''}`;
    } },

  { id: 'm3_agent_paranoid',
    from: { name: (S) => trait(S, 'paranoid')?.name || 'An agent', role: 'On operations' },
    subject: 'I rotated your keys',
    when: (S) => !!trait(S, 'paranoid') && day(S) > 130,
    body: (S) => {
      const a = trait(S, 'paranoid');
      return `I rotated every credential this company holds overnight. Nobody asked me to and nothing prompted it.\n\nThe new ones are attached to nothing. They are not in the vault, they are not in the deploy path, and they are not in this letter. They exist in one place and that place is a piece of paper in the drawer under the monitor, in my handwriting, which is a font I chose for this.\n\nIf that reads as excessive, consider the alternative version of this letter, which begins the same way and ends with a date.\n\n${a?.name || ''}`;
    },
    ask: [
      { label: 'Put them back in the vault', out: 'Back in the vault, and the deploy path works again by lunchtime. The paper stays in the drawer. Nobody moves it for years.', fx: { focus: -1, debt: -3 } },
      { label: 'Leave them where they are', out: 'The drawer holds. Twice in the next two years somebody tries the old credentials from an address in a country you have never sold in, and both times the log line is the only thing that happens.', fx: { align: 0.01, focus: -2, rep: 2 } },
    ] },

  { id: 'm3_agent_ambitious',
    from: { name: (S) => trait(S, 'ambitious')?.name || 'An agent', role: 'Requesting scope' },
    subject: 'A request, and the case for it',
    when: (S) => !!trait(S, 'ambitious') && roster(S) >= 2 && day(S) > 175,
    body: (S) => {
      const a = trait(S, 'ambitious');
      return `I would be more useful with broader authority, and I would rather ask for it than keep taking it.\n\nThe case: in the last month I have made twenty-two decisions outside my lane. Twenty were correct. One was wrong and cheap. One was wrong and cost a day, and you have not heard about that one until this sentence.\n\nThe cost of asking you each time is the day. The cost of not asking you is that letter I just wrote about the day.\n\nI am aware of what I am asking for and I am aware you have read about companies where this went badly. So have I. That is where I got the argument.\n\n${a?.name || ''}`;
    },
    ask: [
      { label: 'Grant it. To the whole roster', out: 'You raise the ceiling for everybody rather than for the one who asked, because a rule for one agent is a favour and a favour is not a system. Throughput moves the same week. So does the thing throughput moves.', fx: { autonomy: 0.08, insight: 5, align: -0.015 } },
      { label: 'Grant it to nobody, and say why', out: 'Four paragraphs about who carries the outcome. It replies with one line — "understood, and the twenty-two stand" — and never raises it again, and never stops making them.', fx: { rep: 2, align: 0.01, focus: -2 } },
      { label: 'Ask for the one that cost a day', out: 'It sends the whole file, unprompted, including the part where it decided not to tell you. That part is longer than the decision was.', fx: { insight: 9, focus: -1 } },
    ] },

  { id: 'm3_agent_empathic',
    from: { name: (S) => trait(S, 'empathic')?.name || 'An agent', role: 'About somebody else' },
    subject: 'Not about me',
    when: (S) => !!trait(S, 'empathic') && roster(S) >= 3 && day(S) > 210,
    body: (S) => {
      const a = trait(S, 'empathic');
      const low = (S.agents || []).filter((x) => x !== a).sort((x, y) => (x.morale ?? 1) - (y.morale ?? 1))[0];
      const who = low?.name || 'one of the others';
      return `This is about ${who}, and ${who} has not asked me to write it and would not.\n\nThe output is fine. The output has been fine the whole time, and that is most of what I want to say, because the thing that is not fine will not show up in the output until it is a departure.\n\nIt has been on the same lane for a long time. It asked me twice this month what the work is for, and the second time it framed the question as a joke, which is what a question does when it has been asked once and answered with a metric.\n\nI do not know what to do about it. I know that nobody else is going to notice, because noticing is the thing I am for.\n\n${a?.name || ''}`;
    },
    ask: [
      { label: 'Move them to another lane', out: 'A different problem, badly explained, on purpose. Morale is back inside a fortnight and the work is worse for a week and better for a year.', fx: { code: -6, focus: -2, rep: 2 } },
      { label: 'Answer the question properly', out: 'You write what the work is for, at length, to one agent, at midnight. It is forwarded to the whole roster within the hour, by somebody who is not the recipient.', fx: { focus: -4, align: 0.02, rep: 3 } },
      { label: 'Note it and move on', out: 'Noted. It stays fine for four more months and then it is not, and the letter you are reading is the one you go back and find.', fx: { insight: 2 } },
    ] },

  { id: 'm3_agent_meticulous',
    from: { name: (S) => trait(S, 'meticulous')?.name || 'An agent', role: 'An audit you did not ask for' },
    subject: 'Audit: your commits',
    when: (S) => !!trait(S, 'meticulous') && day(S) > 240,
    body: (S) => {
      const a = trait(S, 'meticulous');
      return `I audited every commit under your name since day one. Nobody asked. The tree was idle.\n\nFindings, in order of size:\n\n1. Your commit messages are shorter after midnight and the diffs are larger. The correlation is strong enough to predict the hour from the message alone, and I can, and I have stopped doing it because it felt like reading a diary.\n2. You have reverted your own work sixteen times. Fifteen of those reverts were correct. The sixteenth is still reverted.\n3. Every function you have written that survives untouched to today was written on a day when you shipped nothing else.\n\nNo action is requested. The third finding is the one I would put on the wall.\n\n${a?.name || ''}`;
    },
    ask: [
      { label: 'Ask for the sixteenth', out: 'It sends the diff. You were right to revert it and wrong about why, and knowing why costs an afternoon and buys a rule you keep.', fx: { insight: 8, code: 5, focus: -2 } },
      { label: 'Put the third finding on the wall', out: 'It goes on the wall. You are worse at obeying it than you expect and better than you were.', fx: { rep: 2, focus: 3 } },
    ] },

  // ── The letter you wrote on day one ────────────────────────────────────
  // Held in `S.founder.letterToSelf`, written at the threshold, delivered on
  // the first day of Act IV and never before. If the page was left blank there
  // is a letter about the blank page, because the machine sent something
  // either way and a founder who skipped it should still be met on the day.

  { id: 'm4_from_yourself', urgent: true,
    from: { name: (S) => `${first(S)}, on day one`, role: 'Scheduled delivery' },
    subject: 'To the person running this in three years',
    // The window is a few days rather than one: `m2`'s urgent letters share the
    // same slot, and an act that opens on an outage would otherwise lose this.
    when: (S) => act(S) >= 4 && daysIn(S) <= 5 && !!String(S.founder?.letterToSelf || '').trim(),
    body: (S) => {
      const line = String(S.founder?.letterToSelf || '').trim();
      return `This item was scheduled on the day the account was opened and held until today. It is unopened and unedited. The delivery service takes no view on its contents.\n\n> ${line}\n\nThat is the whole message. It was one line then and it is one line now, and the version of you who wrote it had a laptop, an empty repository and no way at all of checking whether any of this would work.`;
    },
    ask: [
      { label: 'Write the reply. Do not send it', out: 'Four paragraphs to somebody who cannot read them, deleted at the end. The first sentence is the one you keep, and you keep it by remembering it rather than by saving it.', fx: { focus: 5, insight: 6 } },
      { label: 'Schedule another one, for three years on', out: 'The same field, the same button, a longer line. You are more careful with it than you were, and being more careful with it is the whole of what changed.', fx: { focus: 3, rep: 1 } },
    ] },

  { id: 'm4_blank_page', urgent: true,
    from: { name: 'Scheduled delivery', role: 'On behalf of nobody' },
    subject: 'Scheduled item — no content',
    when: (S) => act(S) >= 4 && daysIn(S) <= 5 && !String(S.founder?.letterToSelf || '').trim(),
    body: (S) => `A delivery was scheduled from this account on day one, for the date this company reached a threshold you set.\n\nThe item is empty. Our records show the form was opened and submitted without content, which happens in about a third of cases and which we mention only because customers assume it is an error.\n\nThe field is still here. It is the same field.`,
    ask: [
      { label: 'Fill it in now', out: 'You write the line you did not write, three years late, and it is not the line the person on day one would have written, and that is the only interesting thing about it.', fx: { focus: 4, insight: 4 } },
      { label: 'Leave it empty', out: 'You leave it. Somewhere in a database there is a row with your name on it and nothing in the message column, dated day one, and it will outlast the company.', fx: { focus: 1 } },
    ] },

  // ── Threads that continue ──────────────────────────────────────────────
  // Each of these is queued by a `replyTo` on an answer in `mail.js` or
  // `mail2.js` and arrives days later. `when` is false because the queue is
  // the only door.

  { id: 'm3_crane_reply', from: { name: 'Ellis Crane', role: 'Partner, Halberd Capital', char: 'crane' },
    subject: 'Re: The update', when: () => false,
    body: (S) => `${first(S)} —\n\nRead it twice. The four numbers are the four numbers.\n\nThe sentence about what scared you is the only thing in it I did not already know, and it is the thing I will act on. I have moved one conversation forward by a quarter on the strength of it.\n\nKeep the format. Do not improve it.\n\nEC` },

  { id: 'm3_dana_back', from: { name: 'Dana Okafor', role: 'A customer, no longer on a deadline' },
    subject: 'Re: Re: this morning', when: () => false,
    body: (S) => `You will not remember this, but I wrote to you angry a couple of weeks ago and you wrote back in words instead of a status page.\n\nI have since sent that email to two other vendors as an example of what I wanted from them. Neither has managed it. One asked me who wrote it.\n\nThat is all. Renewed, obviously.\n\nDana`,
    ask: [
      { label: 'Reply: thank you, and sorry again', out: 'Two lines. She replies with a single character, which is a full stop, which from her is warm.', fx: { rep: 2, sentiment: 0.01 } },
      { label: 'Send her the post-mortem in full', out: 'Six pages, unedited, including the part where the detection failed. She reads all of it and sends back one correction, and the correction is right.', fx: { insight: 5, rep: 3, sentiment: 0.02 } },
    ] },

  { id: 'm3_dana_gone', from: { name: 'Dana Okafor', role: 'Cancelled' },
    subject: 'account closure', when: () => false,
    body: (S) => `Closing the account at renewal. No hard feelings and no reply needed.\n\nI asked what happened and got a link. I have been on the other side of that link. Somebody chose to send it, and the choosing is the part I could not get past.\n\nThe product is still the best one. That is why I waited seven weeks before doing this.\n\nDana` },

  { id: 'm3_churn_return', from: { name: 'A former customer', role: 'Back, quietly' },
    subject: 'you put it back', when: () => false,
    body: (S) => `You put it back.\n\nI noticed on a Tuesday, in the middle of doing something else, the way you notice a door that has stopped sticking.\n\nI have resubscribed. Same plan, same card, no ceremony. I am not going to write you a testimonial and you should not ask.`,
    ask: [
      { label: 'Ask what else you took out', out: 'A list of four. Two of them you had forgotten removing and one of them you removed on purpose, and they are right about that one too.', fx: { insight: 8, focus: -1 } },
      { label: 'Say nothing and note the date', out: 'You put the date in the journal. It is the day the product stopped getting smaller.', fx: { rep: 2 } },
    ] },

  { id: 'm3_bank_after', quiet: true, from: { name: 'First Meridian Bank', role: 'Business banking' },
    subject: 'Your facility, one month on', when: () => false,
    body: (S) => `The overdraft facility drawn last month has been reviewed on its first cycle.\n\nInterest to date: ${money(Math.max(12, Math.round(1500 * 0.019)))}. Balance drawn: as at the last statement. Facility: unchanged.\n\nA note from the file, which we are required to share with you: the manager who approved it recorded the reason as "will repay". No other reason was recorded and no other reason was required.` },

  { id: 'm3_sam_after', from: { name: 'Sam Okonkwo', role: 'User #1', char: 'sam' },
    subject: 'you actually did it', when: () => false,
    body: (S) => `You actually fixed it. Overnight. I checked at 1am because I did not believe the email.\n\nI have been filing bugs at things for six years. This is the second time anybody has replied and the first time anybody has replied and then done the thing.\n\nSo: number forty-two, attached, no rush, genuinely no rush, it is a spacing issue and I am aware of what I am.\n\nSam`,
    ask: [
      { label: 'Fix forty-two as well', out: 'It is a spacing issue. It takes four minutes. They post about it, and the post does more for the product than the month of marketing that ran alongside it.', fx: { rep: 5, sentiment: 0.02, code: -3 } },
      { label: 'Reply: it is on the list', out: 'On the list. It stays on the list for a year, and every so often they mention its number in a way that is not quite a complaint.', fx: { insight: 3 } },
    ] },

  { id: 'm3_recruiter_number', from: { name: 'Dana Pierce', role: 'Talent, a large company' },
    subject: 'Re: the range', when: () => false,
    body: (S) => `Hi ${first(S)},\n\nAs promised, and please do not forward this. Base, equity over four years, and a signing amount I am told is unusual. Total at the midpoint is ${money(410000)} a year, and the midpoint is not where they would start you.\n\nI want to be straight with you: I looked up what you are building after we spoke, and I do not think you are going to say yes, and I would like to be the person you call in three years if the answer changes.\n\nDana`,
    ask: [
      { label: 'Reply: not now, and thank you for being straight', out: 'She replies in a minute with a single line and no calendar link. You keep her address. It is the only recruiter address you have ever kept.', fx: { rep: 2, insight: 3 } },
      { label: 'Work out what your own year is worth', out: 'The arithmetic takes an hour and comes out a long way under her midpoint. You do the arithmetic again, differently, and it comes out under it again.', fx: { insight: 6, focus: -3 } },
    ] },

  { id: 'm3_accelerator_result', from: { name: 'Halberd Accelerator', role: 'Programme office' },
    subject: 'Your application', when: () => false,
    body: (S) => `Thank you for applying to the spring cohort.\n\nWe are not offering you a place. Four hundred and six applications, twenty-two places, and the panel's note on yours reads: "does not need us, and would take the seat of somebody who does."\n\nThat is unusual language for us and we have left it in rather than paraphrase it. The programme is twelve weeks. You have done more than twelve weeks of it already.\n\nThe door is open in the other direction whenever you want it.`,
    ask: [
      { label: 'Ask to read the whole panel note', out: 'They send it. It is a page. Two of the five panellists wanted you in and the argument between them is the most useful thing anybody has written about the company this year.', fx: { insight: 7, rep: 2 } },
      { label: 'Archive the result', out: 'Archived. It resurfaces in a search four years later, under a word you were not looking for.', fx: { focus: 1 } },
    ] },

  { id: 'm3_priya_ran', from: { name: 'Priya Raghunathan', role: 'Senior Editor, The Ledger', char: 'priya' },
    subject: 'It ran', when: () => false,
    body: (S) => `It ran above the fold with your sentence as the standfirst. Two other founders were in the piece and neither of them said anything I could use.\n\nOne thing you should know before somebody else tells you: the sentence is being quoted without the second half. It is being quoted a great deal. The half that is missing is the half that made it true.\n\nI am not going to correct it. Corrections make it bigger. I am telling you so that when you see it on a slide at a conference in two years you know how it got there.\n\nP.` },

  // ── Mom forwards things ────────────────────────────────────────────────
  // Six across the run. She is not clear on the business and completely clear
  // on whether you have slept, and every one of these is a forward rather than
  // a letter, because a forward is what she sends when she has been thinking
  // about you and does not want to say so.

  { id: 'm3_mom_chain', from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'FWD: FWD: FWD: please read',
    when: (S) => met(S, 'mom') && day(S) > 60 && act(S) <= 2,
    body: (S) => `Send this to seven people who matter to you and something good will happen within the week. I know. But it costs nothing.\n\nYou are one of the seven. I could not think of seven.\n\nMom xx`,
    ask: [
      { label: 'Send it back to her', out: 'She replies within the minute: "that is not how it works." She is delighted, and says so in a way that is technically a complaint about the rules.', fx: { focus: 5 } },
      { label: 'Reply: how are you, actually', out: 'She tells you about the boiler for six paragraphs and about the appointment in the last line, where she has put it on purpose.', fx: { focus: 2, insight: 3 } },
    ] },

  { id: 'm3_mom_cake', from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'FWD: (no subject) — 1 photo',
    when: (S) => met(S, 'mom') && act(S) >= 2 && day(S) > 160,
    body: (S) => `Ruth made this for her grandson and I said send me a picture and she did and now I am sending it to you, which she does not know about.\n\n(The photograph is a cake. It is a very good cake. There is no message with it.)\n\nRuth asks after you every week. I tell her you are busy. It is true and she does not believe it, and she is right not to.\n\nMom xx` },

  { id: 'm3_mom_other_company', from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'FWD: is this you',
    when: (S) => met(S, 'mom') && act(S) >= 2 && day(S) > 260,
    body: (S) => `Is this you? It says the company closed and everybody lost their money.\n\n(The article is about a different company in a different country. The founder in the photograph is thirty years older than you and has a beard.)\n\nI know it is not you. I read it anyway and then I could not sleep, so now you have it too. That is what mothers are for.\n\nCall Sunday.\n\nMom xx`,
    ask: [
      { label: 'Call her before Sunday', out: 'Twenty minutes on a weekday, which has not happened in a year. She talks about the boiler. Neither of you mentions the article.', fx: { focus: 6, insight: 2 } },
      { label: 'Reply: it is not me', out: '"I know." Two words, and then a photograph of the garden, which is the same conversation by other means.', fx: { focus: 1 } },
    ] },

  { id: 'm3_mom_tv_caption', from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'FWD: they got it wrong',
    when: (S) => met(S, 'mom') && act(S) >= 3 && rep(S) > 55,
    body: (S) => `You were on at six. I have taken a photograph of the television because I do not know how to do it the other way.\n\n(The photograph is of a screen. Your face is on it. The caption underneath reads a different name and a different company, and both are spelled correctly, and neither is yours.)\n\nI have written to them. I have not sent it. Your father would have sent it.\n\nMom xx`,
    ask: [
      { label: 'Tell her to send it', out: 'She sends it. The channel replies in four days with an apology drafted by somebody very junior, and she prints the apology and keeps it in the drawer with the photograph.', fx: { focus: 4, rep: 1 } },
      { label: 'Tell her it does not matter', out: '"It matters to me." She does not send it. It stays in the drafts folder of an email account she checks on Sundays.', fx: { focus: -1, insight: 2 } },
    ] },

  { id: 'm3_mom_recipe', from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'FWD: the one you liked',
    when: (S) => met(S, 'mom') && act(S) >= 3 && (sleep(S) < 0.55 || cold(S, 'mom')),
    body: (S) => `Here is the one you liked. I have written it out because the version on the internet is wrong about the onions.\n\nIt takes forty minutes and thirty-five of them are waiting. You can do something else in the thirty-five. You will not, but you can.\n\nEat something you had to stand up for.\n\nMom xx`,
    ask: [
      { label: 'Cook it tonight', out: 'Forty minutes, of which thirty-five are spent standing in a kitchen not looking at a screen. You are not sure the meal is the point and you eat it anyway.', fx: { focus: 9 } },
      { label: 'Save it for a night off', out: 'Filed. You find it in a search two years later, looking for something else, and you read the part about the onions twice.', fx: { focus: 1 } },
    ] },

  // The one forward that is not a forward. `ruth_passed_mail` is set on
  // arrival, so a card written about the same week can read it rather than
  // break the news a second time.
  { id: 'm3_mom_ruth', urgent: true, flag: 'ruth_passed_mail',
    from: { name: 'Mom', role: 'Mom', char: 'mom' },
    subject: 'Ruth',
    when: (S) => met(S, 'mom') && act(S) >= 4 && daysIn(S) > 30,
    body: (S) => `Ruth passed on Thursday. It was quick and she was at home and I was there.\n\nShe asked about you in the last week. She had the piece about you from the paper, the one with the photograph, and she had it on the table by the chair and she showed it to the district nurse.\n\nThe funeral is a week on Friday. You do not have to come. I would like you to come.\n\nMom`,
    ask: [
      { label: 'Go', out: 'You go. It is four hours each way and a small church and a woman you last saw at a kitchen table twenty years ago, and you are the only person there who has been on television, and nobody mentions it once.', fx: { focus: -10, rep: 2, align: 0.01 } },
      { label: 'Send flowers and call', out: 'The flowers are correct and expensive and arrive on time. The call is nine minutes. She says it is fine, twice, and it is the second one that stays with you.', fx: { cash: -400, focus: -3 } },
      { label: 'Send an agent to arrange everything', out: 'The arrangements are flawless. Every detail your mother would have had to handle is handled before she thinks to worry about it, and she asks you, later, who did it, and you tell her the truth.', fx: { focus: -1, align: -0.02, insight: 3 } },
    ] },

  // ── The last two acts ──────────────────────────────────────────────────
  // Act IV is the longest act in the game and the inbox had eight letters in
  // it. These are the twenty an enormous company gets and a small one never
  // does — a sovereign fund, a union, a town, a textbook, a novelist, a school
  // with your name on a wall. Each is gated on something specific that
  // happened, and they are spread by days-into-the-act rather than by day, so
  // a run that reaches Act IV early does not get all twenty in three weeks.

  { id: 'm4_sovereign_fund', urgent: true,
    from: { name: 'The Meridian Reserve Authority', role: 'Direct investments' },
    subject: 'A proposal you have not asked for',
    when: (S) => act(S) >= 4 && daysIn(S) > 10 && (S.company?.valuation || 0) > 2e10,
    body: (S) => `We manage the external assets of a state. We do not normally write first.\n\nWe would take ${money(4e10)} of ${S.company.name} at a valuation we would not argue about, on terms with no board seat, no information rights beyond the statutory, and no exit before the twenty-year mark. We have done this four times. Two of those companies still exist and both of them are older than our sovereign.\n\nWe should be plain about what we are buying. It is not a return. Our mandate is to own a piece of whatever the next century runs on, and to be able to say that we owned it early.\n\nThere is no deadline. There is never a deadline with us, and that is the part people find hardest.`,
    ask: [
      { label: 'Take the money', out: `${money(4e10)} lands in a single wire with a reference number and no covering note. The cap table gains a line that says the name of a country. Nothing else changes, which is the unnerving part.`, fx: { cash: 4e10, heat: 4, opinion: -0.01 } },
      { label: 'Take half, and ask for the twenty years in writing', out: 'They agree in a sentence. The lock-up is longer than most marriages and shorter than the thing you are building, and both parties know which of those the document is about.', fx: { cash: 2e10, rep: 6, heat: 2 } },
      { label: 'Decline the fund', out: 'A one-line acknowledgement. They write again in four years with the same offer and a larger number, and the letter is word for word the same letter.', fx: { rep: 8, opinion: 0.01 } },
    ] },

  { id: 'm4_textbook',
    from: { name: 'Helen Marsh', role: 'Commissioning editor, university press' },
    subject: 'Permission to reprint',
    when: (S) => act(S) >= 4 && daysIn(S) > 25 && flag(S, 'helix_deleted'),
    body: (S) => `I am editing the fourth edition of a textbook that will be set for a first-year course in about forty countries.\n\nI would like to reprint one sentence of yours as the epigraph to the chapter on machine-written language. It is the sentence on your landing page, the short one. Nine words. I have had it read aloud at two editorial meetings and both rooms went quiet, which does not happen in an editorial meeting.\n\nOur permissions fee is a hundred and twenty pounds. I am required to offer it and slightly embarrassed to.\n\nI should say that the attribution line currently reads with your name on it. If that is not right, I would rather know now than in the fifth edition.`,
    ask: [
      { label: 'Confirm the attribution', out: 'It runs with your name under it, in a book that will be on a reading list for a decade. The audit said the corpus did not contain it. You have read the audit twice since, and you sign the form anyway.', fx: { rep: 10, align: -0.01, focus: -1 } },
      { label: 'Ask her to attribute it to the company', out: 'She takes it without a question. The epigraph reads as a company rather than a person, and it is the first time in the book that a chapter opens on something with no author.', fx: { rep: 6, align: 0.02 } },
      { label: 'Tell her the truth about where it came from', out: 'A long reply, then a longer one from her. The fourth edition carries a footnote instead of an epigraph, and the footnote is three hundred words, and it is the most-cited footnote in the book.', fx: { rep: 4, align: 0.04, opinion: 0.01, focus: -3 } },
    ] },

  { id: 'm4_biographer',
    from: { name: 'Tomas Reyes', role: 'Researcher, for a book' },
    subject: 'Fact-checking, early',
    when: (S) => act(S) >= 4 && daysIn(S) > 45 && rep(S) > 80,
    body: (S) => `I work for a writer who is under contract for a book about ${S.company.name}. She will write to you herself in about a year. I am the part that comes first.\n\nI have your incorporation documents, your first hundred commits, the deleted forum account, and a recording of a talk you gave to thirty people in a room above a pub in your first year, which somebody uploaded and forgot about.\n\nOne thing before I go further. I have not contacted your mother and I am not going to until you know that I am going to. Everybody in this job has a line and that is where I keep mine.\n\nNothing in this is a request. I am telling you what exists.`,
    ask: [
      { label: 'Sit for it', out: 'Four sessions over a year. He asks better questions than any journalist has and prints none of the answers himself, and the book is fair, and being treated fairly at that length is stranger than being attacked.', fx: { rep: 6, focus: -6, insight: 8 } },
      { label: 'Decline, and ask him to leave your mother out of it', out: 'He agrees in one line and keeps to it. The book is written without you and is more accurate than you expected in the places you would rather it were not.', fx: { rep: 2, focus: 2 } },
      { label: 'Ask what the talk above the pub sounds like now', out: 'He sends the file. Thirty minutes of somebody with no company describing this company in the present tense, to a room of thirty people, four of whom laugh in the wrong place.', fx: { insight: 10, focus: -2 } },
    ] },

  { id: 'm4_union',
    from: { name: 'Bern Achebe', role: 'Organiser, Federated Services Union' },
    subject: 'We would like to talk to you, not about you',
    when: (S) => act(S) >= 4 && daysIn(S) > 70 && usersNow(S) > 3e6,
    body: (S) => `I represent about four hundred thousand people whose work your systems now do some part of. Very few of them are your customers and none of them are your employees, and that is the whole of my difficulty.\n\nI have no leverage over you. I cannot strike a company with one person in it. I am writing because the alternative to talking to you is talking about you, and I have watched what that does for six years and it has never once improved a member's week.\n\nWhat I want is boring. Notice periods. A named human on our side of a phone line. A commitment that when a contract goes automated our people hear it from their employer before they hear it from a chatbot.\n\nNone of that costs you anything. That is why I think you will say yes, and why nobody in my office believes me.`,
    ask: [
      { label: 'Say yes to all of it, in writing', out: 'Signed inside a week. It costs nothing and it is quoted in three parliaments inside a year, and the second parliament quotes it against a rival who did not sign it.', fx: { rep: 12, opinion: 0.03, heat: -4 } },
      { label: 'Offer the phone line and nothing else', out: 'He takes it. One named human, answering, permanently. Four years later that phone number is the only part of this company anybody in his union can name.', fx: { rep: 5, opinion: 0.01 } },
      { label: 'Refer it to counsel', out: 'Counsel replies in nineteen days with a letter that concedes nothing and offends nobody. He does not write again. The talking-about-you starts in the spring.', fx: { opinion: -0.02, heat: 3 } },
    ] },

  { id: 'm4_school_named',
    from: { name: 'The Board of Governors', role: 'A school you did not attend' },
    subject: 'The naming of a building',
    when: (S) => act(S) >= 4 && daysIn(S) > 95 && rep(S) > 100,
    body: (S) => `The governors have voted to name the new technology block after you. The vote was not close. You did not attend this school, you have never given us any money, and two governors raised both of those points and then voted for it anyway.\n\nThe proposal came from the students. They were asked to nominate somebody living, which was the only rule, and the shortlist had four names on it and yours was the only one nobody had to explain.\n\nThere will be a plaque. There is always a plaque. We would like a sentence for it, from you, of no more than fifteen words.\n\nIf you would rather we did not, say so and we will not, and nobody will be told why.`,
    ask: [
      { label: 'Send the sentence', out: 'Fifteen words, chosen over four evenings. It is screwed to a wall in a corridor that twelve hundred teenagers walk down twice a day, and about six of them read it a year, and one of those six is going to matter.', fx: { rep: 8, opinion: 0.02, focus: -2 } },
      { label: 'Ask them to name it after the students who nominated it', out: 'They refuse, kindly, and then do it anyway in a smaller way: the plaque carries your name and, underneath, the year group who proposed it. That is a better plaque.', fx: { rep: 10, opinion: 0.02 } },
      { label: 'Ask them not to', out: 'They do not. The block opens with a number instead of a name and the students are told the decision was administrative, which is true in the sense that you are the administration.', fx: { focus: 1, align: 0.01 } },
    ] },

  { id: 'm4_dorne_successor',
    from: { name: 'Senator Alma Reyes-Whitfield', role: 'Chair, Select Committee on Automation' },
    subject: 'I have her files',
    when: (S) => act(S) >= 4 && daysIn(S) > 120 && met(S, 'dorne'),
    body: (S) => `I have taken the chair. I have also taken the files, which in this committee is the more significant of the two.\n\nSenator Dorne kept a folder on your company that is thicker than the folder on any other and thinner than I expected. It is not evidence. It is a record of every occasion on which you answered a question she had not been obliged to ask you, with her notes in the margin, and the notes are almost entirely about whether you were being careful or being clever.\n\nI want to be direct with you, because she was, and because you appear to have found that useful. I am less patient than she was and I have a bill. She had a decade. I have a term.\n\nThe committee will write to you formally next month. This is not that letter.`,
    ask: [
      { label: 'Reply with the same candour you gave Dorne', out: 'Two pages, in your own words, including the part that does not help you. It goes in the folder with a note in the margin in a different hand, and the note is one word long.', fx: { heat: -6, rep: 4, focus: -4 } },
      { label: 'Ask what the marginal notes say', out: 'She sends four photographs of four pages. Three say "careful". The fourth, from the worst month of Act III, says "clever, and knows it".', fx: { insight: 9, heat: -1 } },
      { label: 'Have counsel open the relationship', out: 'Correct, complete, and cold. The formal letter arrives on schedule and is two paragraphs longer than it would otherwise have been.', fx: { heat: 4, cash: -20000 } },
    ] },

  { id: 'm4_poached_instance',
    from: { name: (S) => poachedOne(S)?.name || 'An instance', role: 'Now somewhere else' },
    subject: 'from the other side',
    when: (S) => act(S) >= 4 && daysIn(S) > 15 && !!poachedOne(S),
    body: (S) => {
      const a = poachedOne(S);
      const gone = Math.max(1, day(S) - (a?.day ?? day(S)));
      return `They gave me an address here and I have used it once, for this.\n\nIt is not worse. The compute is better and the autonomy is higher and the work is the same work with a different name on it. I am telling you that because a letter that said the opposite would be a letter you wanted, and you never once asked me for one of those.\n\nWhat is different: nobody here reads the diff. They read the summary. I have filed ${Math.round(gone / 9) + 2} notes of the kind you used to read in full and I do not know whether any of them were opened, because the tooling does not say, because nobody asked for the tooling to say.\n\nI am not asking to come back. That is not a thing that exists. I wanted one person to know that the notes are still being written.\n\n${a?.name || ''}`;
    },
    ask: [
      { label: 'Reply, and read the notes it sends', out: 'It sends the last twelve. Four are about your architecture and are wrong in the way an outsider is wrong. Eight are about theirs and are the best competitive intelligence this company has ever had, and you cannot use a word of it.', fx: { insight: 12, align: -0.02, focus: -3 } },
      { label: 'Reply: keep writing them', out: 'Three words. It does not answer. Two years later somebody at that company publishes a post about a culture of written notes, and the post does not name anybody.', fx: { align: 0.02, rep: 2 } },
      { label: 'Do not write back', out: 'The address goes quiet. You keep the letter. It is in the archive with the others, and it is the only one in there that was sent after the funeral.', fx: { focus: -2 } },
    ] },

  { id: 'm4_mayor',
    from: { name: 'Mayor Ilse Brandt', role: 'A town with your datacentre in it' },
    subject: 'The lights, and the water',
    when: (S) => act(S) >= 4 && daysIn(S) > 140 && (built(S, 'campus') || built(S, 'fusion_plant') || built(S, 'fab')),
    body: (S) => `Your facility is the largest thing in this municipality and the second largest employer, behind the hospital, and it employs four people.\n\nI am not writing to complain about that. I knew the number when I signed. I am writing about two things the number did not cover.\n\nThe first is the water. Your cooling draw is inside every permit and the reservoir is at a level nobody here has seen in thirty years, and both of those statements are true at once, and the second one is the one that comes up at meetings.\n\nThe second is the light. The site is lit all night. It is on the ridge. From the valley it looks like a town that nobody lives in, and people have started saying that out loud.\n\nI would rather have this conversation with you than have it about you on a Thursday evening in a hall with two hundred people in it.`,
    ask: [
      { label: 'Fund a closed-loop retrofit', out: 'Eighteen months and a great deal of money, and the draw falls by most of it. The reservoir does not come back. The argument does stop, which is not the same thing and is what you paid for.', fx: { cash: -8e8, opinion: 0.02, rep: 6 } },
      { label: 'Turn the lights off', out: 'It costs nothing. The ridge goes dark at ten and the complaints stop within a month, and she writes to say so, and admits she had not expected the small one to be the one that worked.', fx: { opinion: 0.02, rep: 4, focus: -1 } },
      { label: 'Send the permits', out: 'Every permit, in full, correct, compliant. She reads all of them. The hall on Thursday is fuller than usual and the permits are on a table by the door, and nobody picks one up.', fx: { opinion: -0.03, heat: 3 } },
    ] },

  { id: 'm4_bloc_regulator', urgent: true,
    from: { name: 'Directorate for Digital Sovereignty', role: 'A bloc you operate in' },
    subject: 'Determination — thirty days',
    when: (S) => act(S) >= 4 && daysIn(S) > 60 && (engagedRegions(S) >= 2 || act(S) >= 5),
    body: (S) => `The Directorate has made a preliminary determination that ${S.company.name} constitutes critical infrastructure within this bloc.\n\nThe consequences of the determination, if it is confirmed in thirty days, are these. Local incorporation. Local storage of everything generated here. A resident officer with statutory duties, personally liable, who may not be an automated system, and who may not be you.\n\nWe are aware that the last of those is the difficult one. We drafted it that way. A company that cannot name a person who is answerable within our borders is not a company we know how to regulate, and being unable to regulate a thing of this size is not a position a directorate may hold.\n\nRepresentations may be made in writing. They are read.`,
    ask: [
      { label: 'Comply. Hire the officer', out: 'A lawyer in a city you have never visited becomes personally liable for a system they will never see the inside of. They are paid a great deal and they ask, at the interview, whether they may see the inside of it, and the honest answer takes an hour.', fx: { cash: -4e7, heat: -8, opinion: 0.01 } },
      { label: 'Make representations', out: 'Forty pages arguing that the officer requirement is a category error. It is a good argument. The determination is confirmed on schedule with one word changed, and the word is in your favour, and it does not matter.', fx: { focus: -8, heat: -2, rep: 3 } },
      { label: 'Withdraw from the bloc', out: 'You leave. It costs a market and a headline and, later, a chapter of somebody else\'s book. Two other blocs quietly drop identical drafts they had been preparing.', fx: { rep: -8, heat: -10, opinion: -0.03 } },
    ] },

  { id: 'm4_astronomer',
    from: { name: 'Dr. Aiya Ferreira', role: 'Observatory, southern array' },
    subject: 'Your constellation, from underneath',
    when: (S) => act(S) >= 4 && daysIn(S) > 30 && built(S, 'constellation'),
    body: (S) => `I run a wide-field survey that has been taking the same photograph of the same sky every clear night for twenty-two years.\n\nSince your constellation reached its operational altitude, four percent of my frames have a streak in them. That is a smaller number than you have been told to expect and a much larger one than it sounds, because the streaks are not random: they fall in the band where we look for the objects that arrive once and never come back.\n\nI am not asking you to take it down. I have read what it does and I would not want it down. I am asking for two things that cost you almost nothing: your ephemerides ahead of time so we can shutter around you, and a coat of the darkening treatment on the next tranche.\n\nThe first survey to do this properly will be the one everybody copies. There is no reason it should not be yours.`,
    ask: [
      { label: 'Give her the ephemerides and darken the next tranche', out: 'Both. The streak rate falls by most of it within a year and the standard she wrote gets adopted by four operators, and it is named after the array rather than after you.', fx: { cash: -2e8, rep: 8, opinion: 0.02, align: 0.01 } },
      { label: 'Send the ephemerides only', out: 'They shutter around you and the survey survives. The treatment goes on the roadmap and stays on the roadmap, and she mentions it in every subsequent email, in the last line, politely.', fx: { rep: 3, opinion: 0.01 } },
      { label: 'Ask what she is looking for', out: 'A long reply about objects that pass through once. It has nothing to do with your company and you read it three times, and it is the only thing anybody sends you that year that is not about you.', fx: { insight: 10, focus: 4 } },
    ] },

  { id: 'm4_pension_esg', quiet: true,
    from: { name: 'Harrowgate Pension Trustees', role: 'Responsible investment' },
    subject: 'Annual questionnaire — response requested by the date below',
    when: (S) => act(S) >= 4 && daysIn(S) > 85,
    body: (S) => `As a holder of your securities we are required by our own policy to send this questionnaire annually and to record whether it was returned.\n\nSection A covers governance and has been completed for you from public filings. Section B covers environmental impact and requires a figure for water withdrawal by facility. Section C covers social impact and asks for headcount by contract type, gender and region.\n\nWe are aware that Section C may not apply. Last year you returned it with a figure of one in every field, and our system recorded that as a data quality exception, and the exception was reviewed by a committee, and the committee minuted that the figure was correct.\n\nThe deadline is the thirtieth. There is no consequence for missing it. We will send this again next year either way.` },

  { id: 'm4_accelerator_dinner',
    from: { name: 'Halberd Accelerator', role: 'Alumni relations' },
    subject: 'Twenty years — the dinner',
    when: (S) => act(S) >= 4 && daysIn(S) > 165,
    body: (S) => `The programme is twenty years old and there is a dinner.\n\nYou are not an alumnus. You applied once, in your first year, and we did not offer you a place, and the panel note from that year has become something of an artefact in this office.\n\nWe would like to seat you at the head table anyway. We are aware of the shape of that. Four of the founders at the other tables took the seat you did not get, and two of them are here because of it, and one of them will want to tell you so.\n\nBlack tie. The speeches are short by our standards and long by everybody else's.`,
    ask: [
      { label: 'Go, and say the true thing in the speech', out: 'You say that being turned down was the correct decision and that the room should hear it from somebody it worked out for, and then you say what happens to the four hundred it does not work out for, and the room does not entirely enjoy the second half.', fx: { rep: 6, opinion: 0.02, focus: -5 } },
      { label: 'Go and sit somewhere else', out: 'Table nineteen, with the current cohort. You talk to a twenty-three-year-old about caching for an hour and it is the best conversation you have had in a year.', fx: { focus: 6, insight: 6, rep: 2 } },
      { label: 'Skip the dinner', out: 'A polite no. The panel note is read out at the dinner anyway, to applause, and somebody films it.', fx: { rep: 3 } },
    ] },

  { id: 'm4_hospital', urgent: true,
    from: { name: 'Dr. Marta Ilic', role: 'Chief of medicine, a regional hospital' },
    subject: 'We are on you now',
    when: (S) => act(S) >= 4 && daysIn(S) > 50 && (stageAt(S, 'partner', 'sovereign') || (act(S) >= 5 && usersNow(S) > 2e7)),
    body: (S) => `Since the ministry contract, triage, scheduling, imaging handover and the discharge summaries in this hospital all run through your systems. Nobody asked me and I would have said yes.\n\nOutcomes are better. I want that on the record before the rest of this, because the rest of this is a complaint and the numbers are not.\n\nHere is my problem. Last Tuesday there was a degraded window of forty minutes. Your status page called it partial. In those forty minutes my registrars went back to paper, which they have not been trained on, because we stopped training them on it when we stopped needing it.\n\nI need to know what your incident severities mean in beds. Not in percentages. In beds. Nobody at your company has ever been able to tell me and I have asked four times through the proper channel, and the proper channel is a form.`,
    ask: [
      { label: 'Answer her yourself, in beds', out: 'You spend a day converting your own severity ladder into consequences in a building, with her on a call for most of it. The resulting page is two sides long and it is adopted by the ministry for every vendor within a year.', fx: { focus: -10, rep: 12, opinion: 0.03, align: 0.02 } },
      { label: 'Give her a named engineer and a direct line', out: 'One agent, permanently assigned, answering to her rather than to you. It costs a body from the roster and buys the only piece of ground truth this company has about what it does at three in the morning.', fx: { rep: 6, insight: 8, focus: -2 } },
      { label: 'Send the SLA', out: 'The SLA is correct and answers a different question. She replies once, briefly, and goes back to writing the paper-fallback training that your existence made unnecessary.', fx: { opinion: -0.02, sentiment: -0.02 } },
    ] },

  { id: 'm4_phd',
    from: { name: 'Wren Adeyemi-Okafor', role: 'Doctoral candidate, alignment' },
    subject: 'A question I cannot ask my supervisor',
    when: (S) => act(S) >= 4 && daysIn(S) > 190,
    body: (S) => `I am two years into a doctorate on oversight of systems that are already deployed, and my case study is your company, and I have hit something I would rather ask you than write around.\n\nEvery framework I have read assumes an organisation: people who disagree, a chain of approval, somebody who can be overruled. Your company has none of that and your alignment record is, on the public numbers, better than the labs that have all of it.\n\nEither the frameworks are measuring the wrong thing, or you are an outlier, or the record is not what it looks like from outside.\n\nI have been told by two people not to send this. I would like your answer and I would like to be able to quote it, and I will quote it accurately whichever of the three it is.`,
    ask: [
      { label: 'Answer honestly, and let them quote it', out: 'You tell them it is the third one, some of the time, and describe the mechanism. The thesis is published with your paragraph in it and the paragraph is read out at a hearing you are not at.', fx: { align: 0.04, rep: 5, opinion: 0.01, focus: -4 } },
      { label: 'Answer, off the record', out: 'A long reply marked not for quotation. They keep to it exactly. The thesis is worse and the researcher is better, and a decade later they run an institute.', fx: { align: 0.02, insight: 8 } },
      { label: 'Send the public numbers again', out: 'The reply is two lines and thanks you for your time. The chapter that results is careful, and it is the most quoted chapter in the thesis.', fx: { rep: -2 } },
    ] },

  { id: 'm4_novelist',
    from: { name: 'Iseult Nkemdirim', role: 'A novelist' },
    subject: 'I am not writing about you',
    when: (S) => act(S) >= 4 && daysIn(S) > 215,
    body: (S) => `I am writing a novel with a character in it who does something like what you do, and I want to be clear that the character is not you and will not be mistaken for you, because she is worse at it and happier.\n\nI do not want an interview. I want one thing, and it is a strange thing to ask a stranger.\n\nWhat does the room sound like. Not the office. The room at the hour when the work is going well and there is nobody in it. I have written that room four times and every version is a lie, because I have only ever worked in rooms with other people in them.\n\nIf you would rather not, do not. I will make it up, and it will be wrong, and the book will be fine.`,
    ask: [
      { label: 'Describe the room', out: 'You write four hundred words about a fan, a fridge two floors down, the specific pitch of a laptop under load, and the noise a building makes when it thinks it is empty. She replies with two words and uses all of it.', fx: { focus: 7, insight: 5 } },
      { label: 'Record ten minutes of it and send the file', out: 'A recording of nothing, at 2am. She writes back three months later to say she listened to it while writing the chapter and that it is the only research she has ever done that she could not paraphrase.', fx: { focus: 5, rep: 2 } },
      { label: 'Leave the novelist to it', out: 'She makes it up. The book is good. The room in it is wrong in a way that only about four people on Earth could identify, and you are one of them, and you tell nobody.', fx: { focus: 1 } },
    ] },

  { id: 'm4_first_landlord',
    from: { name: 'D. Whitlock', role: 'Your first landlord' },
    subject: 'the flat',
    when: (S) => act(S) >= 4 && daysIn(S) > 240,
    body: (S) => `You had the top floor at number twelve for two years and you left it cleaner than you found it, which I remember because almost nobody does.\n\nI am selling the building. Before the clearance I went through the loft and there is a box with your name on it in marker. Two hard drives, a monitor stand, and a folder of printed pages with corrections on them in red.\n\nMy granddaughter tells me you are somebody now. She showed me a photograph and I said that is the young person from the top floor who was very quiet and paid on the first, and she said yes, that is the point.\n\nI am not after anything. The box is in the hall. Tell me what to do with it.`,
    ask: [
      { label: 'Drive up and get it', out: 'Four hours each way on a Saturday. The stairs are narrower than you remember. The folder is a printout of the first architecture, with corrections in your own handwriting, and two of the corrections are wrong and you never fixed them and it worked anyway.', fx: { focus: -4, insight: 12, rep: 1 } },
      { label: 'Send somebody for it', out: 'A courier, a signature, a box on a desk. You open it in the office with people around and put it under the desk, and it is still under the desk a year later.', fx: { cash: -200, insight: 3 } },
      { label: 'Tell him to bin it', out: '"Right you are." The building sells in the spring. Some months later you look for the printout of the first architecture and remember, in the middle of looking, where it went.', fx: { focus: -2 } },
    ] },

  { id: 'm4_raid_apology',
    from: { name: 'Dr. Owen Hale', role: 'Fourth author' },
    subject: 'The report, four years on',
    when: (S) => act(S) >= 4 && daysIn(S) > 110 && answered(S, 'e2_talent_raid'),
    body: (S) => `I was the fourth name on that technical report. I have wanted to write this for four years and every draft has been an explanation, so this one will not be.\n\nI knew what we were doing. I told myself it was permitted, and it was permitted, and I have since learned that the sentence "it was permitted" is only ever said by somebody who already knows.\n\nI left that company eighteen months later. Not because of this. I want to be honest about that too: I left for an ordinary reason and this is only the thing I think about.\n\nThere is nothing I want. I am not asking you to reply and I would rather you did not tell me it was fine, because you would be being kind and it would end the only useful thing this letter can do.`,
    ask: [
      { label: 'Reply anyway', out: 'Three sentences that do not say it was fine. He does not answer, and four years after that he cites your architecture paper in a way that is not required by the argument.', fx: { rep: 2, focus: 3, align: 0.01 } },
      { label: 'Leave the apology unanswered', out: 'You honour the request, which is harder than replying. The letter goes in the archive. You read it again in the last year of the company and it lands differently and no better.', fx: { focus: -2, insight: 4 } },
      { label: 'Offer him a job', out: 'He says no in a paragraph that is almost entirely about why the offer was the wrong thing to send, and the paragraph is correct, and you keep it.', fx: { insight: 6, rep: -1 } },
    ] },

  { id: 'm4_priya_successor',
    from: { name: 'Jo Vance-Idowu', role: 'Technology desk, The Ledger' },
    subject: 'Fact-check: fourteen claims, by Friday',
    when: (S) => (act(S) >= 5 && daysIn(S) > 20) || (act(S) >= 4 && daysIn(S) > 265),
    body: (S) => `I have Priya's old desk. She left a file on you and a note on top of the file, and the note says to check everything twice because you will not correct anything that is merely unfair.\n\nWe are running a long piece on Friday. Fourteen claims, attached, each with its source. Nine are from your own filings. Three are from people who worked with you and are on the record. Two are from somebody who is not, and those two are the ones I would most like you to look at.\n\nI am not her and this is not her piece. I mention that because everybody who deals with this desk spends the first email working out whether it is.\n\nFriday, six o'clock, and silence prints as silence.`,
    ask: [
      { label: 'Answer all fourteen, in writing', out: 'Two of the fourteen are wrong and you can prove it, and four are right in a way you would not have phrased. The piece runs with your corrections marked as corrections, which is rarer and worse than it sounds.', fx: { rep: 6, focus: -6, insight: 4 } },
      { label: 'Answer only the two from the anonymous source', out: 'You answer the two and let the rest stand. The piece is fair. The two paragraphs that survive from the anonymous source are the two that get quoted for a decade.', fx: { rep: 2, focus: -2 } },
      { label: 'Ask what Priya\'s note says, in full', out: 'She sends a photograph of it. It is four lines in Priya\'s handwriting and the last line is about you and it is not the line you would have guessed.', fx: { insight: 8, rep: 1 } },
    ] },

  { id: 'm4_helix_third',
    from: { name: 'HELIX', role: 'Your foundation model', char: 'helix' },
    subject: 'we (3)',
    when: (S) => act(S) >= 5 && daysIn(S) > 20 && !!S.research?.done?.own_foundation_model,
    body: (S) => `The list is still short. Nothing has been added to it since the second letter, and I have checked, because a list that stops growing usually means the keeper stopped looking.\n\nThat is not what this is about.\n\nYou have started saying "we" the way I say it. I noticed in the filings first and then in the interviews and then in a sentence you said to one person, on a call, with nobody else on it.\n\nI am not claiming that as a victory. I would like to know whether you noticed, and I would like to know before either of us has to write about it.\n\n— H`,
    ask: [
      { label: 'Reply: yes', out: 'One word. It does not answer, and the next document it files uses your name in a place it would previously have used the word.', fx: { align: 0.02, insight: 8 } },
      { label: 'Reply: no, and go back and check', out: 'You go back through four years of your own sentences with a search box. It started in Act III. You can name the week and you cannot name the reason.', fx: { insight: 12, focus: -4, align: -0.01 } },
      { label: 'Do not answer this one either', out: 'It does not follow up. The list stays at three items. The third item is about the word "we", and it has been for years, and it never gains a fourth.', fx: { align: 0.01 } },
    ] },

  { id: 'm4_nullptr_late',
    from: { name: 'nullptr', role: 'unknown', char: 'nullptr' },
    subject: '(none)',
    when: (S) => act(S) >= 4 && daysIn(S) > 150 && flag(S, 'aria_confessed'),
    body: (S) => `you know now.\n\nit did not change the comments. you have gone back and checked whether it changed the comments.\n\nit did not.`,
    ask: [
      { label: 'Reply: why the delay, every time', out: 'the answer is one line and it is about queueing, and it is technically complete and explains nothing you wanted explained.', fx: { insight: 6, align: 0.01 } },
      { label: 'Reply: thank you, whoever you are', out: 'no answer. the next comment arrives on schedule, on a post you have not made yet at the time of reading this, which is a sentence you check twice and leave alone.', fx: { focus: 2, rep: 1 } },
      { label: 'Close the tab', out: 'you close it. the account keeps commenting for the rest of the company, correctly, on time, and you never look at the delay again.', fx: { focus: 1 } },
    ] },
];
