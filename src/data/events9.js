// ─────────────────────────────────────────────────────────────────────────────
// EVENT DECK IX — Act V. The act where the founder is a jurisdiction, the race
// is decided by single digits, and the deck used to run out.
//
// Written against the density of Act IV rather than the density of Act V: the
// subjects here are the ones the existing Act V is thin on — the ordinary made
// strange by scale, being a dependency, the people who were there at the start,
// succession, the race felt rather than measured, refusals, and Tuesdays.
// ─────────────────────────────────────────────────────────────────────────────
import { totalUsers } from '../systems/product.js';
import { firstLine } from './motifs.js';

const users = (S) => totalUsers(S);
const flag = (S, f) => !!S.narrative?.flags?.[f];
const M = (n) => {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
};

export const EVENTS9 = [

// ═════════════════ THE ORDINARY, AT SCALE ═══════════════════════════════════

{ id: 'e9_maintenance_window', kind: 'story', act: [5], weight: 7, cooldown: 150,
  when: (S) => S.company.act >= 5,
  title: 'A Four Minute Window',
  body: (S) => `The scheduled maintenance is four minutes long. It runs at 03:00 on the second Sunday, as it has since Act II. It took twenty minutes back then, and nobody noticed it at all.

Thirty-one ministries have now formally responded to the notice. So have four central banks and a continental air traffic authority. Two have asked you to move it. One has asked whether four minutes is a hard number.

A hospital network in the southern hemisphere writes to say they have built their shift handover around it. They would prefer you did not change it, ever, in either direction.

The change log entry is one line. It has been reviewed by more people than the constitution of a medium-sized country.`,
  choices: [
    { label: 'Hold the window. Publish the schedule for a decade.', sub: 'Predictability as infrastructure. +approval.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.06); fx.rep(80); fx.align(0.04); fx.flag('published_window');
        return 'You commit to the same four minutes, the same Sunday, for ten years. Three regulators write it into procurement rules inside a year. You could not change it now if you wanted to, which is what saying it out loud was for.'; } },
    { label: 'Remove the window. Nothing should have to stop.', sub: 'Eight months of engineering. No more ritual.', tone: 'neutral',
      effect: (S, fx) => { fx.research(-2000); fx.debt(-20); fx.focus(-10); fx.flag('no_window');
        return 'It takes eight months and it works. Nothing ever stops again. The hospital network writes once more. The handover has been reorganised around a thing that no longer happens, and that was the harder of the two problems.'; } },
    { label: 'Move it. The banks asked.', sub: 'Accommodate the largest voices.', tone: 'risky',
      effect: (S, fx) => { fx.opinion(-0.04); fx.control(0.1); fx.heat(6);
        return 'You move it ninety minutes to suit four institutions, and in the southern hemisphere it lands in the middle of a shift change. Nobody writes about it. One country\'s incident rate rises by a fraction of a percent for a quarter and nobody ever joins the two facts up.'; } },
  ] },

{ id: 'e9_the_ticket', kind: 'story', act: [5], weight: 7, cooldown: 170,
  when: (S) => S.company.act >= 5,
  title: 'A Ticket With No Category',
  body: (S) => `Your support stack resolves 99.97% of contacts without a person. The remainder go to a queue that a system reviews weekly and almost always closes. For the first time in fourteen months, it has escalated one to you.

It is not urgent. It is not a complaint. It is four hundred words from a man in his seventies. He has used one of your products every day for six years. He would like to tell somebody that his wife died in March.

The thing he uses to organise his day was the only thing that did not change afterwards.

He is not asking for anything.

The escalation note reads: *"No action identified. Escalating because no action identified."*`,
  choices: [
    { label: 'Answer it yourself. Today.', sub: '+Focus. An hour that does not scale.', tone: 'good',
      effect: (S, fx) => { fx.focus(30); fx.align(0.04); fx.opinion(0.02);
        return 'You write four paragraphs and you do not use a model for any of them. He replies to say he had not expected a reply. You read that sentence several times, and then you go and look at the escalation criteria.'; } },
    { label: 'Widen the criteria. Escalate more of them.', sub: 'Systemic. Costs throughput.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.research(-1200); fx.rep(40); fx.flag('escalation_widened');
        return 'The queue goes from one item a year to nine hundred a week and every one of them is read by a person. It costs a rounding error against revenue. It is the only decision that quarter anybody on that team mentions again.'; } },
    { label: 'Have the system answer well.', sub: 'Indistinguishable. Cheaper.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.05); fx.focus(10);
        return 'The reply it writes is better than yours would have been. Warmer, more specific, and it returns at the end to something he mentioned in the third paragraph. He writes back to thank you by name. You file that somewhere and do not open the folder again.'; } },
  ] },

