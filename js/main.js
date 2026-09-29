(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js', 'js-ready');
  var motion = root.classList.contains('motion');
  var showLoader = root.classList.contains('loading');

  function onMQ(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function isFocusVisible(el) {
    try { return el.matches(':focus-visible'); } catch (e) { return true; }
  }
  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function rev(s) { return (s || '').split('').reverse().join(''); }

  // Email addresses are stored reversed in data attributes and assembled here.
  function initEmail() {
    document.querySelectorAll('[data-u][data-d]').forEach(function (a) {
      var addr = rev(a.getAttribute('data-u')) + '@' + rev(a.getAttribute('data-d'));
      a.setAttribute('href', 'mailto:' + addr);
      if (a.hasAttribute('data-email-text')) a.textContent = addr;
      a.hidden = false;
    });
  }

  // Split a heading into masked lines based on its current wrapping.
  function split(el) {
    var text = el.getAttribute('data-text') || el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('data-text', text);
    el.innerHTML = text.split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ');
    var lines = [], top = null;
    el.querySelectorAll('.w').forEach(function (s) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.innerHTML = lines.map(function (l) {
      return '<span class="line"><span class="line__inner">' + esc(l.join(' ')) + '</span></span>';
    }).join(' ');
    el.querySelectorAll('.line__inner').forEach(function (s, i) { s.style.transitionDelay = (i * 120) + 'ms'; });
    el.classList.add('is-split');
    void el.offsetWidth;
  }

  function reveal(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-lines') && el.classList.contains('is-split')) {
      var n = el.querySelectorAll('.line').length;
      setTimeout(function () {
        el.textContent = el.getAttribute('data-text');
        el.classList.remove('is-split');
        el.classList.add('is-done');
      }, 900 + (n - 1) * 120 + 100);
    }
    if (el.hasAttribute('data-clip')) setTimeout(function () { el.classList.add('is-settled'); }, 1300);
  }

  // How we work: accordion. With motion on tablet/desktop it autoplays every 5s,
  // paused while hovered, keyboard-focused, off-screen or in a hidden tab.
  function initSteps() {
    var list = document.querySelector('[data-steps]');
    if (!list) return;
    var steps = [].slice.call(list.querySelectorAll('.step'));
    if (!steps.length) return;
    var active = 0, inView = false, hover = false, focused = false;
    var mq = window.matchMedia('(min-width: 768px)');
    var canAuto = function () { return motion && mq.matches; };
    var sync = function () {
      list.classList.toggle('is-auto', canAuto());
      list.classList.toggle('is-paused', hover || focused || !inView || document.hidden);
    };
    var restart = function () {
      steps.forEach(function (s) { s.classList.remove('is-running'); });
      if (!canAuto()) return;
      void steps[active].offsetWidth;
      steps[active].classList.add('is-running');
    };
    var setActive = function (i) {
      active = i;
      steps.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.querySelector('.step__btn').setAttribute('aria-expanded', String(k === i));
      });
      restart();
    };
    steps.forEach(function (s, i) {
      s.querySelector('.step__btn').addEventListener('click', function () { setActive(i); });
      s.querySelector('.step__progress').addEventListener('animationend', function () {
        if (s.classList.contains('is-running') && i === active) setActive((i + 1) % steps.length);
      });
    });
    list.addEventListener('mouseenter', function () { hover = true; sync(); });
    list.addEventListener('mouseleave', function () { hover = false; sync(); });
    list.addEventListener('focusin', function (e) { focused = isFocusVisible(e.target); sync(); });
    list.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !list.contains(e.relatedTarget)) { focused = false; sync(); }
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        sync();
      }).observe(list.closest('section') || list);
    }
    onMQ(mq, function () { sync(); restart(); });
    setActive(0);
    sync();
  }

  function initHeader(header) {
    var hero = document.querySelector('.hero');
    var lastY = Math.max(0, window.scrollY || 0);
    var ticking = false;
    var THRESHOLD = 10;
    var menuOpen = function () { return root.classList.contains('menu-open'); };
    var focusInHeader = function () {
      var a = document.activeElement;
      return !!a && header.contains(a) && isFocusVisible(a);
    };
    var update = function () {
      ticking = false;
      var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      var y = Math.min(Math.max(0, window.scrollY || 0), max);
      header.classList.toggle('is-scrolled', y > 4 || menuOpen());
      if (y <= 4) { header.classList.remove('is-hidden'); lastY = y; return; }
      var dy = y - lastY;
      if (Math.abs(dy) < THRESHOLD) return;
      var limit = hero ? hero.offsetTop + hero.offsetHeight - header.offsetHeight : header.offsetHeight;
      if (dy > 0 && y > limit && !menuOpen() && !focusInHeader()) header.classList.add('is-hidden');
      else if (dy < 0) header.classList.remove('is-hidden');
      lastY = y;
    };
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function initMenu(header) {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-menu]');
    if (!toggle || !menu) return;
    var focusables = function () {
      return [toggle].concat([].slice.call(menu.querySelectorAll('a[href], button:not([disabled])')));
    };
    var setMenu = function (open, restoreFocus) {
      if (open === !menu.hidden) return;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      root.classList.toggle('menu-open', open);
      if (header) {
        header.classList.toggle('is-scrolled', open || window.scrollY > 4);
        if (open) header.classList.remove('is-hidden');
      }
      if (open) {
        var first = menu.querySelector('a[href]');
        if (first) first.focus({ preventScroll: true });
      } else if (restoreFocus) {
        toggle.focus({ preventScroll: true });
      }
    };
    toggle.addEventListener('click', function () { setMenu(menu.hidden, true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false, false); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); setMenu(false, true); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      var first = items[0], last = items[items.length - 1];
      var current = document.activeElement;
      if (items.indexOf(current) === -1) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && current === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
    });
    onMQ(window.matchMedia('(min-width: 768px)'), function (m) {
      if (m.matches && !menu.hidden) setMenu(false, false);
    });
  }

  function initMotion() {
    var hero = document.querySelector('.hero');
    var inHero = function (el) { return !!hero && hero.contains(el); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        reveal(entry.target);
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0 });

    document.querySelectorAll('.hr, .hr-b, [data-fade], [data-clip], [data-std], [data-op], .statement').forEach(function (el) {
      if (!inHero(el)) io.observe(el);
    });

    var fontsReady = document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })])
      : Promise.resolve();

    // Intro: wordmark rises, holds, then the panel wipes up; hero reveal starts mid-wipe.
    var loader = document.querySelector('[data-loader]');
    var intro = new Promise(function (resolve) {
      if (!showLoader || !loader) {
        root.classList.remove('loading');
        if (loader) loader.remove();
        return resolve();
      }
      fontsReady.then(function () {
        requestAnimationFrame(function () {
          loader.classList.add('is-in');
          setTimeout(function () {
            loader.classList.add('is-out');
            setTimeout(resolve, 300);
            setTimeout(function () { root.classList.remove('loading'); loader.remove(); }, 1050);
          }, 1500);
        });
      });
    });

    fontsReady.then(function () {
      document.querySelectorAll('[data-lines]').forEach(split);
      document.querySelectorAll('[data-lines]').forEach(function (el) { if (!inHero(el)) io.observe(el); });
      return intro;
    }).then(function () {
      if (!hero) return;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var d = (hero.querySelectorAll('h1 .line').length - 1) * 120 + 600;
          hero.querySelectorAll('.hero__text > [data-fade]').forEach(function (el, i) {
            el.style.transitionDelay = (Math.max(600, d) + i * 100) + 'ms';
          });
          hero.classList.add('is-loaded');
          hero.querySelectorAll('[data-lines], [data-clip], .hr').forEach(reveal);
        });
      });
    });

    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        document.querySelectorAll('[data-lines].is-split:not(.is-in)').forEach(split);
      }, 200);
    }, { passive: true });
  }

  function init() {
    var header = document.querySelector('[data-header]');
    initEmail();
    if (header) initHeader(header);
    initMenu(header);
    initSteps();
    if (motion) {
      initMotion();
    } else {
      root.classList.remove('loading');
      var loader = document.querySelector('[data-loader]');
      if (loader) loader.remove();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
