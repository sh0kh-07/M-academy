import './styles.css';
import gsap from 'gsap';
import { initI18n, getLang, onLang, t } from './i18n.js';
import { COURSES, CATS, CONFIG } from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const page = document.body.dataset.page;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let hero3d = null;

/* ------------------------------------------------------------------
   Nav, scroll progress, mobile menu
   ------------------------------------------------------------------ */
function initChrome() {
  const nav = $('#nav');
  const bar = $('#scroll-progress');
  const hero = $('#hero');
  const heroContent = $('.hero__content');
  let lastY = window.scrollY;
  let queued = false;

  $$(`[data-nav="${page}"]`).forEach((a) => {
    a.classList.add('is-current');
    a.setAttribute('aria-current', 'page');
  });

  const update = () => {
    queued = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

    nav.classList.toggle('is-scrolled', y > 30);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('is-hidden', y > lastY && y > 600 && !document.body.classList.contains('menu-open'));
      lastY = y;
    }

    if (hero) {
      const p = Math.min(1, y / (hero.offsetHeight || 1));
      hero3d?.setScroll(p);
      if (!reducedMotion) {
        heroContent.style.transform = p > 0 ? `translate3d(0, ${p * -70}px, 0)` : '';
        heroContent.style.opacity = String(Math.max(0, 1 - p * 1.6));
      }
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();

  // mobile menu
  const menu = $('#menu');
  const burger = $('#burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // footer
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
  $$('[data-social]').forEach((a) => {
    const url = CONFIG[a.dataset.social];
    if (url && url !== '#') {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.addEventListener('click', (e) => e.preventDefault());
    }
  });
}

/* ------------------------------------------------------------------
   Page-to-page transition: the screen dips to black, like a film cut
   ------------------------------------------------------------------ */
function initTransitions() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePage) return; // in-page anchors scroll natively

    e.preventDefault();
    if (reducedMotion) {
      window.location.href = url.href;
      return;
    }
    document.body.classList.add('is-leaving');
    setTimeout(() => (window.location.href = url.href), 420);
  });

  // coming back through the browser's back/forward cache
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.body.classList.remove('is-leaving', 'is-entering');
  });
}

/** Lift the black curtain once the page has painted. */
function enter() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('is-entering')));
}

/* ------------------------------------------------------------------
   Reveal on scroll
   ------------------------------------------------------------------ */
function initReveal() {
  const items = $$('[data-reveal]');
  const counts = new Map();
  items.forEach((el) => {
    const parent = el.parentElement;
    const i = counts.get(parent) ?? 0;
    counts.set(parent, i + 1);
    el.style.setProperty('--d', `${Math.min(i, 8) * 0.07}s`);
  });

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------
   Pointer: 3D tilt on cards, magnetic buttons (desktop only)
   ------------------------------------------------------------------ */
function initPointer() {
  if (!finePointer || reducedMotion) return;

  let active = null;
  let pending = null;
  const reset = (el) => {
    el.classList.remove('is-tilting');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  const apply = () => {
    const e = pending;
    pending = null;
    if (!e || !active) return;
    const r = active.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    active.classList.add('is-tilting');
    active.style.setProperty('--rx', `${(0.5 - y) * 9}deg`);
    active.style.setProperty('--ry', `${(x - 0.5) * 11}deg`);
    active.style.setProperty('--mx', `${x * 100}%`);
    active.style.setProperty('--my', `${y * 100}%`);
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('.tilt') : null;
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      if (!pending) requestAnimationFrame(apply);
      pending = e;
    },
    { passive: true },
  );

  $$('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.2);
      y((e.clientY - (r.top + r.height / 2)) * 0.28);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/* ------------------------------------------------------------------
   Courses, marquee and other language-dependent content
   ------------------------------------------------------------------ */
function initCourses() {
  const grid = $('#courses-grid');
  if (!grid) return;
  const lang = getLang();
  const featured = grid.dataset.featured?.split(',').map(Number);
  const list = featured ?? COURSES.map((_, i) => i);

  grid.innerHTML = list
    .map((i) => {
      const c = COURSES[i];
      return `
      <a class="course tilt" href="register.html?course=${i}" data-cat="${c.cat}" data-index="${i}" data-reveal>
        <span class="course__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="course__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></span>
        <span class="course__glyph" aria-hidden="true">${c.g}</span>
        <span class="course__cat">${CATS[c.cat][lang]}</span>
        <span class="course__name">${c[lang]}</span>
      </a>`;
    })
    .join('');

  const buttons = $$('#filters button');
  buttons.forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('is-active')) return;
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      const filter = btn.dataset.filter;
      const cards = $$('.course', grid);
      const show = cards.filter((c) => filter === 'all' || c.dataset.cat === filter);
      cards.forEach((c) => {
        c.classList.add('is-in');
        c.style.setProperty('--d', '0s');
        c.classList.toggle('is-hidden', !show.includes(c));
      });
      if (!reducedMotion) {
        gsap.fromTo(
          show,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.03, clearProps: 'all' },
        );
      }
      refreshScroll?.();
    }),
  );
}

