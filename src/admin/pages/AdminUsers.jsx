import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { query } from '../../lib/http.js';
import { changes } from '../resources.js';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  FormFooter,
  Icon,
  Modal,
  PageHead,
  Pagination,
  Presence,
  Section,
  Spinner,
  Switch,
  errorText,
  initials,
  useFormat,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

/*
  Admin panel users (Swagger "Admin · Foydalanuvchilar") — super admin only.
  The server refuses: blocking / demoting yourself, and blocking / demoting / deleting the last
  active super admin. The UI disables those for your own row and shows the server's message otherwise.
  Changing someone's role or blocking them ends all their sessions.
*/

const users = {
  list: ({ page = 1, limit = 20, search, role, is_active } = {}, signal) => api(`/admin/users${query({ page, limit, search, role, is_active })}`, { signal }),
  create: (body) => api('/admin/users', { method: 'POST', body }),
  update: (id, body) => api(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  resetPassword: (id, password) => api(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'PATCH', body: { new_password: password } }),
};

const ROLES = ['admin', 'super_admin'];
const LIMIT = 20;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,32}$/;

/** 12 characters without look-alikes (no 0/O, 1/l/I), at least one digit. */
function generatePassword() {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  let out = Array.from(bytes, (b) => abc[b % abc.length]).join('');
  if (!/\d/.test(out)) out = out.slice(0, 11) + String(2 + (bytes[0] % 8));
  return out;
}

