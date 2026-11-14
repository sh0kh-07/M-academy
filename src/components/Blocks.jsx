import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { cue } from '../lib/uiSound.js';
import { useI18n } from '../i18n/index.jsx';
import { courseHref } from '../lib/catalog.js';
import { mediaUrl, pick } from '../lib/http.js';
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

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');

/** What every course card shows: dimmed image (if any), number, glyph, category, name. */
function CourseFace({ course, index }) {
  const { lang } = useI18n();
  const name = pick(course.title, lang);
  return (
    <>
      {course.image && <img className="course__img" src={mediaUrl(course.image)} alt="" loading="lazy" draggable={false} />}
      <span className="course__num">{String(index + 1).padStart(2, '0')}</span>
      <span className="course__arrow" aria-hidden="true">
        <Icon name="arrowUpRight" />
      </span>
      <span className="course__glyph" aria-hidden="true">
        {course.glyph || initials(name)}
      </span>
      <span className="course__cat">{course.catTitle ? pick(course.catTitle, lang) : '\u00a0'}</span>
      <span className="course__name">{name}</span>
    </>
  );
}

/**
 * Course cards from the catalogue (src/lib/catalog.js); `filter` hides other categories.
 * A card opens the course page, or the sign-up page while the built-in list stands in.
 */
export function CourseGrid({ courses, filter = 'all' }) {
  const ref = useRef(null);
  const first = useRef(true);

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
      {courses.map((course, i) => {
        const hidden = filter !== 'all' && course.cat !== filter;
        return (
          <Link key={course.id} className={`course tilt${hidden ? ' is-hidden' : ''}`} to={courseHref(course)} data-reveal="">
            <CourseFace course={course} index={i} />
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The directions as a slowly turning 3D ring of cards (pure CSS 3D, one transform per frame).
 * Drag sideways to spin it; a card opens that course. Give it a `key` that changes with the
 * list — the ring measures its cards once when it mounts.
 */
/**
 * A quiet starfield on a 2D canvas behind the course ring. Stars sit at different depths:
 * near ones drift further as the ring turns (parallax), all of them twinkle slowly, and
 * now and then a thin shooting star crosses the sky. Drawn in the ring's own frame loop.
 */
function createStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0;
  let h = 0;
  let stars = [];
  let time = 0;
  let shoot = null;
  let nextShoot = 4 + Math.random() * 5;

  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(320, Math.round((w * h) / 3200));
    stars = Array.from({ length: count }, () => {
      const z = Math.random() ** 1.8; // most stars far away and faint
      return {
        x: Math.random(),
        y: Math.random(),
        z,
        r: 0.35 + z * 1.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.6,
        gold: Math.random() < 0.18,
      };
    });
  };

  const draw = (angle, dt) => {
    if (!w || !h) return;
    time += reducedMotion ? 0 : dt;
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      // the ring's turn moves near stars further than far ones
      let x = (s.x * w + angle * (2 + s.z * 7)) % w;
      if (x < 0) x += w;
      const y = s.y * h;
      const twinkle = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      const alpha = (0.24 + s.z * 0.76) * twinkle;
      ctx.fillStyle = s.gold ? `rgba(246, 222, 166, ${alpha})` : `rgba(214, 224, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.z > 0.82) {
        // the brightest few get a soft cross of light
        ctx.fillStyle = s.gold ? `rgba(246, 222, 166, ${alpha * 0.35})` : `rgba(214, 224, 255, ${alpha * 0.35})`;
        ctx.fillRect(x - s.r * 4, y - 0.4, s.r * 8, 0.8);
        ctx.fillRect(x - 0.4, y - s.r * 4, 0.8, s.r * 8);
      }
    }

    if (reducedMotion) return;
    nextShoot -= dt;
    if (!shoot && nextShoot <= 0) {
      shoot = { x: w * (0.2 + Math.random() * 0.7), y: h * Math.random() * 0.35, life: 0 };
      nextShoot = 6 + Math.random() * 8;
    }
    if (shoot) {
      shoot.life += dt;
      const k = shoot.life / 0.9;
      if (k >= 1) {
        shoot = null;
      } else {
        const len = 120;
        const x = shoot.x - k * 260;
        const y = shoot.y + k * 110;
        const g = ctx.createLinearGradient(x, y, x + len, y - len * 0.42);
        const a = Math.sin(Math.PI * k) * 0.8;
        g.addColorStop(0, `rgba(255, 240, 205, ${a})`);
        g.addColorStop(1, 'rgba(255, 240, 205, 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y - len * 0.42);
        ctx.stroke();
      }
    }
  };

  return { resize, draw, dispose: () => ctx.clearRect(0, 0, w, h) };
}

/** Cards on the ring: a short list is repeated so the ring is always full (at least RING_SLOTS cards). */
const RING_SLOTS = 12;

export function CourseRing({ courses }) {
  const { t } = useI18n();
  const stage = useRef(null);
  const track = useRef(null);
  const stars = useRef(null);
  const rounds = Math.max(1, Math.ceil(RING_SLOTS / courses.length));
  const slots = Array.from({ length: rounds }, () => courses).flat();

  useEffect(() => {
    const box = stage.current;
    const el = track.current;
    const count = el.children.length;
    const state = { angle: 0, velocity: 0, radius: 0, dragging: false, moved: 0, lastX: 0, lastT: 0, hover: false };
    let frame = 0;
    let last = performance.now();
    let visible = false;

    const sky = createStarfield(stars.current);

    const apply = () => {
      el.style.transform = `rotateX(-4deg) translateZ(${-state.radius}px) rotateY(${state.angle.toFixed(3)}deg)`;
    };
    const layout = () => {
      const card = el.firstElementChild;
      const gap = Math.max(24, card.offsetWidth * 0.3);
      // wide: the ring always spans most of the screen, however few cards it has
      const fromCards = (count * (card.offsetWidth + gap)) / (Math.PI * 2);
      state.radius = Math.round(Math.max(fromCards, box.clientWidth * 0.46));
      el.style.setProperty('--r', `${state.radius}px`);
      sky.resize();
      apply();
      sky.draw(state.angle, 0);
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
      sky.draw(state.angle, dt);
      // like an iPhone picker: a detent tick each time a card passes the front, while spun by hand
      const front = Math.round(-state.angle / (360 / count));
      if (front !== state.front) {
        if (state.front !== undefined && (state.dragging || Math.abs(state.velocity) > 12)) {
          cue('detent', { index: ((front % count) + count) % count });
        }
        state.front = front;
      }
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
      sky.dispose();
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
      <canvas className="ring__stars" ref={stars} aria-hidden="true" />
      <div className="ring__stage" ref={stage}>
        <div className="ring__track" ref={track}>
          {slots.map((course, i) => (
            <Link
              key={`${course.id}-${i}`}
              className="course ring__card"
              to={courseHref(course)}
              draggable={false}
              tabIndex={i < courses.length ? undefined : -1}
              aria-hidden={i < courses.length ? undefined : true}
              style={{ '--a': `${(360 / slots.length) * i}deg` }}
            >
              <CourseFace course={course} index={i % courses.length} />
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
