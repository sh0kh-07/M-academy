import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert, Field, Icon, LangSwitch, Spinner, Splash, errorText, usePageTitle, useT } from '../ui.jsx';

const NOTICE = {
  expired: ['info', 'notice.expired'],
  password: ['ok', 'notice.password'],
  logout: ['info', 'notice.logout'],
};

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Login() {
  const t = useT();
  const { status, login, ended } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.startsWith('/admin') ? location.state.from : '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, invalid }
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const passwordRef = useRef(null);
  usePageTitle(t('page.login'));

  // count down a 429 lock, then let the person try again
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(0);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  if (status === 'authed') return <Navigate to={from} replace />;
  if (status === 'loading') return <Splash />;

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;

  async function submit(e) {
    e.preventDefault();
    if (busy || secondsLeft) return;
    const name = username.trim();
    if (!name || !password) {
      setError({ text: t('login.required') });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(name, password); // on success the status flips and <Navigate> above takes over
    } catch (err) {
      setBusy(false);
      setPassword('');
      if (err.status === 401) {
        setError({ text: t('login.wrong'), invalid: true });
        passwordRef.current?.focus();
      } else if (err.status === 429) {
        setError({ text: t('login.locked') });
        if (err.retryAfter) {
          setNow(Date.now());
          setLockedUntil(Date.now() + err.retryAfter * 1000);
        }
      } else {
        setError({ text: errorText(err, t) });
      }
    }
  }

  const notice = !error && NOTICE[ended];

  return (
    <div className="adm-auth">
      <header className="adm-auth__top">
        <Link to="/" className="adm-link">
          <Icon name="arrowLeft" />
          {t('login.back')}
        </Link>
        <LangSwitch />
      </header>

      <main className="adm-auth__main">
        <form className="adm-card adm-auth__card" onSubmit={submit} noValidate>
          <div className="adm-brand adm-brand--auth">
            <img src="/img/logo-mark.webp" alt="" width="40" height="40" />
            <span>
              <b>M.ACADEMY</b>
              <small>{t('brand.sub')}</small>
            </span>
          </div>

          <h1>{t('login.title')}</h1>
          <p className="adm-muted">{t('login.text')}</p>

          {error && (
            <Alert tone="error">
              {error.text}
              {secondsLeft > 0 && <span className="adm-alert__sub">{t('login.wait', { time: mmss(secondsLeft) })}</span>}
            </Alert>
          )}
          {notice && <Alert tone={notice[0]}>{t(notice[1])}</Alert>}

          <Field
            label={t('login.username')}
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            invalid={error?.invalid}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Field
            ref={passwordRef}
            label={t('login.password')}
            type="password"
            name="password"
            autoComplete="current-password"
            maxLength={72}
            value={password}
            invalid={error?.invalid}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={busy || secondsLeft > 0}>
            {busy && <Spinner />}
            {busy ? t('login.checking') : t('login.submit')}
          </button>
        </form>
        <p className="adm-auth__foot">© {new Date().getFullYear()} M.ACADEMY</p>
      </main>
    </div>
  );
}
