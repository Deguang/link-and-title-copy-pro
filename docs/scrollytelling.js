/**
 * Drives the pinned product demo from scroll position.
 *
 * Publishes one number — `--p`, progress through the pinned track from 0 to 1 —
 * and lets CSS do all the choreography from it. That's why the motion is
 * continuous rather than snapping between states, and it's the job a library
 * like GSAP ScrollTrigger would otherwise be carrying.
 *
 * The scrollbar is never touched. The stage is CSS `position: sticky` inside a
 * tall track; this only reads scroll position, so native scrolling, keyboard
 * paging and find-in-page keep working.
 *
 * Bails out entirely when the visitor asks for reduced motion or the viewport is
 * narrow — the stylesheet already renders the finished state there.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cine]');
  if (!root) return;

  var track = root.querySelector('.cine-track');
  var caps = Array.prototype.slice.call(root.querySelectorAll('.cine-cap'));
  if (!track) return;

  var motionOK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var wideEnough = window.matchMedia && window.matchMedia('(min-width: 901px)').matches;
  if (!motionOK || !wideEnough) return;

  // Progress windows for each caption, matched to the CSS timeline.
  var CAPTION_AT = [0.0, 0.22, 0.44, 0.7];

  var ticking = false;
  var lastCap = -1;

  function update() {
    ticking = false;

    var rect = track.getBoundingClientRect();
    var runway = rect.height - window.innerHeight;
    if (runway <= 0) return;

    // 0 when the track's top hits the viewport top, 1 when its bottom does.
    var p = Math.min(1, Math.max(0, -rect.top / runway));
    root.style.setProperty('--p', p.toFixed(4));

    // Captions are discrete — cross-fading text mid-sentence reads as a glitch.
    var idx = 0;
    for (var i = 0; i < CAPTION_AT.length; i++) {
      if (p >= CAPTION_AT[i]) idx = i;
    }
    if (idx !== lastCap) {
      lastCap = idx;
      caps.forEach(function (el, i) { el.classList.toggle('on', i === idx); });
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
