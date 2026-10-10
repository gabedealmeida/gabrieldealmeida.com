import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handler from '../api/subscribe.js';

// A stand-in for Kit that records what it receives and answers however the
// current test tells it to.
let kitServer;
let kitBase;
let calls;
let replies;

before(async () => {
  kitServer = http.createServer((req, res) => {
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
  await new Promise((resolve) => kitServer.listen(0, '127.0.0.1', resolve));
  kitBase = `http://127.0.0.1:${kitServer.address().port}`;
});

after(() => kitServer.close());

beforeEach(() => {
  calls = [];
  replies = {};
  process.env.KIT_API_KEY = 'secret-test-key';
  process.env.KIT_FORM_ID = '12345';
  process.env.KIT_API_BASE = kitBase;
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

test('success: creates the subscriber, then adds them to the form', async () => {
  const out = await call({ body: good });
  assert.equal(out.status, 200);
  assert.deepEqual(out.json, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, '/v4/subscribers');
  assert.deepEqual(calls[0].body, { email_address: 'sam@example.com', first_name: 'Sam' });
  assert.equal(calls[1].url, '/v4/forms/12345/subscribers');
  assert.equal(calls[1].body.email_address, 'sam@example.com');
});

test('success: sends the key as a header, never in the body or the reply', async () => {
  const out = await call({ body: good });
  for (const c of calls) {
    assert.equal(c.headers['x-kit-api-key'], 'secret-test-key');
    assert.ok(!JSON.stringify(c.body).includes('secret-test-key'));
  }
  assert.ok(!JSON.stringify(out.json).includes('secret-test-key'));
});

test('success: cleans the input before it reaches Kit', async () => {
  await call({ body: { firstName: '  Sam  ', email: '  SAM@Example.COM ' } });
  assert.deepEqual(calls[0].body, { email_address: 'sam@example.com', first_name: 'Sam' });
});

test('success: an existing subscriber (200) still counts', async () => {
  replies['/v4/subscribers'] = { status: 200, body: {} };
  replies['/v4/forms/12345/subscribers'] = { status: 200, body: {} };
  assert.equal((await call({ body: good })).status, 200);
});

test('success: passes a valid referrer through and drops a bad one', async () => {
  await call({ body: { ...good, referrer: 'https://gabrieldealmeida.com/?utm_source=ig' } });
  assert.equal(calls[1].body.referrer, 'https://gabrieldealmeida.com/?utm_source=ig');
  calls = [];
  await call({ body: { ...good, referrer: 'javascript:alert(1)' } });
  assert.equal(calls[1].body.referrer, undefined);
});

test('validation: bad input is refused and Kit is never called', async () => {
  const out = await call({ body: { firstName: '', email: 'nope' } });
  assert.equal(out.status, 422);
  assert.ok(out.json.errors.firstName);
  assert.ok(out.json.errors.email);
  assert.equal(calls.length, 0);
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

test('config: missing or malformed Kit settings fail loudly, not silently', async () => {
  delete process.env.KIT_API_KEY;
  assert.equal((await call({ body: good })).status, 500);
  process.env.KIT_API_KEY = 'k';
  process.env.KIT_FORM_ID = 'abc';
  assert.equal((await call({ body: good })).status, 500);
  assert.equal(calls.length, 0);
});

test('kit errors: a rejected email becomes a field error', async () => {
  replies['/v4/subscribers'] = { status: 422, body: {} };
  const out = await call({ body: good });
  assert.equal(out.status, 422);
  assert.ok(out.json.errors.email);
});

test('kit errors: a bad key returns a calm message and no details', async () => {
  replies.default = { status: 401, body: { errors: ['The access token is invalid'] } };
  const out = await call({ body: good });
  assert.equal(out.status, 502);
  assert.equal(out.json.ok, false);
  assert.ok(!JSON.stringify(out.json).toLowerCase().includes('token'));
  assert.equal(calls.length, 1);
});

test('kit errors: a missing form id (404) is reported, not swallowed', async () => {
  replies['/v4/forms/12345/subscribers'] = { status: 404, body: {} };
  const out = await call({ body: good });
  assert.equal(out.status, 502);
});

test('kit errors: an unreachable Kit is a 502', async () => {
  process.env.KIT_API_BASE = 'http://127.0.0.1:1';
  const out = await call({ body: good });
  assert.equal(out.status, 502);
  assert.equal(out.json.ok, false);
});

test('config: the form is optional, and without it people go straight onto the list', async () => {
  delete process.env.KIT_FORM_ID;
  const out = await call({ body: good });
  assert.equal(out.status, 200);
  assert.deepEqual(calls.map((c) => c.url), ['/v4/subscribers']);
  calls = [];
  process.env.KIT_FORM_ID = '';
  assert.equal((await call({ body: good })).status, 200);
  assert.deepEqual(calls.map((c) => c.url), ['/v4/subscribers']);
});

test('config: with no form, a Kit failure is still reported', async () => {
  delete process.env.KIT_FORM_ID;
  replies['/v4/subscribers'] = { status: 401, body: {} };
  assert.equal((await call({ body: good })).status, 502);
});