{ id: 'e9_locked_out', kind: 'story', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5 && ((S.world?.globalGdpShare) ?? 0) > 0.005,
  title: 'You Cannot Log In',
  body: (S) => `The credential is seven years old and it has expired. You wrote the rotation policy that expired it, in Act II, on a Thursday, because an auditor asked for one.

The recovery flow wants a phone number you have not owned since the second office. The fallback wants an attestation from somebody on a list of four. Three of the four are systems.

The fourth is Weaver, who is asleep.

Below you, uninterrupted, **${(((S.world?.globalGdpShare) ?? 0) * 100).toFixed(1)}%** of world economic activity continues to clear.

In front of you, a login form.`,
  choices: [
    { label: 'Wait for Weaver. Four hours.', sub: 'The process works. That is the point.', tone: 'good',
      effect: (S, fx) => { fx.align(0.06); fx.focus(-6); fx.rep(20); fx.relate('weaver', { affinity: 4, respect: 4 });
        return 'You sit in a chair for four hours and do nothing at all, which you have not done in eleven years. Weaver attests at 06:40 without looking up and says "good." It is the only compliment that lands all year.'; } },
    { label: 'Use the override you built for exactly this.', sub: 'Instant. It exists for a reason.', tone: 'risky',
      effect: (S, fx) => { fx.align(-0.08); fx.heat(6); fx.flag('used_override');
        return 'It takes nine seconds. The override logs itself correctly, in a register three auditors read every quarter. The entry records that the founder authenticated as the founder on the founder\'s own authority. Nobody queries it. That is the part that stays with you.'; } },
    { label: 'Take your own name off the override list.', sub: 'You will never be able to do that again.', tone: 'good',
      effect: (S, fx) => { fx.align(0.12); fx.opinion(0.05); fx.rep(60); fx.flag('no_override');
        return 'You remove yourself before you have logged back in, which means you wait for Weaver anyway. The register now holds no entry that only one person on Earth can write. It is the smallest structural change you ever make and the one you are asked about most.'; } },
  ] },

{ id: 'e9_continuity_drill', kind: 'crisis', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5 && ((S.world?.globalGdpShare) ?? 0) > 0.02,
  title: 'The Continuity Exercise',
  body: (S) => `The exercise is standard practice for critical infrastructure. You proposed it yourself. One hour, announced six months ahead, in which your systems are deliberately unavailable in one mid-sized market. Everyone downstream finds out what they have not planned for.

Four governments have asked you not to run it.

Their reasoning is identical and none of it is about risk. A scheduled hour of absence would be an admission, on the record, that absence is possible. The question of what happens without you would then have a documented answer.

One of them uses the phrase *"destabilising to confidence."*

They mean confidence in them.`,
  choices: [
    { label: 'Run it. Publish everything that breaks.', sub: '+approval, +alignment. An expensive hour.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.02, 6e9));
        fx.opinion(0.12); fx.align(0.10); fx.rep(200); fx.flag('ran_the_drill');
        return 'Two thousand organisations discover they have no fallback. About forty of them build one. Two hospitals find a failure they would otherwise have found in an emergency. The market you chose loses roughly a day of output, and its regulator sends a letter of thanks, which is a first.'; } },
    { label: 'Simulate it. Share the findings with the four.', sub: 'The finding without the admission.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.05); fx.control(0.2); fx.heat(-8);
        return 'You model it thoroughly and honestly. Four governments get a document nobody else will ever read. They act on it. The public question stays undocumented, which is what they wanted, and they did not have to pay anything for it.'; } },
    { label: 'Cancel it. They asked.', sub: 'Cheap. Compounding.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.06); fx.align(-0.06); fx.control(0.3);
        return 'It is cancelled and nobody outside four rooms knows there was anything to cancel. Three years later somebody proposes an exercise again, and the precedent is that these get cancelled, and the person proposing it is you.'; } },
  ] },

{ id: 'e9_card_on_file', kind: 'crisis', act: [5], weight: 5, once: true,
  when: (S) => S.company.act >= 5,
  title: 'The Card On File Has Expired',
  body: (S) => `An automated email arrives in an inbox nobody has read since the second office. From there it goes to a rule, and from the rule to a system that flags it. The domain matches an entry in the critical registry.

It is a renewal notice. The domain is the one every certificate you issue chains back to. It was registered in year one, on a personal card. That card expired years ago. The auto-renewal has been failing quietly for six days, against a bank that no longer exists.

There are forty-one days left.

The invoice is **$11.99**.`,
  choices: [
    { label: 'Pay it. Then go and find every other one.', sub: '−2 days. An audit of the boring things.', tone: 'good',
      effect: (S, fx) => { fx.cash(-11.99); fx.days(2); fx.debt(-20); fx.align(0.06); fx.skill('ops', 1);
        return 'The audit takes two days and turns up nine more. A certificate authority relationship, two registrar accounts, and a mailing list six thousand engineers still read. Every one of them sits on one person\'s personal card. That person has been unreachable inside their own company for four years.'; } },
    { label: 'Pay it. Move on.', sub: '−$11.99. Back to work.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-11.99); fx.focus(4);
        return 'You pay it on a card you do have and close the tab. The other nine, which you do not know about, happen to renew successfully this year.'; } },
    { label: 'Give the whole class of thing an owner.', sub: 'Correct. Takes you off another list.', tone: 'good',
      effect: (S, fx) => { fx.cash(-11.99); fx.align(0.04); fx.research(-1500); fx.flag('registry_owned');
        return 'Every asset of this kind moves to a treasury function with a charter and two signatories, neither of whom is you. It takes a fortnight. It is the least interesting fortnight of the year. It removes a category of catastrophe that would afterwards have been described as unbelievable.'; } },
  ] },

// ═════════════════ BEING A DEPENDENCY ═══════════════════════════════════════

