// Score My Side Hustle Idea: every question, every score, every verdict rule.
// The quiz page reads this file and nothing else decides a result, so the
// wording and the math live in exactly one place.

export const STOPS = [
  {
    id: 'agreement',
    title: 'Your work agreement',
    text: 'Might your employment agreement or an outside-work policy rule this out, or have you not checked yet?',
    advice:
      'Read your employment agreement and any outside-work policy before you do anything else. Look for outside work, conflicts of interest, and who owns what you create. If you are not sure, ask a lawyer. This is a planning tool, not legal advice.',
  },
  {
    id: 'reachable',
    title: 'Reachable 9 to 5',
    text: 'Does it need you reachable on weekdays during work hours? Calls, live support, same-day replies, showing up in person.',
    advice:
      'Look for a version that runs outside work hours, like scheduled jobs or messages you answer on your own schedule. If it truly needs weekday daytime, it may not be this one.',
  },
  {
    id: 'requirements',
    title: 'Hard-to-get requirements',
    text: 'Does it need a license, insurance, or equipment that is costly or hard to get? Basic tools you already own do not count.',
    advice:
      'Find out what the license or insurance really takes and costs before you commit. Can you start smaller without it? If not, treat the paperwork as step one, not something to sort out later.',
  },
  {
    id: 'money',
    title: 'Your 2 a.m. number',
    text: 'Think of the most you could lose without touching your family’s cushion. Could finding out if this works cost more than that, after subtracting money customers have already committed (deposits, signed clients, paid orders)?',
    advice:
      'Shrink the first test until the most you could lose is under your 2 a.m. number, or get customers to commit money first. Strong evidence can justify a bigger bet. Thin evidence cannot.',
  },
  {
    id: 'home',
    title: 'Home',
    text: 'Does anyone who would feel the hours or the dollars not know yet, or not agree?',
    advice:
      'Have the conversation before anything else. The idea, the hours, the most you will risk, and what would make them uneasy. Fifteen minutes now beats a hard conversation later.',
  },
];

const opts = (a, b, c) => [
  { score: 0, text: a },
  { score: 1, text: b },
  { score: 2, text: c },
];

