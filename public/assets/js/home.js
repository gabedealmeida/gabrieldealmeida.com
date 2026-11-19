// The home page: the button that follows people down the page on a phone, and plain
// counts of what people tap. This site collects nothing about visitors: no forms, no
// emails. People follow and message on Instagram, and that is all.

import { track } from './track.js';

// ---- where a visitor came from (links in bios carry ?from=) ------------------
const SOURCES = { ig: 'instagram', instagram: 'instagram', tiktok: 'tiktok', youtube: 'youtube' };
const from = new URLSearchParams(window.location.search).get('from')?.trim().toLowerCase();
if (from && SOURCES[from]) track('Arrival', { source: SOURCES[from] });

// ---- a button that follows people down the page on a phone -------------------
// It shows once the top of the page has scrolled away, and steps aside whenever the
// hero, the contact section or the footer is already on screen.
const sticky = document.getElementById('sticky-cta');
if (sticky) {
  const watch = ['.hero', '#work', '.closer', '.footer'].map((selector) => document.querySelector(selector)).filter(Boolean);
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
