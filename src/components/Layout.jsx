import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Routes, useLocation } from 'react-router-dom';
import { LANGS, useI18n } from '../i18n/index.jsx';
import { useSocials } from '../lib/socials.js';
import SocialIcon from './SocialIcon.jsx';
import { reducedMotion } from '../lib/env.js';
import { lockScroll, scrollToTop, unlockScroll } from '../lib/scroll.js';
import { mediaUrl, pick, postJSON } from '../lib/http.js';
import { usePointerFx, useReveal } from '../hooks/usePageFx.js';
import Cursor from './Cursor.jsx';
import MusicPlayer from './MusicPlayer.jsx';
import { useFounder } from '../lib/founder.js';
import { cue, startUiSounds } from '../lib/uiSound.js';

const PageContext = createContext({ ready: () => {} });

/**
 * Every page calls this once. It sets the tab title and tells the layout the page
 * can be shown (the black curtain lifts). Pass `autoReady: false` to lift it yourself
 * with the returned function — the home page waits for the flags.
 */
export function usePage(titleKey, { autoReady = true, title } = {}) {
  const { t } = useI18n();
  const { ready } = useContext(PageContext);
  useEffect(() => {
    document.title = title ?? t(titleKey);
  }, [t, titleKey, title]);
  useEffect(() => {
    if (autoReady) ready();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready;
}

const NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/about', key: 'nav.about' },
  { to: '/courses', key: 'nav.courses' },
  { to: '/results', key: 'nav.results' },
  { to: '/news', key: 'nav.news' },
];

const current = ({ isActive }) => (isActive ? 'is-current' : undefined);

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={code === lang ? 'is-active' : undefined}
          aria-pressed={code === lang}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  const { t, lang } = useI18n();
  const founder = useFounder(); // the link appears once the founder page is filled in
  const socials = useSocials(); // from the admin panel; the block hides while there are none

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <img src="/img/logo-full.webp" alt="M Academy — Online School" width="874" height="705" loading="lazy" />
          <p>{t('footer.tagline')}</p>
        </div>
        <nav className="footer__col">
          <b>{t('footer.nav')}</b>
          <Link to="/about">{t('nav.about')}</Link>
          {founder && <Link to="/about/founder">{t('founder.crumb')}</Link>}
          <Link to="/courses">{t('nav.courses')}</Link>
          <Link to="/results">{t('nav.results')}</Link>
          <Link to="/news">{t('nav.news')}</Link>
          <Link to="/register">{t('cta.signup')}</Link>
        </nav>
        {socials.length > 0 && (
          <nav className="footer__col footer__socials">
            <b>{t('footer.social')}</b>
            {socials.map((s) => {
              const name = pick(s.name, lang);
              const external = /^https?:/i.test(s.url);
              return (
                <a key={s.id ?? s.url} href={s.url} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
                  <span className="footer__social-icon">
                    {s.image ? <img src={mediaUrl(s.image)} alt="" loading="lazy" /> : <SocialIcon name={s.icon} />}
                  </span>
                  {name}
                </a>
              );
            })}
          </nav>
        )}
      </div>
      <div className="container footer__bottom">
        <span>
          © {new Date().getFullYear()} M.ACADEMY. {t('footer.rights')}
        </span>
        <button type="button" onClick={() => scrollToTop()}>
          {t('footer.top')}
        </button>
      </div>
    </footer>
  );
}

/**
 * Site frame: nav, mobile menu, footer and the route transition.
 * Moving between pages dips to black like a cut in a film: the curtain closes,
 * the route is swapped underneath, and the new page lifts it when it is ready.
 */