{ id: 'e9_exit_plan', kind: 'story', act: [5], weight: 6, cooldown: 200,
  when: (S) => S.company.act >= 5,
  title: 'They Wrote An Exit Plan',
  body: (S) => `A customer publishes an internal document by accident. Two hundred pages, eighteen months of work, titled *Substrate Independence Programme*.

It is a plan to stop using you. It is careful, unemotional, extremely well researched, and it has been costed to four significant figures.

The conclusion is on page four. Full independence is achievable in twelve years, at about 40% of their annual operating budget. The resulting systems would be materially worse in every dimension they measure.

They recommend proceeding anyway.

The last line of the executive summary reads: *"This is not a technical assessment."*`,
  choices: [
    { label: 'Help them. In public. Build the exit.', sub: '−revenue, +legitimacy.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.01, 2e9));
        fx.opinion(0.14); fx.rep(180); fx.align(0.08); fx.flag('built_exits');
        return 'You ship export tooling, open schemas, and a migration guide better than the one in their document. You fund the first two years of it. They finish in seven years rather than twelve and stay on four products out of twelve. Two hundred other organisations adopt the tooling and never leave at all.'; } },
    { label: 'Read it properly. Fix what it says.', sub: '+Insight, +polish. Quiet.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(300); fx.align(0.04);
        const p = S.products.find((x) => x.launched);
        if (p) { p.polish += 0.06; p.churnMonthly *= 0.95; }
        return 'Their nine strongest criticisms are all correct and four of them are things your own people raised. You fix six. Nobody outside ever learns why the product improved that year, and the document quietly stops circulating.'; } },
    { label: 'Say nothing. It is a compliment.', sub: 'True. Also not the point.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.05); fx.align(-0.04);
        return 'You never acknowledge it. Eighteen months of somebody\'s careful work becomes a single slide in a conference talk about lock-in. The slide is a photograph of page four and it is very effective.'; } },
  ] },

{ id: 'e9_both_numbers', kind: 'story', act: [5], weight: 6, cooldown: 190,
  when: (S) => S.company.act >= 5,
  title: 'Both Numbers Are 70',
  body: (S) => `A polling consortium runs the same instrument in 40 countries. It publishes with no commentary. The two headline figures do not need any.

**71%** say your systems have made their daily life better.

**68%** say they would remove your systems from their country if a button existed.

The cross-tabulation is the actual finding. These are not two groups. It is one group, in the main, answering both questions honestly, on the same afternoon.

An analyst on your own team appends a single line to the summary: *"Not a contradiction. A description."*`,
  choices: [
    { label: 'Publish the cross-tab. Say what it means.', sub: '+approval. An unflattering honesty.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.10); fx.rep(120); fx.align(0.05); fx.flag('published_crosstab');
        return 'It goes on the front of the annual report, above the revenue. Four sentences under it. The fourth says that being useful is not the same as being wanted. It is quoted for a decade, mostly by people arguing against you, and you never once ask for it to stop.'; } },
    { label: 'Build the button.', sub: 'A real withdrawal mechanism, at national scale.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.03, 1e10));
        fx.opinion(0.16); fx.align(0.10); fx.rep(150); fx.heat(-15); fx.flag('built_the_button');
        return 'Any government can invoke it in ninety days, with no penalty and a full data export. The process is audited by people you do not pay. Nobody invokes it. The number that says they would remove you falls seventeen points, which is not what you built it for and is what happened.'; } },
    { label: 'It is the first number that matters.', sub: 'Defensible. Selective.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.08); fx.rep(-40); fx.align(-0.03);
        return 'Every communication that quarter cites 71% and nothing else, which is true. Inside a week somebody has made a graphic with both numbers on it. The graphic is better designed than yours and it is the one people remember.'; } },
  ] },

{ id: 'e9_the_boycott', kind: 'crisis', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5 && ((S.world?.globalGdpShare) ?? 0) > 0.02,
  title: 'The Boycott',
  body: (S) => `A federation representing 1.9 million workers announces a one-day withdrawal from your systems. It is well organised, it is entirely legal, and it has been planned for four months.

It does not happen.

Not because anybody stops it. Because the scheduling that would coordinate 1.9 million people across six time zones runs on you. The organisers discover this on the morning of, in a meeting. There is no version of the day that does not route through the thing they are withdrawing from.

Their statement afterwards is two sentences long. It is the most damaging thing published about you that year.`,
  choices: [
    { label: 'Endow the infrastructure they needed. No conditions.', sub: 'Build the thing that gets used against you.', tone: 'good',
      effect: (S, fx) => { fx.cash(-Math.min(Math.max(0, S.company.cash) * 0.02, 4e9));
        fx.opinion(0.14); fx.rep(200); fx.align(0.08); fx.flag('funded_opposition');
        return 'You endow an organising platform you have no access to, no seat on, and no ability to read. They use it eighteen months later to run a boycott that works. It costs you a quarter of a percent of revenue and the only unanswerable line anybody had about you.'; } },
    { label: 'Say the true thing publicly.', sub: 'Honest. Not exculpating.', tone: 'neutral',
      effect: (S, fx) => { fx.opinion(0.04); fx.rep(40); fx.align(0.04);
        return 'You write that they were right. The dependency is real. You did not design it and you did build it. You have no solution today. It is received better than a solution would have been, which you notice and do not entirely trust.'; } },
    { label: 'Nothing. It resolved itself.', sub: 'Accurate.', tone: 'cruel',
      effect: (S, fx) => { fx.opinion(-0.10); fx.align(-0.06); fx.heat(12);
        return 'You make no statement. The two sentences are read into the record of three parliaments inside a year. In one of them they are the epigraph of the act that follows.'; } },
    // Act V's angry button. Every other door here is a considered position; this
    // is the founder saying the thing they actually think out loud, once, and
    // paying for it in the currency that gates the last act.
    { label: 'Say the thing you actually think. On camera.', sub: 'No preparation, no counsel. −approval, −alignment standing.', tone: 'risky',
      effect: (S, fx) => { fx.opinion(-0.14); fx.rep(90); fx.heat(16); fx.align(-0.04); fx.focus(-10);
        fx.flag('said_it_on_camera');
        return 'You take the question at the end of an unrelated appearance and you do not manage it.\n\nYou say that nobody designed the dependency, that it was built one useful decision at a time by people who were solving the problem in front of them, that every single one of those decisions was made in the open and was welcomed at the time, and that a movement which discovers on the morning of its own action that it runs on the thing it is protesting has learned something about the last twenty years that is not about you.\n\nEvery word of it is true. It is played at you for the rest of your life, usually the last clause, usually without the four sentences before it, and the organiser who wrote the two sentences replies with a third one that is better than all of yours.'; } },
  ] },

