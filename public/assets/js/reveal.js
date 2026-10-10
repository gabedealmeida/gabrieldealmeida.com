// Sections ease in as they scroll into view. Everything stays visible if
// scripting fails, the browser lacks IntersectionObserver, or the visitor has
// asked for reduced motion.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = document.querySelectorAll('[data-reveal]');

if (!reduced && 'IntersectionObserver' in window && items.length) {
  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((item) => observer.observe(item));
}
