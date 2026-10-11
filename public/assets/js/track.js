// Counts what people do on the site. No cookies, and never a name, an email or an
// answer: only an event name and a few plain labels. The counts go to Plausible.
// If the script is blocked or not set up yet, every call here quietly does nothing.

try {
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
} catch {
  // Not in a browser (the tests): nothing to set up.
}

export function track(name, props) {
  try {
    if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined);
  } catch {
    // Analytics must never break the page.
  }
}