export default function AdminUsers() {
  const t = useT();
  const fmt = useFormat();
  const notify = useToast();
  const { user: me } = useAuth();
  usePageTitle(t('nav.users'));

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  const update = (patch) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true },
    );
  const [text, setText] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => text.trim() !== search && update({ q: text.trim(), page: '' }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const allowed = me.role === 'super_admin';
  const list = useQuery(
    (signal) => (allowed ? users.list({ page, limit: LIMIT, search, role, is_active: status }, signal) : Promise.resolve(null)),
    [allowed, page, search, role, status],
  );
  const [editing, setEditing] = useState(null); // a user, or {} for a new one
  const [resetting, setResetting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busyRow, setBusyRow] = useState(null);

  if (!allowed) {
    return (
      <>
        <PageHead title={t('users.title')} />
        <section className="adm-card">
          <Empty icon="lock" title={t('users.noAccess')} text={t('users.noAccessText')} />
        </section>
      </>
    );
  }

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const roleLabel = (r) => fmt.role(r);

  async function toggleBlock(u) {
    setBusyRow(u.id);
    try {
      await users.update(u.id, { is_active: u.is_active === false });
      notify(t(u.is_active === false ? 'user.unblocked' : 'user.blocked', { name: u.full_name || u.username }));
      list.reload();
    } catch (err) {
      notify(errorText(err, t), 'error');
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <>
      <PageHead title={t('users.title')} text={t('users.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('users.add')}
        </button>
      </PageHead>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input type="search" value={text} placeholder={t('users.search')} aria-label={t('users.search')} onChange={(e) => setText(e.target.value)} />
          </div>
          <Field type="select" className="adm-toolbar__select" aria-label={t('users.colRole')} value={role} onChange={(e) => update({ role: e.target.value, page: '' })}>
            <option value="">{t('users.allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Field>
          <Field type="select" className="adm-toolbar__select" aria-label={t('col.status')} value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
            <option value="">{t('courses.allStatus')}</option>
            <option value="true">{t('status.active')}</option>
            <option value="false">{t('users.blocked')}</option>
          </Field>
        </div>

        {list.error ? (
          <div className="adm-pad">
            <Alert tone="error">{errorText(list.error, t)}</Alert>
          </div>
        ) : list.loading && !list.data ? (
          <div className="adm-loading">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <Empty icon="search" title={t('users.empty')} text={t('courses.nothingText')} />
        ) : (
          <div className="adm-table-wrap" data-loading={list.loading || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('users.colUser')}</th>
                  <th>{t('users.colRole')}</th>
                  <th>{t('col.status')}</th>
                  <th>{t('users.colLogin')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const self = u.id === me.id;
                  const name = u.full_name || u.username;
                  return (
                    <tr key={u.id}>
                      <td>
                        <button type="button" className="adm-course-cell adm-cell-btn" onClick={() => setEditing(u)}>
                          <span className="adm-avatar">{initials(name)}</span>
                          <span>
                            <b>
                              {name}
                              {self && <span className="adm-you">{t('users.you')}</span>}
                            </b>
                            <small>@{u.username}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={`adm-badge${u.role === 'super_admin' ? '' : ' adm-badge--plain'}`}>{roleLabel(u.role)}</span>
                      </td>
                      <td>
                        <span className={`adm-status${u.is_active === false ? ' adm-status--off' : ''}`}>
                          {t(u.is_active === false ? 'users.blocked' : 'status.active')}
                        </span>
                      </td>
                      <td className="adm-muted adm-nowrap" title={u.last_login_at ? fmt.date(u.last_login_at) : undefined}>
                        {u.last_login_at ? fmt.ago(u.last_login_at) : t('users.never')}
                      </td>
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="adm-icon-btn" title={t('common.edit')} aria-label={t('common.edit')} onClick={() => setEditing(u)}>
                            <Icon name="edit" />
                          </button>
                          <button type="button" className="adm-icon-btn" title={t('user.resetTitle')} aria-label={t('user.resetTitle')} onClick={() => setResetting(u)}>
                            <Icon name="lock" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn"
                            disabled={self || busyRow === u.id}
                            title={t(u.is_active === false ? 'user.unblock' : 'user.block')}
                            aria-label={t(u.is_active === false ? 'user.unblock' : 'user.block')}
                            onClick={() => toggleBlock(u)}
                          >
                            <Icon name={u.is_active === false ? 'check' : 'shield'} />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            disabled={self}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                            onClick={() => setRemoving(u)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pages.page ?? page}
          totalPages={pages.total_pages ?? 1}
          total={pages.total_count ?? 0}
          limit={pages.limit ?? LIMIT}
          onPage={(n) => update({ page: n > 1 ? String(n) : '' })}
        />
      </section>

      <Presence when={editing}>
        {(item) => (
          <UserDialog
            user={item.id ? item : null}
            self={item.id === me.id}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'user.created' : 'user.saved'));
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={resetting}>
        {(item) => (
          <ResetDialog
            user={item}
            onClose={() => setResetting(null)}
            onDone={() => {
              notify(t('user.resetDone'));
              setResetting(null);
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('user.deleteTitle')}
            text={t('user.deleteText', { name: item.full_name || item.username })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await users.remove(item.id);
              notify(t('user.deleted'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

/** Password field with "Generate" and "Copy". */
function PasswordField({ value, onChange, invalid, label }) {
  const t = useT();
  const notify = useToast();
  return (
    <div className="adm-stack adm-stack--tight">
      <Field type="password" label={label} hint={t('user.passwordHint')} autoComplete="new-password" value={value} maxLength={72} invalid={invalid} onChange={(e) => onChange(e.target.value)} />
      <div className="adm-row">
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => onChange(generatePassword())}>
          <Icon name="refresh" />
          {t('user.generate')}
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm"
          disabled={!value}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              notify(t('user.passwordCopied'), 'info');
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          <Icon name="copy" />
          {t('user.copyPassword')}
        </button>
      </div>
    </div>
  );
}

function UserDialog({ user, self, onClose, onSaved }) {
  const t = useT();
  const fmt = useFormat();
  const formId = useId();
  const [initial] = useState(() => ({
    full_name: user?.full_name ?? '',
    username: user?.username ?? '',
    role: user?.role ?? 'admin',
    is_active: user ? user.is_active !== false : true,
  }));
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field? }
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    const body = { full_name: form.full_name.trim(), username: form.username.trim(), role: form.role };
    if (body.full_name.length < 2) return setError({ text: t('user.errName'), field: 'full_name' });
    if (!USERNAME_RE.test(body.username)) return setError({ text: t('user.errUsername'), field: 'username' });
    if (!user && password.length < 8) return setError({ text: t('user.errPassword'), field: 'password' });
    setBusy(true);
    setError(null);
    try {
      if (user) {
        const patch = changes({ ...initial }, { ...body, is_active: form.is_active });
        if (Object.keys(patch).length) await users.update(user.id, patch);
        onSaved(false);
      } else {
        await users.create({ ...body, password });
        onSaved(true);
      }
    } catch (err) {
      setError(err.status === 409 ? { text: t('user.usernameTaken'), field: 'username' } : { text: errorText(err, t) });
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t(user ? 'user.editTitle' : 'user.newTitle')}
      subtitle={user ? `@${user.username}` : undefined}
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section>
          <Field label={t('lead.name')} value={form.full_name} maxLength={100} autoFocus invalid={error?.field === 'full_name'} onChange={(e) => set('full_name', e.target.value)} />
          <Field
            label={t('user.username')}
            hint={t('user.usernameHint')}
            value={form.username}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            invalid={error?.field === 'username'}
            onChange={(e) => set('username', e.target.value.replace(/\s+/g, ''))}
          />
          {!user && <PasswordField label={t('user.password')} value={password} onChange={setPassword} invalid={error?.field === 'password'} />}
        </Section>
        <Section title={t('course.settings')}>
          <Field type="select" label={t('user.role')} hint={t('user.roleHint')} value={form.role} disabled={self} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {fmt.role(r)}
              </option>
            ))}
          </Field>
          {user && (
            <Switch label={t('user.active')} hint={self ? t('user.selfNote') : t('user.activeHint')} checked={form.is_active} onChange={(v) => !self && set('is_active', v)} />
          )}
          {user && <p className="adm-field__hint">{t('user.sessionsNote')}</p>}
        </Section>
      </form>
    </Modal>
  );
}

function ResetDialog({ user, onClose, onDone }) {
  const t = useT();
  const formId = useId();
  const [password, setPassword] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) return setError(t('user.errPassword'));
    setBusy(true);
    setError(null);
    try {
      await users.resetPassword(user.id, password);
      onDone();
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('user.resetTitle')}
      subtitle={`@${user.username}`}
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error} onCancel={onClose} submitLabel={t('user.resetTitle')} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <p className="adm-muted">{t('user.resetText', { name: user.full_name || user.username })}</p>
        <PasswordField label={t('pw.new')} value={password} onChange={setPassword} />
      </form>
    </Modal>
  );
}
