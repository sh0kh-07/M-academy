import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { reducedMotion } from '../lib/env.js';
import { getLenis } from '../lib/scroll.js';
import { COURSES } from '../data/courses.js';
import { PLACES } from '../data/places.js';

/* Canvas / animation-heavy pieces. The WebGL code itself lives in src/lib. */

/**
 * Every WebGL scene gets a <canvas> of its own, created when the component mounts and
 * removed when it unmounts. A scene releases its GL context when disposed, so a canvas
 * must never be handed to a second scene (that is what happens on hot reload otherwise).
 *
 * `create(canvas)` returns the scene (or a promise of it); the scene must have dispose().
 */
function useScene(create) {
  const host = useRef(null);
  const latest = useRef(create);
  latest.current = create;

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.current.append(canvas);

    let disposed = false;
    let scene = null;
    Promise.resolve()
      .then(() => latest.current(canvas))
      .then((created) => {
        if (disposed) created?.dispose();
        else scene = created;
      });

    return () => {
      disposed = true;
      scene?.dispose();
      canvas.remove();
    };
  }, []);

  return host;
}

/**
 * The slow-motion flag backdrop (src/lib/hero.js).
 * `onReady(scene)` receives the scene API: intro(), onShot(), setScroll(), pulse().
 * `onFail()` is called when WebGL is unavailable — the page keeps working without it.
 */
export function FlagBackdrop({ className, options, onReady, onFail }) {
  const host = useScene(async (canvas) => {
    try {
      const { createHero } = await import('../lib/hero.js');
      const scene = await createHero(canvas, { reducedMotion, ...options });
      onReady?.(scene);
      return scene;
    } catch (err) {
      console.warn('[M.ACADEMY] WebGL backdrop unavailable', err);
      document.documentElement.classList.add('no-webgl');
      onFail?.(err);
      return null;
    }
  });
  return <div ref={host} className={className} aria-hidden="true" />;
}

/** The extruded gold M (src/lib/emblem.js) with a flat-logo fallback underneath. */
export function Emblem() {
  const [live, setLive] = useState(false);
  const host = useScene(async (canvas) => {
    try {
      const { createEmblem } = await import('../lib/emblem.js');
      const scene = createEmblem(canvas, { reducedMotion });
      setLive(true);
      return scene;
    } catch (err) {
      console.warn('[M.ACADEMY] 3D emblem unavailable, showing the flat logo', err);
      return null;
    }
  });

  return (
    <div className={`about__stage${live ? ' is-3d' : ''}`} data-reveal="">
      <span className="about__halo" />
      <div ref={host} />
      <img className="about__fallback" src="/img/logo-mark.webp" alt="M.ACADEMY" width="543" height="531" />
    </div>
  );
}

/**
 * "From beginner to expert": five steps on a track that scrolls sideways.
 * The section pins while the page scrolls; each step turns towards the centre of the
 * screen as it passes (a slow coverflow). With reduced motion it is a plain vertical list.
 */
export function LearningPath() {
  const { t, html, lang } = useI18n();
  const section = useRef(null);
  const track = useRef(null);
  const fill = useRef(null);
  const refresh = useRef(null);

  useEffect(() => {
    let ctx = null;
    let ro = null;
    let timer = 0;
    let unsync = null;
    let cancelled = false;

    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      refresh.current = () => ScrollTrigger.refresh();
      // keep the pinned section in step with the smooth scroll
      unsync = getLenis()?.on('scroll', ScrollTrigger.update) ?? null;

      const el = section.current;
      const row = track.current;
      const steps = [...row.querySelectorAll('.step')];
      const mark = (progress) =>
        steps.forEach((step, i) => step.toggleAttribute('data-active', progress >= i / steps.length - 0.01));

      if (reducedMotion) {
        ctx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: row,
            start: 'top 75%',
            end: 'bottom 55%',
            onUpdate: (self) => {
              fill.current.style.transform = `scaleY(${self.progress})`;
              mark(self.progress);
            },
          });
        });
      } else {
        const distance = () => Math.max(0, row.scrollWidth - window.innerWidth);
        // --turn: −1 … 1, how far a step is from the centre of the screen (drives the 3D turn in CSS)
        const turn = () => {
          const x = Number(gsap.getProperty(row, 'x')) || 0;
          const half = window.innerWidth / 2;
          steps.forEach((step) => {
            const centre = step.offsetLeft + step.offsetWidth / 2 + x;
            const n = Math.max(-1.4, Math.min(1.4, (centre - half) / half));
            step.style.setProperty('--turn', n.toFixed(3));
          });
        };
        ctx = gsap.context(() => {
          gsap.to(row, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              pin: el.querySelector('.path__pin'),
              start: 'top top',
              end: () => `+=${distance() + window.innerHeight * 0.5}`,
              scrub: 0.6,
              invalidateOnRefresh: true,
              onRefresh: turn,
              onUpdate: (self) => {
                fill.current.style.transform = `scaleX(${self.progress})`;
                mark(self.progress);
                turn();
              },
            },
          });
        });
        turn();
      }

      // Anything that moves this section — a course filter above it, late fonts, a resize —
      // must make ScrollTrigger measure it again, or the pin starts in the wrong place.
      let top = el.getBoundingClientRect().top + window.scrollY;
      ro = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const now = el.getBoundingClientRect().top + window.scrollY;
          if (Math.abs(now - top) < 1) return;
          top = now;
          ScrollTrigger.refresh();
        }, 120);
      });
      ro.observe(document.body);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ro?.disconnect();
      unsync?.();
      ctx?.revert(); // also puts the pinned element back where React expects it
    };
  }, []);

  // text length changes with the language → recalculate the scroll distance
  useEffect(() => {
    refresh.current?.();
  }, [lang]);

  return (
    <section className="path" ref={section}>
      <div className="path__pin">
        <div className="container path__head">
          <p className="eyebrow" data-reveal="">
            <span className="eyebrow__line" />
            <span>{t('path.eyebrow')}</span>
          </p>
          <h2 className="h2" data-reveal="" {...html('path.title')} />
        </div>
        <div className="path__viewport">
          <div className="path__track" ref={track}>
            <div className="path__line">
              <span ref={fill} />
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <article className="step" key={n}>
                <span className="step__num">{String(n).padStart(2, '0')}</span>
                <i className="step__dot" />
                <h3>{t(`path.${n}.title`)}</h3>
                <p>{t(`path.${n}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The dotted globe (src/lib/globe.js) with a label on each language's capital.
 * Labels are ordinary elements that the scene moves to follow its markers.
 */
export function LanguageGlobe() {
  const { lang } = useI18n();
  const labels = useRef([]);
  const [live, setLive] = useState(false);
  const host = useScene(async (canvas) => {
    try {
      const { createGlobe } = await import('../lib/globe.js');
      const scene = createGlobe(canvas, { labels: labels.current, reducedMotion });
      setLive(true);
      return scene;
    } catch (err) {
      console.warn('[M.ACADEMY] 3D globe unavailable', err);
      return null;
    }
  });

  return (
    <div className={`globe${live ? ' is-live' : ''}`} data-reveal="">
      <span className="globe__halo" />
      <div ref={host} />
      <div className="globe__labels" aria-hidden="true">
        {PLACES.map((place, i) => (
          <div
            className="globe__label"
            key={place.course}
            ref={(el) => (labels.current[i] = el)}
            data-side={place.side}
            data-home={place.home ? '' : undefined}
          >
            <span>
              <i>{COURSES[place.course].g}</i>
              {COURSES[place.course][lang]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
