/* Lumen landing page — interactions
 * Vanilla JS, no dependencies. Loaded with a plain <script src> at end of body.
 */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- toasts */
  var toastHost = $('#toasts');

  function toast(message, ms) {
    if (!toastHost) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    toastHost.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, ms || 3200);
  }

  /* ----------------------------------------------------------------- theme */
  var THEME_KEY = 'lumen-theme';
  var themeBtn  = $('#themeBtn');

  function readStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.textContent = theme === 'light' ? '☀️' : '🌙';
      themeBtn.setAttribute('title', theme === 'light' ? 'Switch to dark' : 'Switch to light');
    }
  }

  var systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(readStoredTheme() || (systemPrefersLight ? 'light' : 'dark'));

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
    });
  }

  /* ------------------------------------------------------------ mobile nav */
  var menuBtn = $('#menuBtn');
  var drawer  = $('#drawer');

  function setMenu(open) {
    if (!drawer || !menuBtn) return;
    drawer.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? '✕' : '☰';
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      setMenu(!drawer.classList.contains('open'));
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 760) setMenu(false);
  });

  /* --------------------------------------------- smooth scroll with offset */
  var HEADER_H = 68;

  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#') { e.preventDefault(); return; }
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_H + 1;
      window.scrollTo({ top: Math.max(y, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ----------------------------------------- header state / progress / top */
  var header   = $('#header');
  var progress = $('#progress');
  var toTop    = $('#toTop');
  var ticking  = false;

  function onScroll() {
    var y = window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (header) header.classList.toggle('scrolled', y > 8);
    if (toTop)  toTop.classList.toggle('show', y > 600);
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    highlightNav(y);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------- active nav link state */
  var navLinks = $$('#navLinks a');
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function highlightNav(y) {
    if (!sections.length) return;
    var current = -1;
    sections.forEach(function (sec, i) {
      if (sec.offsetTop - HEADER_H - 40 <= y) current = i;
    });
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === current); });
  }

  /* --------------------------------------------------------- scroll reveal */
  var revealables = $$('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('visible'); });
    startCounters();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings inside the same grid for a nicer cascade.
        var siblings = el.parentElement ? $$('.reveal', el.parentElement) : [];
        var delay = Math.max(siblings.indexOf(el), 0) * 70;
        setTimeout(function () { el.classList.add('visible'); }, delay);
        if (el.id === 'statsRow') startCounters();
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------- number counters */
  var countersStarted = false;

  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;

    $$('[data-count]').forEach(function (el) {
      var target   = parseFloat(el.getAttribute('data-count')) || 0;
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix   = el.getAttribute('data-suffix') || '';

      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
        return;
      }

      var duration = 1400;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------ signup form flow */
  var form    = $('#signupForm');
  var email   = $('#email');
  var msg     = $('#formMsg');
  var submit  = $('#signupBtn');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setMsg(text, kind) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'form-msg' + (kind ? ' ' + kind : '');
  }

  if (form && email && submit) {
    email.addEventListener('input', function () {
      email.classList.remove('invalid');
      if (msg && msg.classList.contains('err')) setMsg('');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = email.value.trim();

      if (!value) {
        email.classList.add('invalid');
        email.focus();
        setMsg('Please enter your email address.', 'err');
        return;
      }
      if (!EMAIL_RE.test(value)) {
        email.classList.add('invalid');
        email.focus();
        setMsg('That doesn’t look like a valid email.', 'err');
        return;
      }

      // Simulated async signup — swap for a real fetch() when you have an API.
      var original = submit.textContent;
      submit.disabled = true;
      submit.style.opacity = '.65';
      submit.textContent = 'Creating…';
      setMsg('');

      setTimeout(function () {
        submit.disabled = false;
        submit.style.opacity = '';
        submit.textContent = original;
        form.reset();
        setMsg('You’re on the list. Check your inbox to confirm.', 'ok');
        toast('Welcome aboard, ' + value.split('@')[0] + '! 🎉');
      }, 900);
    });
  }

  /* ------------------------------------------------------- misc niceties */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Subtle pointer-tracked glow on feature cards.
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.background =
          'radial-gradient(220px circle at ' + (e.clientX - r.left) + 'px ' +
          (e.clientY - r.top) + 'px, rgba(124,140,255,.10), transparent 70%), var(--surface)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.background = '';
      });
    });
  }

  // First paint of scroll-dependent state.
  onScroll();
})();
