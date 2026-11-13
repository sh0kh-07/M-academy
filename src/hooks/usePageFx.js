import { useEffect } from 'react';
import gsap from 'gsap';
import { finePointer, reducedMotion } from '../lib/env.js';

/*
  Page-level effects that work on plain DOM attributes, so components only
  have to opt in with markup:

    data-reveal            fades / rises into view once (state kept in data-in)
    className="tilt"       leans towards the pointer (state kept in data-tilting);
                           data-tilt="0.3" scales the lean, and --px / --py (−0.5 … 0.5)
                           are set on it so inner layers can shift for depth
    className="magnetic"   is gently pulled by the pointer

  State lives in data-* attributes rather than classes on purpose: React owns
  className and would wipe a class it did not render.
*/

/** Re-scan the page for [data-reveal] elements whenever `key` changes (i.e. on every route). */
export function useReveal(key) {
  useEffect(() => {
    const items = [...document.querySelectorAll('[data-reveal]:not([data-in])')];
    const counts = new Map();
    items.forEach((el) => {
      const parent = el.parentElement;
      const i = counts.get(parent) ?? 0;
      counts.set(parent, i + 1);
      el.style.setProperty('--d', `${Math.min(i, 8) * 0.07}s`);
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.setAttribute('data-in', ''));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-in', '');
          io.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
}

/** One delegated pointer listener for every .tilt and .magnetic element on the site. */
export function usePointerFx() {
  useEffect(() => {
    if (!finePointer || reducedMotion) return undefined;

    let tilted = null;
    let pending = null;
    let pulled = null;
    const movers = new WeakMap();

    const resetTilt = (el) => {
      el.removeAttribute('data-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    const applyTilt = () => {
      const e = pending;
      pending = null;
      if (!e || !tilted || !tilted.isConnected) return;
      const r = tilted.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      tilted.setAttribute('data-tilting', '');
      const strength = Number(tilted.dataset.tilt) || 1;
      tilted.style.setProperty('--rx', `${(0.5 - y) * 9 * strength}deg`);
      tilted.style.setProperty('--ry', `${(x - 0.5) * 11 * strength}deg`);
      tilted.style.setProperty('--px', (x - 0.5).toFixed(3));
      tilted.style.setProperty('--py', (y - 0.5).toFixed(3));
      tilted.style.setProperty('--mx', `${x * 100}%`);
      tilted.style.setProperty('--my', `${y * 100}%`);
    };

    const mover = (el) => {
      if (!movers.has(el)) {
        movers.set(el, {
          x: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' }),
        });
      }
      return movers.get(el);
    };

    const onMove = (e) => {
      const target = e.target instanceof Element ? e.target : null;

      const card = target?.closest('.tilt') ?? null;
      if (tilted && tilted !== card) resetTilt(tilted);
      tilted = card;
      if (card) {
        if (!pending) requestAnimationFrame(applyTilt);
        pending = e;
      }

      const magnet = target?.closest('.magnetic') ?? null;
      if (pulled && pulled !== magnet && pulled.isConnected) {
        mover(pulled).x(0);
        mover(pulled).y(0);
      }
      pulled = magnet;
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        mover(magnet).x((e.clientX - (r.left + r.width / 2)) * 0.2);
        mover(magnet).y((e.clientY - (r.top + r.height / 2)) * 0.28);
      }
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);
}
