import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { reducedMotion } from './env.js';

/*
  Smooth (inertial) scrolling for the whole site.

  One Lenis instance lives for the lifetime of the app and is driven by GSAP's
  ticker, so scroll-linked animation (the pinned learning path) stays in step.
  Touch scrolling is left native, and nothing is smoothed for visitors who ask
  for reduced motion.
*/

let lenis = null;
let locks = 0;

export function startSmoothScroll() {
  if (lenis || reducedMotion) return;
  lenis = new Lenis({ lerp: 0.1 }); // lower = longer glide, higher = snappier
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  if (locks > 0) lenis.stop();
}

/** The Lenis instance, or null when smooth scrolling is off. */
export const getLenis = () => lenis;

/** Freeze / release scrolling (mobile menu, preloader). Calls may nest. */
export function lockScroll() {
  locks += 1;
  lenis?.stop();
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) lenis?.start();
}

export function scrollToTop({ immediate = false } = {}) {
  if (!lenis) {
    window.scrollTo({ top: 0, behavior: immediate || reducedMotion ? 'instant' : 'smooth' });
    return;
  }
  if (!immediate) {
    lenis.scrollTo(0, { force: true, duration: 1.4 });
    return;
  }
  // Jump natively, then make Lenis adopt the new position. Asking Lenis to do the jump
  // is not reliable: it does nothing when its internal target already reads 0, and that
  // value can be stale after scrolling that did not go through Lenis.
  window.scrollTo({ top: 0, behavior: 'instant' });
  lenis.reset();
}

export function scrollToElement(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}
