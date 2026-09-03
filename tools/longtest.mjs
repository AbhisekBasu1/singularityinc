// ─────────────────────────────────────────────────────────────────────────────
// THE LONG GAME — a month a day, headlessly. A real day away is thirty days of
// the company, capped at two months; the live clock holds after a month's
// worth of play and the override lifts it; letters arrive while you are gone.
// ─────────────────────────────────────────────────────────────────────────────
import { installDom, ok, eq, near, section, report } from './headless.mjs';
installDom();
import { makeBot } from './bot.mjs';

const bot = await makeBot();
const Loop = bot.Loop;
const { LONG, TIME } = await import('../src/data/balance.js');
const { inbox } = await import('../src/systems/mail.js');
const { on } = await import('../src/engine/bus.js');

const s = bot.Game.startNewGame({ founderName: 'Test', companyName: 'Testco', archetype: 'hacker',
                                  category: 'devtools', productName: 'Testco', pace: 'long' });
bot.Loop.stop();
s.tutorialHold = false;
eq('the run knows its pace', s.settings.pace, 'long');

await section('a real day away is a month of the company', () => {
  const d0 = s.time.day;
  s.meta.lastRealTime = Date.now() - 24 * 3600 * 1000;
  const r = Loop.offlineCatchUp(s);
  ok('catch-up ran', !!r && r.long, JSON.stringify(r).slice(0, 120));
  near('and granted about thirty days', s.time.day - d0, LONG.DAYS_PER_REAL_DAY, 1.5);
  s.meta.lastRealTime = Date.now() - 5 * 24 * 3600 * 1000;
  const d1 = s.time.day;
  Loop.offlineCatchUp(s);
  near('five days away is capped at two months', s.time.day - d1, LONG.MAX_OFFLINE_DAYS, 1.5);
  s.meta.lastRealTime = Date.now() - 10 * 1000;
  eq('ten seconds away is nothing', Loop.offlineCatchUp(s), null);
});

await section('the sitting game is untouched', () => {
  s.settings.pace = 'sitting';
  s.meta.lastRealTime = Date.now() - 24 * 3600 * 1000;
  const d0 = s.time.day;
  const r = Loop.offlineCatchUp(s);
  ok('the saturating gift still applies', !!r && !r.long && s.time.day - d0 < TIME.MAX_OFFLINE_DAYS + 0.01 && s.time.day - d0 > 5);
  s.settings.pace = 'long';
});

await section('letters arrive while you are gone', () => {
  const before = inbox(s).length;
  s.meta.lastRealTime = Date.now() - 24 * 3600 * 1000;
  Loop.offlineCatchUp(s);
  ok('the inbox filled', inbox(s).length > before, `${before} → ${inbox(s).length}`);
});

await section('the live clock holds after a month, and the override lifts it', () => {
  s.meta.realtime = true;
  let held = 0;
  on('long:held', () => held++);
  const L = Loop.longState(s);
  L.liveDays = 0; L.override = false;
  for (let i = 0; i < LONG.LIVE_DAYS_PER_DAY + 2; i++) Loop.simulate(1);
  ok('live days are counted', Loop.longState(s).liveDays >= LONG.LIVE_DAYS_PER_DAY, String(Loop.longState(s).liveDays));
  ok('the clock holds', Loop.longHeld(s));
  eq('and says so once', held, 1);
  Loop.longHeld(s);
  eq('only once', held, 1);
  Loop.longOverride(s);
  ok('the override lifts it', !Loop.longHeld(s));
  eq('the allowance reads back', Loop.longAllowance(s).of, LONG.LIVE_DAYS_PER_DAY);
  s.settings.pace = 'sitting';
  ok('the sitting game never holds', !Loop.longHeld(s));
  s.meta.realtime = false;
});

report('long');
