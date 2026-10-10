import test from 'node:test';
import assert from 'node:assert/strict';
import { entrySource, wantsReset, resolveEntry } from '../public/assets/js/entry.js';

test('entry: the ManyChat link is recognized', () => {
  assert.equal(entrySource('?from=ig'), 'instagram');
  assert.equal(entrySource('?from=instagram'), 'instagram');
  assert.equal(entrySource('?from=IG'), 'instagram');
  assert.equal(entrySource('?utm_source=x&from=ig&y=1'), 'instagram');
});

test('entry: the signup fallback is recognized', () => {
  assert.equal(entrySource('?from=signup'), 'signup');
});

test('entry: the welcome email link is recognized and lets people in', () => {
  assert.equal(entrySource('?from=email'), 'email');
  assert.equal(entrySource('?from=EMAIL'), 'email');
  const r = resolveEntry('?from=email', {});
  assert.equal(r.allowed, true);
  assert.deepEqual(r.profile, { access: true, source: 'email' });
  assert.equal(entrySource('?from=emails'), null);
});

test('entry: everything else is an ordinary visit', () => {
  for (const search of ['', '?', '?from=', '?from=tiktok', '?from=igx', '?source=ig', '?from=ig2', 'from=facebook']) {
    assert.equal(entrySource(search), null, search);
  }
});

test('entry: odd input never throws', () => {
  assert.equal(entrySource(undefined), null);
  assert.equal(entrySource('%%%'), null);
});

test('reset: only ?reset=1 clears the saved data', () => {
  assert.equal(wantsReset('?reset=1'), true);
  assert.equal(wantsReset('?from=ig&reset=1'), true);
  for (const search of ['', '?reset=0', '?reset=true', '?reset=', '?from=ig']) {
    assert.equal(wantsReset(search), false, search);
  }
  assert.equal(wantsReset(undefined), false);
});

test('access: a new visitor with nothing saved is not let in', () => {
  const r = resolveEntry('', {});
  assert.equal(r.allowed, false);
  assert.equal(resolveEntry('', null).allowed, false);
  assert.equal(resolveEntry(undefined, undefined).allowed, false);
});

test('access: someone who signed up on this device is let in', () => {
  const r = resolveEntry('', { name: 'Sam', access: true, source: 'signup' });
  assert.equal(r.allowed, true);
  assert.equal(r.profile.name, 'Sam');
});

test('access: the ManyChat link is the side door, and it keeps nothing but a flag', () => {
  const r = resolveEntry('?from=ig', {});
  assert.equal(r.allowed, true);
  assert.equal(r.source, 'instagram');
  assert.deepEqual(r.profile, { access: true, source: 'instagram' });
});

test('access: the ManyChat link keeps a name the visitor already gave us', () => {
  const r = resolveEntry('?from=ig', { name: 'Sam', access: true, source: 'signup' });
  assert.equal(r.profile.name, 'Sam');
  assert.equal(r.allowed, true);
});

test('access: reset sends everyone back to the sign-up form', () => {
  const r = resolveEntry('?reset=1', { name: 'Sam', access: true });
  assert.equal(r.reset, true);
  assert.equal(r.allowed, false);
  assert.deepEqual(r.profile, {});
});

test('access: reset and the ManyChat link together still let the ManyChat visitor in', () => {
  const r = resolveEntry('?reset=1&from=ig', { name: 'Sam', access: true });
  assert.equal(r.allowed, true);
  assert.deepEqual(r.profile, { access: true, source: 'instagram' });
});

test('access: only a real true counts, never a string or a number', () => {
  for (const access of ['true', 1, 'yes', null, undefined, {}, []]) {
    assert.equal(resolveEntry('', { access }).allowed, false, JSON.stringify(access));
  }
});

test('access: a wrong or unknown flag in the link does not let anyone in', () => {
  for (const search of ['?from=tiktok', '?access=true', '?from=', '?revealed=1']) {
    assert.equal(resolveEntry(search, {}).allowed, false, search);
  }
});
