// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE LAST INCIDENT DID, as a verb phrase — so a line can say "it took the
// thing down" instead of using the incident's title as a sentence subject
// ("A Bad Piece took the thing down"). Keyed by the kind `incidents.js` stamps
// beside the name; a save without the stamp gets the plainest one.
//
// This is a leaf on purpose. It lives here rather than in `signals.js` because
// `threads.js` needs it and `signals.js` reaches into `rivalco.js`, which
// reaches back into `feed.js`, which imports `threads.js` — a cycle, and an ES
// cycle in this codebase is a binding that is undefined at evaluation time.
// `signals.js` re-exports it, so every existing caller is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export const INCIDENT_VERBS = {
  regression: 'corrupted writes for six days before anybody noticed',
  hallucination: 'imported a package that does not exist',
  cost_spike: 'sent you a bill',
  churn_wave: 'walked a slice of your users out the door',
  breach: 'left a key in the open overnight',
  dependency: 'took the thing down',
  agent_loop: 'had two of your agents arguing until morning',
  bad_press: 'was in the paper',
  poach: 'pulled a model out from under you',
  lawsuit: 'arrived by courier, from a law firm',
  sabotage: 'let somebody funded inside',
};

export const incidentVerb = (S) => INCIDENT_VERBS[S?.stats?.lastIncidentKind] || 'took the thing down';
