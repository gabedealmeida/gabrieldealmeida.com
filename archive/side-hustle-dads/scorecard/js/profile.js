// What this browser remembers about the visitor: their first name and whether
// they have signed up. Stored on their own device only.

const KEY = 'gdm:profile:v1';

export function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

// Returns true only if the browser really kept it.
// The email is kept here only so a first name given later, inside the scorecard,
// can be saved against the same subscriber.
export function grantAccess({ name = '', email = '', source = 'signup' } = {}) {
  saveProfile(email ? { name, email, access: true, source } : { name, access: true, source });
  return loadProfile().access === true;
}
