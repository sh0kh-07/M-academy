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
        <div className="cta__panel" data-reveal="">
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
