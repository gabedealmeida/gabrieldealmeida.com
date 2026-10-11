// The home page form. A new visitor must give a first name and email before
// they can reach the quiz. Someone who already signed up on this device gets a
// way back in instead of being asked again.

import { initSignupForm } from './signup.js';
import { loadProfile, grantAccess } from './profile.js';
import { startLinkFor } from './entry.js';

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

if (form && arrival) {
  form.replaceWith(readyCard(loadProfile(), arrival));
  // Every "start" button on the page goes straight into the scorecard.
  document.querySelectorAll('a[href="#get"]').forEach((a) => a.setAttribute('href', arrival));
} else if (form) {
  const saved = loadProfile();
  if (saved.access) {
    form.replaceWith(welcomeBack(saved));
  } else {
    initSignupForm(form, {
      onSuccess: ({ firstName }) => {
        const kept = grantAccess({ name: firstName, source: 'signup' });
        window.location.assign(kept ? '/test' : '/test?from=signup');
      },
    });
  }
}
