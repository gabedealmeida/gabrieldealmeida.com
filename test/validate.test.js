import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateName,
  validateEmail,
  suggestEmail,
  validateSignup,
} from '../public/assets/js/validate.js';

test('names: accepts ordinary and international first names', () => {
  for (const name of ['Gabe', 'Mary-Jane', "O'Brien", 'José', 'Zoë', 'Anne Marie', 'J.R.', '李雷']) {
    assert.equal(validateName(name).ok, true, name);
  }
});

test('names: trims and collapses whitespace', () => {
  assert.equal(validateName('  Gabe   Dee  ').value, 'Gabe Dee');
});

test('names: rejects empty, numbers, links and markup', () => {
  for (const name of ['', '   ', '1234', 'Gabe123', 'http://spam.example', '<b>hi</b>', 'a@b.co', '-Gabe']) {
    assert.equal(validateName(name).ok, false, JSON.stringify(name));
  }
});

test('names: rejects absurdly long input', () => {
  assert.equal(validateName('a'.repeat(61)).ok, false);
  assert.equal(validateName('a'.repeat(60)).ok, true);
});

test('emails: accepts normal addresses and lowercases them', () => {
  assert.equal(validateEmail('  Hello@GabrielDeAlmeida.com ').value, 'hello@gabrieldealmeida.com');
  for (const email of ['a@b.co', 'first.last+tag@sub.example.org', "o'brien@example.com", 'x_y-z@my-domain.io']) {
    assert.equal(validateEmail(email).ok, true, email);
  }
});

test('emails: rejects the usual mistakes with a helpful message', () => {
  const cases = {
    '': 'Please enter your email.',
    'gabe': 'Your email needs an @ in it.',
    'gabe@': 'Add the part after the @, like gmail.com.',
    '@gmail.com': 'Add the part before the @.',
    'gabe@gmail': 'The part after the @ needs a dot, like gmail.com.',
    'gabe @gmail.com': 'Emails cannot have spaces in them.',
    'a@b@c.com': 'Your email has more than one @ in it.',
  };
  for (const [input, message] of Object.entries(cases)) {
    const result = validateEmail(input);
    assert.equal(result.ok, false, input);
    assert.equal(result.message, message, input);
  }
});

test('emails: rejects malformed dots, hyphens and tlds', () => {
  for (const email of ['a..b@example.com', '.a@example.com', 'a.@example.com', 'a@-example.com', 'a@example-.com', 'a@example.c', 'a@example.123', 'a@exa mple.com', 'a@.com', 'a@example..com']) {
    assert.equal(validateEmail(email).ok, false, email);
  }
});

test('emails: enforces length limits', () => {
  assert.equal(validateEmail(`${'a'.repeat(65)}@example.com`).ok, false);
  assert.equal(validateEmail(`${'a'.repeat(64)}@example.com`).ok, true);
  assert.equal(validateEmail(`a@${'b'.repeat(250)}.com`).ok, false);
});

test('suggestions: fixes one-typo common domains', () => {
  assert.equal(suggestEmail('sam@gmial.com'), 'sam@gmail.com');
  assert.equal(suggestEmail('sam@gmail.con'), 'sam@gmail.com');
  assert.equal(suggestEmail('sam@gmail.co'), 'sam@gmail.com');
  assert.equal(suggestEmail('sam@yaho.com'), 'sam@yahoo.com');
  assert.equal(suggestEmail('sam@hotmial.com'), 'sam@hotmail.com');
  assert.equal(suggestEmail('sam@iclod.com'), 'sam@icloud.com');
  assert.equal(suggestEmail('sam@outlok.com'), 'sam@outlook.com');
});

test('suggestions: leaves real and unrelated domains alone', () => {
  for (const email of ['sam@gmail.com', 'sam@mail.com', 'sam@me.com', 'sam@hey.com', 'sam@company.com', 'sam@hotmail.co.uk', 'sam@yahoo.co.uk', 'sam@gabrieldealmeida.com', 'sam@school.edu']) {
    assert.equal(suggestEmail(email), null, email);
  }
});

test('suggestions: never fires on an invalid address', () => {
  assert.equal(suggestEmail('not-an-email'), null);
});

test('signup: reports every problem at once', () => {
  const result = validateSignup({ firstName: '', email: 'nope' });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'firstName']);
});

test('signup: returns cleaned values', () => {
  const result = validateSignup({ firstName: ' Sam ', email: ' SAM@Example.com ' });
  assert.deepEqual(result, { ok: true, value: { firstName: 'Sam', email: 'sam@example.com' } });
});

test('signup: tolerates non-string input without throwing', () => {
  assert.equal(validateSignup({ firstName: null, email: undefined }).ok, false);
  assert.equal(validateSignup({ firstName: { a: 1 }, email: ['x'] }).ok, false);
  assert.equal(validateSignup({}).ok, false);
});
