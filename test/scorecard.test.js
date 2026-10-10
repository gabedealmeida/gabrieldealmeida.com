import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STOPS,
  TESTS,
  VERDICTS,
  scoreHours,
  napkin,
  scoreNapkin,
  verdictKey,
  computeResult,
  NEEDS,
  needsLevel,
} from '../public/assets/js/scorecard.js';

test('content: every choice question has options scoring 0, 1 and 2, in order', () => {
  for (const t of TESTS) {
    for (const q of t.questions) {
      if (q.type) continue;
      assert.deepEqual(q.options.map((o) => o.score), [0, 1, 2], q.id);
      for (const o of q.options) assert.ok(o.text.length > 3, q.id);
    }
  }
});

test('content: five stops, five tests, three questions each, a tip on every question', () => {
  assert.equal(STOPS.length, 5);
  assert.equal(TESTS.length, 5);
  for (const t of TESTS) {
    assert.equal(t.questions.length, 3, t.id);
    assert.ok(t.proof.do && t.proof.pass, t.id);
    for (const q of t.questions) assert.ok(q.tip && q.tip.length > 20, q.id);
  }
  for (const s of STOPS) assert.ok(s.advice.length > 20, s.id);
});

test('3a hours: thresholds match the printed scorecard', () => {
  assert.equal(scoreHours({ have: 10, need: 12 }), 0); // needs more than I have
  assert.equal(scoreHours({ have: 10, need: 10 }), 1); // about what I have
  assert.equal(scoreHours({ have: 10, need: 7 }), 1); // just over two thirds
  assert.equal(scoreHours({ have: 9, need: 6 }), 2); // exactly two thirds
  assert.equal(scoreHours({ have: 10, need: 3 }), 2);
});

test('3a hours: unsure, empty, zero or nonsense all score 0', () => {
  assert.equal(scoreHours({ unsure: true, have: 10, need: 1 }), 0);
  assert.equal(scoreHours({}), 0);
  assert.equal(scoreHours(), 0);
  assert.equal(scoreHours({ have: 0, need: 3 }), 0);
  assert.equal(scoreHours({ have: 10, need: -2 }), 0);
  assert.equal(scoreHours({ have: NaN, need: 3 }), 0);
  assert.equal(scoreHours({ have: '10', need: 3 }), 0);
});

test('napkin: worked example', () => {
  // aim $2,000, $50 profit, 2 hours each, 10 hours a week
  const n = napkin({ aim: 2000, profit: 50, hoursPerSale: 2, weeklyHours: 10 });
  assert.equal(n.sales, 40);
  assert.equal(n.needed, 80);
  assert.equal(n.have, 40);
});

test('5a napkin: 0 when it needs more hours than you have', () => {
  assert.equal(scoreNapkin({ aim: 2000, profit: 50, hoursPerSale: 2, weeklyHours: 10 }), 0);
});

test('5a napkin: 1 when it fits with little room, 2 with room to spare', () => {
  // needs 36 of 40 hours = 90%
  assert.equal(scoreNapkin({ aim: 1800, profit: 50, hoursPerSale: 1, weeklyHours: 10 }), 1);
  // needs exactly 30 of 40 = 75%, which counts as room to spare
  assert.equal(scoreNapkin({ aim: 1500, profit: 50, hoursPerSale: 1, weeklyHours: 10 }), 2);
  // needs 10 of 40
  assert.equal(scoreNapkin({ aim: 500, profit: 50, hoursPerSale: 1, weeklyHours: 10 }), 2);
});

test('5a napkin: missing numbers or "not sure" score 0 and never throw', () => {
  assert.equal(napkin({ aim: 2000, profit: 0, hoursPerSale: 2, weeklyHours: 10 }), null);
  assert.equal(scoreNapkin({ aim: 2000 }), 0);
  assert.equal(scoreNapkin({ unsure: true, aim: 500, profit: 50, hoursPerSale: 1, weeklyHours: 10 }), 0);
  assert.equal(scoreNapkin(), 0);
});

test('verdict: the weakest test decides', () => {
  assert.equal(verdictKey([6, 6, 6, 6, 4]), 'go');
  assert.equal(verdictKey([6, 6, 6, 6, 3]), 'fix'); // 27 of 30 still just "fix"
  assert.equal(verdictKey([5, 6, 2, 6, 6]), 'fix');
  assert.equal(verdictKey([6, 6, 6, 1, 6]), 'prove');
  assert.equal(verdictKey([6, 6, 0, 6, 6]), 'prove');
});

test('verdict: two or more tests at 0 or 1 means next idea', () => {
  assert.equal(verdictKey([1, 6, 6, 0, 6]), 'next');
  assert.equal(verdictKey([0, 0, 0, 0, 0]), 'next');
  assert.equal(verdictKey([1, 1, 6, 6, 6]), 'next');
  assert.equal(verdictKey([2, 2, 2, 2, 2]), 'fix');
});

test('verdict: boundaries sit exactly where the printed scorecard says', () => {
  assert.equal(verdictKey([4, 4, 4, 4, 4]), 'go');
  assert.equal(verdictKey([3, 4, 4, 4, 4]), 'fix');
  assert.equal(verdictKey([2, 4, 4, 4, 4]), 'fix');
  assert.equal(verdictKey([1, 4, 4, 4, 4]), 'prove');
  assert.equal(verdictKey([0, 4, 4, 4, 4]), 'prove');
});

