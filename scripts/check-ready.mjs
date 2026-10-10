// Run before you deploy:  npm run check
// Fails if something the live site depends on is missing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

const pdf = 'public/downloads/score-my-side-hustle-idea.pdf';
if (!fs.existsSync(path.join(root, pdf))) {
  problems.push(`Missing ${pdf}. The quiz links to it, so people would hit a 404.`);
}

if (!process.env.KIT_API_KEY) {
  problems.push('KIT_API_KEY is not set in this shell. Add it in Railway (your service, then Variables) before going live. KIT_FORM_ID is optional.');
}

if (problems.length) {
  console.error('Not ready to go live:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('Ready to go live.');
