// Shared by the browser (signup.js) and the server (api/subscribe.js), so the
// two can never disagree about what a valid name or email looks like.

export const LIMITS = { name: 60, emailTotal: 254, emailLocal: 64 };

// Domains people actually use. Used both to suggest a fix for a typo
// (gmial.com -> gmail.com) and to leave real domains alone.
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'live.com', 'msn.com', 'proton.me',
  'protonmail.com', 'pm.me', 'hey.com', 'mail.com', 'gmx.com', 'fastmail.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bellsouth.net',
  'cox.net', 'charter.net', 'duck.com',
];

const EMAIL_LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*$/u;

export function cleanName(raw) {
  return String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function validateName(raw) {
  const value = cleanName(raw);
  if (!value) return { ok: false, message: 'Please enter your first name.' };
  if (value.length > LIMITS.name) {
    return { ok: false, message: 'That is a bit long. Your first name is plenty.' };
  }
  if (!/\p{L}/u.test(value) || !NAME_CHARS.test(value)) {
    return {
      ok: false,
      message: 'Please use letters only. Spaces, hyphens and apostrophes are fine.',
    };
  }
  return { ok: true, value };
}

export function cleanEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

export function validateEmail(raw) {
  const value = cleanEmail(raw);
  if (!value) return { ok: false, message: 'Please enter your email.' };
  if (/\s/.test(value)) return { ok: false, message: 'Emails cannot have spaces in them.' };

  const parts = value.split('@');
  if (parts.length < 2) return { ok: false, message: 'Your email needs an @ in it.' };
  if (parts.length > 2) return { ok: false, message: 'Your email has more than one @ in it.' };

  const [local, domain] = parts;
  if (!local) return { ok: false, message: 'Add the part before the @.' };
  if (!domain) return { ok: false, message: 'Add the part after the @, like gmail.com.' };
  if (!domain.includes('.')) {
    return { ok: false, message: 'The part after the @ needs a dot, like gmail.com.' };
  }

  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  const bad =
    value.length > LIMITS.emailTotal ||
    local.length > LIMITS.emailLocal ||
    !EMAIL_LOCAL.test(local) ||
    !labels.every((label) => DOMAIN_LABEL.test(label)) ||
    !TLD.test(tld);
  if (bad) {
    return { ok: false, message: 'That email does not look right. Check for typos.' };
  }
  return { ok: true, value };
}

// Optimal string alignment distance: a swap of two letters counts as one edit.
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Returns a corrected address when the domain is one typo away from a
// well-known one (gmial.com, gmail.con), or null. Never blocks anything.
export function suggestEmail(raw) {
  const checked = validateEmail(raw);
  if (!checked.ok) return null;
  const [local, domain] = checked.value.split('@');
  if (COMMON_DOMAINS.includes(domain)) return null;

  let best = null;
  for (const candidate of COMMON_DOMAINS) {
    const dist = distance(domain, candidate);
    if (dist <= 1 && (!best || dist < best.dist)) best = { domain: candidate, dist };
  }
  if (!best && domain.length >= 9) {
    for (const candidate of COMMON_DOMAINS) {
      if (candidate.length < 9) continue;
      const dist = distance(domain, candidate);
      if (dist === 2 && (!best || dist < best.dist)) best = { domain: candidate, dist };
    }
  }
  return best ? `${local}@${best.domain}` : null;
}

export function validateSignup({ firstName, email }) {
  const name = validateName(firstName);
  const mail = validateEmail(email);
  const errors = {};
  if (!name.ok) errors.firstName = name.message;
  if (!mail.ok) errors.email = mail.message;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { firstName: name.value, email: mail.value } };
}
