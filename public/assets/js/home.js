// The home page form. A new visitor must give a first name and email before
// they can reach the quiz. Someone who already signed up on this device gets a
// way back in instead of being asked again.

import { initSignupForm } from './signup.js';
import { loadProfile, grantAccess } from './profile.js';
import { startLinkFor, entrySource } from './entry.js';
import { track } from './track.js';

const form = document.getElementById('signup-form');

// How far this browser got in the scorecard. The quiz page saves its own progress
// under this key. Zero means they have not started.
function progressStep() {
  try {
    const saved = JSON.parse(localStorage.getItem('gdm:score-idea:v1'));
    return saved && Number.isInteger(saved.step) ? saved.step : 0;
  } catch {
    return 0;
  }
}

function welcomeBack(saved) {
  const started = progressStep() > 0;
  const card = document.createElement('div');
  card.className = 'card form';

  const title = document.createElement('h2');
  title.className = 'form-title';
  title.textContent = saved.name ? `Welcome back, ${saved.name}.` : 'Welcome back.';

  const sub = document.createElement('p');
  sub.className = 'form-sub';
  sub.textContent = started ? 'Pick up where you left off, or score a new idea.' : 'Your scorecard is ready whenever you are.';

  const link = document.createElement('a');
  link.className = 'btn';
  link.href = '/test';
  link.textContent = started ? 'Continue' : 'Start the scorecard';

  card.append(title, sub, link);
  return card;
}

// Someone from the Instagram DM or the welcome email lands here with ?from=ig or
// ?from=email. They get the whole page, and a one-tap way into the scorecard.
function readyCard(saved, href) {
  const card = document.createElement('div');
  card.className = 'card form';

  const title = document.createElement('h2');
  title.className = 'form-title';
  title.textContent = saved.name ? `${saved.name}, your scorecard is ready.` : 'Your scorecard is ready.';

  const sub = document.createElement('p');
  sub.className = 'form-sub';
  sub.textContent = 'Start whenever you like. Look around first if you want.';

  const link = document.createElement('a');
  link.className = 'btn';
  link.href = href;
  link.textContent = 'Start the scorecard';

  card.append(title, sub, link);
  return card;
}

const arrival = startLinkFor(window.location.search);
if (arrival) track('Arrival', { source: entrySource(window.location.search) });

// The hero and the closing section each ask for an email and nothing else. Someone
// who is already in gets a button straight to the scorecard instead.
const captureForms = [
  { form: document.getElementById('hero-form'), prefix: 'hero-', where: 'hero' },
  { form: document.getElementById('closer-form'), prefix: 'closer-', where: 'closer' },
].filter((c) => c.form);

function startButton(href, label, where) {
  const link = document.createElement('a');
  link.className = 'btn btn-inline';
  link.href = href;
  link.dataset.cta = where;
  if (where === 'hero') link.classList.add('hero-start');
  link.textContent = label;
  return link;
}

// A signup from any form: remember it on this device, then into the scorecard.
function enter(from) {
  return ({ email }) => {
    track('Signup', { from });
    const kept = grantAccess({ name: '', email, source: 'signup' });
    window.location.assign(kept ? '/test' : '/test?from=signup');
  };
}

const stickyLink = document.querySelector('#sticky-cta a');

if ((form || captureForms.length) && arrival) {
  form?.replaceWith(readyCard(loadProfile(), arrival));
  for (const c of captureForms) c.form.replaceWith(startButton(arrival, 'Start your scorecard', c.where));
  // Every "start" button on the page goes straight into the scorecard.
  document.querySelectorAll('a[href="#get"]').forEach((a) => a.setAttribute('href', arrival));
} else if (form || captureForms.length) {
  const saved = loadProfile();
  if (saved.access) {
    const label = progressStep() > 0 ? 'Continue your scorecard' : 'Start your scorecard';
    form?.replaceWith(welcomeBack(saved));
    for (const c of captureForms) c.form.replaceWith(startButton('/test', label, c.where));
    if (stickyLink) { stickyLink.setAttribute('href', '/test'); stickyLink.textContent = label; }
  } else {
    if (form) initSignupForm(form, { onSuccess: enter('scorecard') });
    for (const c of captureForms) initSignupForm(c.form, { prefix: c.prefix, onSuccess: enter(c.where) });
  }
}

// ---- a button that follows people down the page on a phone -------------------
// It shows once the top of the page has scrolled away, and steps aside whenever a
// signup form (or the footer) is already on screen.
const sticky = document.getElementById('sticky-cta');
if (sticky) {
  const watch = [document.querySelector('.hero'), document.getElementById('scorecard'), document.querySelector('.closer'), document.querySelector('.footer')].filter(Boolean);
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };
  let queued = false;
  const update = () => {
    queued = false;
    sticky.hidden = window.scrollY < 200 || watch.some(onScreen);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
}

// ---- counting what people do (no names, no emails) --------------------------

// Which button they tapped.
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-cta]');
  if (target) track('CTA Click', { where: target.dataset.cta });
});

// How far down the page they got, each section counted once.
const seenSections = document.querySelectorAll('[data-seen]');
if ('IntersectionObserver' in window && seenSections.length) {
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        track('Section Seen', { section: entry.target.dataset.seen });
        seen.unobserve(entry.target);
      }
    },
    { threshold: 0.25 },
  );
  seenSections.forEach((section) => seen.observe(section));
}
