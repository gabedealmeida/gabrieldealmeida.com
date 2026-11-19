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

const files = [...walk(path.join(root, 'public')), path.join(root, 'README.md')];
const read = (file) => fs.readFileSync(file, 'utf8');
const home = read(path.join(root, 'public', 'index.html'));
const rel = (file) => path.relative(root, file);

test('no em dashes or en dashes anywhere a visitor can read', () => {
  for (const file of files) {
    assert.ok(!/[–—]/.test(read(file)), `dash in ${rel(file)}`);
  }
});

test('no guru or hype language, wrong terms, or names that must stay private', () => {
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
    // AI hype
    /supercharge/i,
    /revolutioni[sz]e/i,
    /skyrocket/i,
    /\b10x\b/i,
    /secret sauce/i,
    /cutting[- ]edge/i,
    /next[- ]gen/i,
    /on autopilot/i,
    /\bhack(s|ed)?\b/i,
  ];
  for (const file of files) {
    const text = read(file);
    for (const re of banned) {
      assert.ok(!re.test(text), `${re} found in ${rel(file)}`);
    }
  }
});

test('no income, savings or results promises anywhere', () => {
  const claims = [/guarantee/i, /quit your job/i, /get rich/i, /passive income/i, /six[- ]figure/i, /replace your (team|staff|employees)/i];
  for (const file of files) {
    if (file.endsWith('brand.test.js')) continue;
    const text = read(file);
    for (const re of claims) {
      assert.ok(!re.test(text), `${re} found in ${rel(file)}`);
    }
  }
});

test('no dollar amounts or hours-saved numbers on the pages', () => {
  // Gabe's income figures live in the archive and are not part of this site. Nothing may
  // promise a number of hours, a percentage or dollars saved or earned.
  const numbers = [/\$\s?\d/, /\b\d[\d,]*\s?(hours?|hrs?|minutes?) (a|per|every) (day|week|month)\b/i, /\bsave[sd]?\b[^.<]{0,40}\d+\s?(hours?|hrs?|%|percent)/i, /\d+\s?%/];
  // Only the words a visitor reads: pages and the README. (Stylesheets are full of percentages.)
  for (const file of files.filter((f) => /\.(html|md|txt)$/.test(f))) {
    const text = read(file);
    for (const re of numbers) {
      assert.ok(!re.test(text), `${re} found in ${rel(file)}`);
    }
  }
});

test('the old names are gone from everything a visitor or a file path can show', () => {
  for (const file of files) {
    const text = read(file);
    assert.ok(!/saturday test/i.test(text), `old name in ${rel(file)}`);
    assert.ok(!/saturday-test/i.test(text), `old file name in ${rel(file)}`);
    if (file.endsWith('README.md')) continue; // the README explains where the old site went
    assert.ok(!/score my side hustle/i.test(text), `old scorecard name in ${rel(file)}`);
    assert.ok(!/skool\.com/i.test(text), `old community link in ${rel(file)}`);
  }
});

test('no company, employer, or product names anywhere a visitor can read', () => {
  // Gabe's call: keep the story general. No names, even for past ventures.
  const names = [
    /booklybox/i, /quarterly/i, /pagehabit/i, /books for africa/i, /occuspace/i,
    /storj/i, /upstream/i, /campion/i, /tempus/i, /beacon hill/i, /bon ?bon/i, /fortuna/i,
  ];
  for (const file of files) {
    const text = read(file);
    for (const re of names) {
      assert.ok(!re.test(text), `${re} found in ${rel(file)}`);
    }
  }
});

test('every page that shows the footer carries the not-a-promise note', () => {
  for (const page of ['index.html', 'privacy/index.html']) {
    const text = read(path.join(root, 'public', page));
    assert.match(text, /illustrations, not promises of savings, time or income/, `${page} footer disclaimer`);
    assert.match(text, /person in the loop/, `${page} human-in-the-loop line`);
  }
});

test('the home page positions Gabe as an AI automation builder, honestly', () => {
  assert.match(home, /<h1 id="hero-title">[^<]*Put AI to work/);
  assert.equal((home.match(/<h1\b/g) || []).length, 1, 'exactly one h1');
  assert.match(home, /<title>[^<]*AI[^<]*<\/title>/);
  assert.match(home, /a human checking what matters/i, 'the hero must say a person stays in charge');
  assert.match(home, /Four rules I won't bend/);
  assert.match(home, /Sometimes the right answer is/, 'the honest "no" section is part of the authority');
  assert.match(home, /not promises/i);
});

test('the home page sends people somewhere real: every in-page link has a target', () => {
  const ids = new Set([...home.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, target] of home.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.has(target), `href="#${target}" has no matching id`);
  }
  const dupes = [...ids].filter((id) => (home.match(new RegExp(`\\sid="${id}"`, 'g')) || []).length > 1);
  assert.deepEqual(dupes, [], 'duplicate ids on the home page');
});

test('every picture on the home page exists and has alt text', () => {
  for (const [tag] of home.matchAll(/<img\b[^>]*>/g)) {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    assert.ok(src, `img without src: ${tag}`);
    assert.ok(fs.existsSync(path.join(root, 'public', src)), `missing picture ${src}`);
    assert.ok(/\salt="/.test(tag), `img without alt attribute: ${src}`);
  }
  const og = home.match(/og:image" content="https:\/\/gabrieldealmeida\.com([^"]+)"/)?.[1];
  assert.ok(og && fs.existsSync(path.join(root, 'public', og)), 'share image must exist');
});

test('the site collects no email addresses, anywhere', () => {
  const forbidden = [/<form\b/i, /<input\b/i, /type="email"/i, /mailto:/i, /api\/subscribe/i, /flodesk/i, /newsletter/i, /unsubscribe/i, /weekly brief/i, /hello@/i];
  // Pages and scripts. (The stylesheets keep old form components that nothing uses.)
  for (const file of files.filter((f) => /\.(html|js)$/.test(f))) {
    const text = read(file);
    for (const re of forbidden) {
      assert.ok(!re.test(text), `${re} found in ${rel(file)}`);
    }
  }
});

test('Instagram is the one way in: follow, and message', () => {
  const dm = 'https://ig.me/m/itsgabrieldealmeida';
  const profile = 'https://www.instagram.com/itsgabrieldealmeida/';
  assert.match(home, /<a class="bar-cta" href="https:\/\/ig\.me\/m\/itsgabrieldealmeida"/, 'the header button messages you');
  assert.ok(home.split(dm).length > 4, 'message links appear through the page');
  assert.ok(home.split(`href="${profile}"`).length > 4, 'follow links appear through the page');
  assert.match(home, /<div class="sticky-cta" id="sticky-cta" hidden><a class="btn" href="https:\/\/ig\.me/, 'the phone button messages you');
  for (const [tag] of home.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.ok(/rel="noopener"/.test(tag), `external link without noopener: ${tag}`);
  }
});

test('the home page speaks to businesses bringing AI into their own operations', () => {
  assert.match(home, /I help businesses bring AI into how they work/);
  assert.match(home, /Want AI working inside your business\?/);
  assert.ok(!/Businesses I run myself/i.test(home), 'the photo section was removed on purpose');
});

test('the site is in the palette: no stray hex colours in the new stylesheet', () => {
  const css = read(path.join(root, 'public', 'assets', 'css', 'automation.css'));
  const allowed = new Set(['#1e1611', '#e3bd72']); // the espresso ink and the brass hover already used by theme.css
  for (const [hex] of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    assert.ok(allowed.has(hex.toLowerCase()), `${hex} in automation.css is not part of the palette`);
  }
});
