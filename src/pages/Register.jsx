import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Eyebrow } from '../components/Blocks.jsx';
import { FlagBackdrop } from '../components/Scenes.jsx';
import Icon from '../components/Icon.jsx';
import { CONFIG, COURSES } from '../data/courses.js';
import { finePointer, reducedMotion, wait } from '../lib/env.js';

const GROUPS = [
  ['lang', 'courses.lang'],
  ['exact', 'courses.exact'],
  ['social', 'courses.social'],
];
const STEPS = ['reg.s1', 'reg.s2', 'reg.s3'];
const pad = (n) => String(n).padStart(2, '0');

/**
 * Sign-up in three steps, with a "pass" on the left that fills in live
 * as the visitor chooses a direction and types their name.
 * /register?course=3 arrives from the course cards with a direction already chosen.
 */
export default function Register() {
  const { t, html, lang } = useI18n();
  usePage('title.register');
  const [params] = useSearchParams();

  const [course, setCourse] = useState(() => {
    const raw = params.get('course');
    const index = Number(raw);
    return raw !== null && raw !== '' && Number.isInteger(index) && COURSES[index] ? index : null;
  });
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [shine, setShine] = useState(false);

  const root = useRef(null);
  const panes = useRef(null);
  const pass = useRef(null);
  const errorRef = useRef(null);
  const scene = useRef(null);
  const moving = useRef(false);
  const heightBefore = useRef(0);

  // date and application number printed on the pass
  const stamp = useMemo(() => {
    const now = new Date();
    return {
      date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
      id: `MA-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }, []);

  // --- entrance ----------------------------------------------------------------
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.reg__in', { opacity: 0, y: 24, duration: 1.3, ease: 'power3.out', stagger: 0.11, delay: 0.25 });
      gsap.from(pass.current, {
        rotateY: -38,
        rotateX: 16,
        duration: 1.9,
        ease: 'power3.out',
        delay: 0.55,
        clearProps: 'transform',
      });
      gsap.from('.choice', { opacity: 0, y: 10, duration: 0.6, ease: 'power2.out', stagger: 0.02, delay: 0.95 });
    }, root);
    const id = setTimeout(() => setShine(true), 1900);
    return () => {
      clearTimeout(id);
      ctx.revert();
    };
  }, []);

  // the pass leans towards the pointer
  useEffect(() => {
    if (!finePointer || reducedMotion) return undefined;
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = pass.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        el.setAttribute('data-tracking', '');
        el.style.setProperty('--ry', `${-9 + nx * 13}deg`);
        el.style.setProperty('--rx', `${5 - ny * 9}deg`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  // --- steps ---------------------------------------------------------------------
  const go = (next) => {
    if (moving.current || next === step) return;
    if (reducedMotion) {
      setStep(next);
      return;
    }
    moving.current = true;
    heightBefore.current = panes.current.offsetHeight;
    gsap.to(panes.current.firstElementChild, {
      opacity: 0,
      x: next > step ? -22 : 22,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => setStep(next),
    });
  };

  useLayoutEffect(() => {
    if (!moving.current) return;
    const pane = panes.current.firstElementChild;
    gsap.fromTo(
      panes.current,
      { height: heightBefore.current },
      { height: panes.current.offsetHeight, duration: 0.6, ease: 'power3.out', clearProps: 'height' },
    );
    gsap.fromTo(
      pane.children,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        clearProps: 'opacity,transform',
        onComplete: () => (moving.current = false),
      },
    );
    if (step === 2 && finePointer) pane.querySelector('input')?.focus({ preventScroll: true });
  }, [step]);

  // --- submit ----------------------------------------------------------------------
  const submit = async (e) => {
    e.preventDefault();
    if (step !== 2 || sending || moving.current) return;

    const cleanName = name.trim();
    if (cleanName.length < 2 || phone.replace(/\D/g, '').length < 9) {
      setError(true);
      if (!reducedMotion) {
        requestAnimationFrame(() => {
          if (errorRef.current) gsap.fromTo(errorRef.current, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
        });
      }
      return;
    }
    setError(false);
    setSending(true);

    const payload = {
      name: cleanName,
      phone: phone.trim(),
      course: course == null ? null : COURSES[course].uz,
      lang,
      ref: stamp.id,
    };
    try {
      if (CONFIG.formEndpoint) {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        // Demo mode: no endpoint configured in src/data/courses.js → nothing is sent.
        console.info('[M.ACADEMY] sign-up form is in demo mode, payload:', payload);
        await wait(450);
      }
      go(3);
      setAccepted(true);
      setShine(true);
      scene.current?.pulse();
    } catch (err) {
      console.error('[M.ACADEMY] sign-up failed', err);
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const chosen = course == null ? null : COURSES[course];
  const cleanName = name.trim();

  return (
    <main className="reg" ref={root}>
      <FlagBackdrop
        className="reg__canvas"
        options={{ shots: ['ma'], layout: 'register', brightness: 0.62 }}
        onReady={(created) => {
          scene.current = created;
          created.intro();
        }}
      />
      <div className="reg__shade" aria-hidden="true" />

      <div className="container reg__grid">
        {/* ============ LEFT: headline + live pass ============ */}
        <div className="reg__intro">
          <div className="reg__in">
            <Eyebrow reveal={false}>{t('reg.eyebrow')}</Eyebrow>
          </div>
          <h1 className="h1 reg__title reg__in" {...html('reg.title')} />
          <p className="lead reg__in">{t('reg.lead')}</p>

          <div className="pass-wrap reg__in">
            <article
              className={`pass${accepted ? ' is-accepted' : ''}${shine ? ' is-shine' : ''}`}
              ref={pass}
              aria-hidden="true"
              onAnimationEnd={(e) => e.animationName === 'pass-shine' && setShine(false)}
            >
              <div className="pass__face">
                <header className="pass__head">
                  <img src="/img/logo-mark.webp" alt="" width="543" height="531" />
                  <span className="pass__brand">
                    <b>M.ACADEMY</b>
                    <small>ONLINE SCHOOL</small>
                  </span>
                  <em>{t('pass.kind')}</em>
                </header>

                <div className="pass__body">
                  <dl className="pass__rows">
                    <div>
                      <dt>{t('pass.name')}</dt>
                      <dd className={cleanName ? undefined : 'is-empty'}>{cleanName || t('pass.namePh')}</dd>
                    </div>
                    <div>
                      <dt>{t('pass.track')}</dt>
                      <dd key={`${course}`} className={`swap-in${chosen ? '' : ' is-empty'}`}>
                        {chosen ? chosen[lang] : t('pass.trackPh')}
                      </dd>
                    </div>
                  </dl>
                  <div className="pass__glyph swap-in" key={`${course}`}>
                    {chosen ? chosen.g : 'M'}
                  </div>
                </div>

                <footer className="pass__foot">
                  <span>
                    <small>{t('pass.date')}</small>
                    <b>{stamp.date}</b>
                  </span>
                  <span>
                    <small>№</small>
                    <b>{stamp.id}</b>
                  </span>
                  <span className="pass__motto">
                    BEYOND LEARNING.
                    <br />
                    BEYOND LIMITS.
                  </span>
                </footer>

                <span className="pass__stamp">{t('pass.stamp')}</span>
                <span className="pass__shine" aria-hidden="true" />
              </div>
            </article>
          </div>
        </div>

        {/* ============ RIGHT: three-step form ============ */}
        <form className="reg__card reg__in" onSubmit={submit} noValidate>
          <span className="reg__glow" aria-hidden="true" />

          <div className="stepper">
            <div className="stepper__line">
              <b style={{ transform: `scaleX(${(step - 1) / (STEPS.length - 1)})` }} />
            </div>
            <ol>
              {STEPS.map((key, i) => (
                <li key={key} className={i + 1 === step ? 'is-active' : i + 1 < step ? 'is-done' : undefined}>
                  <i>{pad(i + 1)}</i>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="reg__panes" ref={panes}>
            {step === 1 && (
              <section className="pane" key="1">
                <h2 className="pane__title">{t('reg.q1')}</h2>
                <div className="choices">
                  {GROUPS.map(([cat, key]) => (
                    <div className="choices__group" key={cat}>
                      <b>{t(key)}</b>
                      <div className="choices__list">
                        {COURSES.map((item, i) =>
                          item.cat === cat ? (
                            <button
                              key={i}
                              type="button"
                              className={`choice${course === i ? ' is-selected' : ''}`}
                              aria-pressed={course === i}
                              onClick={() => setCourse(i)}
                            >
                              <i>{item.g}</i>
                              {item[lang]}
                            </button>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="choices__list">
                    <button
                      type="button"
                      className={`choice choice--plain${course == null ? ' is-selected' : ''}`}
                      aria-pressed={course == null}
                      onClick={() => setCourse(null)}
                    >
                      {t('reg.undecided')}
                    </button>
                  </div>
                </div>
                <div className="reg__actions">
                  <span className="reg__hint">{t('reg.hint1')}</span>
                  <button type="button" className="btn btn--gold" onClick={() => go(2)}>
                    <span>{t('reg.next')}</span>
                    <Icon name="arrow" />
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="pane" key="2">
                <h2 className="pane__title">{t('reg.q2')}</h2>
                <label className="field">
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder=" "
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <span>{t('form.name')}</span>
                  <i />
                </label>
                <label className="field">
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder=" "
                    value={phone}
                    onFocus={() => !phone && setPhone('+998 ')}
                    onBlur={() => phone.trim() === '+998' && setPhone('')}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ''))}
                  />
                  <span>{t('form.phone')}</span>
                  <i />
                </label>
                {error && (
                  <p className="reg__error" role="alert" ref={errorRef}>
                    {t('form.error')}
                  </p>
                )}
                <p className="reg__note">{t('reg.note')}</p>
                <div className="reg__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => go(1)}>
                    {t('reg.back')}
                  </button>
                  <button type="submit" className="btn btn--gold" disabled={sending}>
                    <span>{t('form.submit')}</span>
                    <Icon name="arrow" />
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="pane pane--done" key="3">
                <svg className="reg__check" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="28" />
                  <path d="m20 33 9 9 16-18" />
                </svg>
                <h2 className="pane__title">{t('reg.doneTitle')}</h2>
                <p className="pane__text">{t('reg.doneText')}</p>
                <div className="reg__actions reg__actions--center">
                  <Link className="btn btn--ghost" to="/">
                    {t('reg.home')}
                  </Link>
                  <Link className="btn btn--gold" to="/courses">
                    {t('hero.cta1')}
                  </Link>
                </div>
              </section>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
