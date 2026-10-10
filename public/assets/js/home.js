// The home page form. A new visitor must give a first name and email before
// they can reach the quiz. Someone who already signed up on this device gets a
// way back in instead of being asked again.

import { initSignupForm } from './signup.js';
import { loadProfile, grantAccess } from './profile.js';

const form = document.getElementById('signup-form');

function welcomeBack(saved) {
  const card = document.createElement('div');
  card.className = 'card form';

  const title = document.createElement('h2');
  title.className = 'form-title';
  title.textContent = saved.name ? `Welcome back, ${saved.name}.` : 'Welcome back.';

  const sub = document.createElement('p');
  sub.className = 'form-sub';
  sub.textContent = 'Pick up where you left off, or score a new idea.';

  const link = document.createElement('a');
  link.className = 'btn';
  link.href = '/test';
  link.textContent = 'Continue';

  card.append(title, sub, link);
  return card;
}

if (form) {
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
