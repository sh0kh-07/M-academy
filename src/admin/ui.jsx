import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { LANGS, useI18n } from '../i18n/index.jsx';
import { reducedMotion } from '../lib/env.js';
import { adminDict } from './dict.js';
import { useAuth } from './auth.jsx';

/* ---------------- text ---------------- */

export function useT() {
  const { lang } = useI18n();
  return useCallback(
    (key, vars) => {
      const s = adminDict[lang]?.[key] ?? adminDict.uz[key] ?? key;
      return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
    },
    [lang],
  );
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} — M.ACADEMY Admin`;
  }, [title]);
}

const LOCALES = { ru: 'ru-RU', en: 'en-GB' };
// many browsers ship no Uzbek date names, so Uzbek dates are spelled out here: "13-noyabr 2026, 14:00"
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const pad = (n) => String(n).padStart(2, '0');

export function useFormat() {
  const { lang } = useI18n();
  const t = useT();
  return {
    /** "5 daqiqa oldin" / "5 минут назад" / "5 minutes ago"; older than a week → the date */
    ago(value) {
      const d = new Date(value);
      if (!value || Number.isNaN(d.getTime())) return '—';
      const sec = (Date.now() - d.getTime()) / 1000;
      const step = sec < 3600 ? ['minute', 60, 'time.minutes'] : sec < 86400 ? ['hour', 3600, 'time.hours'] : ['day', 86400, 'time.days'];
      if (sec < 60) return t('time.now');
      if (sec >= 7 * 86400) return this.date(value);
      const n = Math.floor(sec / step[1]);
      if (lang === 'uz') return t(step[2], { n });
      return new Intl.RelativeTimeFormat(LOCALES[lang], { numeric: 'auto' }).format(-n, step[0]);
    },
    date(value) {
      if (!value) return '—';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      if (lang === 'uz') {
        return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    },
    /** date only: "14-noyabr 2026" / "14 нояб. 2026 г." */
    day(value) {
      const d = new Date(value);
      if (!value || Number.isNaN(d.getTime())) return '—';
      if (lang === 'uz') return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: 'medium' }).format(d);
    },
    role(role) {
      if (!role) return '—';
      const key = `role.${role}`;
      const label = t(key);
      return label === key ? role.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : label;
    },
  };
}

/** A readable message for anything the API client throws. */
export function errorText(err, t) {
  if (!err) return '';
  if (err.status === 0) return t(err.message === 'timeout' ? 'err.timeout' : 'err.network');
  if (err.status === 403) return t('err.forbidden');
  if (err.status === 429) return t('err.rate');
  if (err.status >= 500 || !err.messages?.length) return t('err.generic');
  return err.messages.join(' ');
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/* ---------------- icons (24px line icons) ---------------- */

const PATHS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
    </>
  ),
  news: (
    <>
      <path d="M5 4.5h11.5v15H6.5A1.5 1.5 0 0 1 5 18V4.5Z" />
      <path d="M16.5 8.5h2.5V18a1.5 1.5 0 0 1-3 0" />
      <path d="M8 8.5h5.5M8 12h5.5M8 15.5h3.5" />
    </>
  ),
  courses: (
    <>
      <path d="M12 6.5c-2-1.5-4.8-2-7.5-1.5v13c2.7-.5 5.5 0 7.5 1.5 2-1.5 4.8-2 7.5-1.5V5c-2.7-.5-5.5 0-7.5 1.5Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.3" />
      <path d="M2.8 19.5c.9-3.2 3.3-5 6.2-5s5.3 1.8 6.2 5" />
      <path d="M15.5 5.6a3.3 3.3 0 0 1 0 6.1M17.6 14.8c1.8.6 3 2.2 3.6 4.7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M10.5 12H20M16.5 8l4 4-4 4" />
    </>
  ),
  external: (
    <>
      <path d="M13.5 4.5h6v6M19.5 4.5 11 13" />
      <path d="M17.5 14v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10 5.8c.6-.2 1.3-.3 2-.3 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M14.1 14.2A3 3 0 0 1 9.8 9.9M6.4 7.4C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.5 4.2-1.1" />
      <path d="m4 4 16 16" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.3v.2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.7 2.7L16 9.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.7v.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m7.5 15 3.5-4.5 3 2.5 4.5-6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.5h12l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-4.5Z" />
      <path d="M3.5 13.5h4.5l1.5 2.5h5l1.5-2.5h4.5" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  send: <path d="m20.5 3.5-17 7 6.5 2.5 2.5 6.5 8-16Zm-10.5 9.5 4-4" />,
  student: (
    <>
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
      <path d="M6.5 10.5v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5" />
      <path d="M21.5 8.5v5" />
    </>
  ),
  note: (
    <>
      <path d="M5.5 3.5h9l4 4v13h-13v-17Z" />
      <path d="M14.5 3.5v4h4M8.5 12h7M8.5 15.5h5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16 8.5 4.5 8.5-4.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10v3Z" />
      <path d="m14 7.5 2.5 2.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M10 4.5h4M6.5 7l.8 11.6A1.5 1.5 0 0 0 8.8 20h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 17 4.5-4.5 3.5 3.5 2.5-2.5L20 19" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="5.5" width="13" height="13" rx="2" />
      <path d="m16.5 10.5 4-2.5v8l-4-2.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" />
      <path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.5V6.2l10-2v11.3" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
};

export function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  );
}

/* ---------------- small pieces ---------------- */

export const Spinner = () => <span className="adm-spin" aria-hidden="true" />;

export function Splash() {
  return (
    <div className="adm-splash" role="status" aria-live="polite">
      <img src="/img/logo-mark.webp" alt="" width="44" height="44" />
      <Spinner />
    </div>
  );
}

export function BootError() {
  const t = useT();
  const { error, reload, logout } = useAuth();
  return (
    <div className="adm-splash">
      <div className="adm-card adm-boot">
        <Icon name="alert" className="adm-boot__icon" />
        <h1>{t('boot.title')}</h1>
        <p>{errorText(error, t)}</p>
        <div className="adm-row">
          <button type="button" className="adm-btn adm-btn--primary" onClick={reload}>
            <Icon name="refresh" />
            {t('boot.retry')}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={logout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

const ALERT_ICON = { error: 'alert', ok: 'check', info: 'info' };

export function Alert({ tone = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`adm-alert adm-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[tone]} />
      <div>{children}</div>
    </div>
  );
}

