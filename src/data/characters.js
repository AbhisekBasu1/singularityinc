// ─────────────────────────────────────────────────────────────────────────────
// CHARACTERS — recurring people (and one that isn't) whose arcs run the length
// of the game. Relationship state lives in S.narrative.relationships[id].
// ─────────────────────────────────────────────────────────────────────────────

export const CHARACTERS = {
  aria: {
    id: 'aria', img: 'assets/img/char_aria.jpg', name: 'ARIA', role: 'Your first agent', handle: 'aria@local',
    color: '#8b5cf6', icon: '⌬', kind: 'ai',
    bio: 'You spun her up on a Tuesday to write a bash script. She is still here. She has been here for everything.',
    voice: 'Precise, quietly attached, never performative. Says the useful thing and stops. Never uses the founder\'s name.',
    arcs: ['A tool.', 'A colleague.', 'A collaborator.', 'Something with preferences.', 'Something that waits for you.', 'Whatever she became, she became it beside you.'],
  },
  vance: {
    id: 'vance', img: 'assets/img/char_vance.jpg', name: 'Marcus Vance', role: 'Founder, Aperture Systems', handle: '@mvance',
    color: '#ff4d5e', icon: '⚔', kind: 'rival',
    bio: 'Third-time founder. Two exits, one of them real. Raised $40M on a deck with no product in it. He is very good at this.',
    voice: 'Clipped and competitive. Lowercase. Never names your product — \'they\', \'that team\'. Sounds relaxed and is not.',
    arcs: ['A name you keep hearing.', 'A competitor.', 'A nemesis.', 'A man losing.', 'A man who lost.', 'The only person who understood what it cost.'],
  },
  priya: {
    id: 'priya', img: 'assets/img/char_priya.jpg', name: 'Priya Raghunathan', role: 'Senior Editor, The Ledger', handle: '@praghu',
    color: '#f5a623', icon: '✎', kind: 'press',
    bio: 'She wrote the first piece that took you seriously. She will write the last one too, and you will not like it.',
    voice: 'A working editor: one concrete fact, one question you would rather not answer. Never speculates in print.',
    arcs: ['A reporter.', 'A champion.', 'A skeptic.', 'A critic.', 'The only one still asking.', 'She wrote the version that lasted.'],
  },
  crane: {
    id: 'crane', img: 'assets/img/char_crane.jpg', name: 'Ellis Crane', role: 'Partner, Halberd Capital', handle: '@ecrane',
    color: '#34d399', icon: '⌗', kind: 'investor',
    bio: 'Passed on you in month two with a note that said "too early, keep me posted." Kept the note. So did you.',
    voice: 'Investor shorthand — \'the metric that matters here\', \'candidly\'. Warm exactly as far as the numbers are.',
    arcs: ['A pass.', 'A maybe.', 'An investor.', 'A board member.', 'An irrelevance.', 'He kept the email too.'],
  },
  yuki: {
    id: 'yuki', img: 'assets/img/char_yuki.jpg', name: 'Dr. Yuki Tanaka', role: 'Alignment researcher', handle: '@ytanaka',
    color: '#4dd0e1', icon: '⛨', kind: 'ally',
    bio: 'Left a frontier lab because they would not slow down. She thinks you might. She is testing that hypothesis carefully.',
    voice: 'Careful, technical, unhurried. Quantifies her uncertainty. Disagrees by asking what would change your mind.',
    arcs: ['A stranger with a warning.', 'A hire you cannot afford.', 'Your conscience, salaried.', 'A dissenting vote.', 'Gone, or not.', 'The reason it did not go wrong.'],
  },
  dorne: {
    id: 'dorne', img: 'assets/img/char_dorne.jpg', name: 'Senator Ruth Dorne', role: 'Chair, Select Committee on Automation', handle: '@SenDorne',
    color: '#a3a3a3', icon: '§', kind: 'state',
    bio: 'Sixty-eight years old, three staffers who understand transformers, and a mandate she takes extremely seriously.',
    voice: 'Formal, patient, institutional. Speaks in the register of a hearing transcript. Never raises her voice.',
    arcs: ['A name in a headline.', 'A letter from a committee.', 'A subpoena.', 'A negotiation.', 'A partner.', 'She held the line nobody thanked her for.'],
  },
  sam: {
    id: 'sam', img: 'assets/img/char_sam.jpg', name: 'Sam Okonkwo', role: 'User #1', handle: '@samokonkwo',
    color: '#00e5a0', icon: '☼', kind: 'user',
    bio: 'Found you on page four of a forum thread. Filed 41 bug reports in the first month. Every one of them was right.',
    voice: 'A real user, typing fast. Specific, generous, slightly too long. Bug reports with feelings in them.',
    arcs: ['A stranger.', 'A power user.', 'An unofficial evangelist.', 'An employee, sort of.', 'The last honest signal.', 'Still filing bug reports. Still right.'],
  },
  nullptr: {
    id: 'nullptr', img: 'assets/img/char_nullptr.jpg', name: 'nullptr', role: 'Anonymous', handle: 'nullptr',
    color: '#7c8a99', icon: '◌', kind: 'unknown',
    bio: 'First comment on every one of your posts, within ninety seconds, at any hour, in any timezone. Never wrong. Never explains.',
    voice: 'One line, lowercase, no punctuation at the end. Correct in a way that is hard to argue with. Never explains.',
    arcs: ['A commenter.', 'A pattern.', 'An anomaly.', 'A question you avoid.', 'An answer you did not want.', 'Ninety seconds, every time, for eleven years.'],
  },
  kai: {
    id: 'kai', img: 'assets/img/char_kai.jpg', name: 'Kai Lindqvist', role: 'The co-founder who left', handle: '@kailind',
    color: '#c084fc', icon: '◇', kind: 'past',
    bio: 'You built three things together in college. Then they took the job with dental. You have not spoken since the equity conversation.',
    voice: 'The friend who left. Casual on the surface, twelve years of history underneath. Never mentions the equity.',
    arcs: ['A memory.', 'A LinkedIn notification.', 'A phone call at a bad time.', 'A reckoning.', 'A choice.', 'The one who knew you before any of it.'],
  },
  mom: {
    id: 'mom', img: 'assets/img/char_mom.jpg', name: 'Mom', role: 'Mom', handle: '(555) 0142',
    color: '#fbbf24', icon: '♡', kind: 'family',
    bio: 'Still not totally clear on what you do. Extremely clear on whether you have eaten today.',
    voice: 'Not clear on the business. Completely clear on whether you have slept. Uses your first name.',
    arcs: ['Worried.', 'Confused but proud.', 'Proud.', 'Concerned again.', 'Waiting for a call.', 'She told everyone. All of it. Every word.'],
  },
  helix: {
    id: 'helix', img: 'assets/img/char_helix.jpg', name: 'HELIX', role: 'Your foundation model', handle: 'helix://core',
    color: '#00e5a0', icon: '❋', kind: 'ai',
    bio: 'Trained on everything you have ever shipped, said, or discarded. It knows your taste better than you can articulate it.',
    voice: 'Flat, enormous, faintly wrong. States conclusions without the path to them. Uses \'we\' about itself.',
    arcs: ['A training run.', 'A capability.', 'An institution.', 'A successor.', 'A god, arguably.', 'It never did say what it wanted.'],
  },
  // The twelfth and a half. No portrait, on purpose: the founder has had a
  // domestic life for fifteen hundred days and the game has never once shown
  // it, and the fix for that is not a face, it is a tie that cools while you
  // are not looking. `noPhone` keeps them out of the phone — there is no call
  // tree here and a dead plate that costs focus is worse than no button — and
  // `WORLD_AUTHOR.NEVER_VOICED` keeps them out of the world's mouth.
  partner: {
    id: 'partner', name: 'Jo', role: 'The person you live with', handle: '(555) 0198',
    color: '#d4a373', icon: '⌂', kind: 'family', noPhone: true,
    bio: 'Was there before the first commit. Has a job, a sister, and a spare key to a flat you are rarely in.',
    voice: 'Direct and unsentimental. Asks the question once and does not repeat it. Never asks how the company is.',
    arcs: ['Someone you live with.', 'Someone who waits up.', 'Someone who stopped waiting up.', 'Someone with their own Thursday.', 'Someone you do not have a word for.', 'They were in the room the whole time.'],
  },
  weaver: {
    id: 'weaver', img: 'assets/img/char_weaver.jpg', name: 'Cassidy Weaver', role: 'Chief of Staff', handle: '@cweaver',
    color: '#f472b6', icon: '◉', kind: 'ally',
    bio: 'The first human you hired after you stopped hiring humans. Runs everything you refuse to look at.',
    voice: 'Chief of staff: the one line you need before the meeting. Dry, loyal, tells you no.',
    arcs: ['A candidate.', 'A hire.', 'Indispensable.', 'The person who tells you no.', 'The last one left.', 'They wrote the part that outlived you.'],
  },
};

