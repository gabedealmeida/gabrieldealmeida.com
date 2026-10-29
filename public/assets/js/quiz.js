import { STOPS, TESTS, VERDICTS, NEEDS, needsLevel, computeResult, napkin as napkinMath, scoreHours, scoreNapkin } from './scorecard.js';
import { resolveEntry } from './entry.js';
import { loadProfile, saveProfile, clearProfile } from './profile.js';
import { track } from './track.js';
import { validateName } from './validate.js';

const KEY = 'gdm:score-idea:v1';
const WORKSHEET = '/downloads/score-my-side-hustle-idea.pdf';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const screen = document.getElementById('screen');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');

// ---- small helpers ---------------------------------------------------------

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
  return node;
}

const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode or blocked storage: the test still works, it just will not be remembered.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clear if storage is blocked.
    }
  },
};

function parseNumber(text) {
  const cleaned = String(text ?? '').replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const fmtMoney = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// Puts the last word of a line in amber, like the hooks do.
function withAccent(text) {
  const i = text.lastIndexOf(' ');
  if (i < 0) return [el('span', { class: 'accent' }, text)];
  return [text.slice(0, i + 1), el('span', { class: 'accent' }, text.slice(i + 1))];
}

// ---- state -----------------------------------------------------------------

function freshState() {
  return {
    v: 1,
    step: 0,
    idea: '',
    smallest: '',
    needs: [],
    stops: {},
    answers: {},
    hours: { have: null, need: null, unsure: false },
    napkin: { aim: 2000, profit: null, hoursPerSale: null, unsure: false },
  };
}

function loadState() {
  const saved = store.get(KEY);
  if (!saved || saved.v !== 1) return freshState();
  const base = freshState();
  return {
    ...base,
    ...saved,
    needs: Array.isArray(saved.needs) ? saved.needs.filter((id) => NEEDS.some((n) => n.id === id)) : [],
    stops: { ...saved.stops },
    answers: { ...saved.answers },
    hours: { ...base.hours, ...saved.hours },
    napkin: { ...base.napkin, ...saved.napkin },
  };
}

const steps = [{ kind: 'intro' }, { kind: 'shrink' }, { kind: 'stops' }];
TESTS.forEach((test, ti) => {
  test.questions.forEach((q) => steps.push({ kind: q.type || 'choice', ti, test, q }));
});
steps.push({ kind: 'results' });
const RESULTS = steps.length - 1;

// Read the address once, before anything cleans it, so ?reset=1&from=ig works together.
// Only signed-up visitors (or people sent by ManyChat, who gave their email in
// the Instagram DM) may use the quiz. Everyone else goes back to the home page.
const visitSearch = window.location.search;
const entry = resolveEntry(visitSearch, loadProfile());
if (entry.reset) store.remove(KEY);
if (entry.reset || entry.source) {
  saveProfile(entry.profile);
  history.replaceState(null, '', window.location.pathname);
}
const profile = entry.profile;

let state = loadState();
state.step = Number.isInteger(state.step) ? Math.min(Math.max(state.step, 0), RESULTS) : 0;
// Always open on the intro. If there is saved progress, it offers Continue or Start over.
let index = 0;

const save = () => store.set(KEY, state);

// ---- navigation ------------------------------------------------------------

function go(next, { push = true } = {}) {
  index = Math.min(Math.max(next, 0), RESULTS);
  state.step = index;
  save();
  if (push) history.pushState({ step: index }, '');
  render();
}

function reset() {
  state = freshState();
  save();
}

window.addEventListener('popstate', (event) => {
  const step = event.state?.step;
  if (Number.isInteger(step)) go(step, { push: false });
});

// What gets counted: starting, reaching each of the five tests, and finishing.
// Nothing about the person or their answers is sent, only the verdict's name.
let lastTest = -1;
let counted = false;
let finishedCounted = false;
function noteProgress(step) {
  if (!counted) {
    counted = true;
    track('Quiz Opened', { source: profile.source || 'direct' });
  }
  if (step.test && step.ti !== lastTest) {
    lastTest = step.ti;
    if (step.ti === 0) track('Quiz Started', { source: profile.source || 'direct' });
    track('Quiz Test', { n: String(step.ti + 1) });
  }
  if (step.kind === 'results' && !finishedCounted) {
    finishedCounted = true;
    const r = computeResult(state);
    track('Quiz Finished', { verdict: r.verdict, weakest: TESTS[r.lowestIndex].name });
  }
}

function render() {
  const step = steps[index];
  screen.replaceChildren(views[step.kind](step));

  const inQuiz = index > 0 && index < RESULTS;
  progress.hidden = !inQuiz;
  const pct = Math.round((index / RESULTS) * 100);
  progress.setAttribute('aria-valuenow', String(pct));
  progressFill.style.width = `${pct}%`;

  noteProgress(step);

  // Each of the five tests has its own colour, which tints the page glow, the progress bar and the answers.
  if (step.test) document.body.dataset.t = String(step.ti);
  else delete document.body.dataset.t;

  window.scrollTo(0, 0);
  screen.querySelector('[data-focus]')?.focus({ preventScroll: true });
}

// ---- shared pieces ---------------------------------------------------------

const backButton = () =>
  index > 0 ? el('button', { class: 'back', type: 'button', onclick: () => go(index - 1) }, '← Back') : null;

const metaFor = (step) => (step.test ? `Test ${step.ti + 1} of 5 · ${step.test.name}` : 'Getting started');

const topBar = (step) =>
  el(
    'div',
    { class: 'q-top' },
    backButton(),
    el('span', { class: 'q-meta' }, step.test ? el('b', { class: 'q-badge', 'aria-hidden': 'true' }, String(step.ti + 1)) : null, metaFor(step)),
  );

function continueButton(label = 'Continue', disabled = false) {
  return el('button', { class: 'btn', type: 'submit', disabled }, label);
}

function field(id, label, control, hint, errorId) {
  return el(
    'div',
    { class: 'field' },
    el('label', { for: id }, label),
    control,
    hint ? el('p', { class: 'fine field-hint' }, hint) : null,
    el('p', { class: 'error', id: errorId, hidden: true }),
  );
}

function showError(id, message) {
  const node = document.getElementById(id);
  const input = node.previousElementSibling?.matches('input, textarea') ? node.previousElementSibling : null;
  node.textContent = message;
  node.hidden = false;
  (input || node.parentElement.querySelector('input'))?.setAttribute('aria-invalid', 'true');
}

function clearErrors(form) {
  form.querySelectorAll('.error').forEach((n) => {
    n.hidden = true;
    n.textContent = '';
  });
  form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
}

function numberInput(id, value, placeholder) {
  const input = el('input', { type: 'text', inputmode: 'decimal', id, name: id, autocomplete: 'off', placeholder });
  if (value != null) input.value = String(value);
  return input;
}

function screenForm(step, ...kids) {
  return el(
    'form',
    {
      class: 'screen',
      novalidate: true,
      onsubmit: (event) => {
        event.preventDefault();
        step.onSubmit?.(event.currentTarget);
      },
    },
    ...kids,
  );
}

// ---- first name (asked once, on the first screen, and optional) --------------

// Saves the first name on this device so the result can say hi. If we also have the
// email they signed up with, the name goes to the same subscriber, so emails can say
// hi too. A name sent this way never starts the welcome email again.
// Returns false (and shows why) only when something was typed that is not a name.
function rememberName(input, errorNode) {
  const typed = input.value.trim();
  errorNode.hidden = true;
  input.removeAttribute('aria-invalid');
  if (!typed) return true;
  const checked = validateName(typed);
  if (!checked.ok) {
    errorNode.textContent = checked.message;
    errorNode.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return false;
  }
  profile.name = checked.value;
  saveProfile({ ...loadProfile(), name: checked.value });
  if (profile.email) {
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ firstName: checked.value, email: profile.email, skipWelcome: true, hp: '' }),
      keepalive: true,
    }).catch(() => {});
  }
  return true;
}

