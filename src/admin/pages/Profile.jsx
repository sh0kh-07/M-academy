import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { AccountDetails, Alert, Field, PageHead, Spinner, errorText, initials, useFormat, usePageTitle, useT } from '../ui.jsx';

const EMPTY = { old: '', next: '', repeat: '' };

function PasswordForm() {
  const t = useT();
  const { changePassword } = useAuth();
  const { hash } = useLocation();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null); // { text, field }
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (hash === '#password') firstRef.current?.focus(); // arrived from "Change password" on the dashboard
  }, [hash]);

  const bind = (key) => ({
    value: form[key],
    invalid: error?.field === key,
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const { old, next, repeat } = form;
    let problem = null;
    if (!old || !next || !repeat) problem = { text: t('pw.errRequired'), field: !old ? 'old' : !next ? 'next' : 'repeat' };
    else if (next.length < 8 || next.length > 72) problem = { text: t('pw.errLength'), field: 'next' };
    else if (next === old) problem = { text: t('pw.errSame'), field: 'next' };
    else if (next !== repeat) problem = { text: t('pw.errMatch'), field: 'repeat' };
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      await changePassword(old, next); // every session ends; the router moves us to the sign-in page
    } catch (err) {
      setBusy(false);
      setError({ text: errorText(err, t), field: err.status === 400 || err.status === 401 ? 'old' : null });
    }
  }

  return (
    <form className="adm-card adm-form" id="password" onSubmit={submit} noValidate>
      <h2 className="adm-card__title">{t('pw.title')}</h2>
      <p className="adm-muted">{t('pw.text')}</p>
      {error && <Alert tone="error">{error.text}</Alert>}
      <Field ref={firstRef} label={t('pw.old')} type="password" autoComplete="current-password" {...bind('old')} />
      <Field label={t('pw.new')} type="password" autoComplete="new-password" hint={t('pw.hint')} {...bind('next')} />
      <Field label={t('pw.repeat')} type="password" autoComplete="new-password" {...bind('repeat')} />
      <div>
        <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
          {busy && <Spinner />}
          {busy ? t('pw.saving') : t('pw.submit')}
        </button>
      </div>
    </form>
  );
}

export default function Profile() {
  const t = useT();
  const fmt = useFormat();
  const { user } = useAuth();
  usePageTitle(t('profile.title'));
  const name = user.full_name || user.username;

  return (
    <>
      <PageHead title={t('profile.title')} text={t('profile.text')} />
      <section className="adm-cols adm-cols--profile">
        <article className="adm-card">
          <div className="adm-person">
            <span className="adm-avatar adm-avatar--lg">{initials(name)}</span>
            <div>
              <b>{name}</b>
              <small>
                @{user.username} · {fmt.role(user.role)}
              </small>
            </div>
          </div>
          <AccountDetails user={user} withId />
        </article>
        <PasswordForm />
      </section>
    </>
  );
}
