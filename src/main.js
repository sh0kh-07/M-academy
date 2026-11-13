import 'lenis/dist/lenis.css';
import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initI18n, t, getLang, onLang } from './i18n.js';
import { COURSES, CATS, CONFIG } from './data.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis = null;
let hero3d = null;

/* ------------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------------ */
function initScroll() {
  if (!reducedMotion) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released when the preloader leaves
  }

  const nav = $('#nav');
  const bar = $('#scroll-progress');
  const hero = $('#hero');
  const heroContent = $('.hero__content');
  const heroCanvas = $('#hero-canvas');
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

    nav.classList.toggle('is-scrolled', y > 30);
    if (Math.abs(y - lastY) > 6) {
      const down = y > lastY;
      nav.classList.toggle('is-hidden', down && y > 600 && !document.body.classList.contains('menu-open'));
      lastY = y;
    }

    const p = Math.min(1, y / (hero.offsetHeight || 1));
    hero3d?.setScroll(p);
    if (p < 1 && !reducedMotion) {
      heroContent.style.transform = `translate3d(0, ${p * -90}px, 0)`;
      heroContent.style.opacity = String(Math.max(0, 1 - p * 1.7));
      heroCanvas.style.opacity = String(Math.max(0, 1 - p * 1.15));
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // a click or tap on the hero sends a gust of wind through the flags
  hero.addEventListener('pointerdown', () => hero3d?.gust(0.9));
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

function initAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (id === '#') {
      e.preventDefault();
      return;
    }
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (id === '#top') {
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else {
      scrollToTarget(target);
    }
  });
}

/* ------------------------------------------------------------------
   Mobile menu
   ------------------------------------------------------------------ */
const menu = () => $('#menu');

function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  menu().classList.remove('is-open');
  menu().setAttribute('aria-hidden', 'true');
  $('#burger').setAttribute('aria-expanded', 'false');
  lenis?.start();
}

function initMenu() {
  $('#burger').addEventListener('click', () => {
    if (document.body.classList.contains('menu-open')) {
      closeMenu();
      return;
    }
    document.body.classList.add('menu-open');
    menu().classList.add('is-open');
    menu().setAttribute('aria-hidden', 'false');
    $('#burger').setAttribute('aria-expanded', 'true');
    lenis?.stop();
  });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
}

/* ------------------------------------------------------------------
   Courses, marquee and other language-dependent content
   ------------------------------------------------------------------ */
function renderCourses() {
  const lang = getLang();
  $('#courses-grid').innerHTML = COURSES.map(
    (c, i) => `
      <button type="button" class="course tilt" data-cat="${c.cat}" data-index="${i}" data-reveal>
        <span class="course__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="course__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></span>
        <span class="course__glyph" aria-hidden="true">${c.g}</span>
        <span class="course__cat">${CATS[c.cat][lang]}</span>
        <span class="course__name">${c[lang]}</span>
      </button>`,
  ).join('');
}

function updateCourseTexts() {
  const lang = getLang();
  $$('.course').forEach((el) => {
    const c = COURSES[Number(el.dataset.index)];
    $('.course__cat', el).textContent = CATS[c.cat][lang];
    $('.course__name', el).textContent = c[lang];
  });
  $$('[data-course]').forEach((el) => {
    el.textContent = COURSES[Number(el.dataset.course)][lang];
  });
}

function renderMarquee() {
  const lang = getLang();
  const half = COURSES.map((c) => `<span>${c[lang]}</span>`).join('');
  $('#marquee').innerHTML = half + half;
}

function renderCourseOptions() {
  const lang = getLang();
  const select = $('#signup-course');
  const previous = select.value;
  select.innerHTML =
    `<option value="">${t('form.any')}</option>` +
    COURSES.map((c, i) => `<option value="${i}">${c[lang]}</option>`).join('');
  select.value = previous;
}

