import gsap from 'gsap';
import { t, getLang, onLang } from './i18n.js';
import { COURSES, CONFIG } from './data.js';

/* ------------------------------------------------------------------
   Sign-up page: three steps, with a "pass" that fills in live
   as the visitor chooses a direction and types their name.
   ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GROUPS = [
  ['lang', 'courses.lang'],
  ['exact', 'courses.exact'],
  ['social', 'courses.social'],
];

export function initRegister({ reducedMotion, finePointer, enter }) {
  const form = $('#reg-form');
  const panes = $('.reg__panes', form);
  const choices = $('#choices');
  const pass = $('#pass');
  const passName = $('#pass-name');
  const passTrack = $('#pass-track');
  const passGlyph = $('#pass-glyph');
  const fill = $('#stepper-fill');
  const steps = $$('#stepper li');
  const error = $('#reg-error');
  const nameInput = form.elements.name;
  const phoneInput = form.elements.phone;

  const state = { step: 1, course: null, busy: false };
  let backdrop = null;

  // ?course=3 arrives from the course cards
  const param = Number(new URLSearchParams(window.location.search).get('course'));
  const hasParam = window.location.search.includes('course=') && Number.isInteger(param) && COURSES[param];
  if (hasParam) state.course = param;

  // --- the pass -----------------------------------------------------------
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  $('#pass-date').textContent = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  $('#pass-id').textContent = `MA-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}-${String(
    Math.floor(1000 + Math.random() * 9000),
  )}`;

  const swap = (el, apply) => {
    if (reducedMotion) {
      apply();
      return;
    }
    el.classList.add('is-swap');
    setTimeout(() => {
      apply();
      el.classList.remove('is-swap');
    }, 200);
  };

  const paintName = () => {
    const value = nameInput.value.trim();
    passName.textContent = value || t('pass.namePh');
    passName.classList.toggle('is-empty', !value);
  };

  const paintTrack = (animate = true) => {
    const course = state.course == null ? null : COURSES[state.course];
    const apply = () => {
      passTrack.textContent = course ? course[getLang()] : t('pass.trackPh');
      passTrack.classList.toggle('is-empty', !course);
      passGlyph.textContent = course ? course.g : 'M';
    };
    if (!animate) {
      apply();
      return;
    }
    swap(passTrack, apply);
    passGlyph.classList.add('is-swap');
    setTimeout(() => passGlyph.classList.remove('is-swap'), reducedMotion ? 0 : 220);
  };

  // the pass leans towards the pointer
  if (finePointer && !reducedMotion) {
    let frame = 0;
    window.addEventListener(
      'pointermove',
      (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = pass.getBoundingClientRect();
          const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
          const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
          pass.classList.add('is-tracking');
          pass.style.setProperty('--ry', `${-9 + nx * 13}deg`);
          pass.style.setProperty('--rx', `${5 - ny * 9}deg`);
        });
      },
      { passive: true },
    );
  }

  // --- step 1: directions ---------------------------------------------------
  function renderChoices() {
    const lang = getLang();
    choices.innerHTML =
      GROUPS.map(
        ([cat, key]) => `
        <div class="choices__group">
          <b>${t(key)}</b>
          <div class="choices__list">
            ${COURSES.map((c, i) =>
              c.cat === cat
                ? `<button type="button" class="choice${state.course === i ? ' is-selected' : ''}" data-course="${i}" aria-pressed="${state.course === i}"><i>${c.g}</i>${c[lang]}</button>`
                : '',
            ).join('')}
          </div>
        </div>`,
      ).join('') +
      `<div class="choices__list">
        <button type="button" class="choice choice--plain${state.course == null ? ' is-selected' : ''}" data-course="" aria-pressed="${state.course == null}">${t('reg.undecided')}</button>
      </div>`;
  }

  choices.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.choice') : null;
    if (!btn) return;
    state.course = btn.dataset.course === '' ? null : Number(btn.dataset.course);
    $$('.choice', choices).forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
    paintTrack();
  });

  // --- steps ------------------------------------------------------------------
  const pane = (n) => $(`.pane[data-step="${n}"]`, form);

  function markSteps() {
    steps.forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === state.step);
      li.classList.toggle('is-done', i + 1 < state.step);
    });
    fill.style.transform = `scaleX(${(state.step - 1) / (steps.length - 1)})`;
  }

  function go(step) {
    if (state.busy || step === state.step) return;
    const from = pane(state.step);
    const to = pane(step);
    const dir = step > state.step ? 1 : -1;
    state.step = step;
    markSteps();

    const show = () => {
      from.hidden = true;
      from.classList.remove('is-active');
      to.hidden = false;
      to.classList.add('is-active');
    };
    if (reducedMotion) {
      show();
      return;
    }

    state.busy = true;
    const before = panes.offsetHeight;
    gsap.to(from, {
      opacity: 0,
      x: -22 * dir,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(from, { clearProps: 'all' });
        show();
        const after = panes.offsetHeight;
        gsap.fromTo(panes, { height: before }, { height: after, duration: 0.6, ease: 'power3.out', clearProps: 'height' });
        gsap.fromTo(
          to.children,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.07,
            clearProps: 'opacity,transform',
            onComplete: () => (state.busy = false),
          },
        );
        if (step === 2 && finePointer) nameInput.focus({ preventScroll: true });
      },
    });
  }

  form.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('[data-next]')) go(2);
    if (e.target.closest('[data-back]')) go(1);
  });

  // --- step 2: details --------------------------------------------------------
  nameInput.addEventListener('input', paintName);
  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+998 ';
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.trim() === '+998') phoneInput.value = '';
  });
  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/[^\d+\s()-]/g, '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.step !== 2 || state.busy) return;

    const name = nameInput.value.trim();
    const digits = phoneInput.value.replace(/\D/g, '');
    if (name.length < 2 || digits.length < 9) {
      error.hidden = false;
      if (!reducedMotion) gsap.fromTo(error, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
      return;
    }
    error.hidden = true;

    const payload = {
      name,
      phone: phoneInput.value.trim(),
      course: state.course == null ? null : COURSES[state.course].uz,
      lang: getLang(),
      ref: $('#pass-id').textContent,
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
        await wait(450);
      }
      go(3);
      pass.classList.add('is-accepted', 'is-shine');
      backdrop?.pulse();
    } catch (err) {
      console.error('[M.ACADEMY] sign-up failed', err);
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  // --- language -----------------------------------------------------------------
  onLang(() => {
    renderChoices();
    paintName();
    paintTrack(false);
  });

  // --- first paint ------------------------------------------------------------------
  renderChoices();
  paintName();
  paintTrack(false);
  markSteps();

  if (!reducedMotion) {
    gsap.from('.reg__in', { opacity: 0, y: 24, duration: 1.3, ease: 'power3.out', stagger: 0.11, delay: 0.25 });
    gsap.from(pass, { rotateY: -38, rotateX: 16, duration: 1.9, ease: 'power3.out', delay: 0.55, clearProps: 'transform' });
    gsap.from('.choice', { opacity: 0, y: 10, duration: 0.6, ease: 'power2.out', stagger: 0.02, delay: 0.95 });
    setTimeout(() => pass.classList.add('is-shine'), 1900);
    pass.addEventListener('animationend', () => pass.classList.remove('is-shine'));
  }

  // the backdrop is a nicety: the page works without it
  import('./hero.js')
    .then((m) => m.createHero($('#reg-canvas'), { reducedMotion, shots: ['ma'], layout: 'register', brightness: 0.62 }))
    .then((scene) => {
      backdrop = scene;
      scene.intro();
    })
    .catch((err) => {
      console.warn('[M.ACADEMY] WebGL backdrop unavailable', err);
      document.documentElement.classList.add('no-webgl');
    });

  enter();
}