export default function Layout({ children }) {
  const { t } = useI18n();
  const location = useLocation();
  const [shown, setShown] = useState(location);
  const [covered, setCovered] = useState(true);
  const [menu, setMenu] = useState(false);
  const navRef = useRef(null);
  const barRef = useRef(null);

  // Lift the curtain once the new page has painted (two frames), or shortly after
  // if the browser is holding frames back.
  const ready = useCallback(() => {
    let lifted = false;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      setCovered(false);
    };
    requestAnimationFrame(() => requestAnimationFrame(lift));
    setTimeout(lift, 180);
  }, []);

  // route change → close the curtain, then swap the page under it
  useEffect(() => {
    if (location.key === shown.key) return undefined;
    setMenu(false);
    if (location.pathname === shown.pathname && location.search === shown.search) {
      setShown(location);
      return undefined;
    }
    setCovered(true);
    cue('whoosh'); // the screen dips to black
    const id = setTimeout(
      () => {
        setShown(location);
        scrollToTop({ immediate: true });
      },
      reducedMotion ? 0 : 420,
    );
    return () => clearTimeout(id);
  }, [location, shown]);

  // never leave the visitor in the dark if a page fails to report in
  useEffect(() => {
    if (!covered) return undefined;
    const id = setTimeout(() => setCovered(false), 6000);
    return () => clearTimeout(id);
  }, [covered, shown]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menu);
    if (!menu) return undefined;
    lockScroll(); // the page must not scroll behind the open menu
    return unlockScroll;
  }, [menu]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // scroll progress + nav that hides on the way down
  useEffect(() => {
    let lastY = window.scrollY;
    let queued = false;
    const update = () => {
      queued = false;
      const nav = navRef.current;
      const bar = barRef.current;
      if (!nav || !bar) return;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      nav.toggleAttribute('data-scrolled', y > 30);
      if (Math.abs(y - lastY) > 6) {
        nav.toggleAttribute('data-hidden', y > lastY && y > 600 && !document.body.classList.contains('menu-open'));
        lastY = y;
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // page views for the admin statistics: POST /api/visits { path } (no query string).
  // Production build only, so local work and testing don't count as visits.
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    postJSON('/visits', { path: shown.pathname.slice(0, 300) }, { keepalive: true }).catch(() => {});
  }, [shown.pathname]);

  useReveal(shown.key);
  usePointerFx();
  useEffect(startUiSounds, []); // soft tick on hover, click on press

  return (
    <PageContext.Provider value={{ ready }}>
      <div className={`curtain${covered ? ' is-on' : ''}`} aria-hidden="true" />
      <Cursor />
      <MusicPlayer />
      <div className="scroll-progress" aria-hidden="true">
        <span ref={barRef} />
      </div>

      <header className="nav" ref={navRef}>
        <div className="nav__inner">
          <Link className="brand" to="/" aria-label="M.ACADEMY">
            <img src="/img/logo-mark.webp" alt="" width="543" height="531" />
            <span className="brand__text">
              <b>M.ACADEMY</b>
              <small>ONLINE SCHOOL</small>
            </span>
          </Link>

          <nav className="nav__links" aria-label="Primary">
            {NAV.map(({ to, key, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={current}>
                {label ?? t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="nav__side">
            <LangSwitch />
            <Link className="btn btn--gold btn--sm nav__cta" to="/register">
              {t('cta.signup')}
            </Link>
            <button
              type="button"
              className="burger"
              aria-label="Menu"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`menu${menu ? ' is-open' : ''}`} aria-hidden={!menu}>
        <nav className="menu__links">
          {NAV.map(({ to, key, label }, i) => (
            <NavLink key={to} to={to} end={to === '/'} className={current} onClick={() => setMenu(false)}>
              <i>{String(i + 1).padStart(2, '0')}</i>
              <span>{label ?? t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="menu__foot">
          <LangSwitch />
          <Link className="btn btn--gold" to="/register" onClick={() => setMenu(false)}>
            {t('cta.signup')}
          </Link>
        </div>
      </div>

      {/* keyed so a page always mounts fresh — and reports in — after the curtain closes */}
      <Routes location={shown} key={shown.pathname + shown.search}>
        {children}
      </Routes>
      <Footer />
    </PageContext.Provider>
  );
}
