import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handler from '../api/subscribe.js';

// A stand-in for Flodesk that records what it receives and answers however the
// current test tells it to.
let flodeskServer;
let flodeskBase;
let calls;
let replies;

before(async () => {
  flodeskServer = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null });
      const reply = replies[req.url] ?? replies.default ?? { status: 200, body: {} };
      res.statusCode = reply.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(reply.body ?? {}));
    });
  });
  await new Promise((resolve) => flodeskServer.listen(0, '127.0.0.1', resolve));
  flodeskBase = `http://127.0.0.1:${flodeskServer.address().port}`;
});

after(() => flodeskServer.close());

beforeEach(() => {
  calls = [];
  replies = {};
  process.env.FLODESK_API_KEY = 'secret-test-key';
  process.env.FLODESK_SEGMENT_ID = 'seg123';
  process.env.FLODESK_WORKFLOW_ID = 'wf456';
  process.env.FLODESK_API_BASE = flodeskBase;
});

// Minimal req/res doubles shaped like Node's, which is what the server hands the function.
function call({ method = 'POST', body, headers = { 'content-type': 'application/json' }, raw } = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      headers,
      body,
      async *[Symbol.asyncIterator]() {
        if (raw !== undefined) yield Buffer.from(raw);
      },
    };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(text) { resolve({ status: this.statusCode, headers: this.headers, json: text ? JSON.parse(text) : null }); },
    };
    handler(req, res);
  });
}

const good = { firstName: 'Sam', email: 'sam@example.com' };

test('success: creates the subscriber on the segment, then starts the welcome workflow', async () => {
  replies['/workflows/wf456/subscribers'] = { status: 204, body: null };
  const out = await call({ body: good });
  assert.equal(out.status, 200);
  assert.deepEqual(out.json, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, '/subscribers');
  assert.deepEqual(calls[0].body, { email: 'sam@example.com', first_name: 'Sam', segment_ids: ['seg123'] });
  assert.equal(calls[1].url, '/workflows/wf456/subscribers');
  assert.deepEqual(calls[1].body, { email: 'sam@example.com' });
});

test('success: logs in the way Flodesk asks, and never puts the key in a body or a reply', async () => {
  const out = await call({ body: good });
  const expected = `Basic ${Buffer.from('secret-test-key:').toString('base64')}`;
  for (const c of calls) {
    assert.equal(c.headers.authorization, expected);
    assert.match(c.headers['user-agent'], /gabrieldealmeida\.com/);
    assert.ok(!JSON.stringify(c.body).includes('secret-test-key'));
  }
  assert.ok(!JSON.stringify(out.json).includes('secret-test-key'));
});

test('success: cleans the input before it reaches Flodesk', async () => {
  await call({ body: { firstName: '  Sam  ', email: '  SAM@Example.COM ' } });
  assert.equal(calls[0].body.email, 'sam@example.com');
  assert.equal(calls[0].body.first_name, 'Sam');
});

test('success: an existing subscriber (200) still counts', async () => {
  replies['/subscribers'] = { status: 200, body: {} };
  assert.equal((await call({ body: good })).status, 200);
});

test('validation: bad input is refused and Flodesk is never called', async () => {
  const out = await call({ body: { firstName: '12345', email: 'nope' } });
  assert.equal(out.status, 422);
  assert.ok(out.json.errors.firstName);
  assert.ok(out.json.errors.email);
  assert.equal(calls.length, 0);
});

test('email only: the home page asks for no name, and no name is sent to Flodesk', async () => {
  replies['/workflows/wf456/subscribers'] = { status: 204, body: null };
  const out = await call({ body: { email: 'sam@example.com' } });
  assert.equal(out.status, 200);
  assert.deepEqual(calls[0].body, { email: 'sam@example.com', segment_ids: ['seg123'] });
  assert.equal(calls[1].url, '/workflows/wf456/subscribers');
});

test('email only: a missing email is still refused', async () => {
  const out = await call({ body: { firstName: '', email: '' } });
  assert.equal(out.status, 422);
  assert.ok(out.json.errors.email);
  assert.ok(!out.json.errors.firstName);
  assert.equal(calls.length, 0);
});