export const TESTS = [
  {
    id: 'buyers',
    name: 'Already has buyers',
    short: 'Buyers',
    tagline: 'Pick a market that already pays.',
    questions: [
      {
        id: '1a',
        text: 'Have you seen strangers actually pay for something like this?',
        options: opts(
          'No. I think people would want it, or only friends and family say they would.',
          'I have seen it sold, but could not tell how often.',
          'Yes, and I can show it. At least 3 recent sales or dated reviews from strangers.',
        ),
        tip: 'Find 3 recent sales or dated reviews from strangers for something like this. Sold listings, marketplace reviews, ads that have run for months. If you cannot find them, that is your answer.',
      },
      {
        id: '1b',
        text: 'Have you asked a stranger for money?',
        options: opts(
          'Never asked.',
          'I have asked friends or family.',
          'I have asked strangers. Even if they said no, I know why.',
        ),
        tip: 'Ask one stranger for money this week. A booked time or a pre-order counts. Even a no teaches you something.',
      },
      {
        id: '1c',
        text: 'Why would a stranger pick you over what is already there?',
        options: opts(
          'I would be about the same as everyone else.',
          'I would be cheaper or more convenient, but anyone could match that.',
          'I can name one specific thing that is different and hard to copy, in one sentence.',
        ),
        tip: 'Finish this sentence: "Pick me because ___." If cheaper or more convenient is the best you have, keep looking for something harder to copy.',
      },
    ],
    miss: 'I started a fitness company in a crowded space with nothing that set me apart. I couldn’t get people to pay.',
    proof: {
      do: 'Write a one-line offer with a price. Put it where buyers already look, or message 10 people who recently bought something similar. Ask 5 for a real commitment, such as a booked time or a pre-order.',
      pass: 'At least 2 say yes with a date or money, or you learn exactly why not.',
    },
  },
  {
    id: 'door',
    name: 'Already has a door',
    short: 'Door',
    tagline: 'Sell where buyers already are.',
    questions: [
      {
        id: '2a',
        text: 'Is there a place buyers already go to find this?',
        hint: 'A marketplace, search, local groups, a platform.',
        options: opts(
          'I would have to build an audience or a website first.',
          'Maybe. I know a place but have not tried it.',
          'Yes. I can name the place and I have seen buyers asking or buying there.',
        ),
        tip: 'Name the one place your buyers already look. A marketplace, search, a local group. Go there and watch for buyers asking.',
      },
      {
        id: '2b',
        text: 'Could you get your first 10 customers with zero followers?',
        options: opts(
          'Not without ads, an audience, or luck.',
          'Probably, but I would have to learn a new channel first.',
          'Yes. I can describe the steps in 5 lines or fewer.',
        ),
        tip: 'Write your first-10-customers plan in 5 lines or fewer. If it needs an audience or ads, look for a different door.',
      },
      {
        id: '2c',
        text: 'If that door closed, would you have another?',
        options: opts(
          'No. The whole thing runs through one platform or one person.',
          'I could find another, but it would take months.',
          'Yes. I already have a second way in, or it does not depend on one platform.',
        ),
        tip: 'Find a second way in, so one platform or one person cannot shut you down.',
      },
    ],
    miss: 'With the fitness company I was starting from the ground up, trying to get people to a website. There was no door already open.',
    proof: {
      do: 'Post one real offer on the place buyers already go. Count messages for 7 days, not likes.',
      pass: 'At least 3 real inquiries from strangers.',
    },
  },
  {
    id: 'week',
    name: 'Fits your week',
    short: 'Week',
    tagline: 'The week belongs to the job.',
    questions: [
      {
        id: '3a',
        type: 'hours',
        text: 'Do the hours fit?',
        tip: 'Shrink the idea until the weekly hours it needs fit inside the hours you can truly protect. Never plan on hours you only hope to have.',
      },
      {
        id: '3b',
        text: 'If you skipped a week (sick kid, big deadline), what happens?',
        options: opts('Customers leave or things pile up.', 'Some pain, but it recovers.', 'Nothing breaks.'),
        tip: 'Make a skipped week painless. Batch work ahead, set clear response times, and limit how much can pile up.',
      },
      {
        id: '3c',
        text: 'What if it works too well?',
        hint: 'If it doubled next month, what happens?',
        options: opts(
          'I could not keep up and I would have no way to say no.',
          'I would manage for a while but I have no plan.',
          'I can cap it. A waitlist, a customer limit, or a price that slows demand.',
        ),
        tip: 'Decide your cap before you start. A waitlist, a customer limit, or a higher price.',
      },
    ],
    miss: 'My pool business worked, then got too big too quick and collided with my job. I also ran a home wholesaling business. It needed a bigger operation and more of my attention than I had.',
    proof: {
      do: 'Run a mock Saturday. Do one customer-sized job in the real time slot you would use. Time every step, including admin. Note what interrupts you.',
      pass: 'It took no more than the hours you budgeted, and the rest of your week did not suffer.',
    },
  },
  {
    id: 'safe',
    name: 'Safe to be wrong',
    short: 'Safe',
    tagline: 'Your 2 a.m. number.',
    questions: [
      {
        id: '4a',
        text: 'What would it cost to find out if this works?',
        hint: 'Include the one-page test and the first month, minus money customers have already committed.',
        options: opts(
          'More than my 2 a.m. number, or I do not know.',
          'Within it, but I would feel it.',
          'Less than half of it.',
        ),
        tip: 'Shrink the first test until it costs less than half of your 2 a.m. number, or get customers to commit money first.',
      },
      {
        id: '4b',
        text: 'Could you stop in one weekend and owe nothing?',
        hint: 'No leases, unsellable inventory, contracts, or loans.',
        options: opts(
          'No. I would be locked into something.',
          'Mostly. One or two things to unwind.',
          'Yes. I could stop Sunday night and owe nothing.',
        ),
        tip: 'Remove what you cannot undo before you start. Leases, inventory you cannot sell back, contracts, loans.',
      },
      {
        id: '4c',
        text: 'Could you watch the swings without losing sleep?',
        options: opts(
          'It uses my family’s cushion, or I would check it constantly.',
          'It is my own spare money, but I would watch it closely.',
          'I would be fine if it went to zero, and I would not need to check daily.',
        ),
        tip: 'Use only money you could lose without losing sleep, and stay away from anything you would check at 2 a.m.',
      },
    ],
    miss: 'I dabbled in stock trading. The ups and downs were more than I could stomach, it was my family’s money, and the people on the other side had far more resources than I did.',
    proof: {
      do: 'Write your 2 a.m. number. Spend 15 minutes with the person at home: the idea, the hours, the most you will risk, and what would make them uneasy. List every contract, lease, or purchase and check that each can be undone.',
      pass: 'You both agree on the number, and nothing on your list cannot be undone.',
    },
  },
  {
    id: 'math',
    name: 'The math holds',
    short: 'Math',
    tagline: 'Your napkin. Your own arithmetic, not a forecast.',
    questions: [
      {
        id: '5a',
        type: 'napkin',
        text: 'Do the hours fit?',
        tip: 'Raise the profit per sale, cut the hours per sale, or lower the goal until the hours fit.',
      },
      {
        id: '5b',
        text: 'Is the profit per sale real?',
        options: opts(
          'A guess.',
          'Estimated from similar sellers.',
          'From costs I have actually priced out (materials, fees, delivery, my time).',
        ),
        tip: 'Price out the real costs. Materials, fees, delivery, and your time. Replace the guess with a quote.',
      },
      {
        id: '5c',
        text: 'Does one source carry the plan?',
        hint: 'One customer, one platform, or one supplier.',
        options: opts('One source is more than half.', 'One source is about half.', 'No source is more than a third.'),
        tip: 'Spread the plan across more than one customer, platform, or supplier. One paycheck is a single point of failure. Do not build a second one.',
      },
    ],
    miss: null,
    proof: {
      do: 'Replace one guess with a real number. Get one real price (a quote or a competitor’s published price) and one real cost. Redo the napkin.',
      pass: 'The hours needed fit within the hours you have, using real numbers.',
    },
  },
];

