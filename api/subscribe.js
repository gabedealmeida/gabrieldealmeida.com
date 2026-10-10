// POST /api/subscribe
// Validates the signup again on the server (never trust the browser), then adds
// the person to Kit: create the subscriber, then put them on the form.
// The Kit key lives only in this function's environment, never in the page.

import { validateSignup } from '../public/assets/js/validate.js';

const KIT_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 4096;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const err = new Error('too large');
      err.code = 'TOO_LARGE';
      throw err;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function cleanReferrer(value) {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

async function kit(path, payload, { base, key }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Kit-Api-Key': key,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return send(res, 415, { ok: false, message: 'Unsupported request.' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    if (err.code === 'TOO_LARGE') return send(res, 413, { ok: false, message: 'Request too large.' });
    return send(res, 400, { ok: false, message: 'That request could not be read.' });
  }

  // Honeypot: a real person never sees or fills this field. Say thanks and
  // do nothing, so a bot gets no signal about why it was ignored.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    return send(res, 200, { ok: true });
  }

  const checked = validateSignup({ firstName: body.firstName, email: body.email });
  if (!checked.ok) {
    return send(res, 422, { ok: false, errors: checked.errors });
  }
  const { firstName, email } = checked.value;

  const key = process.env.KIT_API_KEY;
  const formId = process.env.KIT_FORM_ID;
  const base = (process.env.KIT_API_BASE || 'https://api.kit.com').replace(/\/$/, '');
  if (!key || !formId || !/^\d+$/.test(formId)) {
    console.error('subscribe: KIT_API_KEY or KIT_FORM_ID is missing or invalid');
    return send(res, 500, {
      ok: false,
      message: 'Signup is not connected yet. Please try again soon.',
    });
  }

  try {
    const created = await kit(
      '/v4/subscribers',
      { email_address: email, first_name: firstName },
      { base, key },
    );
    if (created.status === 422) {
      return send(res, 422, {
        ok: false,
        errors: { email: 'That email does not look right. Check for typos.' },
      });
    }
    if (![200, 201, 202].includes(created.status)) {
      console.error(`subscribe: Kit create subscriber returned ${created.status}`);
      return send(res, 502, {
        ok: false,
        message: 'Something went wrong on our end. Please try again in a minute.',
      });
    }

    const added = await kit(
      `/v4/forms/${formId}/subscribers`,
      { email_address: email, referrer: cleanReferrer(body.referrer) },
      { base, key },
    );
    if (![200, 201].includes(added.status)) {
      console.error(`subscribe: Kit add to form returned ${added.status}`);
      return send(res, 502, {
        ok: false,
        message: 'Something went wrong on our end. Please try again in a minute.',
      });
    }

    return send(res, 200, { ok: true });
  } catch (err) {
    console.error(`subscribe: Kit request failed (${err.name})`);
    return send(res, 502, {
      ok: false,
      message: 'We could not reach the signup service. Please try again in a minute.',
    });
  }
}
