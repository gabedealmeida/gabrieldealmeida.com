// The site server. Serves public/ with clean URLs and runs api/subscribe.js.
// No dependencies: it only uses what comes with Node.
//
//   npm start                    what Railway runs (reads PORT and the Kit variables)
//   npm run dev                  local preview, nothing cached
//   npm run dev -- --mock-kit    local preview that pretends to be Kit, so you can
//                                try the whole signup flow with no account

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import subscribe from './api/subscribe.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');

export const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

// Pages, styles, scripts, images and the PDF are always re-checked with the
// server (a cheap "has this changed?" question, answered with a 304 when not).
// Only the font, which never changes, is cached for a year. Caching styles or
// scripts for even an hour pairs a fresh page with a stale stylesheet after a
// deploy, which breaks the layout for anyone who visited recently.
function cacheControl(ext, dev) {
  if (dev) return 'no-store';
  if (ext === '.woff2' || ext === '.ttf') return 'public, max-age=31536000, immutable';
  return 'no-cache';
}

const etagCache = new Map();
function etagFor(file, stat) {
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  let tag = etagCache.get(key);
  if (!tag) {
    const digest = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 20);
    tag = `W/"${digest}"`;
    etagCache.set(key, tag);
  }
  return tag;
}

function notModified(req, tag) {
  const sent = String(req.headers['if-none-match'] || '');
  if (!sent) return false;
  const bare = (value) => value.trim().replace(/^W\//, '');
  return sent.split(',').some((candidate) => candidate.trim() === '*' || bare(candidate) === bare(tag));
}

// Finds the file for a URL path, or null. Never leaves public/, and never
// serves a file or folder whose name starts with a dot.
export function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return { bad: true };
  }
  if (decoded.includes('\0')) return { bad: true };
  if (decoded.split('/').some((part) => part.startsWith('.'))) return null;

  const target = path.normalize(path.join(publicDir, decoded));
  if (target !== publicDir && !target.startsWith(publicDir + path.sep)) return null;

  const candidates = [target, `${target}.html`, path.join(target, 'index.html')];
  const file = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  return file ? { file } : null;
}

const gzipCache = new Map();
function gzipped(file, stat) {
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  let buffer = gzipCache.get(key);
  if (!buffer) {
    buffer = zlib.gzipSync(fs.readFileSync(file));
    gzipCache.set(key, buffer);
  }
  return buffer;
}

function sendFile(req, res, file, { dev, status = 200 }) {
  const ext = path.extname(file);
  const stat = fs.statSync(file);
  res.statusCode = status;
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', status === 200 ? cacheControl(ext, dev) : 'no-store');

  if (status === 200 && !dev) {
    const tag = etagFor(file, stat);
    res.setHeader('ETag', tag);
    if (COMPRESSIBLE.has(ext) && stat.size > 512) res.setHeader('Vary', 'Accept-Encoding');
    if (notModified(req, tag)) {
      res.statusCode = 304;
      return res.end();
    }
  }

  const wantsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  if (COMPRESSIBLE.has(ext) && stat.size > 512) {
    res.setHeader('Vary', 'Accept-Encoding');
    if (wantsGzip) {
      const body = gzipped(file, stat);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', body.length);
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
  }
  res.setHeader('Content-Length', stat.size);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

export function createServer({ dev = false } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);

      if (url.pathname === '/health') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.end('ok');
      }
      if (url.pathname === '/api/subscribe') return await subscribe(req, res);

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        return res.end('Method not allowed');
      }

      const found = resolveFile(url.pathname);
      if (found?.bad) {
        res.statusCode = 400;
        return res.end('Bad request');
      }
      if (!found) return sendFile(req, res, path.join(publicDir, '404.html'), { dev, status: 404 });
      return sendFile(req, res, found.file, { dev });
    } catch (err) {
      console.error('server error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Something went wrong.');
      } else {
        res.destroy();
      }
    }
  });
}

// ---- running it ------------------------------------------------------------

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
  const mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      console.log(`[mock kit] ${req.method} ${req.url} ${raw}`);
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    });
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  process.env.KIT_API_BASE = `http://127.0.0.1:${mock.address().port}`;
  process.env.KIT_API_KEY = 'mock-key';
  process.env.KIT_FORM_ID = '1';
  console.log('Mock Kit is on. Signups are logged here and go nowhere else.');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  loadEnvFile();

  if (process.argv.includes('--mock-kit')) {
    // A fake Kit on the live site would quietly throw real signups away.
    if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
      console.error('--mock-kit is for local use only. Refusing to start.');
      process.exit(1);
    }
    await startMockKit();
  }

  // 8080 unless the host hands us a PORT. Railway's PORT variable wins if it is set.
  const port = Number(process.env.PORT || 8080);
  const server = createServer({ dev: process.argv.includes('--dev') });
  server.listen(port, '0.0.0.0', () => console.log(`Site running on port ${port}`));

  // Railway stops the old copy with SIGTERM when a new deploy takes over.
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