export const VERDICTS = {
  go: {
    label: 'Go. Start Saturday.',
    when: 'Your lowest test is 4 or more',
    text: 'It passed. Pick a start date and keep the first version small.',
  },
  fix: {
    label: 'Fix one thing first.',
    when: 'Your lowest test is 2 or 3',
    text: 'One weak spot. Change it, then rescore that test.',
  },
  prove: {
    label: 'Prove it before you spend.',
    when: 'Your lowest test is 0 or 1',
    text: 'Run the one-page test on that test before you put in money or weekends.',
  },
  next: {
    label: 'Not this one. Next idea.',
    when: 'Two or more tests at 0 or 1',
    text: 'Better to know on day one than in month six.',
  },
};

// The bigger things that make a side hustle heavy. Tick what the smallest
// version really needs. Fewer is better. This is advice, not part of the score.
export const NEEDS = [
  { id: 'people', label: 'Hiring or managing other people' },
  { id: 'license', label: 'A license, permit, or insurance' },
  { id: 'equipment', label: 'Equipment or tools you would have to buy' },
  { id: 'inventory', label: 'Inventory or supplies you would have to stock' },
  { id: 'space', label: 'A space to rent or store things' },
  { id: 'build', label: 'A website, app, or store you would have to build' },
  { id: 'setup', label: 'A business entity, separate bank account, or tax setup' },
  { id: 'fixed', label: 'Fixed appointments or deadlines you cannot move' },
];

export function needsLevel(count) {
  if (count >= 5) {
    return { level: 'heavy', text: 'That is a lot for a side hustle. Try shrinking it again before you score it.' };
  }
  if (count >= 3) return { level: 'watch', text: 'Getting heavy. Can you drop one?' };
  return { level: 'light', text: 'That is a light start.' };
}

// ---- scoring ---------------------------------------------------------------

const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

// 3a: hours the smallest version needs each week, against hours you can protect.
export function scoreHours({ have, need, unsure } = {}) {
  if (unsure || !positive(have) || !positive(need)) return 0;
  const ratio = need / have;
  if (ratio > 1) return 0;
  if (ratio > 2 / 3) return 1;
  return 2;
}

// 5a: the napkin. Returns null until every number is a positive number.
export function napkin({ aim, profit, hoursPerSale, weeklyHours } = {}) {
  if (![aim, profit, hoursPerSale, weeklyHours].every(positive)) return null;
  const sales = aim / profit;
  const needed = sales * hoursPerSale;
  const have = weeklyHours * 4;
  return { sales, needed, have, ratio: needed / have };
}

export function scoreNapkin(input = {}) {
  if (input.unsure) return 0;
  const n = napkin(input);
  if (!n) return 0;
  if (n.needed > n.have) return 0;
  if (n.needed > 0.75 * n.have) return 1;
  return 2;
}

export function questionScore(q, state) {
  if (q.type === 'hours') return scoreHours(state.hours);
  if (q.type === 'napkin') {
    return scoreNapkin({ ...state.napkin, weeklyHours: state.hours?.have });
  }
  const value = state.answers?.[q.id];
  return Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0;
}

export function verdictKey(testScores) {
  const low = testScores.filter((s) => s <= 1).length;
  if (low >= 2) return 'next';
  const lowest = Math.min(...testScores);
  if (lowest >= 4) return 'go';
  if (lowest >= 2) return 'fix';
  return 'prove';
}

export function computeResult(state) {
  const questionScores = {};
  const testScores = TESTS.map((test) =>
    test.questions.reduce((sum, q) => {
      const score = questionScore(q, state);
      questionScores[q.id] = score;
      return sum + score;
    }, 0),
  );

  const lowestScore = Math.min(...testScores);
  const lowestIndex = testScores.indexOf(lowestScore); // ties go to the lower test number
  const stopsYes = STOPS.filter((s) => state.stops?.[s.id] === true).map((s) => s.id);

  // The quickest wins: every question that did not score a 2, weakest first,
  // staying inside tests in their natural order when scores tie.
  const tips = [];
  TESTS.forEach((test, ti) => {
    test.questions.forEach((q) => {
      if (questionScores[q.id] < 2) {
        tips.push({ id: q.id, test: ti, score: questionScores[q.id], tip: q.tip });
      }
    });
  });
  tips.sort((a, b) => a.score - b.score || a.test - b.test);

  return {
    testScores,
    questionScores,
    total: testScores.reduce((a, b) => a + b, 0),
    lowestScore,
    lowestIndex,
    verdict: verdictKey(testScores),
    stopsYes,
    tips,
    napkin: napkin({ ...state.napkin, weeklyHours: state.hours?.have }),
  };
}