test('every verdict has copy', () => {
  for (const k of ['go', 'fix', 'prove', 'next']) {
    assert.ok(VERDICTS[k].label && VERDICTS[k].when && VERDICTS[k].text, k);
  }
});

test('result: all top scores gives 30 and a go', () => {
  const state = {
    answers: Object.fromEntries(
      TESTS.flatMap((t) => t.questions.filter((q) => !q.type).map((q) => [q.id, 2])),
    ),
    stops: {},
    hours: { have: 10, need: 3 },
    napkin: { aim: 500, profit: 50, hoursPerSale: 1 },
  };
  const r = computeResult(state);
  assert.deepEqual(r.testScores, [6, 6, 6, 6, 6]);
  assert.equal(r.total, 30);
  assert.equal(r.verdict, 'go');
  assert.equal(r.tips.length, 0);
});

test('result: an empty quiz is a zero and a next idea, not a crash', () => {
  const r = computeResult({});
  assert.deepEqual(r.testScores, [0, 0, 0, 0, 0]);
  assert.equal(r.verdict, 'next');
  assert.equal(r.total, 0);
});

test('result: ties for weakest go to the lower test number', () => {
  const state = {
    answers: Object.fromEntries(
      TESTS.flatMap((t) => t.questions.filter((q) => !q.type).map((q) => [q.id, 2])),
    ),
    hours: { have: 10, need: 3 },
    napkin: { aim: 500, profit: 50, hoursPerSale: 1 },
  };
  state.answers['2a'] = 0;
  state.answers['4a'] = 0; // Test 2 and Test 4 both drop to 4
  const r = computeResult(state);
  assert.equal(r.testScores[1], 4);
  assert.equal(r.testScores[3], 4);
  assert.equal(r.lowestIndex, 1);
});

test('result: tips list the weakest answers first, then test order', () => {
  const state = {
    answers: Object.fromEntries(
      TESTS.flatMap((t) => t.questions.filter((q) => !q.type).map((q) => [q.id, 2])),
    ),
    hours: { have: 10, need: 3 },
    napkin: { aim: 500, profit: 50, hoursPerSale: 1 },
  };
  state.answers['4b'] = 1;
  state.answers['1b'] = 0;
  state.answers['3b'] = 0;
  const ids = computeResult(state).tips.map((t) => t.id);
  assert.deepEqual(ids, ['1b', '3b', '4b']);
});

test('result: computed questions feed the tips and the napkin comes back', () => {
  const state = {
    answers: {},
    hours: { have: 10, need: 12 },
    napkin: { aim: 2000, profit: 50, hoursPerSale: 2 },
  };
  const r = computeResult(state);
  assert.equal(r.questionScores['3a'], 0);
  assert.equal(r.questionScores['5a'], 0);
  assert.equal(r.napkin.needed, 80);
  assert.equal(r.napkin.have, 40);
  assert.ok(r.tips.some((t) => t.id === '3a'));
  assert.ok(r.tips.some((t) => t.id === '5a'));
});

test('result: stops are reported by id and ignore anything else', () => {
  const r = computeResult({ stops: { agreement: true, home: true, money: false, bogus: true } });
  assert.deepEqual(r.stopsYes, ['agreement', 'home']);
});

test('result: garbage answers are treated as 0, never as bonus points', () => {
  const r = computeResult({ answers: { '1a': 5, '1b': -1, '1c': 'two', '2a': 1.5 }, hours: {}, napkin: {} });
  assert.equal(r.questionScores['1a'], 0);
  assert.equal(r.questionScores['1b'], 0);
  assert.equal(r.questionScores['1c'], 0);
  assert.equal(r.questionScores['2a'], 0);
});

test('checklist: eight specific, unique items, each with a plain label', () => {
  assert.equal(NEEDS.length, 8);
  assert.equal(new Set(NEEDS.map((n) => n.id)).size, 8);
  for (const n of NEEDS) assert.ok(/^[a-z]+$/.test(n.id) && n.label.length > 10, n.id);
});

test('checklist: levels match what the printed worksheet says', () => {
  assert.equal(needsLevel(0).level, 'light');
  assert.equal(needsLevel(2).level, 'light');
  assert.equal(needsLevel(3).level, 'watch');
  assert.equal(needsLevel(4).level, 'watch');
  assert.equal(needsLevel(5).level, 'heavy');
  assert.equal(needsLevel(8).level, 'heavy');
  for (const n of [0, 3, 5]) assert.ok(needsLevel(n).text.length > 10);
});

test('checklist: it is advice only and never changes a score', () => {
  const answers = Object.fromEntries(TESTS.flatMap((t) => t.questions.filter((q) => !q.type).map((q) => [q.id, 2])));
  const base = { answers, hours: { have: 10, need: 3 }, napkin: { aim: 500, profit: 50, hoursPerSale: 1 } };
  assert.deepEqual(computeResult(base).testScores, computeResult({ ...base, needs: NEEDS.map((n) => n.id) }).testScores);
});
