// ─────────────────────────────────────────────────────────────────────────────
// THE VOICE — `copylint`, for prose nobody wrote in this repository.
//
// `tools/copylint.mjs` reads the written content files and refuses a build over
// a curly quote or a lowercase "i". None of that reaches the world layer: an
// assistant's card is written at run time, lands in the same modal as the deck's,
// and sits three inches from a card that has been through the linter. So the
// same rules run here, on the same prose, at the moment it is written.
//
// Two differences, and both are deliberate.
//
//   · Nothing here ever refuses. A card the founder can read is worth more than
//     a card that was correct, and a model told "no" without a number to change
//     re-plans blindly. These are `warnings`, they ride back on the tool result,
//     and the world console counts them.
//   · It reads *narration* only. Contractions, exclamation marks and "you will"
//     are wrong in the game's voice and completely right in a character's mouth,
//     so quoted speech — anything in double quotes, anything in a markdown
//     blockquote, anything in italics inside one — is cut out before the rules
//     run. Every contraction in the written deck is inside quotation marks.
//
// Pure, and importing nothing: `validate.js` calls it, `tools/lint.mjs` could,
// and it must never be the reason a card is refused.
// ─────────────────────────────────────────────────────────────────────────────

// The house style, as the deck holds itself to it. Each rule is a test and the
// sentence a writer can act on — never "invalid", always what to do instead.
const NARRATION_RULES = [
  [/!/, 'no exclamation marks — the game never raises its voice'],
  [/\b(as an AI|language model|ChatGPT|I cannot|I’m sorry|as a large)\b/i,
   'stay in the world; you are the market, not an assistant'],
  [/\byou will\b/i, 'present tense — the card is happening now, not later'],
  [/\byou would\b/i, 'present tense — say what happens, not what would'],
  [/\b(don't|doesn't|isn't|aren't|wasn't|weren't|won't|can't|couldn't|shouldn't|wouldn't|haven't|hasn't|hadn't|didn't|it's|you're|they're|we're|there's|that's|I'm|I've|let's)\b/i,
   'no contractions in narration — the game narrates plainly and contracts only inside quotation marks'],
  [/[“”‘’]/, 'straight quotes only — the interface prints " and \''],
  [/\.\.\./, 'three dots — use …'],
  [/ {2,}/, 'double space'],
  [/\s+[,.;:?](?!\d)/, 'space before punctuation'],
  [/[a-z],[A-Za-z]/, 'missing space after a comma'],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, 'a leaked value — that is a variable, not a word'],
  [/\bi\b(?![.'’])/, 'lowercase standalone "i"'],
  [/\bteh\b|\brecieve|\bseperate|\boccured\b|\bdefinately\b|\bthier\b/i, 'likely typo'],
  [/\bTODO\b|\bFIXME\b|\blorem\b/i, 'a placeholder left in'],
];

// The tics `copylint` counts across the content modules. One of these in one
// card is a cadence; the linter's own threshold is eight in a module, and the
// world writes one card at a time — so this warns on the second one in a
// single card, which is where it starts reading as a house style being copied
// rather than a sentence being written.
const TICS = [
  ['eleven', /\beleven\b/gi], ['nine', /\bnine\b/gi], ['forty-one', /\bforty-one\b/gi],
  ['ninety seconds', /\bninety seconds\b/gi], ['a pause', /\ba pause\b/gi],
  ['candidly', /\bcandidly\b/gi], ['which is the', /\bwhich is the\b/gi],
  ['it is also', /\bit is also\b/gi],
];

// Quoted speech is a person talking and answers to nobody's style guide.
// Blockquote lines, double-quoted spans and italic spans inside them come out
// before anything below runs.
// The cut-out is a token, never a space: replacing a quoted sentence with " "
// manufactures the double space the rule below then reports, which is how a
// perfectly-written line came back complaining about its own punctuation.
function narrationOf(text) {
  return String(text ?? '')
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n')
    .replace(/"[^"]*"/g, 'SAID')
    .replace(/\*[^*]+\*/g, 'SAID');
}

// Numbers. The deck's rule is "counts as words, money as figures": a bare
// small integer in prose reads as a spreadsheet. Money, percentages, days,
// versions and anything four digits or longer are figures on purpose.
// No lookbehind: Safari only learned it in 16.4 and this ships as source.
function numberWarnings(prose) {
  const out = [];
  const bare = prose.replace(/[$€£]\s?[\d,.]+/g, ' ')       // money
                    .replace(/\d[\d,.]*\s?%/g, ' ')          // percentages
                    .replace(/\b\d+\s?(?:am|pm|k|m|bn?|x|×|st|nd|rd|th)\b/gi, ' ')
                    .replace(/\bday \d+/gi, ' ')
                    .replace(/\d{4,}/g, ' ');
  const m = /(^|[^\w.$€£])([2-9]|1[0-2])(?![\w.%])/.exec(bare);
  if (m) {
    out.push(`write small counts as words — "${m[2]}" reads as a spreadsheet; money and percentages stay figures`);
  }
  return out;
}

// "One concrete number" is satisfied by a word as readily as a figure — that
// is the same rule, from the other side. A body reading "nine days" has its
// number, and telling it otherwise is how two rules end up contradicting.
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half|twice|third|quarter)\b/i;
function hasNumber(text) {
  return /\d/.test(text) || NUMBER_WORDS.test(text);
}

// One block of prose, judged as narration. Returns the sentences a writer can
// act on, worst first, never more than `max`.
export function voiceWarnings(text, { max = 4, numbers = true } = {}) {
  const raw = String(text ?? '');
  if (!raw.trim()) return [];
  const prose = narrationOf(raw);
  const out = [];
  for (const [re, msg] of NARRATION_RULES) {
    if (re.test(prose) && !out.includes(msg)) out.push(msg);
  }
  if (numbers) for (const w of numberWarnings(prose)) if (!out.includes(w)) out.push(w);
  for (const [name, re] of TICS) {
    const n = (raw.match(re) || []).length;
    if (n >= 2) { out.push(`"${name}" twice in one card is a tic, not a cadence — vary the beat`); break; }
  }
  return out.slice(0, max);
}

// A whole card. The body carries the number rule; a label is four words and a
// small integer in one is a cost, not a spreadsheet. The old style check lived
// in `validate.js` and this replaces it, so the "one concrete number" advice
// comes along too — it is the only rule here that fires on an *absence*.
export function cardVoiceWarnings(card, { max = 4 } = {}) {
  const body = String(card?.body ?? '');
  const rest = (card?.choices || [])
    .map((c) => `${c?.label || ''} ${c?.sub || ''} ${c?.outcome || ''}`).join('\n');
  const out = voiceWarnings(body, { max: max + 2 });
  for (const w of voiceWarnings(rest, { max: max + 2, numbers: false })) {
    if (!out.includes(w)) out.push(w);
  }
  if (!hasNumber(body)) out.push('one concrete number in the body makes a card land');
  return out.slice(0, max);
}

// A post, a letter, a line on the weather or a line in ARIA's voice. A post is
// mostly somebody talking, so the number rule is off: a user writes "3 crashes
// since Tuesday" and that is the register.
export function lineVoiceWarnings(text, { max = 3 } = {}) {
  return voiceWarnings(text, { max, numbers: false });
}
