import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Gabe's hard rules, checked on every file a visitor can read.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'downloads' || e.name === 'fonts' || e.name === 'img' ? [] : walk(full);
    return /\.(html|js|css|md|txt|xml|webmanifest)$/.test(e.name) ? [full] : [];
  });
}

const files = [
  ...walk(path.join(root, 'public')),
  ...walk(path.join(root, 'pdf')),
  path.join(root, 'content', 'score-my-side-hustle-idea.md'),
  path.join(root, 'README.md'),
];

test('no em dashes or en dashes anywhere a visitor can read', () => {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/[–—]/.test(text), `dash in ${path.relative(root, file)}`);
  }
});

test('no guru language, wrong terms, or names that must stay private', () => {
  const banned = [
    /\bunlock/i,
    /game[- ]?changer/i,
    /level up/i,
    /side business/i,
    /side gig/i,
    /small bets/i,
    /lambo/i,
    /occuspace/i,
    /content launch/i,
    /\b4\s?am\b/i,
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of banned) {
      assert.ok(!re.test(text), `${re} found in ${path.relative(root, file)}`);
    }
  }
});

test('no income promises or earnings claims on the site', () => {
  const claims = [/\$\s?250/i, /250,?000/, /six[- ]figure/i, /guarantee/i, /quit your job/i];
  for (const file of files) {
    if (file.endsWith('brand.test.js')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const re of claims) {
      assert.ok(!re.test(text), `${re} found in ${path.relative(root, file)}`);
    }
  }
});

test('the old name is gone from everything a visitor or a file path can show', () => {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/saturday test/i.test(text), `old name in ${path.relative(root, file)}`);
    assert.ok(!/saturday-test/i.test(text), `old file name in ${path.relative(root, file)}`);
  }
});
