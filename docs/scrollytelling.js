/**
 * Drives the page -> shortcut -> paste demo from scroll position.
 *
 * Deliberately does NOT touch the scrollbar. Steps are ordinary flow content and
 * the stage is CSS `position: sticky`; this file only observes which step is in
 * the reading band and stamps `data-step` on the section for CSS to react to.
 * Native scrolling, keyboard paging, and find-in-page keep working.
 *
 * If IntersectionObserver is missing, or the visitor asked for reduced motion,
 * it bails out and leaves the static state the stylesheet already renders.
 */
(function () {
  'use strict';

  var section = document.querySelector('[data-demo]');
  if (!section) return;

  var steps = Array.prototype.slice.call(section.querySelectorAll('.demo-step'));
  if (!steps.length) return;

  // Number the steps from DOM order — the i18n array section can't emit an index.
  steps.forEach(function (el, i) {
    el.setAttribute('data-index', String(i));
  });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;

  var current = null;

  function setStep(n) {
    if (current === n) return;
    current = n;
    section.setAttribute('data-step', String(n));

    steps.forEach(function (el) {
      // Step 0 is the setup shot; the payoff (last state) has no step block.
      el.classList.toggle('is-active', Number(el.getAttribute('data-index')) === n);
    });

    // Show only the clipboard / destination content belonging to this state.
    // The clipboard keeps its last value once filled — a real clipboard would.
    Array.prototype.forEach.call(section.querySelectorAll('.dst-out'), function (el) {
      el.classList.toggle('on', Number(el.getAttribute('data-for')) === n);
    });
  }

  // A narrow band across the middle of the viewport decides the active step, so
  // the change lands when a step reaches reading position rather than on entry.
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        setStep(Number(entry.target.getAttribute('data-index')));
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );

  steps.forEach(function (el) { observer.observe(el); });

  setStep(0);
})();
