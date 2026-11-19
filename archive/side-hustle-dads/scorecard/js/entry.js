// Who is this visitor, and are they allowed in?
//
// Ways in: sign up on the home page (name and email), arrive from ManyChat at
// /test?from=ig (email already collected in the Instagram DM), or follow the
// link in the welcome email at /test?from=email. Anyone else who opens /test is
// sent back to the home page. The links carry a flag only, never a name or an email.

export function entrySource(search) {
  const from = new URLSearchParams(search ?? '').get('from')?.trim().toLowerCase();
  if (from === 'ig' || from === 'instagram') return 'instagram';
  // Only used right after a home page signup, when the browser could not save
  // the signup (blocked storage), so nobody gets stuck bouncing back to the form.
  if (from === 'signup') return 'signup';
  // The link in the welcome email. Anyone who gets that email is already on the
  // list, and they may open it on a different phone or computer.
  if (from === 'email') return 'email';
  return null;
}

// People who arrive from the DM or the email already gave their email, so the home
// page shows them a way straight into the scorecard instead of the signup form.
// This returns that link, or null for an ordinary visitor.
export function startLinkFor(search) {
  const source = entrySource(search);
  if (source === 'instagram') return '/test?from=ig';
  if (source === 'email') return '/test?from=email';
  return null;
}

// /test?reset=1 clears what this browser remembers (saved answers and the
// signed-up flag). It only ever affects the device that opens it, and it is
// how you test both entry paths one after the other.
export function wantsReset(search) {
  return new URLSearchParams(search ?? '').get('reset') === '1';
}

// Decides what a visit to /test should do. `saved` is what the browser remembered.
export function resolveEntry(search, saved) {
  const reset = wantsReset(search);
  const base = reset || !saved || typeof saved !== 'object' ? {} : saved;
  const source = entrySource(search);
  const profile = source ? { ...base, access: true, source } : base;
  return { reset, source, profile, allowed: profile.access === true };
}
