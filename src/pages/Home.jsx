import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { CourseGrid, CourseRing, Cta, Eyebrow, Features, Stats } from '../components/Blocks.jsx';
import { FlagBackdrop, LanguageGlobe } from '../components/Scenes.jsx';
import { PostCard } from '../components/NewsParts.jsx';
import Icon from '../components/Icon.jsx';
import { COURSES } from '../data/courses.js';
import { PLACES } from '../data/places.js';
import { reducedMotion, wait } from '../lib/env.js';
import { FALLBACK, useCatalog } from '../lib/catalog.js';
import { useFeed } from '../lib/newsFeed.js';
import { pick } from '../lib/http.js';
import { FounderSection } from './Founder.jsx';
import { lockScroll, scrollToElement, unlockScroll } from '../lib/scroll.js';

/** The logo preloader is shown once per browser session, on the first visit to the home page. */
function firstVisit() {
  try {
    const seen = sessionStorage.getItem('ma-seen') === '1';
    sessionStorage.setItem('ma-seen', '1');
    return !seen;
  } catch {
    return true;
  }
}

// fewer courses than this look sparse on the 3D ring, so they are shown as cards instead
const RING_MIN = 6;

export default function Home() {
  const { t, html, lang } = useI18n();
  const catalog = useCatalog();
  const feed = useFeed();
  const ready = usePage('title.home', { autoReady: false });

  const [preloader, setPreloader] = useState(() => firstVisit() && !reducedMotion);
  const root = useRef(null);
  const hero = useRef(null);
  const content = useRef(null);
  const bars = useRef(null);
  const pre = useRef(null);
  const scene = useRef(null);
  const copy = useRef(null);
  const gate = useRef(null); // resolves when the flags are ready (or have failed)

  if (!gate.current) {
    let open;
    const promise = new Promise((resolve) => (open = resolve));
    gate.current = { promise, open };
  }

  // headline starts hidden and is revealed once the picture is up
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const ctx = gsap.context(() => {
      copy.current = gsap
        .timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .from('.hero__line > span', { yPercent: 108, duration: 1.7, stagger: 0.16, clearProps: 'transform' }, 0.5)
        .from(
          '.hero__eyebrow, .hero__sub, .hero__cta, .hero__tags, .hero__shots, .hero__scroll',
          { opacity: 0, y: 16, duration: 1.5, stagger: 0.12, clearProps: 'opacity,transform' },
          0.9,
        );
    }, root);
    return () => ctx.revert();
  }, []);

  // preloader → first shot
  useEffect(() => {
    let cancelled = false;
    const el = pre.current;
    const progress = { v: 0 };
    const setProgress = (v, duration) =>
      el &&
      gsap.to(progress, {
        v,
        duration,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => {
          el.querySelector('b').textContent = String(Math.round(progress.v));
          el.querySelector('.preloader__bar span').style.transform = `scaleX(${progress.v / 100})`;
        },
      });

    let locked = false;
    const release = () => {
      document.body.classList.remove('is-loading');
      if (locked) unlockScroll();
      locked = false;
    };

    const start = () => {
      release();
      ready();
      scene.current?.intro();
      copy.current?.play();
    };

    (async () => {
      if (el) {
        document.body.classList.add('is-loading');
        lockScroll();
        locked = true;
        ready(); // the preloader covers the page, so the curtain can lift underneath it
        setProgress(40, 1.4);
      }
      await Promise.race([gate.current.promise, wait(7000)]);
      await Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(2500)]);
      if (cancelled) return;

      if (!el) {
        start();
        return;
      }
      await setProgress(100, 0.5);
      if (cancelled) return;
      gsap
        .timeline()
        .to(el.querySelector('.preloader__inner'), { opacity: 0, duration: 0.7, ease: 'power2.inOut' })
        .add(start, '+=0.15')
        .to(el, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, '<')
        .add(() => !cancelled && setPreloader(false));
    })();

    return () => {
      cancelled = true;
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the hero drifts away as the page scrolls
  useEffect(() => {
    let queued = false;
    const update = () => {
      queued = false;
      if (!hero.current) return;
      const p = Math.min(1, window.scrollY / (hero.current.offsetHeight || 1));
      scene.current?.setScroll(p);
      if (reducedMotion) return;
      content.current.style.transform = p > 0 ? `translate3d(0, ${p * -70}px, 0)` : '';
      content.current.style.opacity = String(Math.max(0, 1 - p * 1.6));
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onScene = (created) => {
    scene.current = created;
    created.onShot((index, seconds) => {
      const items = bars.current ? [...bars.current.children] : [];
      items.forEach((bar) => bar.removeAttribute('data-active'));
      const bar = items[index];
      if (!bar) return;
      bar.style.setProperty('--shot', `${seconds}s`);
      void bar.offsetWidth; // restart the fill animation
      bar.setAttribute('data-active', '');
    });
    gate.current.open();
  };

  const marquee = (catalog ?? FALLBACK).courses.map((course) => pick(course.title, lang));

  return (
    <main ref={root}>
      {preloader && (
        <div className="preloader" ref={pre} aria-hidden="true">
          <div className="preloader__inner">
            <img className="preloader__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" />
            <div className="preloader__bar">
              <span />
            </div>
            <div className="preloader__meta">
              <span>M.ACADEMY</span>
              <span>
                <b>0</b>%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ HERO ============ */}
      <section className="hero" ref={hero}>
        <FlagBackdrop className="hero__canvas" onReady={onScene} onFail={() => gate.current.open()} />
        <div className="hero__shade" aria-hidden="true" />

        <div className="container hero__content" ref={content}>
          <p className="eyebrow hero__eyebrow">
            <span className="eyebrow__line" />
            M.ACADEMY • ONLINE SCHOOL
          </p>
          <h1 className="hero__title" aria-label="Beyond Learning. Beyond Limits.">
            <span className="hero__line">
              <span>BEYOND LEARNING.</span>
            </span>
            <span className="hero__line hero__line--gold">
              <span>BEYOND LIMITS.</span>
            </span>
          </h1>
          <p className="hero__sub">{t('hero.sub')}</p>
          <div className="hero__cta">
            <Link className="btn btn--gold magnetic" to="/courses">
              <span>{t('hero.cta1')}</span>
              <Icon name="arrow" />
            </Link>
            <Link className="btn btn--ghost magnetic" to="/about">
              {t('hero.cta2')}
            </Link>
          </div>
          <ul className="hero__tags">
            <li>{t('hero.tag1')}</li>
            <li>{t('hero.tag2')}</li>
            <li>{t('hero.tag3')}</li>
          </ul>
        </div>

        {/* one bar per shot of the backdrop */}
        <div className="hero__shots" ref={bars} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <a
          className="hero__scroll"
          href="#intro"
          aria-label="Scroll"
          onClick={(e) => {
            e.preventDefault();
            scrollToElement(document.getElementById('intro'));
          }}
        >
          <i />
        </a>
      </section>

      {/* ============ MARQUEE ============ */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[...marquee, ...marquee].map((name, i) => (
            <span key={i}>{name}</span>
          ))}
        </div>
      </div>

      {/* ============ ACADEMY (teaser) ============ */}
      <section className="section intro" id="intro">
        <div className="container intro__grid">
          <div className="intro__copy">
            <Eyebrow>{t('about.eyebrow')}</Eyebrow>
            <h2 className="h2" data-reveal="" {...html('about.title')} />
            <p className="lead" data-reveal="">
              {t('about.text')}
            </p>
            <Link className="link-arrow" to="/about" data-reveal="">
              <span>{t('common.more')}</span>
              <Icon name="arrow" />
            </Link>
          </div>
          <Features />
        </div>
      </section>

      {/* ============ FOUNDER (from the admin panel; hidden until filled in) ============ */}
      <FounderSection />

      {/* ============ COURSES (preview) ============ */}
      <section className="section courses">
        <div className="container">
          <header className="section__head">
            <div>
              <Eyebrow>{t('courses.eyebrow')}</Eyebrow>
              <h2 className="h2" data-reveal="" {...html('courses.title')} />
              <p className="lead" data-reveal="">
                {t('courses.sub')}
              </p>
            </div>
            <Link className="btn btn--ghost" to="/courses" data-reveal="">
              <span>{t('courses.allLink')}</span>
              <Icon name="arrow" />
            </Link>
          </header>
        </div>
        {catalog &&
          (catalog.courses.length >= RING_MIN ? (
            <CourseRing key={catalog.courses.map((c) => c.id).join()} courses={catalog.courses} />
          ) : (
            <div className="container">
              <CourseGrid courses={catalog.courses} />
            </div>
          ))}
      </section>

      {/* ============ WORLD LANGUAGES (3D globe) ============ */}
      <section className="section world">
        <div className="container world__grid">
          <div className="world__copy">
            <Eyebrow>{t('world.eyebrow')}</Eyebrow>
            <h2 className="h2" data-reveal="" {...html('world.title')} />
            <p className="lead" data-reveal="">
              {t('world.text')}
            </p>
            <ul className="world__langs" data-reveal="">
              {PLACES.map(({ course }) => (
                <li key={course}>
                  <Link to={`/register?course=${COURSES[course].slug}`}>
                    <i>{COURSES[course].g}</i>
                    {COURSES[course][lang]}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="world__hint" data-reveal="">
              {t('world.hint')}
            </p>
          </div>
          <LanguageGlobe />
        </div>
      </section>

      {/* ============ LATEST NEWS ============ */}
      <section className="section news-teaser">
        <div className="container">
          <header className="section__head">
            <div>
              <Eyebrow>{t('news.eyebrow')}</Eyebrow>
              <h2 className="h2" data-reveal="" {...html('news.latest')} />
            </div>
            <Link className="btn btn--ghost" to="/news" data-reveal="">
              <span>{t('news.allLink')}</span>
              <Icon name="arrow" />
            </Link>
          </header>
          <div className="posts">
            {feed?.posts.slice(0, 3).map((post) => (
              <PostCard post={post} key={post.id} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ NUMBERS ============ */}
      <section className="section results">
        <div className="container">
          <header className="section__head section__head--center">
            <Eyebrow center>{t('results.eyebrow')}</Eyebrow>
            <h2 className="h2" data-reveal="" {...html('results.title')} />
          </header>
          <Stats />
          <p className="note" data-reveal="">
            {t('results.note')}
          </p>
        </div>
      </section>

      <Cta />
    </main>
  );
}
