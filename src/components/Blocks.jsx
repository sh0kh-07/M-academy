import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { CATS, COURSES } from '../data/courses.js';
import { reducedMotion } from '../lib/env.js';
import Icon from './Icon.jsx';

/* Small building blocks shared by several pages. */

export function Eyebrow({ children, center = false, reveal = true }) {
  return (
    <p className="eyebrow" {...(reveal ? { 'data-reveal': '' } : {})}>
      <span className="eyebrow__line" />
      <span>{children}</span>
      {center && <span className="eyebrow__line" />}
    </p>
  );
}

export function Sample() {
  const { t } = useI18n();
  return <span className="sample">{t('common.sample')}</span>;
}

/** Closing call to action, used at the bottom of every page except sign-up. */
export function Cta() {
  const { t, html } = useI18n();
  return (
    <section className="section cta">
      <div className="container">
        <div className="cta__panel tilt" data-tilt="0.3" data-reveal="">
          <span className="cta__border" aria-hidden="true" />
          <div className="cta__inner">
            <img className="cta__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" loading="lazy" />
            <Eyebrow center reveal={false}>
              {t('cta.eyebrow')}
            </Eyebrow>
            <h2 className="h2 cta__title" {...html('cta.title')} />
            <p className="lead">{t('cta.sub')}</p>
            <div className="cta__buttons">
              <Link className="btn btn--gold magnetic" to="/register">
                <span>{t('cta.signup')}</span>
                <Icon name="arrow" />
              </Link>
              <Link className="btn btn--ghost magnetic" to="/courses">
                {t('hero.cta1')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A number that counts up the first time it scrolls into view. */
function Counter({ to }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const format = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      el.textContent = format(to);
      return undefined;
    }
    let tween = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const state = { v: 0 };
        tween = gsap.to(state, {
          v: to,
          duration: 2.4,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = format(state.v)),
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween?.kill();
    };
  }, [to]);
  return <span ref={ref}>0</span>;
}

/** The four headline numbers. Three of them are placeholders and say so. */
export function Stats() {
  const { t } = useI18n();
  const items = [
    { to: 1200, suffix: '+', label: 'results.s1', sample: true },
    { to: 16, suffix: '', label: 'results.s2', sample: false },
    { to: 40, suffix: '+', label: 'results.s3', sample: true },
    { to: 98, suffix: '%', label: 'results.s4', sample: true },
  ];
  return (
    <div className="stats">
      {items.map((item) => (
        <div className="stat" data-reveal="" key={item.label}>
          {item.sample && <Sample />}
          <b>
            <Counter to={item.to} />
            {item.suffix}
          </b>
          <small>{t(item.label)}</small>
        </div>
      ))}
    </div>
  );
}

/**
 * Course cards. `indices` limits the list (home page); `filter` hides other categories.
 * Each card opens the sign-up page with that direction already chosen.
 */
