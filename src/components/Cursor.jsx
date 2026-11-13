import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { finePointer, reducedMotion } from '../lib/env.js';

const enabled = finePointer && !reducedMotion;

/**
 * A thin gold ring that trails the mouse and swells over anything clickable.
 * The real cursor stays visible; the ring only moves with transforms, so it is cheap.
 * Not rendered on touch devices or when reduced motion is requested.
 */
export default function Cursor() {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    let shown = false;

    const onMove = (e) => {
      if (!shown) {
        gsap.set(el, { x: e.clientX, y: e.clientY }); // appear under the pointer, not fly in from the corner
        el.setAttribute('data-on', '');
        shown = true;
      }
      x(e.clientX);
      y(e.clientY);
      const hot = e.target instanceof Element && e.target.closest('a, button, input, select, label, .tilt');
      el.toggleAttribute('data-hover', Boolean(hot));
    };
    const onLeave = () => {
      el.removeAttribute('data-on');
      shown = false;
    };
    const onDown = () => el.setAttribute('data-down', '');
    const onUp = () => el.removeAttribute('data-down');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div className="cursor" ref={ref} aria-hidden="true">
      <i />
    </div>
  );
}