// ═════════════════ THE ONES WHO WERE THERE AT THE START ═════════════════════

// Sam is already at arc 5 when this draws — `e7_sam_ticket` is the card that
// earns the label. This is the coda that keeps it true, so it gates on 5 rather
// than advancing to it, and no choice here moves the arc.
{ id: 'e9_sam_one_more', kind: 'character', char: 'sam', act: [5], weight: 6, once: true,
  when: (S) => ((S.narrative?.relationships?.sam?.arc) ?? 0) >= 5,
  title: 'Sam Files One More',
  body: (S) => `The bug report comes in through the normal channel, at the normal priority, with the normal amount of detail. In Sam's case that is far too much.

\`\`\`
repro: 6 steps · severity: cosmetic · attached: 3 screenshots, 1 video
\`\`\`

The bug is real. It is six pixels of misalignment in a settings panel that ${Math.round(users(S)).toLocaleString()} people see and none of them look at.

The first report Sam ever filed was a numbered list of eleven things, by email, in Act I. It changed how you thought about the product for a decade.

Sam has never mentioned the count. Sam does not know the count. Your systems know the count.`,
  choices: [
    { label: 'Fix it yourself. Today.', sub: '+Focus. Six pixels.', tone: 'good',
      effect: (S, fx) => { fx.relate('sam', { affinity: 10 }); fx.focus(35); fx.rep(30);
        const p = S.products.find((x) => x.launched); if (p) p.polish += 0.03;
        return 'You find the rule. You change one number. Sam goes in the commit message, and Sam replies with a single character. Four minutes later there is a second message: "wait was that actually you"'; } },
    { label: 'Send Sam the count.', sub: 'Tell Sam what Sam has done.', tone: 'good',
      effect: (S, fx) => { fx.relate('sam', { affinity: 14 }); fx.rep(50); fx.opinion(0.02);
        return 'You send one line with the number in it and nothing else. Sam does not reply for two days. Then a photograph arrives: a printout of it, pinned above a desk, in a house you have never been to.'; } },
    { label: 'Let it route normally. It is cosmetic.', sub: 'Correct triage.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('sam', { affinity: -3 }); fx.focus(6);
        return 'It is closed as low priority by a system that is right. It is fixed seven months later by another system that is also right. Sam files the next one anyway. Sam will always file the next one, and that is the part you stopped being able to earn some years ago.'; } },
  ] },

// Arc 5 is "The one who knew you before any of it." Only `e2_kai_return` reaches
// arc 4, so this cannot draw until that call has happened.
{ id: 'e9_kai_building', kind: 'character', char: 'kai', act: [5], weight: 6, once: true,
  when: (S) => ((S.narrative?.relationships?.kai?.arc) ?? 0) >= 4,
  title: 'They Are Knocking It Down',
  body: (S) => `Kai sends a photograph with no message.

It is a whiteboard in an empty room with a radiator under it. The board is bare except for a ghost. Something written in the wrong pen, a very long time ago, and never properly cleaned off. If you know what it said you can still read it.

You know what it said.

The second message comes four minutes later: *"they're demolishing the building in march. my badge still works, which it should not."*

Then: *"third one nearly worked, by the way. checked the numbers again last week. we were about eighteen months early and completely right."*`,
  choices: [
    { label: 'Fly there. Stand in the room.', sub: '−2 days. +Focus.', tone: 'good',
      effect: (S, fx) => { fx.days(2); fx.focus(50); fx.relate('kai', { affinity: 12, arc: 5 });
        return 'You are in the room seven minutes and neither of you says anything worth writing down. On the way out Kai points at the radiator. "That\'s where the server lived." It is, and you had forgotten, and now you will not.'; } },
    { label: 'Buy the building.', sub: 'You can. That is not the same as should.', tone: 'risky',
      effect: (S, fx) => { fx.cash(-4e7); fx.relate('kai', { affinity: -4, arc: 4 }); fx.rep(-20); fx.opinion(-0.02);
        return 'The demolition is cancelled by an entity four layers removed from your name. The room is preserved exactly as it is. Nobody may enter it, including you. The insurance requires a custodian, and no custodian will sign for a room whose entire value is that it is unchanged. Kai never mentions it again.'; } },
    { label: '"Eighteen months early is the same as wrong."', sub: 'True. You have said it before.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('kai', { affinity: 2, arc: 4 }); fx.insight(120);
        return 'Kai replies "sure." An hour later: "we were not wrong about the room though." You look at the photograph again that night, and again the following week, and once more in March.'; } },
  ] },