function updateLanguageContent() {
  const lang = getLang();
  $$('.course').forEach((el) => {
    const c = COURSES[Number(el.dataset.index)];
    $('.course__cat', el).textContent = CATS[c.cat][lang];
    $('.course__name', el).textContent = c[lang];
  });
  $$('[data-course]').forEach((el) => {
    el.textContent = COURSES[Number(el.dataset.course)][lang];
  });
  const marquee = $('#marquee');
  if (marquee) {
    const half = COURSES.map((c) => `<span>${c[lang]}</span>`).join('');
    marquee.innerHTML = half + half;
  }
  refreshScroll?.();
}

/* ------------------------------------------------------------------
   Counters
   ------------------------------------------------------------------ */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;
  const format = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => (el.textContent = format(Number(el.dataset.count))));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const state = { v: 0 };
        gsap.to(state, {
          v: Number(el.dataset.count),
          duration: 2.4,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = format(state.v)),
        });
      }),
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------
   Learning path: pinned horizontal scroll on desktop, timeline on mobile
   ------------------------------------------------------------------ */
let refreshScroll = null;

async function initPath() {
  const track = $('#path-track');
  if (!track) return;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  refreshScroll = () => ScrollTrigger.refresh();

  const fill = $('#path-fill');
  const steps = $$('.step', track);
  const mark = (progress) =>
    steps.forEach((step, i) => step.classList.toggle('is-active', progress >= i / steps.length - 0.01));
  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.path',
        pin: '.path__pin',
        start: 'top top',
        end: () => `+=${distance() + window.innerHeight * 0.5}`,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          fill.style.transform = `scaleX(${self.progress})`;
          mark(self.progress);
        },
      },
    });
    return () => {
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
      fill.style.transform = '';
    };
  });

  mm.add('(max-width: 899.98px), (prefers-reduced-motion: reduce)', () => {
    const st = ScrollTrigger.create({
      trigger: track,
      start: 'top 75%',
      end: 'bottom 55%',
      onUpdate: (self) => {
        fill.style.transform = `scaleY(${self.progress})`;
        mark(self.progress);
      },
    });
    return () => st.kill();
  });
}

/* ------------------------------------------------------------------
   NIGINA demo conversation
   ------------------------------------------------------------------ */
function initChat() {
  const chat = $('#chat');
  if (!chat) return;
  const body = $('#chat-body');
  let run = 0;
  let visible = false;

  const bubble = (who) => {
    const el = document.createElement('div');
    el.className = `bubble bubble--${who}`;
    body.append(el);
    while (body.children.length > 4) body.firstElementChild.remove();
    return el;
  };

  async function play() {
    const id = ++run;
    const alive = () => id === run && visible;
    body.innerHTML = '';
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

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else run++;
    },
    { threshold: 0.35 },
  ).observe(chat);

  onLang(() => visible && play());
}

/* ------------------------------------------------------------------
   3D emblem (Academy page)
   ------------------------------------------------------------------ */
