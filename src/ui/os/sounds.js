// ─────────────────────────────────────────────────────────────────────────────
// The workstation's own cues, behind their own switch.
//
// The game's sounds are the game's; these are the machine's, and somebody who
// wants one without the other should have it. Menus and hovers are silent on
// purpose — a desktop that clicks at every pointer movement is a desktop nobody
// leaves the sound on for.
// ─────────────────────────────────────────────────────────────────────────────
import { S } from '../../engine/state.js';
import { play } from '../audio.js';

export function chrome(name) {
  if (S?.settings?.os?.sounds === false) return;
  play(name);
}
