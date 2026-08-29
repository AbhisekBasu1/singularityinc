// ─────────────────────────────────────────────────────────────────────────────
// RESULT SHAPES
//
// A rejected `execute` has its reason discarded by the platform: the assistant
// receives a bare UnknownError and re-plans against nothing. So nothing in this
// codebase ever rejects. Every outcome — including a crash — resolves as one of
// the objects below, `status` first, and every non-ok one carries `next`: the
// thing to do about it, phrased so it can be acted on without asking.
// ─────────────────────────────────────────────────────────────────────────────

export function ok(data = {}) { return { status: 'ok', ...data }; }

// One structured refusal, assembled from the validator's problem list. The
// first problem leads, because a model reads the first clause and stops.
export function refused(problems, extra = {}) {
  const list = Array.isArray(problems) ? problems : [problems];
  const first = list[0] || {};
  const out = {
    status: 'refused',
    rule: first.rule || 'refused',
    reason: reasonFor(first),
    who: 'the rules of the world',
    next: first.fix || 'try something smaller',
    ...extra,
  };
  if (first.limit !== undefined) out.limit = first.limit;
  if (first.got !== undefined) out.got = first.got;
  if (first.when) out.when = first.when;
  if (list.length > 1) {
    out.also = list.slice(1, 4).map((p) => `${p.path || 'card'}: ${p.rule}`);
  }
  return out;
}

function reasonFor(p) {
  if (!p.rule) return 'that is not allowed here';
  const where = p.path ? `${p.path} ` : '';
  switch (p.rule) {
    case 'cap':          return `${where}${p.got} is past this act's ceiling of \u00b1${p.limit}`;
    case 'cash_share':   return `${where}would take more of the founder's cash than any one card may`;
    case 'rate':         return `too often — the limit is ${p.limit}`;
    case 'card_open':    return 'the founder is still reading the last card';
    case 'no_way_out':   return `every choice hurts the same thing — ${p.fix}`;
    case 'immunity':     return 'the founder earned an immunity to this';
    case 'too_early':    return `not in play yet (${p.got}, needs ${p.limit})`;
    case 'too_long':     return `${where}is ${p.got} characters, ${p.limit} is the limit`;
    case 'unknown_key':  return `${where}is not something the world can move`;
    case 'unknown_character': return `${where}is not somebody the founder has met`;
    case 'offline':      return 'the founder is away and the game is catching up';
    case 'no_rival':     return 'no company has become the rival yet';
    case 'no_card':      return 'no card is open';
    default:             return `${where}${p.rule.replace(/_/g, ' ')}`;
  }
}

export function badInput(problems) {
  return {
    status: 'bad_input',
    problems: (problems || []).slice(0, 5).map((p) => ({
      path: p.path, rule: p.rule, ...(p.limit !== undefined ? { limit: p.limit } : {}),
      ...(p.got !== undefined ? { got: typeof p.got === 'string' ? p.got.slice(0, 40) : p.got } : {}),
      fix: p.fix,
    })),
    next: 'fix the listed fields and call again',
  };
}

export function cancelled(why, extra = {}) {
  return { status: 'cancelled', why, next: 'the user stopped you — ask them what they want instead', ...extra };
}

export function crashed(e) {
  return {
    status: 'error',
    message: String(e?.message || e).slice(0, 180),
    next: 'that call broke; the game is unaffected — try a different one',
  };
}

export function needsHuman(what, extra = {}) {
  return { status: 'needs_human', what, who: 'the founder',
           next: 'it is on their screen now — they press Accept, or they do not', ...extra };
}
