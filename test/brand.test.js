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
  ...walk(path.join(root, 'email')),
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

test('no income promises or guarantees anywhere', () => {
  const claims = [/six[- ]figure/i, /guarantee/i, /quit your job/i, /get rich/i, /passive income/i];
  for (const file of files) {
    if (file.endsWith('brand.test.js')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const re of claims) {
      assert.ok(!re.test(text), `${re} found in ${path.relative(root, file)}`);
    }
  }
});

test('the $250K claim lives only on the home page, framed as his result and not a promise', () => {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!/\$\s?250|250,?000/.test(text)) continue;
    assert.ok(file.endsWith(path.join('public', 'index.html')), `$250K claim in ${path.relative(root, file)}`);
    assert.match(text, /my result, not a promise/i, 'the claim needs its framing');
    assert.match(text, /not a typical outcome/i, 'the claim needs the typical-outcome disclaimer');
    assert.match(text, /most of mine failed/i, 'the claim needs the honesty line next to it');
  }
});

test('the old name is gone from everything a visitor or a file path can show', () => {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/saturday test/i.test(text), `old name in ${path.relative(root, file)}`);
    assert.ok(!/saturday-test/i.test(text), `old file name in ${path.relative(root, file)}`);
  }
});

test('no company, employer, or product names anywhere a visitor can read', () => {
  // Gabe's call: keep the story general. No names, even for past ventures.
  const names = [
    /booklybox/i, /quarterly/i, /pagehabit/i, /books for africa/i, /occuspace/i,
    /storj/i, /upstream/i, /campion/i, /tempus/i, /beacon hill/i, /bon ?bon/i, /fortuna/i,
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of names) {
      assert.ok(!re.test(text), `${re} found in ${path.relative(root, file)}`);
    }
  }
});

test('a dollar goal on the home page is always a goal, with its limits written next to it', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const lede = html.match(/<h1 id="hero-title">.*?<\/h1>/s)?.[0] ?? '';
  if (/\$\s?\d/.test(lede)) {
    assert.match(lede, /aim for/i, 'the hero number must be framed as something to aim for');
    assert.match(lede, /not a promise/i, 'the hero number needs "not a promise" beside it');
    assert.match(lede, /typical result/i, 'the hero number needs "typical result" beside it');
    assert.match(lede, /little or nothing/i, 'the hero number needs the honest line about most side hustles');
  }
  for (const page of ['index.html', 'test/index.html', 'privacy/index.html']) {
    const text = fs.readFileSync(path.join(root, 'public', page), 'utf8');
    assert.match(text, /Any dollar amount is a goal, not a typical result/, `${page} footer disclaimer`);
  }
});
