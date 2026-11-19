// Builds public/downloads/score-my-side-hustle-idea.pdf from pdf/score-my-side-hustle-idea.html
// using Chrome's own print engine (so the PDF uses the same Inter as the site).
//
//   npm run build:pdf
//
// Set CHROME_PATH if Chrome lives somewhere unusual.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'pdf', 'score-my-side-hustle-idea.html');
const output = path.join(root, 'public', 'downloads', 'score-my-side-hustle-idea.pdf');

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const chrome = candidates.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('Could not find Chrome. Install it, or set CHROME_PATH to its location.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const result = spawnSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${output}`,
    `file://${source}`,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

if (result.status !== 0 || !fs.existsSync(output)) {
  console.error(result.stderr?.toString() || 'Chrome did not produce a PDF.');
  process.exit(1);
}
console.log(`Wrote ${path.relative(root, output)} (${Math.round(fs.statSync(output).size / 1024)} KB)`);
