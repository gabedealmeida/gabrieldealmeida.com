// Run before you deploy:  npm run check
// Fails if something the live site depends on is missing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

// The share card shown when the link is posted anywhere.
const share = 'public/assets/img/og-automation.jpg';
if (!fs.existsSync(path.join(root, share))) {
  problems.push(`Missing ${share}. Shared links would show no picture.`);
}

if (!fs.existsSync(path.join(root, 'public', 'index.html'))) {
  problems.push('Missing public/index.html.');
}

if (problems.length) {
  console.error('Not ready to go live:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('Ready to go live.');
