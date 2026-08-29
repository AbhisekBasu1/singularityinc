// Procedural naming for the living world: companies, products, agents, people.
import { pick, rand, chance, randInt } from '../engine/rng.js';

export const COMPANY_PREFIX = ['Hyper', 'Neo', 'Lumen', 'Vector', 'Quanta', 'Aether', 'Nova', 'Orbit',
  'Helio', 'Cobalt', 'Cinder', 'Nimbus', 'Strata', 'Vertex', 'Pallas', 'Kestrel', 'Onyx', 'Sable',
  'Solace', 'Tessera', 'Corvid', 'Halcyon', 'Zenith', 'Delta', 'Argo', 'Basil', 'Cadence', 'Ember'];
export const COMPANY_SUFFIX = ['works', 'labs', 'AI', 'Systems', 'Dynamics', 'Compute', 'Forge', 'Grid',
  'Stack', 'Loop', 'Core', 'Mind', 'Sphere', 'Foundry', 'Collective', 'Industries', 'Research', 'Cloud'];
export const PRODUCT_WORDS = ['Flow', 'Pulse', 'Atlas', 'Beacon', 'Canvas', 'Compass', 'Drift', 'Echo',
  'Forge', 'Gravity', 'Harbor', 'Index', 'Juno', 'Kernel', 'Lattice', 'Mosaic', 'Nomad', 'Orbit',
  'Prism', 'Quill', 'Relay', 'Signal', 'Tempo', 'Umbra', 'Vellum', 'Warden', 'Xenon', 'Yield', 'Zephyr',
  'Anchor', 'Bloom', 'Cipher', 'Dovetail', 'Ledger', 'Loom', 'Meridian', 'Nexus', 'Oracle', 'Parade'];

export const FIRST_NAMES = ['Ava', 'Marcus', 'Priya', 'Yuki', 'Ellis', 'Sofia', 'Dmitri', 'Amara',
  'Theo', 'Nadia', 'Kwame', 'Ingrid', 'Rafael', 'Mei', 'Jonas', 'Leila', 'Ozan', 'Bex', 'Cormac',
  'Elena', 'Farid', 'Greta', 'Hugo', 'Isla', 'Javier', 'Kira', 'Liam', 'Marisol', 'Noor', 'Oscar',
  'Pia', 'Quinn', 'Rune', 'Sana', 'Tomas', 'Uma', 'Viktor', 'Wren', 'Xiulan', 'Yosef', 'Zara',
  'Anders', 'Bruna', 'Caleb', 'Dara', 'Emeka', 'Freya', 'Gideon', 'Hana', 'Idris', 'Juno'];
export const LAST_NAMES = ['Vance', 'Raghunathan', 'Tanaka', 'Crane', 'Okonkwo', 'Lindqvist', 'Mbeki',
  'Castellanos', 'Novak', 'Farrow', 'Yildiz', 'Abadi', 'Whitlock', 'Nakamura', 'Osei', 'Petrov',
  'Delacroix', 'Hargrave', 'Bergström', 'Kaur', 'Moreau', 'Silva', 'Ashford', 'Kovac', 'Ramos',
  'Ferreira', 'Blackwood', 'Halvorsen', 'Adeyemi', 'Sorrentino', 'Chandra', 'Bellweather', 'Vasquez',
  'Ohara', 'Kirkland', 'Mensah', 'Duval', 'Sandoval', 'Ivanova', 'Thorne'];

export const AGENT_NAMES = ['ARIA', 'MERIDIAN', 'VESPER', 'ORACLE', 'CASSIUS', 'HALCYON', 'NOVA',
  'PROMETHEUS', 'ATLAS', 'SPHINX', 'ECHO', 'JANUS', 'PALLAS', 'KESTREL', 'ODIN', 'THEIA', 'HERMES',
  'CALYPSO', 'DAEDALUS', 'ELECTRA', 'FENRIR', 'GAIA', 'HYPATIA', 'ICARUS', 'JUNO', 'KRONOS',
  'LETHE', 'MNEMOSYNE', 'NYX', 'ORPHEUS', 'PANDORA', 'QUILL', 'RHEA', 'SELENE', 'TALOS', 'URANIA',
  'VULCAN', 'WARDEN', 'XANTHE', 'YGGDRASIL', 'ZEPHYR', 'ARGUS', 'BOREAS', 'CERBERUS', 'DELPHI',
  'EOS', 'FURY', 'GORGON', 'HELIOS', 'IRIS'];

export const HANDLE_WORDS = ['builds', 'ships', 'codes', 'hacks', 'dev', 'founder', 'ceo', 'eth',
  'ai', 'labs', 'xyz', 'io', 'onchain', 'irl', 'hq'];

function rawCompanyName() {
  const r = rand();
  if (r < 0.35) return pick(COMPANY_PREFIX) + pick(COMPANY_SUFFIX).toLowerCase();
  if (r < 0.6) return pick(COMPANY_PREFIX) + ' ' + pick(COMPANY_SUFFIX);
  if (r < 0.8) return pick(PRODUCT_WORDS) + pick(['.ai', '.io', ' AI', ' Labs', 'HQ']);
  return pick(PRODUCT_WORDS) + pick(PRODUCT_WORDS).toLowerCase();
}

// Names the world must never reuse — chiefly the player's own company, so a
// rival is never called "Dovetailmeridian".
const taken = new Set();
export function reserveName(name) {
  if (!name) return;
  taken.add(String(name).toLowerCase().replace(/[^a-z0-9]/g, ''));
}
export function companyName() {
  for (let i = 0; i < 24; i++) {
    const n = rawCompanyName();
    const key = n.toLowerCase().replace(/[^a-z0-9]/g, '');
    let clash = false;
    for (const t of taken) { if (t.length > 3 && (key.includes(t) || t.includes(key))) { clash = true; break; } }
    if (!clash) return n;
  }
  return rawCompanyName();
}

export function productName() {
  const r = rand();
  if (r < 0.4) return pick(PRODUCT_WORDS);
  if (r < 0.7) return pick(PRODUCT_WORDS) + pick(['', '', ' Pro', ' One', ' X', ' Zero']);
  return pick(COMPANY_PREFIX) + pick(PRODUCT_WORDS).toLowerCase();
}

export function personName() {
  return pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
}

export function handleFor(name) {
  const base = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  return '@' + base + (chance(0.5) ? pick(HANDLE_WORDS) : String(randInt(1, 99)));
}

let agentNameIdx = 0;
export function agentName(used = []) {
  // An agent called MERIDIAN inside a company called Meridian reads as a bug.
  const key = (n) => String(n).toLowerCase().replace(/[^a-z0-9]/g, '');
  const avail = AGENT_NAMES.filter((n) => !used.includes(n) && !taken.has(key(n)));
  if (avail.length) return pick(avail);
  agentNameIdx++;
  return pick(AGENT_NAMES) + '-' + agentNameIdx;
}

export const TAGLINES = [
  'The last software you will ever need.',
  'Autonomy, on tap.',
  'We turn intent into infrastructure.',
  'Ship at the speed of thought.',
  'One founder. Infinite throughput.',
  'The operating system for ambition.',
  'Everything, eventually.',
  'Compute is destiny.',
];