function initFilters() {
  const buttons = $$('#filters button');
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      const filter = btn.dataset.filter;
      const cards = $$('.course');
      const show = cards.filter((c) => filter === 'all' || c.dataset.cat === filter);

      cards.forEach((c) => {
        c.classList.add('is-in');
        c.style.setProperty('--d', '0s');
        c.classList.toggle('is-hidden', !show.includes(c));
      });
      if (!reducedMotion) {
        gsap.fromTo(
          show,
          { opacity: 0, y: 26, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', stagger: 0.035, clearProps: 'all' },
        );
      }
      ScrollTrigger.refresh();
    }),
  );
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
   Pointer niceties: 3D tilt, cursor halo, magnetic buttons
   ------------------------------------------------------------------ */
function initTilt() {
  if (!finePointer || reducedMotion) return;
  let active = null;
  const reset = (el) => {
    el.classList.remove('is-tilting');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('.tilt') : null;
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.classList.add('is-tilting');
      el.style.setProperty('--rx', `${(0.5 - y) * 11}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * 13}deg`);
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => active && reset(active));
}

function initCursor() {
  if (!finePointer || reducedMotion) return;
  const cursor = $('#cursor');
  const ring = $('i', cursor);
  const glow = $('b', cursor);
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
  const glowX = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3.out' });
  const glowY = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3.out' });
  window.addEventListener(
    'pointermove',
    (e) => {
      cursor.classList.add('is-on');
      ringX(e.clientX);
      ringY(e.clientY);
      glowX(e.clientX);
      glowY(e.clientY);
      const hot = e.target instanceof Element && e.target.closest('a, button, .tilt, select, input');
      cursor.classList.toggle('is-hover', Boolean(hot));
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
}

function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  $$('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.28);
      y((e.clientY - (r.top + r.height / 2)) * 0.38);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ------------------------------------------------------------------
   Counters
   ------------------------------------------------------------------ */
function initCounters() {
  const els = $$('[data-count]');
  const finish = (el) => (el.textContent = Number(el.dataset.count).toLocaleString('ru-RU').replace(/ /g, ' '));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    els.forEach(finish);
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
          duration: 2.2,
          ease: 'expo.out',
          onUpdate: () => (el.textContent = Math.round(state.v).toLocaleString('ru-RU').replace(/ /g, ' ')),
          onComplete: () => finish(el),
        });
      }),
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------
   Learning path: pinned horizontal scroll on desktop, timeline on mobile
   ------------------------------------------------------------------ */
function initPath() {
  const track = $('#path-track');
  const fill = $('#path-fill');
  const steps = $$('.step', track);
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
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          fill.style.transform = `scaleX(${self.progress})`;
          steps.forEach((step, i) => step.classList.toggle('is-active', self.progress >= i / steps.length - 0.01));
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
        steps.forEach((step, i) => step.classList.toggle('is-active', self.progress >= i / steps.length - 0.01));
      },
    });
    return () => st.kill();
  });
}

/* ------------------------------------------------------------------
   NIGINA demo conversation
   ------------------------------------------------------------------ */
function initChat() {
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
        await wait(who === 'user' ? 32 : 15);
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
  ).observe($('#chat'));

  onLang(() => visible && play());
}

/* ------------------------------------------------------------------
   Sign-up dialog
   ------------------------------------------------------------------ */
