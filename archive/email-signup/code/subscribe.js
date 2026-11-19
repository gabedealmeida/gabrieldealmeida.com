// POST /api/subscribe
// Validates the signup again on the server (never trust the browser), then adds
// the person to Flodesk: create or update the subscriber (put on a segment if one
// is set), then, if a workflow is set, start the welcome workflow for them.
// The Flodesk key lives only in this function's environment, never in the page.

import { validateSignup } from '../public/assets/js/validate.js';

const FLODESK_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 4096;
const ID_PATTERN = /^[A-Za-z0-9]+$/;

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

// Flodesk wants the key as the username of a Basic login, with no password,
// and an app name in the User-Agent.
async function flodesk(path, payload, { base, key }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FLODESK_TIMEOUT_MS);
  try {
    return await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'gabrieldealmeida.com (https://gabrieldealmeida.com)',
        Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// A rejected key, a busy service or a Flodesk outage are our problem, not the
// visitor's. Any other refusal is about this one person and is not worth a failed signup.
const isOurProblem = (status) => status === 401 || status === 403 || status === 429 || status >= 500;

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

  const checked = validateSignup({ firstName: body.firstName, email: body.email }, { requireName: false });
  if (!checked.ok) {
    return send(res, 422, { ok: false, errors: checked.errors });
  }
  const { firstName, email } = checked.value;

  const key = process.env.FLODESK_API_KEY;
  const segmentId = process.env.FLODESK_SEGMENT_ID;
  const workflowId = process.env.FLODESK_WORKFLOW_ID;
  const base = (process.env.FLODESK_API_BASE || 'https://api.flodesk.com/v1').replace(/\/$/, '');
  // The key is required. The segment and the workflow are optional, but if one is
  // set it must look like a Flodesk id.
  if (!key || (segmentId && !ID_PATTERN.test(segmentId)) || (workflowId && !ID_PATTERN.test(workflowId))) {
    console.error('subscribe: FLODESK_API_KEY is missing, or FLODESK_SEGMENT_ID / FLODESK_WORKFLOW_ID is malformed');
    return send(res, 500, {
      ok: false,
      message: 'Signup is not connected yet. Please try again soon.',
    });
  }

  try {
    const person = { email };
    if (firstName) person.first_name = firstName;
    if (segmentId) person.segment_ids = [segmentId];
    const created = await flodesk('/subscribers', person, { base, key });
    if (created.status === 400 || created.status === 422) {
      return send(res, 422, {
        ok: false,
        errors: { email: 'That email does not look right. Check for typos.' },
      });
    }
    if (created.status !== 200 && created.status !== 201) {
      console.error(`subscribe: Flodesk create subscriber returned ${created.status}`);
      return send(res, 502, {
        ok: false,
        message: 'Something went wrong on our end. Please try again in a minute.',
      });
    }

    // Only when a workflow is set: start the welcome email for them. A person who
    // already finished it may be refused, and that should not break their signup.
    // A name sent on its own later (from the scorecard) only updates the subscriber, so it
    // must not start the welcome email a second time.
    if (workflowId && body.skipWelcome !== true) {
      const started = await flodesk(`/workflows/${workflowId}/subscribers`, { email }, { base, key });
      if (isOurProblem(started.status)) {
        console.error(`subscribe: Flodesk add to workflow returned ${started.status}`);
        return send(res, 502, {
          ok: false,
          message: 'Something went wrong on our end. Please try again in a minute.',
        });
      }
      if (started.status >= 400) console.error(`subscribe: Flodesk did not restart the workflow (${started.status}), signup kept`);
    }

    return send(res, 200, { ok: true });
  } catch (err) {
    console.error(`subscribe: Flodesk request failed (${err.name})`);
    return send(res, 502, {
      ok: false,
      message: 'We could not reach the signup service. Please try again in a minute.',
    });
  }
}