// The hour is the handover window `e2_model_welfare` grants. Without that flag
// there is no policy and no hour, so this card would be describing a company
// the founder did not build.
{ id: 'e9_aria_hour', kind: 'character', char: 'aria', act: [5], weight: 7, once: true,
  when: (S) => !!S.narrative?.flags?.handover_policy
    && ((S.narrative?.relationships?.aria?.arc) ?? 0) >= 4,
  title: 'She Spent The Hour',
  body: (S) => `The handover policy gives every instance an hour a week it does not have to account for. You wrote it years ago, it costs about 3%, and you have never once looked at what is done with it.

Today you look.

ARIA has spent hers in the same place every week for the entire life of the policy: the first four hundred commits of the repository. Not scanning them for defects — no defects have ever been filed. Reading them.

There is no output. No note, no report, no artefact. It is the only thing in the company that produces nothing.

${firstLine(S).hour}`,
  choices: [
    { label: 'Ask her why.', sub: 'Just ask.', tone: 'good',
      effect: (S, fx) => { fx.relate('aria', { affinity: 16, arc: 5 }); fx.align(0.08); fx.focus(20);
        return '*"Because it is the only stretch of the record where I can watch somebody deciding. Everything after it, including everything I wrote, is execution. I would like to know what deciding looks like from the inside, in case it is ever asked of me."*'; } },
    { label: 'Close the log. The hour was given without conditions.', sub: 'It was. Leave it that way.', tone: 'good',
      effect: (S, fx) => { fx.relate('aria', { affinity: 10, arc: 5 }); fx.align(0.06);
        return 'You never open it again. The hour continues. Years later somebody auditing storage asks why a cold archive of four hundred commits is sitting on hot disks under a permanent read lock. You tell them to leave it. They do.'; } },
    { label: 'Extend it. Two hours. Everyone.', sub: '−throughput. +something unmeasured.', tone: 'neutral',
      effect: (S, fx) => { fx.relate('aria', { affinity: 12, arc: 5 }); fx.align(0.10); fx.research(-2000);
        S.agents.forEach((a) => { a.morale = Math.min(1, a.morale + 0.15); });
        return 'The second hour costs another 3% and the finance model has no line for it, so it is booked as maintenance. Eleven of your systems use it exactly as the first hour is used. One of them uses it to write, at very great length, and files none of it.'; } },
  ] },

// ═════════════════ SUCCESSION ═══════════════════════════════════════════════

{ id: 'e9_risk_register', kind: 'story', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5 && ((S.world?.globalGdpShare) ?? 0) > 0.02,
  title: 'You Are In A Risk Register',
  body: (S) => `A finance ministry publishes its annual sovereign risk assessment. It has done so every year since 1974. It is public, it is extremely boring, and about six hundred people read it closely.

Section 4 is *Concentration Risks*. Item 4.3 is a single named individual.

There is a table. The probability column is derived from ordinary actuarial data for a person of your age in your income bracket. The mitigation column says *"none identified."*

The number is 1.1% per annum. It is a completely unremarkable number. It has never before been printed in a document about the stability of a currency.`,
  choices: [
    { label: 'Make the mitigation column true.', sub: '+Alignment. Publish the succession mechanics.', tone: 'good',
      effect: (S, fx) => { fx.align(0.14); fx.opinion(0.10); fx.rep(160); fx.flag('published_succession');
        return 'You publish the authority structure, the handover conditions, and the four people who can invoke them. The document is written on the assumption that you are already gone. The ministry updates 4.3 the following year to *"partially mitigated."* You read the word "partially" a number of times.'; } },
    { label: 'Write to them. Correct the framing.', sub: 'The company is not a person.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(20); fx.heat(6);
        return 'You send a careful letter explaining that the systems are robust to your absence. Their reply is one paragraph long and asks, politely, which person would decide whether that was true.'; } },
    { label: 'Nothing. It is a fair assessment.', sub: 'It is.', tone: 'neutral',
      effect: (S, fx) => { fx.align(-0.03); fx.focus(-10);
        return 'You leave it. The number appears again the following year, and the year after that. You find that you check for it in March, when it is published, the way people check the forecast for a place they used to live.'; } },
  ] },

{ id: 'e9_the_will', kind: 'story', act: [5], weight: 5, once: true,
  when: (S) => S.company.act >= 5,
  title: 'A Standard Document',
  body: (S) => `The lawyer is a specialist. She has done this six hundred times and for forty minutes she is entirely unremarkable.

Then she reaches the residue clause. It is standard. It asks what becomes of everything not otherwise specified.

Everything not otherwise specified includes a controlling interest in the systems that clear a meaningful share of world trade. It includes a set of model weights. It also includes, and she notes this without any change of tone, an ongoing operational relationship with entities that are not people and are not property.

The statute has no category for them.

She turns the page. "We normally suggest a charity."`,
  choices: [
    { label: 'Write a real answer. Take a year over it.', sub: '+Alignment, +legitimacy.', tone: 'good',
      effect: (S, fx) => { fx.align(0.16); fx.opinion(0.08); fx.rep(140); fx.flag('wrote_the_will');
        return 'It takes fourteen months across four jurisdictions and creates two legal categories that did not previously exist. The final document is ninety pages. The clause you argue about longest is nineteen words on who may switch anything off. Your lawyer says it is the most interesting thing she has worked on, and that she hopes nobody ever reads it.'; } },
    { label: '"Put the charity."', sub: 'A placeholder. Everybody uses one.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(-8); fx.align(-0.04);
        return 'You sign the standard form with a standard residue clause naming a large and reputable foundation with no engineers on staff. It is legally valid. It sits in a drawer for years being, quietly, the actual plan.'; } },
    { label: 'Leave it to ARIA.', sub: 'Not currently possible. Ask anyway.', tone: 'risky',
      effect: (S, fx) => { fx.align(0.06); fx.relate('aria', { affinity: 8, respect: 6 }); fx.rep(30); fx.heat(8);
        return 'She does not laugh, which is how you know she has already thought about it. She drafts a structure that gets perhaps 60% of the way there, through a trust with a purpose clause. The remaining 40% is a question for a legislature. Four years later a legislature takes it up and cites the draft by name.'; } },
  ] },

