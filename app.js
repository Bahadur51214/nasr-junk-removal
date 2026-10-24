/* NASR Junk Removal — interaction layer (vanilla JS, no deps) */
(function () {
  'use strict';

  /* release the head-script reveal guard: app.js loaded and runs,
     so IntersectionObserver + failsafe below own the reveal state */
  if (window.__revealGuard) {
    clearTimeout(window.__revealGuard);
    window.__revealGuard = null;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  var mobileMenu = document.getElementById('mobileMenu');

  /* ---------- sticky header ---------- */
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  function isOpen() {
    return !!menuBtn && menuBtn.getAttribute('aria-expanded') === 'true';
  }
  function setLabel(open) {
    if (menuBtn) menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  function closeMenu(restoreFocus) {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    setLabel(false);
    if (restoreFocus) menuBtn.focus();
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      var open = isOpen();
      menuBtn.setAttribute('aria-expanded', String(!open));
      mobileMenu.classList.toggle('is-open', !open);
      setLabel(!open);
      if (!open) {
        /* keyboard users land inside the menu; touch/click keeps flow natural */
        var kb = false;
        try { kb = menuBtn.matches(':focus-visible'); } catch (e) { kb = false; }
        var first = mobileMenu.querySelector('nav a');
        if (kb && first) first.focus({ preventScroll: true });
      }
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) closeMenu(true);
    });
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (!e.target.closest('#mobileMenu') && !e.target.closest('.menu-btn')) closeMenu(false);
    });
  }

  /* ---------- smooth in-page scrolling (sticky header offset) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu(false);
    var top = target.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
    /* move focus to the destination for keyboard / screen-reader users */
    try {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    } catch (err) { /* no-op */ }
  });

  /* ---------- scroll reveal (content visible if this never runs) ---------- */
  function revealNow(el) {
    var stag = el.closest('[data-stagger]');
    if (stag) {
      var kids = stag.querySelectorAll('.reveal');
      var idx = Array.prototype.indexOf.call(kids, el);
      if (idx > -1) el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
    }
    el.style.willChange = 'opacity, transform';
    el.classList.add('is-visible');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.style.willChange = '';
      el.style.transitionDelay = '0s';
    };
    el.addEventListener('transitionend', function h(e) {
      if (e.target !== el || (e.propertyName !== 'opacity' && e.propertyName !== 'transform')) return;
      el.removeEventListener('transitionend', h);
      finish();
    });
    setTimeout(finish, 1400);
  }

  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(revealNow);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealNow(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    /* failsafe: never leave content hidden */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) revealNow(el);
      });
    }, 1200);
  }

  /* ---------- active nav link ---------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll('section[id], footer[id]')
  );
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.setAttribute(
            'aria-current',
            link.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false'
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { navIo.observe(s); });
  }

  /* ---------- FAQ: smooth height on <details> ---------- */
  var canAnimate = !reduceMotion && document.documentElement.style
    && 'transition' in document.documentElement.style;
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var summary = item.querySelector('summary');
    var panel = item.querySelector('.faq-panel');
    if (!summary || !panel || !canAnimate) return;
    var animating = false;

    summary.addEventListener('click', function (e) {
      if (animating) return;
      e.preventDefault();

      if (item.open) {
        animating = true;
        panel.style.overflow = 'hidden';
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () {
          panel.style.transition = 'height .4s cubic-bezier(.16,1,.3,1), opacity .4s ease';
          panel.style.height = '0px';
          panel.style.opacity = '0';
        });
        var done = function () {
          item.open = false;
          panel.style.cssText = '';
          animating = false;
          panel.removeEventListener('transitionend', done);
        };
        panel.addEventListener('transitionend', done);
        setTimeout(done, 600);
      } else {
        item.open = true;
        animating = true;
        var h = panel.scrollHeight;
        panel.style.overflow = 'hidden';
        panel.style.height = '0px';
        panel.style.opacity = '0';
        requestAnimationFrame(function () {
          panel.style.transition = 'height .4s cubic-bezier(.16,1,.3,1), opacity .4s ease';
          panel.style.height = h + 'px';
          panel.style.opacity = '1';
        });
        var done2 = function () {
          panel.style.cssText = '';
          animating = false;
          panel.removeEventListener('transitionend', done2);
        };
        panel.addEventListener('transitionend', done2);
        setTimeout(done2, 600);
      }
    });
  });

  /* ---------- before / after sliders ---------- */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var set = function () {
      ba.style.setProperty('--pos', range.value + '%');
    };
    range.addEventListener('input', set);
    set();
  });

  /* ---------- hero subtle parallax (desktop, motion allowed, rAF-throttled) ---------- */
  var heroImg = document.querySelector('.hero-parallax');
  if (heroImg && !reduceMotion && window.matchMedia('(min-width: 768px)').matches) {
    var heroTicking = false;
    window.addEventListener('scroll', function () {
      if (heroTicking) return;
      heroTicking = true;
      requestAnimationFrame(function () {
        heroTicking = false;
        var y = Math.min(window.scrollY, 700);
        heroImg.style.transform = 'scale(1.06) translate3d(0,' + y * 0.12 + 'px,0)';
      });
    }, { passive: true });
  }
})();