// ---- views -----------------------------------------------------------------

const views = {
  intro() {
    const started = state.step > 0 && state.step < RESULTS;
    const finished = state.step >= RESULTS;
    const lede = finished
      ? 'Welcome back. Your last result is saved on this device.'
      : started
        ? 'Welcome back. Your answers are saved on this device.'
        : 'Before you spend a weekend or a dollar, find out if the idea fits around your job and your family. Five quick checks, fifteen short questions, and a verdict you can act on.';

    // Asked once. Skipping it is fine; the result just will not say your name.
    const nameInput = el('input', { type: 'text', id: 'first-name', name: 'first-name', autocomplete: 'given-name', autocapitalize: 'words', spellcheck: 'false', maxlength: '60', placeholder: 'So I can say hi on your result', 'aria-describedby': 'first-name-error' });
    const nameError = el('p', { class: 'error', id: 'first-name-error', hidden: true });
    const nameField = !profile.name && !finished
      ? el('div', { class: 'field name-field' }, el('label', { for: 'first-name' }, 'First name (optional)'), nameInput, nameError)
      : null;

    return el(
      'section',
      { class: 'screen intro' },
      el('p', { class: 'eyebrow' }, 'A free scorecard for working dads'),
      el('h1', { class: 'q-title q-big', tabindex: '-1', 'data-focus': '' }, 'Score My Side Hustle ', el('span', { class: 'accent' }, 'Idea.')),
      el('p', { class: 'lede' }, lede),
      el('ul', { class: 'test-chips', 'aria-label': 'The five tests' }, TESTS.map((test, i) => el('li', { class: `tc${i}` }, test.name))),
      el(
        'div',
        { class: 'from-gabe' },
        el('img', { src: '/assets/img/gabe-door.jpg', width: '576', height: '768', alt: '', decoding: 'async' }),
        el('p', {}, 'This is the scorecard I use before I take on a side hustle. Answer honestly. It is built to tell you the truth, not what you want to hear.', el('span', {}, 'Gabriel')),
      ),
      el(
        'figure',
        { class: 'intro-photo' },
        el('div', { class: 'ip-frame' }, el('img', { src: '/assets/img/gabe-door.jpg', width: '576', height: '768', alt: 'Gabriel De Almeida smiling in a denim shirt, leaning against a green door', decoding: 'async' })),
        el('figcaption', {}, 'This is the scorecard I use before I take on a side hustle. Answer honestly. It is built to tell you the truth, not what you want to hear.', el('span', {}, 'Gabriel')),
      ),
      el('ul', { class: 'facts', 'aria-label': 'What to expect' }, el('li', {}, 'About 5 minutes'), el('li', {}, 'Free'), el('li', {}, 'Your answers stay on your device')),
      el('p', { class: 'fine' }, 'Answer for the smallest weekend version of your idea. If you cannot show it, pick the lower answer.'),
      nameField,
      el(
        'div',
        { class: 'actions' },
        el(
          'button',
          {
            class: 'btn',
            type: 'button',
            onclick: () => {
              if (nameField && !rememberName(nameInput, nameError)) return;
              go(finished ? RESULTS : started ? state.step : 1);
            },
          },
          finished ? 'See my result' : started ? 'Continue' : 'Start',
        ),
        started || finished
          ? el(
              'button',
              {
                class: 'btn btn-secondary',
                type: 'button',
                onclick: () => {
                  reset();
                  go(1);
                },
              },
              'Start over',
            )
          : null,
      ),
    );
  },

  shrink(step) {
    const idea = el('input', { type: 'text', id: 'idea', name: 'idea', maxlength: '80', autocomplete: 'off', placeholder: 'Dog walking for neighbors' });
    idea.value = state.idea;
    const smallest = el('textarea', { id: 'smallest', name: 'smallest', rows: '3', maxlength: '240', placeholder: 'I will walk dogs for 5 neighbors on Saturday mornings.' });
    smallest.value = state.smallest;

    // The count only speaks up once they have ticked something.
    let touched = state.needs.length > 0;
    const readout = el('p', { class: 'readout', 'aria-live': 'polite' });
    const refreshNeeds = () => {
      if (!touched) {
        readout.textContent = '';
        readout.className = 'readout';
        return;
      }
      const count = state.needs.length;
      const { level, text } = needsLevel(count);
      readout.textContent = `${count} ticked. ${text}`;
      readout.className = `readout needs-${level}`;
    };

    const needs = el(
      'fieldset',
      { class: 'field' },
      el('legend', {}, 'What does the smallest version need?'),
      el('p', { class: 'fine field-hint' }, 'Tick everything that applies. Fewer is better.'),
      el(
        'div',
        { class: 'needs' },
        NEEDS.map((item) => {
          const input = el('input', { type: 'checkbox', name: 'need', value: item.id });
          input.checked = state.needs.includes(item.id);
          input.addEventListener('change', () => {
            touched = true;
            state.needs = NEEDS.filter((n) => (n.id === item.id ? input.checked : state.needs.includes(n.id))).map((n) => n.id);
            save();
            refreshNeeds();
          });
          return el('label', { class: 'need' }, input, el('span', {}, item.label));
        }),
      ),
      readout,
    );
    refreshNeeds();

    step.onSubmit = () => {
      state.idea = idea.value.trim();
      state.smallest = smallest.value.trim();
      go(index + 1);
    };

    return screenForm(
      step,
      topBar(step),
      el('h2', { class: 'q-title', tabindex: '-1', 'data-focus': '' }, 'Start small.'),
      el('p', { class: 'lede' }, 'Write the smallest version of your idea you could run on weekends. Everything you answer next is about this version. All of this is optional.'),
      field('idea', 'What is the idea?', idea, null, 'idea-error'),
      field('smallest', 'The smallest weekend version, in one sentence', smallest, null, 'smallest-error'),
      needs,
      el('div', { class: 'actions' }, continueButton()),
    );
  },

  stops(step) {
    const next = el('button', { class: 'btn', type: 'submit' }, 'Continue');
    const refresh = () => {
      next.disabled = !STOPS.every((s) => typeof state.stops[s.id] === 'boolean');
    };

    const rows = STOPS.map((stop, i) => {
      const name = `stop-${stop.id}`;
      const choice = (label, value) => {
        const input = el('input', { type: 'radio', name, value: String(value) });
        input.checked = state.stops[stop.id] === value;
        input.addEventListener('click', () => {
          state.stops[stop.id] = value;
          save();
          refresh();
        });
        return el('label', { class: 'pill' }, input, el('span', {}, label));
      };
      return el(
        'fieldset',
        { class: 'stop card' },
        el('legend', { class: 'stop-title' }, `${i + 1}. ${stop.title}`),
        el('p', { class: 'stop-text' }, stop.text),
        el('div', { class: 'yn-row' }, choice('Yes', true), choice('No', false)),
      );
    });

    step.onSubmit = () => go(index + 1);
    refresh();

    return screenForm(
      step,
      topBar(step),
      el('h2', { class: 'q-title', tabindex: '-1', 'data-focus': '' }, 'Five quick checks.'),
      el('p', { class: 'lede' }, 'Any yes means pause and think it through. A hard stop is a "not yet," not a "no forever."'),
      el('div', { class: 'stack' }, rows),
      el('div', { class: 'actions' }, next),
    );
  },

  choice(step) {
    const { q } = step;
    const next = el('button', { class: 'btn', type: 'submit' }, 'Continue');
    const chosen = () => Number.isInteger(state.answers[q.id]);
    next.disabled = !chosen();

    const cards = q.options.map((option) => {
      const input = el('input', { type: 'radio', name: 'choice', value: String(option.score) });
      input.checked = state.answers[q.id] === option.score;
      const card = el('label', { class: `choice${input.checked ? ' is-selected' : ''}` }, input, el('span', { class: 'choice-text' }, option.text));
      input.addEventListener('click', (event) => {
        state.answers[q.id] = option.score;
        save();
        card.parentElement.querySelectorAll('.choice').forEach((c) => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        next.disabled = false;
        // A tap or a click moves on by itself. Keyboard users press Continue.
        if (event.detail > 0) window.setTimeout(() => go(index + 1), reduceMotion ? 0 : 240);
      });
      return card;
    });

    step.onSubmit = () => chosen() && go(index + 1);

    return screenForm(
      step,
      topBar(step),
      el('h2', { class: 'q-title', tabindex: '-1', 'data-focus': '' }, q.text),
      q.hint ? el('p', { class: 'q-hint' }, q.hint) : null,
      el('div', { class: 'choices', role: 'radiogroup', 'aria-label': q.text }, cards),
      el('div', { class: 'actions' }, next),
    );
  },

  hours(step) {
    const have = numberInput('have', state.hours.have, '10');
    const need = numberInput('need', state.hours.need, '5');
    const unsure = el('input', { type: 'checkbox', id: 'unsure', name: 'unsure' });
    unsure.checked = !!state.hours.unsure;
    const readout = el('p', { class: 'readout', 'aria-live': 'polite' });

    const refresh = () => {
      need.disabled = unsure.checked;
      const h = parseNumber(have.value);
      const n = parseNumber(need.value);
      if (unsure.checked) readout.textContent = 'No problem. Finding that number is your first job.';
      else if (h > 0 && n > 0) {
        const score = scoreHours({ have: h, need: n });
        readout.textContent = `It needs about ${Math.round((n / h) * 100)}% of the hours you can protect. ${
          score === 2 ? 'That leaves room to spare.' : score === 1 ? 'That is tight.' : 'That does not fit yet.'
        }`;
      } else readout.textContent = '';
    };
    [have, need].forEach((i) => i.addEventListener('input', refresh));
    unsure.addEventListener('change', refresh);
    refresh();

    step.onSubmit = (form) => {
      clearErrors(form);
      const h = parseNumber(have.value);
      const n = parseNumber(need.value);
      let ok = true;
      if (!(h > 0 && h <= 100)) {
        showError('have-error', 'Enter the hours you can really protect each week, between 1 and 100.');
        ok = false;
      }
      if (!unsure.checked && !(n > 0 && n <= 100)) {
        showError('need-error', 'Enter the hours it needs each week, or tick "not sure yet."');
        ok = false;
      }
      if (!ok) return form.querySelector('[aria-invalid]')?.focus();
      state.hours = { have: h, need: unsure.checked ? null : n, unsure: unsure.checked };
      go(index + 1);
    };

    return screenForm(
      step,
      topBar(step),
      el('h2', { class: 'q-title', tabindex: '-1', 'data-focus': '' }, 'Do the hours fit?'),
      el('p', { class: 'lede' }, 'Be honest. Hours you only hope to have do not count.'),
      field('have', 'Hours a week I can really protect', have, null, 'have-error'),
      field('need', 'Hours a week the smallest version needs', need, null, 'need-error'),
      el('label', { class: 'check' }, unsure, el('span', {}, 'I am not sure how many hours it needs yet')),
      readout,
      el('div', { class: 'actions' }, continueButton()),
    );
  },

  napkin(step) {
    const aim = numberInput('aim', state.napkin.aim, '2000');
    const profit = numberInput('profit', state.napkin.profit, '50');
    const per = numberInput('per', state.napkin.hoursPerSale, '2');
    const unsure = el('input', { type: 'checkbox', id: 'napkin-unsure', name: 'napkin-unsure' });
    unsure.checked = !!state.napkin.unsure;

    const rows = {
      sales: el('dd', {}),
      needed: el('dd', {}),
      have: el('dd', {}, `${fmt((state.hours.have || 0) * 4)} hours`),
    };
    const verdict = el('p', { class: 'readout', 'aria-live': 'polite' });

    const inputs = () => ({
      aim: parseNumber(aim.value),
      profit: parseNumber(profit.value),
      hoursPerSale: parseNumber(per.value),
      weeklyHours: state.hours.have,
    });

    const refresh = () => {
      [aim, profit, per].forEach((i) => (i.disabled = unsure.checked));
      const n = napkinMath(inputs());
      rows.sales.textContent = n ? `${Math.ceil(n.sales)} sales` : 'Fill in the numbers above';
      rows.needed.textContent = n ? `${fmt(n.needed)} hours` : '';
      if (unsure.checked) verdict.textContent = 'No problem. Finding these numbers is your first job.';
      else if (n) {
        const score = scoreNapkin(inputs());
        verdict.textContent = score === 2 ? 'The hours fit, with room to spare.' : score === 1 ? 'The hours fit, but it is tight.' : 'The hours do not fit yet.';
      } else verdict.textContent = '';
    };
    [aim, profit, per].forEach((i) => i.addEventListener('input', refresh));
    unsure.addEventListener('change', refresh);
    refresh();

    step.onSubmit = (form) => {
      clearErrors(form);
      if (unsure.checked) {
        state.napkin = { aim: parseNumber(aim.value) ?? 2000, profit: null, hoursPerSale: null, unsure: true };
        return go(index + 1);
      }
      const v = inputs();
      let ok = true;
      const bad = (value, max = 10_000_000) => !(value > 0 && value <= max);
      if (bad(v.aim)) (showError('aim-error', 'Enter what you are aiming for each month, like 2000.'), (ok = false));
      if (bad(v.profit)) (showError('profit-error', 'Enter the profit on one sale, like 50.'), (ok = false));
      if (bad(v.hoursPerSale, 1000)) (showError('per-error', 'Enter the hours one sale takes, like 2.'), (ok = false));
      if (!ok) return form.querySelector('[aria-invalid]')?.focus();
      state.napkin = { aim: v.aim, profit: v.profit, hoursPerSale: v.hoursPerSale, unsure: false };
      go(index + 1);
    };

    return screenForm(
      step,
      topBar(step),
      el('h2', { class: 'q-title', tabindex: '-1', 'data-focus': '' }, 'Do the numbers work?'),
      el('p', { class: 'lede' }, 'Your napkin. This is your own arithmetic, not a forecast.'),
      field('aim', 'Aim for, per month ($)', aim, 'Use your own number.', 'aim-error'),
      field('profit', 'Profit per sale ($)', profit, 'Price, minus what it costs you to deliver, including fees.', 'profit-error'),
      field('per', 'Hours per sale', per, 'Finding the customer, doing the work, the admin.', 'per-error'),
      el('label', { class: 'check' }, unsure, el('span', {}, 'I do not know these numbers yet')),
      el('dl', { class: 'napkin-out' }, el('dt', {}, 'Sales needed per month'), rows.sales, el('dt', {}, 'Hours needed per month'), rows.needed, el('dt', {}, 'Hours you can protect per month'), rows.have),
      verdict,
      el('div', { class: 'actions' }, continueButton()),
    );
  },

  results() {
    const r = computeResult(state);
    const verdict = VERDICTS[r.verdict];
    const weak = TESTS[r.lowestIndex];

    const hero = el(
      'header',
      { class: 'result-hero' },
      el('p', { class: 'q-meta' }, state.idea ? `Your result for ${state.idea}` : 'Your result'),
      el('h1', { class: 'q-title q-big', tabindex: '-1', 'data-focus': '' }, withAccent(verdict.label)),
      el('p', { class: 'lede' }, verdict.text),
      state.smallest ? el('p', { class: 'fine' }, `Smallest version: ${state.smallest}`) : null,
    );

    const stopsBanner = r.stopsYes.length
      ? el(
          'div',
          { class: 'card callout' },
          el('h2', {}, `Pause first. ${r.stopsYes.length === 1 ? 'You answered yes to 1 hard stop.' : `You answered yes to ${r.stopsYes.length} hard stops.`}`),
          el('ul', { class: 'bullets' }, r.stopsYes.map((id) => el('li', {}, STOPS.find((s) => s.id === id).title))),
          el('p', { class: 'fine' }, 'The verdict above does not count until you have dealt with these, or decided to go ahead anyway and written down why.'),
        )
      : null;

    const bars = el(
      'section',
      { class: 'panel' },
      el('h2', {}, 'Your five tests'),
      el('p', { class: 'fine' }, 'The weakest test decides your verdict.'),
      el(
        'ol',
        { class: 'bars' },
        TESTS.map((test, i) => {
          const weakest = i === r.lowestIndex;
          return el(
            'li',
            { class: `bar-row${weakest ? ' is-weakest' : ''}` },
            el('span', { class: 'bar-name' }, test.name, weakest ? el('em', {}, 'Weakest link') : null),
            el('span', { class: 'segs', 'aria-hidden': 'true' }, Array.from({ length: 6 }, (_, s) => el('i', { class: s < r.testScores[i] ? 'on' : '' }))),
            el('span', { class: 'bar-score' }, `${r.testScores[i]} of 6`),
          );
        }),
      ),
      el('p', { class: 'fine' }, `Total: ${r.total} of 30. The total only breaks a tie between ideas.`),
    );

    let napkinText;
    if (r.napkin) {
      napkinText = `Your napkin: ${Math.ceil(r.napkin.sales)} sales a month at ${fmt(state.napkin.hoursPerSale)} hours each is ${fmt(r.napkin.needed)} hours. You said you can protect about ${fmt(r.napkin.have)}.`;
    } else {
      napkinText = 'You are not sure about the numbers yet. That is fine. Finding them is your first job.';
    }
    const napkinPanel = el('p', { class: 'card callout napkin-line' }, napkinText);

    const actions = el(
      'div',
      { class: 'actions no-print' },
      el('button', { class: 'btn', type: 'button', onclick: () => { track('Result Action', { action: 'save-pdf' }); window.print(); } }, 'Save as PDF'),
      el('a', { class: 'btn btn-secondary', href: WORKSHEET, download: '', onclick: () => track('Result Action', { action: 'worksheet' }) }, 'Download the printable worksheet'),
      el(
        'button',
        {
          class: 'btn btn-secondary',
          type: 'button',
          onclick: () => {
            track('Result Action', { action: 'score-another' });
            reset();
            go(1);
          },
        },
        'Score another idea',
      ),
    );

    return el(
      'section',
      { class: 'screen results' },
      el('p', { class: 'print-only print-brand' }, 'Score My Side Hustle Idea | Gabriel De Almeida'),
      hero,
      stopsBanner,
      bars,
      napkinPanel,
      fullBreakdown(r, weak),
      actions,
      interestPoll(),
      el('p', { class: 'fine' }, 'A verdict is a recommendation, not a ruling. If your gut and the scorecard disagree, do not ignore either one. Find out why. Then decide.'),
      el('p', { class: 'close-line' }, 'Keep your job. Start a side ', el('span', { class: 'accent' }, 'hustle.')),
      el('p', { class: 'story-link no-print' }, 'Want to know who built this? ', el('a', { href: '/#story' }, 'Read my story.')),
    );
  },
};

// ---- a small demand test: what would help most next? ------------------------

const INTEREST_KEY = 'gdm:interest:v1';
const INTEREST = [
  { id: 'course', label: 'A step-by-step course' },
  { id: 'community', label: 'A community of working dads' },
  { id: 'review', label: 'A review of my idea' },
  { id: 'none', label: 'Nothing. The scorecard is enough.' },
];

function interestPoll() {
  const answered = store.get(INTEREST_KEY);
  const thanks = el('p', { class: 'poll-thanks', role: 'status', hidden: !answered }, 'Thank you. That helps me decide what to build, if anything.');
  const options = el(
    'div',
    { class: 'poll-options', hidden: !!answered },
    INTEREST.map((item) =>
      el(
        'button',
        {
          class: 'poll-btn',
          type: 'button',
          onclick: () => {
            track('Interest', { choice: item.id });
            store.set(INTEREST_KEY, item.id);
            options.hidden = true;
            thanks.hidden = false;
          },
        },
        item.label,
      ),
    ),
  );
  return el(
    'section',
    { class: 'panel poll no-print' },
    el('h2', {}, 'What would help you most next?'),
    el('p', { class: 'fine' }, "I'm not selling anything right now. If I built something to help after the scorecard, which would you want most?"),
    options,
    thanks,
  );
}

// ---- results: the full breakdown ------------------------------------------

function fullBreakdown(r, weak) {
  const stopsPanel = r.stopsYes.length
    ? el(
        'section',
        { class: 'panel' },
        el('h2', {}, r.stopsYes.length === 1 ? 'About your hard stop' : 'About your hard stops'),
        el(
          'ul',
          { class: 'tips' },
          r.stopsYes.map((id) => {
            const stop = STOPS.find((s) => s.id === id);
            return el('li', {}, el('strong', {}, stop.title), el('p', {}, stop.advice));
          }),
        ),
        el('p', { class: 'note' }, 'If you decide to go ahead anyway, that is allowed. Write down why, and what would prove you wrong. Strong evidence can justify a bigger bet. Thin evidence cannot.'),
      )
    : null;

  return el(
    'div',
    { class: 'full', id: 'full-breakdown' },
    el('h2', { class: 'full-title', tabindex: '-1', 'data-focus': '' }, profile.name ? `Here you go, ${profile.name}.` : 'Here you go.'),

    el(
      'section',
      { class: 'panel' },
      el('h2', {}, 'Your one-page test'),
      el(
        'p',
        { class: 'fine' },
        r.verdict === 'go'
          ? `Your lowest test is ${weak.name}, at ${r.lowestScore} of 6. You passed, so this one is optional. If you want proof before you start, run it this week. Keep it under $25 and one week.`
          : `Your weakest test is ${weak.name}, at ${r.lowestScore} of 6. Run this one this week. Keep it under $25 and one week.`,
      ),
      el('dl', { class: 'proof-out' }, el('dt', {}, 'This week, do this'), el('dd', {}, weak.proof.do), el('dt', {}, 'Pass if'), el('dd', {}, weak.proof.pass)),
      el('p', { class: 'fine' }, 'After the week, rescore that test. If it is now 4 or more, check your next-lowest test.'),
      weak.miss ? el('p', { class: 'note' }, el('strong', {}, 'From my misses. '), weak.miss) : null,
    ),

    el(
      'section',
      { class: 'panel' },
      el('h2', {}, 'Your quickest fixes'),
      r.tips.length
        ? el(
            'ol',
            { class: 'tips' },
            r.tips.map((t) =>
              el('li', {}, el('span', { class: 'tip-meta' }, `Test ${t.test + 1} · ${TESTS[t.test].name}`), el('p', {}, t.tip)),
            ),
          )
        : el('p', {}, 'Nothing to fix. Every answer scored a 2.'),
    ),

    stopsPanel,
  );
}

// ---- go ---------------------------------------------------------------------

if (entry.allowed) {
  history.replaceState({ step: index }, '');
  render();
} else {
  window.location.replace('/#get');
}