async function initEmblem() {
  const canvas = $('#emblem-canvas');
  if (!canvas) return;
  try {
    const { createEmblem } = await import('./emblem.js');
    createEmblem(canvas, { reducedMotion });
    canvas.parentElement.classList.add('is-3d');
  } catch (err) {
    console.warn('[M.ACADEMY] 3D emblem unavailable, showing the flat logo', err);
  }
}

/* ------------------------------------------------------------------
   Home: preloader (first visit only) → the first shot fades up
   ------------------------------------------------------------------ */
async function bootHome() {
  const preloader = $('#preloader');
  const canvas = $('#hero-canvas');
  const bars = $$('#hero-shots i');

  let seen = false;
  try {
    seen = sessionStorage.getItem('ma-seen') === '1';
    sessionStorage.setItem('ma-seen', '1');
  } catch {
    /* private mode: the preloader simply shows every time */
  }
  if (seen || reducedMotion) preloader.classList.add('is-skipped');
  else {
    document.body.classList.add('is-loading');
    document.body.classList.remove('is-entering'); // the preloader covers the page instead
  }

  const num = $('#preloader-num');
  const bar = $('#preloader-bar');
  const progress = { v: 0 };
  const setProgress = (v, duration = 0.8) =>
    gsap.to(progress, {
      v,
      duration,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => {
        num.textContent = String(Math.round(progress.v));
        bar.style.transform = `scaleX(${progress.v / 100})`;
      },
    });
  setProgress(40, 1.4);

  // copy starts hidden; it is revealed once the picture is up
  const copy = reducedMotion
    ? null
    : gsap
        .timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .from('.hero__line > span', { yPercent: 108, duration: 1.7, stagger: 0.16, clearProps: 'transform' }, 0.5)
        .from(
          '.hero__eyebrow, .hero__sub, .hero__cta, .hero__tags, .hero__shots, .hero__scroll',
          { opacity: 0, y: 16, duration: 1.5, stagger: 0.12, clearProps: 'all' },
          0.9,
        );

  const heroPromise = import('./hero.js')
    .then((m) => m.createHero(canvas, { reducedMotion }))
    .catch((err) => {
      console.warn('[M.ACADEMY] WebGL hero unavailable, using the static fallback', err);
      document.documentElement.classList.add('no-webgl');
      return null;
    });

  const attach = (hero) => {
    hero3d = hero;
    if (!hero) return;
    hero.onShot((index, seconds) => {
      bars.forEach((b) => b.classList.remove('is-active'));
      const current = bars[index];
      if (!current) return;
      current.style.setProperty('--shot', `${seconds}s`);
      void current.offsetWidth; // restart the fill animation
      current.classList.add('is-active');
    });
  };

  const TIMEOUT = Symbol('timeout');
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const first = await Promise.race([heroPromise, wait(7000).then(() => TIMEOUT)]);
  let started = false;
  if (first === TIMEOUT) {
    heroPromise.then((hero) => {
      attach(hero);
      if (started) hero?.intro();
    });
  } else {
    attach(first);
  }
  await Promise.race([fonts, wait(2500)]);

  const start = () => {
    started = true;
    document.body.classList.remove('is-loading', 'is-entering');
    hero3d?.intro();
    copy?.play();
  };

  if (seen || reducedMotion) {
    start();
    return;
  }

  await setProgress(100, 0.5);
  gsap
    .timeline()
    .to('.preloader__inner', { opacity: 0, duration: 0.7, ease: 'power2.inOut' })
    .add(start, '+=0.15')
    .to(preloader, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, '<')
    .add(() => preloader.remove());
}

/* ------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------ */
function boot() {
  initI18n();
  initChrome();
  initTransitions();
  initCourses();
  updateLanguageContent();
  initReveal();
  initPointer();
  initCounters();
  initPath();
  initChat();
  initEmblem();
  onLang(updateLanguageContent);

  if (page === 'home') {
    bootHome();
  } else if (page === 'register') {
    import('./register.js').then((m) => m.initRegister({ reducedMotion, finePointer, enter }));
  } else {
    enter();
  }
}

if (import.meta.env.DEV) window.__gsap = gsap; // dev only: lets tests fast-forward animations

boot();
