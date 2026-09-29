(function (d, w) {
  var r = d.documentElement;
  r.classList.add('js');
  var motion = false;
  try {
    motion = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: no-preference)').matches && 'IntersectionObserver' in w);
  } catch (e) {}
  if (!motion) return;
  r.classList.add('motion');
  if (r.hasAttribute('data-intro')) r.classList.add('loading');
  // Safety net: if main.js never runs, drop the reveal styles so no content stays hidden.
  w.setTimeout(function () {
    if (!r.classList.contains('js-ready')) r.classList.remove('motion', 'loading');
  }, 3000);
})(document, window);