function initForm() {
  const dialog = $('#signup');
  const form = $('#signup-form');
  const done = $('#signup-done');
  const error = $('#signup-error');
  const phone = form.elements.phone;

  const open = (courseIndex) => {
    closeMenu();
    done.hidden = true;
    error.hidden = true;
    if (courseIndex != null) form.elements.course.value = String(courseIndex);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    lenis?.stop();
  };
  const close = () => dialog.close();

  dialog.addEventListener('close', () => lenis?.start());
  dialog.addEventListener('click', (e) => e.target === dialog && close());

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('[data-close-form]')) {
      close();
      return;
    }
    const course = e.target.closest('.course');
    if (course) {
      open(course.dataset.index);
      return;
    }
    if (e.target.closest('[data-open-form]')) open();
  });

  phone.addEventListener('focus', () => {
    if (!phone.value) phone.value = '+998 ';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const digits = phone.value.replace(/\D/g, '');
    if (name.length < 2 || digits.length < 9) {
      error.hidden = false;
      return;
    }
    error.hidden = true;

    const index = form.elements.course.value;
    const payload = {
      name,
      phone: phone.value.trim(),
      course: index === '' ? null : COURSES[Number(index)].uz,
      lang: getLang(),
    };

    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    try {
      if (CONFIG.formEndpoint) {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        // Demo mode: no endpoint configured in src/data.js → nothing is sent.
        console.info('[M.ACADEMY] sign-up form is in demo mode, payload:', payload);
        await wait(500);
      }
      done.hidden = false;
      form.reset();
    } catch (err) {
      console.error('[M.ACADEMY] sign-up failed', err);
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  // contact + social links come from CONFIG
  const contact = $('#contact-link');
  if (CONFIG.telegram && CONFIG.telegram !== '#') {
    contact.href = CONFIG.telegram;
    contact.target = '_blank';
    contact.rel = 'noopener';
  } else {
    contact.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  }
  $$('[data-social]').forEach((a) => {
    const url = CONFIG[a.dataset.social];
    if (url && url !== '#') {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
}

/* ------------------------------------------------------------------
   3D emblem — loaded only when the section approaches
   ------------------------------------------------------------------ */
function initEmblem() {
  const canvas = $('#emblem-canvas');
  if (!canvas || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      try {
        const { createEmblem } = await import('./emblem.js');
        createEmblem(canvas, { reducedMotion });
        canvas.parentElement.classList.add('is-3d');
      } catch (err) {
        console.warn('[M.ACADEMY] 3D emblem unavailable, showing the flat logo', err);
      }
    },
    { rootMargin: '700px' },
  );
  io.observe(canvas);
}

/* ------------------------------------------------------------------
   Preloader + hero intro
   ------------------------------------------------------------------ */
async function boot() {
  initI18n();
  renderCourses();
  updateCourseTexts();
  renderMarquee();
  renderCourseOptions();
  $('#year').textContent = String(new Date().getFullYear());

  initScroll();
  initAnchors();
  initMenu();
  initFilters();
  initReveal();
  initTilt();
  initCursor();
  initMagnetic();
  initCounters();
  initPath();
  initChat();
  initForm();
  initEmblem();

  onLang(() => {
    updateCourseTexts();
    renderMarquee();
    renderCourseOptions();
    ScrollTrigger.refresh();
  });

  // --- preloader ---
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

  setProgress(38, 1.4);

  const heroPromise = import('./hero.js')
    .then((m) => m.createHero($('#hero-canvas'), { reducedMotion }))
    .catch((err) => {
      console.warn('[M.ACADEMY] WebGL hero unavailable, using the static fallback', err);
      document.documentElement.classList.add('no-webgl');
      return null;
    });
  const fonts = document.fonts?.ready ?? Promise.resolve();
  fonts.then(() => progress.v < 70 && setProgress(70, 0.8));

  const TIMEOUT = Symbol('timeout');
  const first = await Promise.race([heroPromise, wait(8000).then(() => TIMEOUT)]);
  let introPlayed = false;
  if (first === TIMEOUT) {
    heroPromise.then((h) => {
      hero3d = h;
      if (introPlayed) h?.intro();
    });
  } else {
    hero3d = first;
  }
  await Promise.race([fonts, wait(2500)]);
  await setProgress(100, 0.5);

  // --- intro ---
  const releasePage = () => {
    document.body.classList.remove('is-loading');
    lenis?.start();
    ScrollTrigger.refresh();
  };

  if (reducedMotion) {
    $('#preloader').remove();
    releasePage();
    introPlayed = true;
    return;
  }

  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .to('.preloader__inner', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' })
    .to('#preloader', { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, '-=0.05')
    .add(() => {
      introPlayed = true;
      hero3d?.intro();
    }, '-=0.85')
    .from('#nav', { yPercent: -120, opacity: 0, duration: 1.2, clearProps: 'all' }, '-=0.45')
    .from('.hero__line > span', { yPercent: 118, duration: 1.3, stagger: 0.13, clearProps: 'transform' }, '<0.05')
    .from(
      '.hero__eyebrow, .hero__sub, .hero__cta, .hero__tags, .hero__scroll',
      { opacity: 0, y: 28, duration: 1.1, stagger: 0.09, clearProps: 'all' },
      '<0.25',
    )
    .add(() => {
      $('#preloader').remove();
      releasePage();
    }, '<0.2');
}

boot();