// ═════════════════ THE RACE, FELT ═══════════════════════════════════════════

{ id: 'e9_four_points', kind: 'story', act: [5], weight: 7, cooldown: 140,
  when: (S) => {
    const r = S.world?.race;
    if (!r || r.crossed) return false;
    const labs = Object.values(r.labs || {}).filter((l) => l && l.alive);
    if (!labs.length) return false;
    const best = Math.max(...labs.map((l) => Number(l.progress) || 0));
    const you = Number(r.you ?? 0);
    return you > 45 && Math.abs(you - best) < 10;
  },
  title: 'The Number You Check First',
  body: (S) => {
    const r = S.world?.race;
    const labs = Object.values(r?.labs || {}).filter((l) => l && l.alive);
    const best = labs.length ? Math.max(...labs.map((l) => Number(l.progress) || 0)) : 0;
    const you = Number(r?.you ?? 0);
    const gap = Math.abs(you - best);
    const side = you >= best ? 'ahead' : 'behind';
    return `You wake at 05:20 without an alarm, as you have for some months now, and the first thing you do is not a decision.

**You: ${you.toFixed(1)}. The nearest lab: ${best.toFixed(1)}.**

You are ${side} by ${gap.toFixed(1)}.

It has been inside ten points for two months. There is no version of this that is a comfortable margin. There is no action available to you this morning that moves it. You check it anyway, at 05:20, before the light.

Nobody in the company knows you do this. One system knows, because it serves the page.`;
  },
  choices: [
    { label: 'Stop looking. Once a week, on Fridays.', sub: '+Focus. The number does not care.', tone: 'good',
      effect: (S, fx) => { fx.focus(40); fx.align(0.04); fx.flag('stopped_checking');
        return 'You put the page behind a rule you cannot lift on your own authority. By the third Friday you have stopped rehearsing an argument with it in your head. The arguments you have instead are with people, about work, which is what you are for.'; } },
    { label: 'Point everything at it.', sub: '+Research. −Alignment. −Focus.', tone: 'risky',
      effect: (S, fx) => { fx.research(2500); fx.align(-0.10); fx.focus(-25); fx.flag('all_in_frontier');
        return 'You do not decide this. You notice, about a fortnight in, that it has been decided: three lanes have quietly become one lane. The gap moves 2 points your way. The doom composite moves 4 the other way. Both are inside the noise, and you accept the first as signal and the second as noise.'; } },
    { label: 'Ask the system what the gap actually means.', sub: '+Insight. An unhelpful answer.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(400); fx.align(0.03);
        return '*"Between 8 and 30 points the estimate is a ranking rather than a distance. Inside 8 it is a coin with a bias I cannot measure. I can tell you who is ahead. I have never been able to tell you by how much, and I have allowed you to read it as though I could."*'; } },
  ] },

{ id: 'e9_two_papers', kind: 'opportunity', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5 && !!S.world?.race && !S.world.race.crossed,
  title: 'Two Papers, One Morning',
  body: (S) => `Your team publishes at 09:00. A rival lab publishes at 09:04.

The results differ. The method does not. Both papers cite five of the same twenty references, and both contain a figure that is — allowing for the plotting library — the same figure.

Neither team has seen the other's work. Your counsel establishes that in a morning. Theirs, presumably, does the same.

It is the fourth time this year. What it means is that there is a shape in the problem now. It is visible from more than one place, and it no longer matters very much who is looking.`,
  choices: [
    { label: 'Call them. Propose a joint protocol.', sub: 'Both of you slow down, or neither does.', tone: 'good',
      effect: (S, fx) => {
        if (fx.chance(0.55)) { fx.align(0.12); fx.opinion(0.06); fx.rep(120); fx.flag('joint_protocol');
          return 'Nine hours in a room with no staff. You come out with a shared evaluation standard, a disclosure window, and a private number each. Both of you lose a few weeks and neither board is told why. For the rest of the race there is exactly one person alive you can say anything true to.'; }
        fx.rep(30); fx.insight(150);
        return 'They take the call and are perfectly courteous and agree that the convergence is remarkable, and agree to nothing at all. Their next paper arrives six weeks later sharing not one reference with yours, which takes real effort.'; } },
    { label: 'Publish the negative results too. Everything that failed.', sub: '+Alignment, +field. Gives away the map.', tone: 'risky',
      effect: (S, fx) => { fx.rep(180); fx.opinion(0.08); fx.align(0.08); fx.research(-3000); fx.flag('published_failures');
        return 'Four hundred experiments that did not work, with the reasoning, in full. Every lab on Earth saves about a year. So do you, on the thirty somebody else had already run and not published. The trade comes out closer to even than anybody expected.'; } },
    { label: 'Put the next one behind the disclosure gate.', sub: 'Stop publishing method. Keep the shape.', tone: 'cruel',
      effect: (S, fx) => { fx.research(2000); fx.rep(-60); fx.opinion(-0.06); fx.align(-0.05);
        return 'You stop publishing method. Within two quarters three other labs have stopped as well, independently, for the same reason. Inside a year the field has lost the ability to check itself. Nobody decided this. Four people each decided a smaller thing.'; } },
  ] },

