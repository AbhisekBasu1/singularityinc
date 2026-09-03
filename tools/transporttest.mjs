// The pause bit belongs to the founder. Background notices may end an explicit
// run to the next decision, but ordinary incidents and thresholds cannot write
// the same persistent state as the pause button.
import { installDom, ok, eq, section, report } from './headless.mjs';
installDom();

const { newGame, setState } = await import('../src/engine/state.js');
const Transport = await import('../src/ui/transport.js');

const s = setState(newGame({}));
s.meta.realtime = true;
s.tutorialHold = false;
Transport.reset();

await section('background events never turn on Pause', () => {
  const reasons = ['incident', 'thread', 'letter', 'runway', 'cash', 'rogue',
                   'card', 'research', 'call', 'act'];
  for (const reason of reasons) {
    s.settings.paused = false;
    eq(`${reason} is not a pause`, Transport.hold(reason), false);
    eq(`${reason} leaves the founder's state alone`, s.settings.paused, false);
  }
});

await section('the founder still controls the transport', () => {
  Transport.setPaused(true);
  eq('Pause stops the clock', s.settings.paused, true);
  Transport.setSpeed(2);
  eq('choosing a speed resumes it', s.settings.paused, false);
  eq('and changes the speed', s.settings.speed, 2);
  Transport.togglePause();
  eq('Space can pause it', s.settings.paused, true);
  Transport.togglePause();
  eq('Space can resume it', s.settings.paused, false);
});

// §C2. The exception that proves the rule: a toggle the founder turned on is
// the founder's hand on the pause button, pressed in advance. A toggle nobody
// has touched writes nothing — which is the state every save is in until
// somebody goes and changes it.
await section('the auto-pause is off until it is asked for', () => {
  const kinds = ['incident', 'wire', 'runway', 'cash', 'rogue'];
  delete s.settings.autoPause;
  for (const kind of kinds) {
    s.settings.paused = false;
    eq(`${kind} does nothing with no settings at all`, Transport.autoPause(kind), false);
    eq(`${kind} leaves the clock running`, s.settings.paused, false);
  }
  s.settings.autoPause = {};
  for (const kind of kinds) {
    s.settings.paused = false;
    eq(`${kind} does nothing while its toggle is off`, Transport.autoPause(kind), false);
    eq(`${kind} still leaves the clock running`, s.settings.paused, false);
  }
});

await section('a toggle the founder turned on stops the clock', () => {
  for (const kind of ['incident', 'wire', 'runway', 'cash', 'rogue']) {
    s.settings.autoPause = { [kind]: true };
    s.settings.paused = false;
    eq(`${kind} pauses once it is asked for`, Transport.autoPause(kind), true);
    eq(`${kind} writes the same bit the button writes`, s.settings.paused, true);
    eq(`${kind} does not pause an already-stopped clock twice`, Transport.autoPause(kind), false);
    // Its neighbours are still off, and one toggle must never speak for five.
    s.settings.paused = false;
    const other = kind === 'incident' ? 'rogue' : 'incident';
    eq(`${kind} on does not turn ${other} on`, Transport.autoPause(other), false);
    eq(`${other} leaves the clock running`, s.settings.paused, false);
  }
  s.settings.autoPause = {};
  s.settings.paused = false;
});

await section('run to next stops only after the founder asks', () => {
  s.settings.speed = 2;
  s.settings.paused = false;
  const started = Transport.seek();
  ok('the seek starts', started.ok && Transport.isSeeking());
  eq('it runs at top speed', s.settings.speed, 4);
  eq('it runs rather than pausing', s.settings.paused, false);
  eq('a destination ends it', Transport.hold('incident'), true);
  eq('the founder\'s speed returns', s.settings.speed, 2);
  eq('the requested stop is paused', s.settings.paused, true);
});

// The act card is the one notice that used to reach in and unpause. It is a
// transient blocker in the loop now and its only transport touchpoint is
// `hold('act')`, so whatever the founder had set is what they get back — and
// an auto-pause toggle does not change that, because turning an act is not one
// of the five things anybody can ask to be stopped for.
await section('the act card gives the clock back the way it found it', () => {
  s.settings.autoPause = { incident: true, cash: true };
  for (const paused of [false, true]) {
    s.settings.paused = paused;
    s.settings.speed = 3;
    eq(`act is not a pause with the clock ${paused ? 'stopped' : 'running'}`, Transport.hold('act'), false);
    eq('the founder\'s pause state is untouched', s.settings.paused, paused);
    eq('and so is their speed', s.settings.speed, 3);
  }
  s.settings.paused = false;
  s.settings.speed = 2;
  Transport.seek();
  eq('a seek into an act turn ends there', Transport.hold('act'), true);
  eq('with the founder\'s speed back', s.settings.speed, 2);
  eq('and the clock held for them to read it', s.settings.paused, true);
  s.settings.autoPause = {};
});

report('transport');
