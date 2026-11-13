import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { reducedMotion, wait } from '../lib/env.js';

/* Canvas / animation-heavy pieces. The WebGL code itself lives in src/lib. */

/**
 * The slow-motion flag backdrop (src/lib/hero.js).
 * `onReady(scene)` receives the scene API: intro(), onShot(), setScroll(), pulse().
 * `onFail()` is called when WebGL is unavailable — the page keeps working without it.
 */
export function FlagBackdrop({ className, options, onReady, onFail }) {
  const ref = useRef(null);
  const callbacks = useRef({ onReady, onFail });
  callbacks.current = { onReady, onFail };

  useEffect(() => {
    let disposed = false;
    let scene = null;
    import('../lib/hero.js')
      .then((m) => m.createHero(ref.current, { reducedMotion, ...options }))
      .then((created) => {
        if (disposed) {
          created.dispose();
          return;
        }
        scene = created;
        callbacks.current.onReady?.(created);
      })
      .catch((err) => {
        if (disposed) return;
        console.warn('[M.ACADEMY] WebGL backdrop unavailable', err);
        document.documentElement.classList.add('no-webgl');
        callbacks.current.onFail?.(err);
      });
    return () => {
      disposed = true;
      scene?.dispose();
    };
    // the scene is built once per mount; options are read at creation time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/** The extruded gold M (src/lib/emblem.js) with a flat-logo fallback underneath. */
export function Emblem() {
  const ref = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let disposed = false;
    let scene = null;
    import('../lib/emblem.js')
      .then((m) => {
        if (disposed) return;
        scene = m.createEmblem(ref.current, { reducedMotion });
        setLive(true);
      })
      .catch((err) => console.warn('[M.ACADEMY] 3D emblem unavailable, showing the flat logo', err));
    return () => {
      disposed = true;
      scene?.dispose();
    };
  }, []);

  return (
    <div className={`about__stage${live ? ' is-3d' : ''}`} data-reveal="">
      <span className="about__halo" />
      <canvas ref={ref} aria-hidden="true" />
      <img className="about__fallback" src="/img/logo-mark.webp" alt="M.ACADEMY" width="543" height="531" />
    </div>
  );
}

/**
 * "From beginner to expert": five steps.
 * Desktop — the section pins and the track scrolls sideways; mobile — a vertical timeline.
 */
export function LearningPath() {
  const { t, html, lang } = useI18n();
  const section = useRef(null);
  const track = useRef(null);
  const fill = useRef(null);
  const refresh = useRef(null);

  useEffect(() => {
    let mm = null;
    let cancelled = false;

    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      refresh.current = () => ScrollTrigger.refresh();

      const steps = [...track.current.querySelectorAll('.step')];
      const mark = (progress) =>
        steps.forEach((step, i) => step.toggleAttribute('data-active', progress >= i / steps.length - 0.01));

      mm = gsap.matchMedia();
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const distance = () => Math.max(0, track.current.scrollWidth - window.innerWidth);
        gsap.to(track.current, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            pin: section.current.querySelector('.path__pin'),
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.5}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              fill.current.style.transform = `scaleX(${self.progress})`;
              mark(self.progress);
            },
          },
        });
      });
      mm.add('(max-width: 899.98px), (prefers-reduced-motion: reduce)', () => {
        ScrollTrigger.create({
          trigger: track.current,
          start: 'top 75%',
          end: 'bottom 55%',
          onUpdate: (self) => {
            fill.current.style.transform = `scaleY(${self.progress})`;
            mark(self.progress);
          },
        });
      });
    });

    return () => {
      cancelled = true;
      mm?.revert(); // also puts the pinned element back where React expects it
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

/** A scripted demo conversation with NIGINA that types itself out while it is on screen. */
export function NiginaChat() {
  const { t, lang } = useI18n();
  const chat = useRef(null);
  const body = useRef(null);

  useEffect(() => {
    const box = body.current;
    let run = 0;
    let visible = false;

    const bubble = (who) => {
      const el = document.createElement('div');
      el.className = `bubble bubble--${who}`;
      box.append(el);
      while (box.children.length > 4) box.firstElementChild.remove();
      return el;
    };

    async function play() {
      const id = ++run;
      const alive = () => id === run && visible;
      box.innerHTML = '';
      const script = [
        ['user', t('chat.q')],
        ['ai', t('chat.a')],
        ['user', t('chat.q2')],
        ['ai', t('chat.a2')],
      ];

      if (reducedMotion) {
        script.slice(0, 2).forEach(([who, text]) => (bubble(who).textContent = text));
        return;
      }
      for (const [who, text] of script) {
        if (who === 'ai') {
          const typing = bubble('ai');
          typing.classList.add('bubble--typing');
          typing.innerHTML = '<i></i><i></i><i></i>';
          await wait(1100);
          if (!alive()) return;
          typing.remove();
        }
        const el = bubble(who);
        for (const ch of text) {
          el.textContent += ch;
          await wait(who === 'user' ? 34 : 16);
          if (!alive()) return;
        }
        await wait(900);
        if (!alive()) return;
      }
      await wait(4200);
      if (alive()) play();
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else run++;
      },
      { threshold: 0.35 },
    );
    io.observe(chat.current);
    return () => {
      visible = false;
      run++;
      io.disconnect();
    };
    // restart the script when the language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <div className="chat" ref={chat} aria-hidden="true">
      <div className="chat__head">
        <i />
        <b>NIGINA</b>
        <small>{t('nigina.demo')}</small>
      </div>
      <div className="chat__body" ref={body} />
      <div className="chat__input">
        <span>{t('nigina.placeholder')}</span>
        <i />
      </div>
    </div>
  );
}
