// The home page: the weekly brief signup forms, the button that follows people down the
// page on a phone, and plain counts of what people tap. No names or emails are ever counted.

import { initSignupForm } from './signup.js';
import { track } from './track.js';

// ---- where a visitor came from (links in bios and emails carry ?from=) -------
const SOURCES = { ig: 'instagram', instagram: 'instagram', email: 'email', tiktok: 'tiktok', youtube: 'youtube' };
const from = new URLSearchParams(window.location.search).get('from')?.trim().toLowerCase();
if (from && SOURCES[from]) track('Arrival', { source: SOURCES[from] });

// ---- the signup forms --------------------------------------------------------
// One in the hero, one in the weekly brief section, one at the bottom. Each asks for
// an email only. When it works, the form is replaced by a short thank you in place.
function showThanks(form) {
  const box = document.createElement('div');
  box.className = form.classList.contains('card') ? 'thanks card form' : 'thanks';
  box.setAttribute('role', 'status');
  box.tabIndex = -1;

  const title = document.createElement('p');
  title.className = 'thanks-title';
  title.textContent = "You're in.";

  const body = document.createElement('p');
  body.textContent = 'Watch your inbox for the next brief. If it does not show up in a few minutes, check spam or promotions.';

  box.append(title, body);
  form.replaceWith(box);
  box.focus();
}

const forms = [
  { id: 'hero-form', prefix: 'hero-', where: 'hero' },
  { id: 'signup-form', prefix: '', where: 'brief' },
  { id: 'closer-form', prefix: 'closer-', where: 'closer' },
];

for (const { id, prefix, where } of forms) {
  const form = document.getElementById(id);
  if (!form) continue;
  initSignupForm(form, {
    prefix,
    onSuccess: () => {
      track('Signup', { from: where });
      showThanks(form);
    },
  });
}

// ---- a button that follows people down the page on a phone -------------------
// It shows once the top of the page has scrolled away, and steps aside whenever a
// signup form, the contact section or the footer is already on screen.
const sticky = document.getElementById('sticky-cta');
if (sticky) {
  const watch = ['.hero', '#brief', '#work', '.closer', '.footer'].map((selector) => document.querySelector(selector)).filter(Boolean);
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
