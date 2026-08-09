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
  // Progress windows for each caption, matched to the CSS timeline:
  // the question, the two ways to copy, the confirmation, the paste, the format.
  var CAPTION_AT = [0.0, 0.18, 0.42, 0.62, 0.82];

  var ticking = false;
  var lastCap = -1;

  // Geometry is cached rather than measured per frame. getBoundingClientRect()
  // after writing --p forces a synchronous layout every frame — the classic
  // read-after-write thrash, and the main reason scrolling stuttered. The track's
  // size doesn't depend on --p, so it only needs re-measuring on resize.
  var trackTop = 0;
  var runway = 1;

  function measure() {
    var top = 0;
    for (var el = track; el; el = el.offsetParent) top += el.offsetTop;
    trackTop = top;
    runway = Math.max(1, track.offsetHeight - window.innerHeight);
  }

  function update() {
    ticking = false;

    // 0 when the track's top reaches the viewport top, 1 when its bottom does.
    var p = (window.pageYOffset - trackTop) / runway;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
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

  function onResize() {
    measure();
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  // Geometry is cached, so it has to be re-taken whenever the page can still
  // move underneath it. Measuring only at script time reads a layout that fonts
  // and images have not settled yet, and every later frame then maps the scroll
  // position onto the wrong point in the sequence.
  measure();
  update();
  window.addEventListener('load', onResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onResize).catch(function () {});
  }
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe(track);
  }
})();
