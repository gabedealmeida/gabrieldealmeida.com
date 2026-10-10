import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, resolveFile, SECURITY_HEADERS } from '../server.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let server;
let base;
let kit;
let kitCalls;

before(async () => {
  kitCalls = [];
  kit = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      kitCalls.push({ url: req.url, body: JSON.parse(raw || '{}') });
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
  });
  await new Promise((resolve) => kit.listen(0, '127.0.0.1', resolve));
  process.env.KIT_API_BASE = `http://127.0.0.1:${kit.address().port}`;
  process.env.KIT_API_KEY = 'test-key';
  process.env.KIT_FORM_ID = '42';

  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  kit.close();
});

test('pages: home, quiz and privacy are served, with clean addresses', async () => {
  for (const route of ['/', '/test', '/privacy']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, route);
    assert.match(res.headers.get('content-type'), /text\/html/, route);
  }
});

test('pages: an unknown address is a 404 page, not a crash', async () => {
  const res = await fetch(`${base}/no-such-page`);
  assert.equal(res.status, 404);
  assert.match(await res.text(), /That page isn.t/);
});

test('pages: the old thank-you page is gone', async () => {
  assert.equal((await fetch(`${base}/thanks`)).status, 404);
});

test('health: Railway can check the site is up', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'ok');
});

test('security headers are on every kind of response', async () => {
  for (const route of ['/', '/assets/css/site.css', '/health', '/no-such-page']) {
    const res = await fetch(base + route);
    for (const name of Object.keys(SECURITY_HEADERS)) {
      assert.ok(res.headers.get(name), `${name} missing on ${route}`);
    }
  }
  const csp = (await fetch(base)).headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.ok(!/unsafe-inline/.test(csp));
});

test('files outside public/ can never be reached', async () => {
  const attempts = ['/../package.json', '/%2e%2e/package.json', '/%2e%2e%2fpackage.json', '/assets/../../server.mjs', '/..%2f..%2fserver.mjs', '/api/subscribe.js', '/server.mjs', '/package.json', '/.env', '/%2eenv'];
  for (const attempt of attempts) {
    const res = await fetch(base + attempt);
    assert.equal(res.status === 404 || res.status === 405 || res.status === 400, true, `${attempt} returned ${res.status}`);
    const body = await res.text();
    assert.ok(!body.includes('"name": "gabrieldealmeida.com"'), `${attempt} leaked package.json`);
    assert.ok(!body.includes('createServer'), `${attempt} leaked server code`);
  }
});

test('files whose names start with a dot are never served', async () => {
  assert.equal((await fetch(`${base}/downloads/.gitkeep`)).status, 404);
  assert.equal(resolveFile('/downloads/.gitkeep'), null);
});

test('a broken address is a 400, not a crash', async () => {
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  assert.equal((await fetch(`${base}/a%00b`)).status, 400);
  assert.equal((await fetch(`${base}/health`)).status, 200); // still alive afterwards
});

test('only GET and HEAD are allowed on pages', async () => {
  const post = await fetch(base, { method: 'POST', body: 'x' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('caching: fonts for a year, pages always re-checked, nothing cached in dev', async () => {
  const font = await fetch(`${base}/assets/fonts/inter-variable.woff2`);
  assert.match(font.headers.get('cache-control'), /max-age=31536000, immutable/);
  const page = await fetch(base);
  assert.match(page.headers.get('cache-control'), /max-age=0, must-revalidate/);

  const dev = createServer({ dev: true });
  await new Promise((resolve) => dev.listen(0, '127.0.0.1', resolve));
  const res = await fetch(`http://127.0.0.1:${dev.address().port}/`);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  dev.close();
});

test('compression: text is gzipped when asked, and decodes to the real file', async () => {
  const res = await fetch(`${base}/assets/css/site.css`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(res.headers.get('content-encoding'), 'gzip');
  assert.equal(res.headers.get('vary'), 'Accept-Encoding');
  const expected = fs.readFileSync(path.join(root, 'public/assets/css/site.css'), 'utf8');
  assert.equal(await res.text(), expected);

  const plain = await fetch(`${base}/assets/css/site.css`, { headers: { 'accept-encoding': 'identity' } });
  assert.equal(plain.headers.get('content-encoding'), null);
});

test('pdf and images are served untouched with the right type', async () => {
  const pdf = await fetch(`${base}/downloads/score-my-side-hustle-idea.pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(pdf.headers.get('content-encoding'), null);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
});

test('signup: the real server passes a good signup to Kit in the right order', async () => {
  kitCalls.length = 0;
  const res = await fetch(`${base}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Sam', email: 'sam@example.com', hp: '', referrer: 'https://gabrieldealmeida.com/' }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(kitCalls.map((c) => c.url), ['/v4/subscribers', '/v4/forms/42/subscribers']);
});

test('signup: a bad signup is refused before it reaches Kit', async () => {
  kitCalls.length = 0;
  const res = await fetch(`${base}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: '', email: 'nope' }),
  });
  assert.equal(res.status, 422);
  assert.equal(kitCalls.length, 0);
});

test('signup: the address only accepts POST', async () => {
  assert.equal((await fetch(`${base}/api/subscribe`)).status, 405);
});
