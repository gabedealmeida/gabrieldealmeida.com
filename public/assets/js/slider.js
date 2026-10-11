// The photo slider: the arrows move it by most of a screenful, and an arrow
// switches off when there is nothing further that way. Swiping, the trackpad
// and the keyboard all work on the strip itself without any of this.

const slider = document.querySelector('.slider');

if (slider) {
  const track = slider.querySelector('.slider-track');
  const nav = slider.querySelector('.slider-nav');
  const [prev, next] = nav.querySelectorAll('.slider-btn');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    nav.hidden = max <= 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('.slider-btn');
    if (!button) return;
    track.scrollBy({ left: Number(button.dataset.dir) * track.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  });

  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // Photos load late and change the strip's width, so measure again as each arrives.
  track.querySelectorAll('img').forEach((img) => img.addEventListener('load', update));
  update();
}
