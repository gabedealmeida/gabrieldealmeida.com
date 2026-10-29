import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, resolveFile, SECURITY_HEADERS, PLAUSIBLE_ORIGIN } from '../server.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let server;
let base;
let flodesk;
let flodeskCalls;

before(async () => {
  flodeskCalls = [];
  flodesk = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      flodeskCalls.push({ url: req.url, body: JSON.parse(raw || '{}') });
      if (req.url.startsWith('/workflows/')) {
        res.statusCode = 204;
        return res.end();
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
  });
  await new Promise((resolve) => flodesk.listen(0, '127.0.0.1', resolve));
  process.env.FLODESK_API_BASE = `http://127.0.0.1:${flodesk.address().port}`;
  process.env.FLODESK_API_KEY = 'test-key';
  process.env.FLODESK_SEGMENT_ID = 'seg42';
  process.env.FLODESK_WORKFLOW_ID = 'wf42';

  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  flodesk.close();
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
  assert.ok(csp.includes(PLAUSIBLE_ORIGIN), 'the policy must allow our Plausible');
  assert.ok(!csp.includes('plausible.io'), 'nothing should still point at the hosted Plausible');
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

test('caching: only the font is cached for long, everything else is re-checked', async () => {
  const font = await fetch(`${base}/assets/fonts/inter-variable.woff2`);
  assert.match(font.headers.get('cache-control'), /max-age=31536000, immutable/);
  for (const route of ['/', '/test', '/assets/css/site.css', '/assets/js/quiz.js', '/assets/js/scorecard.js', '/assets/img/gabe.png', '/downloads/score-my-side-hustle-idea.pdf']) {
    const res = await fetch(base + route);
    assert.equal(res.headers.get('cache-control'), 'no-cache', route);
    assert.ok(res.headers.get('etag'), `${route} needs an ETag`);
  }
});

test('caching: an unchanged file gets a 304 with no body, a changed one gets the file', async () => {
  const first = await fetch(`${base}/assets/css/site.css`);
  const tag = first.headers.get('etag');
  assert.ok(tag);
  const again = await fetch(`${base}/assets/css/site.css`, { headers: { 'if-none-match': tag } });
  assert.equal(again.status, 304);
  assert.equal(await again.text(), '');
  assert.equal(again.headers.get('etag'), tag);
  assert.equal(again.headers.get('cache-control'), 'no-cache');
  const stale = await fetch(`${base}/assets/css/site.css`, { headers: { 'if-none-match': 'W/"old-version"' } });
  assert.equal(stale.status, 200);
  assert.ok((await stale.text()).length > 1000);
});

test('caching: the same ETag works with and without compression', async () => {
  const plain = await fetch(`${base}/assets/css/site.css`, { headers: { 'accept-encoding': 'identity' } });
  const tag = plain.headers.get('etag');
  const zipped = await fetch(`${base}/assets/css/site.css`, { headers: { 'accept-encoding': 'gzip', 'if-none-match': tag } });
  assert.equal(zipped.status, 304);
});

test('caching: a 404 page is never cached or tagged', async () => {
  const res = await fetch(`${base}/no-such-page`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('etag'), null);
});

test('caching: dev mode keeps everything uncached', async () => {
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

test('signup: the real server passes a good signup to Flodesk in the right order', async () => {
  flodeskCalls.length = 0;
  const res = await fetch(`${base}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Sam', email: 'sam@example.com', hp: '', referrer: 'https://gabrieldealmeida.com/' }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(flodeskCalls.map((c) => c.url), ['/subscribers', '/workflows/wf42/subscribers']);
});

test('signup: a bad signup is refused before it reaches Flodesk', async () => {
  flodeskCalls.length = 0;
  const res = await fetch(`${base}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: '', email: 'nope' }),
  });
  assert.equal(res.status, 422);
  assert.equal(flodeskCalls.length, 0);
});

test('signup: the address only accepts POST', async () => {
  assert.equal((await fetch(`${base}/api/subscribe`)).status, 405);
});

test('every page loads the analytics script from our own Plausible, and the policy allows it', () => {
  const pages = ['index.html', 'test/index.html', 'privacy/index.html', '404.html'];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, 'public', page), 'utf8');
    const tag = html.match(/<script defer data-domain="gabrieldealmeida\.com" src="([^"]+)"><\/script>/);
    assert.ok(tag, `${page} has no analytics tag`);
    assert.ok(tag[1].startsWith(`${PLAUSIBLE_ORIGIN}/js/`), `${page} loads analytics from somewhere else`);
    assert.ok(!/\.hash\./.test(tag[1]), `${page} counts every #anchor as a page view`);
  }
});