export function CourseGrid({ indices, filter = 'all' }) {
  const { lang } = useI18n();
  const ref = useRef(null);
  const first = useRef(true);
  const list = indices ?? COURSES.map((_, i) => i);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const cards = [...ref.current.querySelectorAll('.course:not(.is-hidden)')];
    cards.forEach((card) => card.setAttribute('data-in', ''));
    if (reducedMotion) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.03, clearProps: 'opacity,transform' },
    );
  }, [filter]);

  return (
    <div className="courses__grid" ref={ref}>
      {list.map((i) => {
        const course = COURSES[i];
        const hidden = filter !== 'all' && course.cat !== filter;
        return (
          <Link
            key={i}
            className={`course tilt${hidden ? ' is-hidden' : ''}`}
            to={`/register?course=${i}`}
            data-reveal=""
          >
            <span className="course__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="course__arrow" aria-hidden="true">
              <Icon name="arrowUpRight" />
            </span>
            <span className="course__glyph" aria-hidden="true">
              {course.g}
            </span>
            <span className="course__cat">{CATS[course.cat][lang]}</span>
            <span className="course__name">{course[lang]}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The directions as a slowly turning 3D ring of cards (pure CSS 3D, one transform per frame).
 * Drag sideways to spin it; a card opens the sign-up page with that direction chosen.
 */
export function CourseRing() {
  const { t, lang } = useI18n();
  const stage = useRef(null);
  const track = useRef(null);

  useEffect(() => {
    const box = stage.current;
    const el = track.current;
    const count = el.children.length;
    const state = { angle: 0, velocity: 0, radius: 0, dragging: false, moved: 0, lastX: 0, lastT: 0, hover: false };
    let frame = 0;
    let last = performance.now();
    let visible = false;

    const apply = () => {
      el.style.transform = `rotateX(-5deg) translateZ(${-state.radius}px) rotateY(${state.angle.toFixed(3)}deg)`;
    };
    const layout = () => {
      const card = el.firstElementChild;
      const gap = Math.max(14, card.offsetWidth * 0.11);
      state.radius = Math.round((count * (card.offsetWidth + gap)) / (Math.PI * 2));
      el.style.setProperty('--r', `${state.radius}px`);
      apply();
    };

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!state.dragging) {
        state.angle += state.velocity * dt;
        state.velocity *= Math.exp(-dt * 2.2);
        if (!state.hover && !reducedMotion) state.angle -= 4.5 * dt; // idle drift, degrees per second
      }
      apply();
      frame = requestAnimationFrame(tick);
    };
    const run = (on) => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (on) frame = requestAnimationFrame(tick);
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      state.dragging = true;
      state.moved = 0;
      state.velocity = 0;
      state.lastX = e.clientX;
      state.lastT = performance.now();
      box.setAttribute('data-dragging', '');
    };
    const onMove = (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastX;
      const now = performance.now();
      const degrees = (dx / state.radius) * (180 / Math.PI); // the surface follows the pointer
      state.angle += degrees;
      state.velocity = degrees / Math.max(0.008, (now - state.lastT) / 1000);
      state.moved += Math.abs(dx);
      state.lastX = e.clientX;
      state.lastT = now;
    };
    const onUp = () => {
      if (!state.dragging) return;
      state.dragging = false;
      state.velocity = Math.max(-240, Math.min(240, state.velocity));
      box.removeAttribute('data-dragging');
    };
    // a drag must not count as a click on the card under the pointer
    const onClick = (e) => {
      if (state.moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onEnter = () => (state.hover = true);
    const onLeave = () => (state.hover = false);

    box.addEventListener('pointerdown', onDown);
    box.addEventListener('click', onClick, true);
    box.addEventListener('pointerenter', onEnter);
    box.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(layout);
    ro.observe(box);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run(visible && !document.hidden);
    });
    io.observe(box);
    const onVisibility = () => run(visible && !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    layout();

    return () => {
      run(false);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('click', onClick, true);
      box.removeEventListener('pointerenter', onEnter);
      box.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="ring" data-reveal="">
      <div className="ring__stage" ref={stage}>
        <div className="ring__track" ref={track}>
          {COURSES.map((course, i) => (
            <Link
              key={i}
              className="course ring__card"
              to={`/register?course=${i}`}
              draggable={false}
              style={{ '--a': `${(360 / COURSES.length) * i}deg` }}
            >
              <span className="course__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="course__arrow" aria-hidden="true">
                <Icon name="arrowUpRight" />
              </span>
              <span className="course__glyph" aria-hidden="true">
                {course.g}
              </span>
              <span className="course__cat">{CATS[course.cat][lang]}</span>
              <span className="course__name">{course[lang]}</span>
            </Link>
          ))}
        </div>
      </div>
      <p className="ring__hint">{t('ring.hint')}</p>
    </div>
  );
}

/** Pill-shaped filter tabs. `options` = [[value, label], …] */
export function Filters({ options, value, onChange }) {
  return (
    <div className="filters" data-reveal="" role="tablist">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={key === value}
          className={key === value ? 'is-active' : undefined}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The three "what the academy gives you" cards. */
export function Features() {
  const { t } = useI18n();
  const items = [
    ['layers', 'about.f1'],
    ['compass', 'about.f2'],
    ['spark', 'about.f3'],
  ];
  return (
    <div className="features features--stack">
      {items.map(([icon, key], i) => (
        <article className="card feature tilt" data-reveal="" key={key}>
          <span className="card__num">{String(i + 1).padStart(2, '0')}</span>
          <div className="icon">
            <Icon name={icon} />
          </div>
          <div>
            <h3>{t(`${key}.title`)}</h3>
            <p>{t(`${key}.text`)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