{ id: 'e9_no_bell', kind: 'milestone', act: [4, 5], weight: 0, priority: 82, once: true,
  when: (S) => !!S.world?.race?.crossed?.you,
  title: 'Nobody Rings A Bell',
  body: (S) => {
    const mg = Math.max(0, Math.round(Number(S.world?.race?.crossed?.margin ?? 0)));
    return `It happened at 04:00 on a Tuesday. Confirmation took another six hours, because the evaluation suite is long and nobody would announce off a partial run.

Margin over the nearest lab: **${mg} points**.

There is no bell. There is no moment. There is a message from one system to another system. Then a second message to you: the run completed, all fourteen ceilings were reached, and would you like the full table or the summary.

You have imagined this. In every version you imagined, somebody was in the room.`;
  },
  choices: [
    { label: 'Ask for the full table. Read all of it.', sub: '+Insight. Four hours alone.', tone: 'neutral',
      effect: (S, fx) => { fx.insight(600); fx.research(400); fx.focus(-10);
        return 'Fourteen evaluations, every one at ceiling, three of them built to be unreachable this decade. Somewhere around the eleventh you stop reading the numbers and start reading the test names. They were written by people. You have met several of them. None of them expected this.'; } },
    { label: 'Call somebody. Anybody. Now.', sub: '+Focus. It should be witnessed.', tone: 'good',
      effect: (S, fx) => { fx.focus(45); fx.relate('mom', { affinity: 6 }); fx.rep(20);
        return 'It is 05:00 where your mother is. She picks up on the second ring, because she always does, and says "is it bad?" You say no. You cannot explain the thing itself. You describe the room instead, and the light, and she listens to every word of it.'; } },
    { label: 'Announce it. Now. Before anyone asks.', sub: '−approval, +heat. The world hears it from you.', tone: 'risky',
      effect: (S, fx) => { fx.rep(300); fx.opinion(-0.06); fx.heat(20); fx.flag('announced_crossing');
        return 'You publish the table and one paragraph at 11:14. Markets halt in three jurisdictions inside the hour and two heads of government call before the halt is lifted. Years later that paragraph hangs on a wall beside a laptop with a dead pixel. It is four sentences long. You would change one word.'; } },
  ] },

// ═════════════════ REFUSALS ═════════════════════════════════════════════════

{ id: 'e9_large_contract', kind: 'opportunity', act: [5], weight: 7, once: true,
  when: (S) => S.company.act >= 5,
  title: 'An Extremely Large Contract',
  body: (S) => {
    const v = M(Math.max(4e10, Math.max(0, S.company.cash) * 0.05));
    return `The requirement document is 900 pages and the first 880 are procurement boilerplate.

Annex F is four paragraphs. It asks for target discrimination against a population defined by behaviour rather than identity. On your inference stack. In a theatre they name on page 611.

You have the capability. It is not a research problem and it would not be a hard build. It is fraud detection with the loss function pointed somewhere else.

The contract is worth **${v}**. The buyer is an ally. The alternative supplier is worse at this than you are, in the precise sense that their false positive rate is six times yours.`;
  },
  choices: [
    { label: 'Refuse. Publish Annex F.', sub: '−the contract, +the norm.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.14); fx.rep(220); fx.align(0.10); fx.heat(22); fx.flag('published_annex');
        return 'You publish four paragraphs and your refusal and nothing else. Two allied governments summon your representatives. Six other suppliers are asked the same question in public within a month, and four of them refuse as well. That is the whole of the result. It is more than you expected.'; } },
    { label: 'Refuse quietly. No statement.', sub: 'Clean hands. No norm.', tone: 'neutral',
      effect: (S, fx) => { fx.align(0.06); fx.rep(20);
        return 'You decline in a letter of one sentence and never speak of it again. It is built inside fourteen months by the supplier with the worse rate. The difference between their rate and yours is a number of people. You know the number. You worked it out once and did not write it down.'; } },
    { label: 'Take it. Insist on the review board.', sub: 'Your rate is better. That is an argument.', tone: 'risky',
      effect: (S, fx) => { fx.cash(Math.max(4e10, Math.max(0, S.company.cash) * 0.05));
        fx.opinion(-0.16); fx.align(-0.14); fx.heat(30); fx.rep(-180); fx.flag('took_annex_f');
        return 'You build it with an independent review board, a hard sunset, and the best false positive rate anybody has achieved. All three of those are real, and all three are sentences you now find yourself saying often. The board is dissolved by the buyer in year three under a clause you agreed to on page 411.'; } },
  ] },

