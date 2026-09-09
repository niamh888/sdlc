// ============================================================
// SCROLL REVEAL — fade + lift elements into place as they scroll into view
//
// WHAT THIS FILE DOES
// Any element with class="reveal-on-scroll" starts invisible and slightly
// lower than its final position, then eases into place the first time it
// enters the viewport. Used on the home page testimonials so the section
// doesn't land as one flat wall of text.
//
// PROGRESSIVE ENHANCEMENT, NOT A REQUIREMENT
// style.css gives .reveal-on-scroll full opacity and no offset by default —
// that is the "visible" state. This file's only job is to add a
// .reveal-pending class BEFORE the browser paints (hiding the element) and
// then remove it once the element is scrolled into view (revealing it via
// the transition already defined in CSS). If this script fails to load, or
// IntersectionObserver doesn't exist, .reveal-pending is never added and
// every element simply stays visible — a missing animation, not missing
// content.
//
// WHY SKIP IT FOR "PREFERS REDUCED MOTION"
// Motion that the visitor didn't ask for can trigger real discomfort
// (vestibular disorders, motion sickness), not just mild annoyance — which is
// why browsers expose this as an OS-level setting rather than a per-site one.
// Someone who has switched it on gets every element already visible, with no
// hidden step and no animation, same as the no-JS fallback above.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets.length) return;

  const reducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    // Leave every target in its default (visible) state — see comment above.
    return;
  }

  // Hide now, reveal later. Doing this here (in JS) rather than in the base
  // CSS rule is what makes the no-JS/no-IntersectionObserver fallback work:
  // CSS alone always shows the content, and only a browser that can actually
  // run the reveal ever hides it in the first place.
  targets.forEach(function (el) {
    el.classList.add('reveal-pending');
  });

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        // One-shot: once revealed, stop watching. Scrolling back past it
        // should not re-hide and re-animate it.
        observer.unobserve(entry.target);
      }
    });
  }, {
    // Fires a little before the element is fully on screen, so the
    // animation finishes by the time it reaches a comfortable reading
    // position rather than completing mid-scroll.
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.15
  });

  targets.forEach(function (el) {
    observer.observe(el);
  });
});
