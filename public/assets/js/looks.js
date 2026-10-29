// The Looks panel: try a headline font, a body font, a palette and a corner style on the page.
// It is off for visitors. Add ?looks=1 to any address to turn it on in this browser, ?looks=0 to turn it off.
// The choice is remembered on this computer, and "Reset" returns the page to the current look.
(function () {
  var KEY = 'gdm:looks:v3';
  var HEADS = [['', 'Current (Inter + serif accent)'], ['rakkas', 'Rakkas'], ['newsreader', 'Newsreader'], ['zilla', 'Zilla Slab'], ['bricolage', 'Bricolage Grotesque'], ['sourcesans', 'Source Sans 3'], ['manrope', 'Manrope'], ['instrument', 'Instrument Serif']];
  var BODIES = [['', 'Current (Inter)'], ['sourcesans', 'Source Sans 3'], ['manrope', 'Manrope'], ['newsreader', 'Newsreader'], ['zilla', 'Zilla Slab'], ['bricolage', 'Bricolage Grotesque']];
  var PALETTES = [['', 'Current'], ['aubergine', 'Aubergine & citron'], ['a', 'A Forest & linen'], ['b', 'B Slate & ember'], ['c', 'C Cobalt & apricot'], ['lamplight', 'Lamplight (walnut & amber)'], ['navybrass', 'Navy & brass'], ['evergreen', 'Evergreen & marigold'], ['tomato', 'Charcoal & tomato'], ['denim', 'Denim & butter'], ['plum', 'Plum & peach'], ['sage', 'Charcoal & sage'], ['twoam', 'Two a.m. (midnight & sky)'], ['burnt', 'Burnt orange & cream'], ['cobaltlemon', 'Cobalt & lemon'], ['emeraldblush', 'Emerald & blush'], ['oxblood', 'Oxblood & gold'], ['violetlime', 'Violet & lime'], ['tealcoral', 'Deep teal & coral'], ['electric', 'Black & electric green'], ['tobacco', 'Tobacco & turquoise'], ['ketchup', 'Ketchup & mustard'], ['poolsun', 'Pool blue & sunflower'], ['fireside', 'Fireside (char & ember)'], ['bankerlamp', 'Library lamp (library green & brass)'], ['mahogany', 'Mahogany & amber'], ['bookbinder', 'Bookbinder (burgundy & gilt)'], ['mossfire', 'Moss & firelight'], ['snowedin', 'Snowed in (pine night & ember)']];
  var BROWNS = [['saddle', 'Saddle leather & brass'], ['smoke', 'Smoke & parchment'], ['whiskey', 'Whiskey & oak'], ['espresso', 'Espresso & brass'], ['walnut', 'Walnut & gold leaf'], ['champagne', 'Saddle & champagne'], ['cocoa', 'Cocoa & old gold'], ['mocha', 'Mocha & marigold'], ['polished', 'Leather & polished gold'], ['burnished', 'Smoke & burnished brass'], ['honey', 'Oak & honey']];
  var SHAPES = [['', 'Rounded'], ['square', 'Square']];
  var PRESETS = [['Designer 01', 'newsreader', 'manrope'], ['Designer 02', 'zilla', 'sourcesans'], ['Designer 03', 'bricolage', 'sourcesans'], ['Rakkas + Source Sans', 'rakkas', 'sourcesans']];
  var HEROES = [['', 'Photo collage'], ['cutout', 'Cut-out portrait (designer)']];
  var LONGS = [['body', 'Body font (recommended)'], ['head', 'Headline font']];
  var SCOPES = [['signature', 'Signature only (recommended)'], ['all', 'All headlines']];
  var EMPTY = { head: 'newsreader', body: 'sourcesans', palette: 'espresso', shape: '', hero: 'cutout', long: 'body', scope: 'signature' };
  var state = Object.assign({}, EMPTY);
  try { var saved = JSON.parse(localStorage.getItem(KEY)); if (saved) state = Object.assign(state, saved); } catch (e) {}

  // ?focus=.closer records where that part of the page starts (data-focus-y) and shows everything,
  // so a tall screenshot can be cropped to it
  try {
    var focusSel = new URLSearchParams(location.search).get('focus');
    if (focusSel) window.addEventListener('load', function () { var el = document.querySelector(focusSel); document.documentElement.classList.remove('reveal-ready'); if (el) document.documentElement.setAttribute('data-focus-y', String(Math.round(el.getBoundingClientRect().top + window.scrollY))); });
  } catch (e) {}

  // ?palette=lamplight&head=newsreader&body=sourcesans&hero=cutout lets a link open a specific look
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (k in EMPTY) state[k] = v; }); } catch (e) {}

  var root = document.documentElement;
  function apply() {
    Object.keys(EMPTY).forEach(function (k) {
      if (state[k]) root.setAttribute('data-' + k, state[k]); else root.removeAttribute('data-' + k);
    });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  apply();

  function build() {
    var box = document.createElement('div'); box.className = 'looks';
    var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'looks-toggle'; toggle.textContent = 'Looks';
    var panel = document.createElement('div'); panel.className = 'looks-panel'; panel.hidden = true;
    function row(label, key, options, target) {
      var r = document.createElement('div'); r.className = 'looks-row';
      var l = document.createElement('div'); l.className = 'looks-label'; l.textContent = label; r.appendChild(l);
      var chips = document.createElement('div'); chips.className = 'looks-chips'; r.appendChild(chips);
      options.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'looks-chip'; b.textContent = o[1]; b.dataset.key = key; b.dataset.value = o[0];
        chips.appendChild(b);
      });
      (target || panel).appendChild(r);
    }
    var special = document.createElement('div'); special.className = 'looks-special';
    var sh = document.createElement('div'); sh.className = 'looks-special-title'; sh.textContent = 'Browns & golds'; special.appendChild(sh);
    var sn = document.createElement('div'); sn.className = 'looks-special-note'; sn.textContent = BROWNS.length + ' palettes, your favorites first'; special.appendChild(sn);
    row('', 'palette', BROWNS, special);
    panel.appendChild(special);
    var pre = document.createElement('div'); pre.className = 'looks-row';
    var pl = document.createElement('div'); pl.className = 'looks-label'; pl.textContent = 'Quick pairings'; pre.appendChild(pl);
    var pc = document.createElement('div'); pc.className = 'looks-chips'; pre.appendChild(pc);
    PRESETS.forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'looks-preset'; b.textContent = p[0]; b.dataset.head = p[1]; b.dataset.body = p[2]; pc.appendChild(b);
    });
    panel.appendChild(pre);
    row('Headline font', 'head', HEADS); row('Body font', 'body', BODIES); var more = document.createElement('details'); more.className = 'looks-more'; var ms = document.createElement('summary'); ms.textContent = 'Other palettes (' + PALETTES.length + ')'; more.appendChild(ms); row('', 'palette', PALETTES, more); panel.appendChild(more); row('Corners', 'shape', SHAPES); row('Hero picture', 'hero', HEROES); row('Long headlines (9+ words)', 'long', LONGS); row('Headline font used on', 'scope', SCOPES);
    var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'looks-reset'; reset.textContent = 'Reset to the live look'; panel.appendChild(reset);
    function paint() { panel.querySelectorAll('.looks-chip').forEach(function (b) { b.setAttribute('aria-pressed', String(state[b.dataset.key] === b.dataset.value)); }); }
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('.looks-chip');
      var p = e.target.closest('.looks-preset');
      if (b) { state[b.dataset.key] = b.dataset.value; apply(); paint(); }
      if (p) { state.head = p.dataset.head; state.body = p.dataset.body; apply(); paint(); }
      if (e.target === reset) { state = Object.assign({}, EMPTY); apply(); paint(); }
    });
    toggle.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    box.appendChild(panel); box.appendChild(toggle); document.body.appendChild(box); paint();
  }
  // Mark headings that run long, so the CSS can set them in the body font.
  function mark() {
    document.querySelectorAll('h1, h2, .q-title, .story-body .lead').forEach(function (h) {
      var words = (h.textContent || '').trim().split(/\s+/).filter(Boolean).length;
      h.classList.toggle('long-head', words >= 9);
    });
  }
  function start() {
    build(); mark();
    var screen = document.getElementById('screen');
    if (screen && window.MutationObserver) new MutationObserver(mark).observe(screen, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
