// ─────────────────────────────────────────────────────────────────────────────
// THE CHRONICLE — the book, headlessly. One chapter per act reached, nothing
// leaked, the company named, the founder's own words quoted, the shelf kept
// through a reset, and a lost run given a book too.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, section, report } from './headless.mjs';
installDom();
import { makeBot } from './bot.mjs';

const bot = await makeBot();
const { chronicle, toText, chapterText } = await import('../src/systems/chronicle.js');
const { addNote } = await import('../src/ui/os/journal.js');
const Record = await import('../src/systems/record.js');

let s = bot.Game.startNewGame({ founderName: 'Ada Lin', companyName: 'Meridian', archetype: 'hacker',
                                category: 'devtools', productName: 'Meridian' });
bot.Loop.stop();
s.tutorialHold = false;
const BAD = /undefined|\bNaN\b|\[object Object\]|\{[a-z]+\}/;

await section('day one has a book', () => {
  const b = chronicle(s);
  eq('one chapter', b.chapters.length, 1);
  ok('it names the company', /Meridian/.test(b.title));
  ok('and says the founder\'s name', /Ada/.test(b.subtitle));
  const t = toText(b);
  ok('the text is clean', !BAD.test(t), t.match(BAD)?.[0]);
});

await section('a played run has chapters', () => {
  bot.play(s, 420);
  addNote(s, 'The build is green and I do not trust it.');
  const b = chronicle(s);
  ok('a chapter per act reached', b.chapters.length === s.company.act, `${b.chapters.length} vs act ${s.company.act}`);
  for (const ch of b.chapters) {
    ok(`act ${ch.act} has prose`, ch.paragraphs.length >= 2, String(ch.paragraphs.length));
    ok(`act ${ch.act} spans real days`, ch.from >= 0 && ch.to >= ch.from, `${ch.from}–${ch.to}`);
    ok(`act ${ch.act} is clean`, !BAD.test(chapterText(ch)), chapterText(ch).match(BAD)?.[0]);
  }
  ok('the founder\'s own words are quoted', b.chapters.some((ch) => ch.paragraphs.some((p) => typeof p !== 'string' && /green/.test(p.text))));
  ok('people are in it', b.people.length > 0);
  ok('numbers are in it', b.numbers.length >= 6);
  const t = toText(b);
  ok('the whole text is clean', !BAD.test(t), t.match(BAD)?.[0]);
  ok('and long enough to be a book', t.length > 1500, String(t.length));
});

await section('the Record files it', () => {
  const rows = Record.list(s, 'chronicle');
  ok('one file per act plus the book', rows.length === s.company.act + 1, String(rows.length));
  const doc = Record.read(s, 'chronicle', 'book');
  ok('the book opens', !!doc && doc.body.length > 500);
  const hits = Record.search(s, 'Meridian');
  ok('and Find can find it', hits.some((h) => h.path === 'chronicle'));
});

await section('a lost run gets a book, and it goes on the shelf', () => {
  s.ending = { id: 'bankrupt', name: 'Bankrupt', tone: 'bad', text: () => 'The money ran out on a Tuesday.' };
  const b = chronicle(s, s.ending);
  ok('it says how it ended', b.closing.length === 2 && /Tuesday/.test(b.closing[1]), b.closing.join(' | '));
  ok('and that it was lost', b.lost && b.lossLine.length > 20);
  const { legacy } = bot.Game.prestige(s);
  eq('the shelf has it', legacy.chronicles.length, 1);
  ok('with the text', legacy.chronicles[0].text.length > 1500);
  eq('and the ending', legacy.chronicles[0].ending, 'bankrupt');
});

report('chronicle');