test('name later: skipWelcome saves the name and does not start the welcome email again', async () => {
  const out = await call({ body: { firstName: 'Sam', email: 'sam@example.com', skipWelcome: true } });
  assert.equal(out.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/subscribers');
  assert.equal(calls[0].body.first_name, 'Sam');
});

test('honeypot: a filled trap field looks like success but does nothing', async () => {
  const out = await call({ body: { ...good, hp: 'http://spam.example' } });
  assert.equal(out.status, 200);
  assert.equal(calls.length, 0);
});

test('request shape: only POST with JSON is accepted', async () => {
  const get = await call({ method: 'GET' });
  assert.equal(get.status, 405);
  assert.equal(get.headers.allow, 'POST');
  const form = await call({ body: good, headers: { 'content-type': 'text/plain' } });
  assert.equal(form.status, 415);
  assert.equal(calls.length, 0);
});

test('request shape: unreadable and oversized bodies are rejected', async () => {
  const broken = await call({ raw: '{not json' });
  assert.equal(broken.status, 400);
  const huge = await call({ raw: JSON.stringify({ firstName: 'x'.repeat(10000) }) });
  assert.equal(huge.status, 413);
  assert.equal(calls.length, 0);
});

test('config: a missing key or a malformed id fails loudly, not silently', async () => {
  delete process.env.FLODESK_API_KEY;
  assert.equal((await call({ body: good })).status, 500);
  process.env.FLODESK_API_KEY = 'k';
  process.env.FLODESK_SEGMENT_ID = 'not a valid id!';
  assert.equal((await call({ body: good })).status, 500);
  process.env.FLODESK_SEGMENT_ID = 'seg123';
  process.env.FLODESK_WORKFLOW_ID = '../x';
  assert.equal((await call({ body: good })).status, 500);
  assert.equal(calls.length, 0);
});

test('flodesk errors: a rejected email becomes a field error', async () => {
  replies['/subscribers'] = { status: 400, body: {} };
  const out = await call({ body: good });
  assert.equal(out.status, 422);
  assert.ok(out.json.errors.email);
});

test('flodesk errors: a bad key returns a calm message and no details', async () => {
  replies.default = { status: 401, body: { message: 'Invalid API key' } };
  const out = await call({ body: good });
  assert.equal(out.status, 502);
  assert.equal(out.json.ok, false);
  assert.ok(!JSON.stringify(out.json).toLowerCase().includes('key'));
  assert.equal(calls.length, 1);
});

test('flodesk errors: a busy Flodesk (429) is our problem, not a field error', async () => {
  replies['/subscribers'] = { status: 429, body: {} };
  assert.equal((await call({ body: good })).status, 502);
});

test('flodesk errors: an unreachable Flodesk is a 502', async () => {
  process.env.FLODESK_API_BASE = 'http://127.0.0.1:1';
  const out = await call({ body: good });
  assert.equal(out.status, 502);
  assert.equal(out.json.ok, false);
});

test('workflow: a server error starting the workflow fails the signup so they can retry', async () => {
  replies['/workflows/wf456/subscribers'] = { status: 500, body: {} };
  assert.equal((await call({ body: good })).status, 502);
});

test('workflow: a refusal about this person (already finished it) keeps the signup', async () => {
  replies['/workflows/wf456/subscribers'] = { status: 409, body: {} };
  const out = await call({ body: good });
  assert.equal(out.status, 200);
  assert.deepEqual(out.json, { ok: true });
});

test('config: the segment and the workflow are each optional', async () => {
  delete process.env.FLODESK_SEGMENT_ID;
  delete process.env.FLODESK_WORKFLOW_ID;
  const out = await call({ body: good });
  assert.equal(out.status, 200);
  assert.deepEqual(calls.map((c) => c.url), ['/subscribers']);
  assert.equal(calls[0].body.segment_ids, undefined);
  calls = [];
  process.env.FLODESK_SEGMENT_ID = '';
  process.env.FLODESK_WORKFLOW_ID = '';
  assert.equal((await call({ body: good })).status, 200);
  assert.deepEqual(calls.map((c) => c.url), ['/subscribers']);
});

test('config: with neither set, a Flodesk failure is still reported', async () => {
  delete process.env.FLODESK_SEGMENT_ID;
  delete process.env.FLODESK_WORKFLOW_ID;
  replies['/subscribers'] = { status: 401, body: {} };
  assert.equal((await call({ body: good })).status, 502);
});
