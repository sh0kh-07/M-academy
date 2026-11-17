import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Icon, LangSwitch, initials, useFormat, useT } from './ui.jsx';
import { useNewLeads } from './resources.js';

/* Sidebar sections. Items marked `soon` are shown greyed out until their pages exist. */
/*
  Sidebar. Leads sit right under the dashboard (daily work); each section keeps its own
  categories as a separate item. `badge: 'leads'` shows how many new leads are waiting.
*/
const NAV = [
  {
    items: [
      { to: '/admin', key: 'nav.dashboard', icon: 'dashboard', end: true },
      { to: '/admin/statistics', key: 'nav.statistics', icon: 'chart' },
      { to: '/admin/leads', key: 'nav.leads', icon: 'inbox', badge: 'leads' },
      { to: '/admin/students', key: 'nav.students', icon: 'student' },
    ],
  },
  {
    label: 'nav.groupCourses',
    items: [
      { to: '/admin/courses', key: 'nav.courses', icon: 'courses' },
      { to: '/admin/categories', key: 'nav.categories', icon: 'layers' },
      { to: '/admin/teachers', key: 'nav.teachers', icon: 'users' },
    ],
  },
  {
    label: 'nav.groupNews',
    items: [
      { to: '/admin/news', key: 'nav.news', icon: 'news' },
      { to: '/admin/news-categories', key: 'nav.categories', icon: 'layers' },
    ],
  },
  {
    label: 'nav.groupSite',
    items: [
      { to: '/admin/founder', key: 'nav.founder', icon: 'user' },
      { to: '/admin/music', key: 'nav.music', icon: 'music' },
      { to: '/admin/socials', key: 'nav.socials', icon: 'link' },
    ],
  },
  {
    label: 'nav.account',
    items: [
      { to: '/admin/profile', key: 'nav.profile', icon: 'user' },
      { to: '/admin/users', key: 'nav.users', icon: 'shield', role: 'super_admin' },
    ],
  },
];

// the top bar's "M.ACADEMY / <section>" — first matching prefix wins
const CRUMBS = [
  ['/admin/statistics', 'nav.statistics'],
  ['/admin/users', 'nav.users'],
  ['/admin/leads', 'nav.leads'],
  ['/admin/students', 'nav.students'],
  ['/admin/news-categories', 'ncats.title'],
  ['/admin/news', 'nav.news'],
  ['/admin/courses', 'nav.courses'],
  ['/admin/categories', 'cats.title'],
  ['/admin/teachers', 'nav.teachers'],
  ['/admin/music', 'nav.music'],
  ['/admin/founder', 'nav.founder'],
  ['/admin/socials', 'nav.socials'],
  ['/admin/profile', 'nav.profile'],
];
const crumb = (path) => CRUMBS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'nav.dashboard';

export default function AdminLayout() {
  const t = useT();
  const fmt = useFormat();
  const { user, logout } = useAuth();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const name = user.full_name || user.username;
  const newLeads = useNewLeads();

  useEffect(() => {
    setOpen(false);
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  // mobile drawer: Esc closes it, the page underneath stays put
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const signOut = () => {
    setLeaving(true);
    logout(); // the session ends → the guard sends us to the sign-in page
  };

  return (
    <div className="adm-shell" data-nav={open ? 'open' : undefined}>
      <aside className="adm-side" id="adm-side">
        <div className="adm-side__head">
          <Link to="/admin" className="adm-brand">
            <img src="/img/logo-mark.webp" alt="" width="34" height="34" />
            <span>
              <b>M.ACADEMY</b>
              <small>{t('brand.sub')}</small>
            </span>
          </Link>
          <button type="button" className="adm-icon-btn adm-side__close" aria-label={t('nav.close')} onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="adm-nav" aria-label={t('nav.menu')}>
          {NAV.map(({ label, items }) => (
            <div key={label ?? 'main'} className="adm-nav__group">
              {label && <p className="adm-nav__label">{t(label)}</p>}
              {items.filter((item) => !item.role || item.role === user.role).map((item) =>
                item.soon ? (
                  <span key={item.to ?? item.key} className="adm-nav__item" aria-disabled="true">
                    <Icon name={item.icon} />
                    <span>{t(item.key)}</span>
                    <small className="adm-soon">{t('nav.soon')}</small>
                  </span>
                ) : (
                  <NavLink key={item.to} to={item.to} end={item.end} className="adm-nav__item">
                    <Icon name={item.icon} />
                    <span>{t(item.key)}</span>
                    {item.badge === 'leads' && newLeads > 0 && <b className="adm-nav__badge">{newLeads > 99 ? '99+' : newLeads}</b>}
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="adm-side__foot">
          <a className="adm-nav__item" href="/" target="_blank" rel="noopener">
            <Icon name="external" />
            <span>{t('nav.site')}</span>
          </a>
          <div className="adm-me">
            <span className="adm-avatar">{initials(name)}</span>
            <span className="adm-me__text">
              <b>{name}</b>
              <small>{fmt.role(user.role)}</small>
            </span>
            <button
              type="button"
              className="adm-icon-btn"
              onClick={signOut}
              disabled={leaving}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="adm-scrim" aria-hidden="true" onClick={() => setOpen(false)} />

      <div className="adm-main">
        <header className="adm-top">
          <button
            type="button"
            className="adm-icon-btn adm-burger"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="adm-side"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <p className="adm-crumbs">
            <span>M.ACADEMY</span>
            <i aria-hidden="true">/</i>
            <b>{t(crumb(pathname))}</b>
          </p>
          <div className="adm-top__side">
            <LangSwitch />
            <Link to="/admin/profile" className="adm-avatar adm-avatar--sm" title={name} aria-label={t('nav.profile')}>
              {initials(name)}
            </Link>
          </div>
        </header>
        <main className="adm-content" key={pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
