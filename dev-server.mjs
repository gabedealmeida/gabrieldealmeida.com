// Local preview. Serves public/ the way Vercel does (clean URLs) and runs the
// real api/subscribe.js function.
//
//   npm run dev                 uses KIT_API_KEY / KIT_FORM_ID from .env
//   npm run dev -- --mock-kit   pretends to be Kit, so you can try the whole
//                               signup flow with no account

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subscribe from './api/subscribe.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 3000);

function loadEnvFile() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function startMockKit() {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      console.log(`[mock kit] ${req.method} ${req.url} ${raw}`);
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.KIT_API_BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.KIT_API_KEY = 'mock-key';
  process.env.KIT_FORM_ID = '1';
  console.log('Mock Kit is on. Signups are logged here and go nowhere else.');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.normalize(path.join(publicDir, clean));
  if (!target.startsWith(publicDir)) return null;
  const candidates = [target, `${target}.html`, path.join(target, 'index.html')];
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) ?? null;
}

// Apply the same security headers the live site sends (from vercel.json), so a
// blocked script or font shows up here and not after you deploy.
const sitewideHeaders =
  JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers?.find(
    (rule) => rule.source === '/(.*)',
  )?.headers ?? [];

loadEnvFile();
if (process.argv.includes('--mock-kit')) await startMockKit();

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    for (const { key, value } of sitewideHeaders) res.setHeader(key, value);
    if (url.pathname === '/api/subscribe') return subscribe(req, res);

    const file = resolveFile(url.pathname);
    if (!file) {
      res.statusCode = 404;
      res.setHeader('Content-Type', TYPES['.html']);
      return res.end(fs.readFileSync(path.join(publicDir, '404.html')));
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Site running at http://localhost:${port}`));
