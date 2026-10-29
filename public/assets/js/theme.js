// The look is set by the data-* attributes on <html> (see theme.css). This file does two small jobs.
//
// 1. Headlines past about nine words are hard to read in a display face, so it tags them
//    (.long-head) and the stylesheet sets those in the body font.
// 2. The Looks panel, for trying fonts and palettes, is off for visitors. Add ?looks=1 to any
//    address to turn it on in this browser, and ?looks=0 to turn it off again.

(function () {
  var FLAG = 'gdm:looks-on';

  function mark() {
    document.querySelectorAll('h1, h2, .q-title, .story-body .lead').forEach(function (h) {
      var words = (h.textContent || '').trim().split(/\s+/).filter(Boolean).length;
      h.classList.toggle('long-head', words >= 9);
    });
  }

  function start() {
    mark();
    var screen = document.getElementById('screen');
    if (screen && window.MutationObserver) new MutationObserver(mark).observe(screen, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  var wanted = null;
  try {
    var param = new URLSearchParams(location.search).get('looks');
    if (param === '1') localStorage.setItem(FLAG, '1');
    if (param === '0') localStorage.removeItem(FLAG);
    wanted = localStorage.getItem(FLAG) === '1';
  } catch (e) {
    wanted = false;
  }
  if (wanted) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/assets/css/looks.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = '/assets/js/looks.js';
    document.head.appendChild(js);
  }
})();