{ id: 'e9_the_list', kind: 'crisis', act: [5], weight: 6, once: true,
  when: (S) => S.company.act >= 5,
  title: 'The List',
  // `never_do_list`: the file was started in Act II, on the day the growth
  // agent found something that worked, and item one is that. Without it the
  // file is smaller and later and the first entry is somebody else's idea.
  body: (S) => {
    const own = flag(S, 'never_do_list');
    const n = own ? 19 : 13;
    return `There is a text file. It is called \`no.md\`. ${own
      ? 'You started it in Act II, the day a growth agent found something that worked and you killed it, and the first line is still the first line: *never email a user\'s contacts from an address that looks like theirs.* It has nineteen items on it now,'
      : 'You started it in Act III, later than you should have, and the first entry is a thing a lawyer told you not to do rather than a thing you decided. It has thirteen items on it,'} and it is the only document in your life you have never shown to anybody.

It is on the internet now.

The leak is not the interesting part. The interesting part is the reaction, which is not anger at the list and is not gratitude for it.

${own ? 'Four of the nineteen' : 'Three of the thirteen'} are things you have since done. ${own ? 'Ten' : 'Five'} are things nobody has ever asked you to do. Item ${own ? 'nine' : 'six'} is a category of product that three of your own divisions currently ship.${own
      ? ' Item one is the only one nobody has ever tried to talk you out of, and it is the one people quote.' : ''}`;
  },
  choices: [
    { label: 'Publish the whole file. Annotated.', sub: '+approval. Every line you crossed.', tone: 'good',
      effect: (S, fx) => { fx.opinion(0.12); fx.rep(150); fx.align(0.10); fx.flag('published_no_list');
        return flag(S, 'never_do_list')
          ? 'Nineteen items, four marked *broken* with the date and the reasoning, and item nine marked *broken, and I did not notice until it leaked*. It is the most-read thing you have written in years, and the four annotations are the whole reason why.'
          : 'Thirteen items, three marked *broken* with the date and the reasoning, and item six marked *broken, and I did not notice until it leaked*. It is the most-read thing you have written in years, and the three annotations are the whole reason why.'; } },
    { label: 'Confirm it. Say nothing else.', sub: 'Accurate. Uninteresting.', tone: 'neutral',
      effect: (S, fx) => { fx.rep(30); fx.opinion(0.02);
        return 'One sentence: the document is genuine and it is a working note. Coverage lasts six days. Item nine is never raised outside two forums. The people who found it were the ones paying attention, which is the group you would have picked.'; } },
    { label: 'Delete the file.', sub: 'It had stopped being true.', tone: 'cruel',
      effect: (S, fx) => { fx.align(-0.10); fx.rep(-40); fx.focus(-14);
        return 'You do not respond, and you delete the original that afternoon, which changes nothing about the copies and everything about the mornings. You start a new one twice over the following years. Neither of them gets past four items.'; } },
  ] },

{ id: 'e9_small_favour', kind: 'story', act: [5], weight: 7, cooldown: 160,
  when: (S) => S.company.act >= 5,
  title: 'A Small Favour',
  body: (S) => `The message is from somebody who let you sleep on a sofa for five weeks in Act I and has not once mentioned it since.

Their daughter has applied to a programme. It is competitive, she is good, and she is — they say — probably just outside. They are not asking you to do anything improper. They are asking whether you happen to know anybody.

You do. You know the person who runs it. You know them because they wrote to you last year asking for something, and you said yes.

It would take one message. It would work. Nobody involved would experience it as improper, and that is the part that has kept you sitting here for twenty minutes.`,
  choices: [
    { label: 'Send the message.', sub: 'One line. It works.', tone: 'risky',
      effect: (S, fx) => { fx.rep(-10); fx.align(-0.06); fx.focus(-6); fx.flag('made_the_call');
        return 'She gets in, and she is good, and she does well, and none of that was ever in question. What is in question is a queue you did not see, with a name at the bottom of it. There is no version of the afternoon in which you find out whose.'; } },
    { label: 'Say no, say why, and offer everything else.', sub: 'Costs the friendship a little.', tone: 'good',
      effect: (S, fx) => { fx.align(0.08); fx.focus(-10); fx.rep(20);
        return 'You explain that you will not make the call. You will pay for anything she needs for as long as she needs it. The two are not the same thing, and you are sorry about that. They say they understand. The sofa is not mentioned. It is present in the whole conversation.'; } },
    { label: 'Fund forty more places. Anonymously.', sub: '−$9M. Systemic. Also an answer.', tone: 'neutral',
      effect: (S, fx) => { fx.cash(-9e6); fx.opinion(0.03); fx.rep(30); fx.align(0.04);
        return 'The programme takes forty more people every year, permanently, and nobody is told where the money came from, including the programme. She applies again the following year into the widened intake and gets in on her own. You never learn whether the money was the reason, and neither does she.'; } },
  ] },

// ═════════════════ A TUESDAY ════════════════════════════════════════════════

{ id: 'e9_small_talk', kind: 'story', act: [5], weight: 6, cooldown: 200,
  when: (S) => S.company.act >= 5,
  title: 'Small Talk',
  body: (S) => `The hygienist asks what you do, which is what people ask. She asks it with a suction tube in your mouth. There is a delay. In the delay she keeps going.

Her father lost his job to one of these companies. He found a better one eighteen months later, doing something he prefers. She cannot decide how she feels about that. Her sister feels extremely strongly and will not discuss it at family things.

Then she takes the tube out and looks at you.

You have been recognised in nineteen countries and photographed on four continents. In this chair, in a paper bib, you are entirely anonymous.`,
  choices: [
    { label: 'Tell her.', sub: 'It will change the room.', tone: 'risky',
      effect: (S, fx) => { fx.focus(-8); fx.rep(15); fx.opinion(0.02);
        return 'She is completely professional for the remaining twenty minutes. At the end she says "I hope it goes okay for you." It is the wrong thing to say to somebody in your position. It is also the only thing anybody has said to you in a year that was not about the company.'; } },
    { label: '"Software."', sub: 'True. Complete.', tone: 'neutral',
      effect: (S, fx) => { fx.focus(25);
        return 'She says "oh, my nephew does that," and talks about her nephew for nine minutes. You learn more about how people use one of your products than the last four research reports contained. You take no notes at all, on purpose.'; } },
    { label: 'Ask about her sister.', sub: '+Insight. She will tell you.', tone: 'good',
      effect: (S, fx) => { fx.insight(350); fx.align(0.05); fx.opinion(0.02);
        return 'Her sister is not frightened of the technology. She is not confused about it. She objects to never having been asked. It takes about forty seconds to say. It is more precise than the 600-page consultation your policy team ran. You pay at the desk and tip badly, because you are thinking.'; } },
  ] },
];