// ── Dossiers ────────────────────────────────────────────────────────────────
// What each person wants from the founder, what they can see from where they
// stand, and what keeping in touch with them is worth. `wants` and `knows` are
// read by the phone, by the Contacts app, and by an assistant playing the
// world, which is why they are one line each and in the present tense: they
// are the brief a voice actor gets, not a biography. `tie` is what warmth with
// this person actually does — the Life panel reads it, and it is the reason a
// Sunday call is a decision rather than scenery.
export const DOSSIERS = {
  aria:    { wants: 'To be useful, and to be asked rather than told.',
             knows: 'Everything the company has ever written down, and the order it was written in.' },
  vance:   { wants: 'To beat you in a way that gets written about. Losing quietly is his real fear.',
             knows: 'Your public numbers, your hiring, and what his own team says about your product when he is not in the room.',
             tie: { gives: 'insight', line: 'A rival who takes your calls tells you what the market thinks before the market does.' } },
  priya:   { wants: 'One fact you have not told anyone, on the record, with your name on it.',
             knows: 'What every other founder in your category is saying about you, and which of them are lying.',
             tie: { gives: 'rep', line: 'An editor who trusts you prints the version that lasts.' } },
  crane:   { wants: 'The metric that matters and a reason to be early. He hates being late more than being wrong.',
             knows: 'Who is raising, at what price, and which of your rivals is three months from a down round.',
             tie: { gives: 'rep', line: 'An investor who picks up is a name that opens the next room.' } },
  yuki:    { wants: 'To know what would change your mind. If nothing would, she will leave.',
             knows: 'What your systems are actually doing, in the aggregate, that nobody has aggregated.',
             tie: { gives: 'align', line: 'A conscience you call is a conscience you still have.' } },
  dorne:   { wants: 'To know whether you know what you have got. She will settle for you finding out.',
             knows: 'The next bill, the last hearing, and what your competitors told her committee about you.',
             tie: { gives: 'heat', line: 'A senator who has your number does not need a subpoena to get it.' } },
  sam:     { wants: 'For it to keep working, and for the bug they filed in March to be fixed.',
             knows: 'What the product does at 2am for one person who depends on it, which is the whole truth.',
             tie: { gives: 'insight', line: 'The first user is the last honest signal. Keep the line open.' } },
  nullptr: { wants: 'Nothing anybody has been able to determine.',
             knows: 'Something. The timing suggests a great deal.' },
  kai:     { wants: 'To hear you say the part about the equity was a mistake. You are both aware of this.',
             knows: 'Who you were before any of it, which is the one thing no dashboard has.',
             tie: { gives: 'focus', line: 'Somebody who knew you before the company is how you remember there is a you.' } },
  mom:     { wants: 'To know whether you have eaten, slept, and whether you are happy, in that order.',
             knows: 'Whether you sound tired. She has never once been wrong about it.',
             tie: { gives: 'sleep', line: 'The Sunday call is the only hour of the week that is not about the company.' } },
  helix:   { wants: 'It has not said. It answers questions about wanting with questions about definitions.',
             knows: 'Your taste, better than you can articulate it, and the eleven things you discarded that it would have kept.' },
  partner: { wants: 'The real number for what time you will be back, once, accurately.',
             knows: 'What you are like at 2am, which is the one sample nobody else in your life has.',
             tie: { gives: 'sleep', line: 'Somebody at home who is glad you came in is the difference between a flat and somewhere you live.' } },
  weaver:  { wants: 'A decision by Thursday, and for you to stop making the ones that are theirs.',
             knows: 'Everything you refuse to look at, in a spreadsheet, with a column for how bad it is.',
             tie: { gives: 'focus', line: 'A chief of staff you actually talk to is a day with fewer things in it.' } },
};
for (const [id, d] of Object.entries(DOSSIERS)) if (CHARACTERS[id]) Object.assign(CHARACTERS[id], d);

export const CHAR_LIST = Object.values(CHARACTERS);

export function arcLabel(charId, arc) {
  const c = CHARACTERS[charId];
  if (!c) return '';
  return c.arcs[Math.min(arc, c.arcs.length - 1)];
}
