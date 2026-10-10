// Who is this visitor, and are they allowed in?
//
// Two ways in: sign up on the home page (name and email), or arrive from
// ManyChat at /test?from=ig, where the email was already collected in the
// Instagram DM. Anyone else who opens /test is sent back to the home page.
// The links carry a flag only, never a name or an email.

export function entrySource(search) {
  const from = new URLSearchParams(search ?? '').get('from')?.trim().toLowerCase();
  if (from === 'ig' || from === 'instagram') return 'instagram';
  // Only used right after a home page signup, when the browser could not save
  // the signup (blocked storage), so nobody gets stuck bouncing back to the form.
  if (from === 'signup') return 'signup';
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
