import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { track } from '../public/assets/js/track.js';

test('tracking: never throws, even with no browser or no analytics script', () => {
  assert.doesNotThrow(() => track('Anything'));
  assert.doesNotThrow(() => track('Anything', { a: 'b' }));
});

test('tracking: events carry only plain labels, never a name or an email', () => {
  const files = ['home.js', 'quiz.js'].map((f) => fs.readFileSync(new URL(`../public/assets/js/${f}`, import.meta.url), 'utf8'));
  for (const text of files) {
    for (const call of text.match(/track\([^;]*\);/g) ?? []) {
      assert.ok(!/firstName|\bemail\b|profile\.name|state\.idea|state\.smallest|answers/.test(call), `personal data in ${call}`);
    }
  }
});

test('contact email: the address is never written out in any page', () => {
  for (const f of ['index.html', 'test/index.html', 'privacy/index.html', '404.html']) {
    const text = fs.readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
    assert.ok(!/hello@gabrieldealmeida\.com/i.test(text), `address visible in ${f}`);
  }
});