/**
 * Labelled form control. type="password" adds a show/hide button, type="textarea" gives
 * a multi-line field, type="select" a dropdown (pass <option>s as children).
 */
export function Field({ label, hint, type = 'text', invalid, className, children, ...input }) {
  const t = useT();
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const shared = {
    id,
    'aria-invalid': invalid || undefined,
    'aria-describedby': hint ? `${id}-hint` : undefined,
    ...input,
  };
  let control;
  if (type === 'textarea') control = <textarea rows={5} {...shared} />;
  else if (type === 'select') control = <select {...shared}>{children}</select>;
  else {
    control = (
      <input
        type={isPassword && shown ? 'text' : type}
        spellCheck={isPassword ? false : undefined}
        autoCapitalize={isPassword ? 'off' : undefined}
        {...shared}
      />
    );
  }
  return (
    <div className={`adm-field${className ? ` ${className}` : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`adm-input${isPassword ? ' adm-input--pw' : ''}${type === 'select' ? ' adm-input--select' : ''}`}>
        {control}
        {type === 'select' && <Icon name="chevronDown" className="adm-input__chevron" />}
        {isPassword && (
          <button
            type="button"
            className="adm-eye"
            aria-label={t(shown ? 'pw.hide' : 'pw.show')}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
      {hint && (
        <small id={`${id}-hint`} className="adm-field__hint">
          {hint}
        </small>
      )}
    </div>
  );
}

export function PageHead({ title, text, children }) {
  return (
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </header>
  );
}

/** The signed-in user's details as a definition list. */
export function AccountDetails({ user, withId = false }) {
  const t = useT();
  const fmt = useFormat();
  const active = user.is_active !== false;
  const rows = [
    ['field.name', user.full_name || '—'],
    ['field.username', user.username],
    ['field.role', <span className="adm-badge">{fmt.role(user.role)}</span>],
    [
      'field.status',
      <span className={`adm-status${active ? '' : ' adm-status--off'}`}>
        {t(active ? 'status.active' : 'status.inactive')}
      </span>,
    ],
    ['field.lastLogin', fmt.date(user.last_login_at)],
  ];
  if (withId) rows.push(['field.id', <span className="adm-mono">{user.id}</span>]);
  return (
    <dl className="adm-dl">
      {rows.map(([key, value]) => (
        <div key={key}>
          <dt>{t(key)}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** On/off switch with a label. */
export function Switch({ checked, onChange, label, hint }) {
  const id = useId();
  return (
    <div className="adm-switch-row">
      <div>
        <label htmlFor={id}>{label}</label>
        {hint && <small>{hint}</small>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className="adm-switch"
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

/** UZ / RU / EN tabs for multilingual fields; `missing` marks languages with an empty required field. */
export function LangTabs({ value, onChange, missing = [] }) {
  return (
    <div className="adm-tabs" role="tablist">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={code === value}
          onClick={() => onChange(code)}
        >
          {code.toUpperCase()}
          {missing.includes(code) && <i className="adm-tabs__dot" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

/* ---------------- enter / exit animation ---------------- */

const EXIT_MS = reducedMotion ? 0 : 170; // keep in step with the *-out keyframes in admin.css
const ExitContext = createContext(false);

/**
 * Keeps a dialog on screen for its closing animation. `when` is the thing being shown
 * (a lesson, {} for "new", true…); render the dialog from the value passed to `children`,
 * not from the page's state, because that is already null while the dialog fades out.
 *
 *   <Presence when={editing}>{(item) => <LessonDialog lesson={item} … />}</Presence>
 */
export function Presence({ when, children }) {
  const [shown, setShown] = useState(when || null);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (when) {
      setShown(when);
      setExiting(false);
      return undefined;
    }
    setExiting(true);
    const id = setTimeout(() => {
      setShown(null);
      setExiting(false);
    }, EXIT_MS);
    return () => clearTimeout(id);
  }, [when]);
  if (!shown) return null;
  return <ExitContext.Provider value={exiting}>{children(shown)}</ExitContext.Provider>;
}

/**
 * A centred dialog: the backdrop fades in, the panel grows from 95 % and fades in;
 * closing plays it backwards (inside <Presence>). Esc and the backdrop close it unless `busy`.
 * size: 'sm' (confirmations) | 'md' (short forms) | 'lg' (forms with a photo or long text).
 * The header and `footer` stay put; only the body scrolls.
 */
export function Modal({ title, subtitle, children, footer, onClose, busy = false, size = 'md', drawer = false }) {
  const exiting = useContext(ExitContext);
  const ref = useRef(null);
  const rootRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy || exiting;

  useEffect(() => {
    const before = document.activeElement;
    // a drawer opens on its content (no keyboard popping up); a dialog on its first field
    const first = drawer
      ? null
      : (ref.current?.querySelector('input, textarea, select') ?? ref.current?.querySelector('button:not(.adm-modal__x)'));
    (first ?? ref.current)?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== 'Escape' || busyRef.current) return;
      const open = document.querySelectorAll('.adm-modal');
      if (open[open.length - 1] === rootRef.current) closeRef.current(); // only the topmost one closes
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`adm-modal${drawer ? ' adm-modal--drawer' : ''}`}
      data-state={exiting ? 'closed' : 'open'}
      onMouseDown={(e) => e.target === e.currentTarget && !busyRef.current && onClose()}
    >
      <div className="adm-modal__overlay" aria-hidden="true" />
      <div
        className={`adm-modal__box adm-modal__box--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <header className="adm-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="adm-icon-btn adm-modal__x" onClick={onClose} disabled={busy || exiting} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="adm-modal__body">{children}</div>
        {footer && <footer className="adm-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/** "Are you sure?" dialog. onConfirm may be async; its error is shown inside the dialog. */
export function Confirm({ title, text, confirmLabel, tone = 'danger', onConfirm, onClose, extra }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={`adm-btn adm-btn--${tone}`} onClick={run} disabled={busy}>
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="adm-muted">{text}</p>
      {error && (typeof extra === 'function' ? extra(error) : <Alert tone="error">{errorText(error, t)}</Alert>)}
    </Modal>
  );
}

/**
 * Footer for a form dialog: the error on the left, Cancel / Save on the right.
 * The Save button submits the form by id, so the form itself can live in the scrolling body.
 */
export function FormFooter({ formId, busy, error, onCancel, disabled = false, submitLabel }) {
  const t = useT();
  return (
    <>
      <div className="adm-modal__msg">{error && <Alert tone="error">{error}</Alert>}</div>
      <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={busy}>
        {t('common.cancel')}
      </button>
      <button type="submit" form={formId} className="adm-btn adm-btn--primary" disabled={busy || disabled}>
        {(busy || disabled) && <Spinner />}
        {busy ? t('common.saving') : (submitLabel ?? t('common.save'))}
      </button>
    </>
  );
}

/** A titled group inside a dialog, with an optional control (e.g. language tabs) on the right. */
export function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`adm-section ${className}`}>
      {(title || aside) && (
        <header className="adm-section__head">
          {title && <h3>{title}</h3>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon = 'info', title, text, children }) {
  return (
    <div className="adm-empty">
      <span className="adm-stat__icon">
        <Icon name={icon} />
      </span>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function Pagination({ page, totalPages, total, limit, onPage }) {
  const t = useT();
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="adm-pager">
      <span>{t('common.range', { from, to, total })}</span>
      <div className="adm-row">
        <button type="button" className="adm-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('common.prev')}>
          <Icon name="chevronLeft" />
        </button>
        <button
          type="button"
          className="adm-icon-btn"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label={t('common.next')}
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- data loading ---------------- */

/**
 * Run `load(signal)` whenever `deps` change; the previous request is cancelled.
 * Returns { data, error, loading, reload, setData }.
 */
export function useQuery(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    load(ctrl.signal).then(
      (data) => !ctrl.signal.aborted && setState({ data, error: null, loading: false }),
      (error) => !ctrl.signal.aborted && setState((s) => ({ ...s, error, loading: false })),
    );
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), []);
  return { ...state, reload, setData };
}

/* ---------------- toasts ---------------- */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((text, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((list) => list.map((item) => (item.id === id ? { ...item, leaving: true } : item))), 3300);
    setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 3300 + EXIT_MS + 60);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`adm-toast adm-toast--${item.tone}`} data-state={item.leaving ? 'closed' : 'open'}>
            <Icon name={ALERT_ICON[item.tone]} />
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="adm-lang" role="group" aria-label="Language">
      {LANGS.map((code) => (
        <button key={code} type="button" aria-pressed={code === lang} onClick={() => setLang(code)}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
