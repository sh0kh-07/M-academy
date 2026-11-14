import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { mediaUrl, pick } from '../../lib/http.js';
import MediaField from '../MediaField.jsx';
import { LANG_KEYS, changes, courseOptions, teacherCourseIds, teachers } from '../resources.js';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  FormFooter,
  Icon,
  LangTabs,
  Modal,
  PageHead,
  Pagination,
  Presence,
  Section,
  Spinner,
  Switch,
  errorText,
  initials,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

const LIMIT = 20;
const emptyText = () => ({ uz: '', ru: '', en: '' });
const text = (v) => (v && typeof v === 'object' ? { ...emptyText(), ...v } : { ...emptyText(), uz: v ?? '' });

/** Teachers: list with search / status / course filters, add-edit dialog, delete (Swagger "Admin · Ustozlar"). */
export default function TeachersList() {
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('nav.teachers'));

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const course = params.get('course') ?? '';
  const update = (patch) =>
    setParams(
      () => {
        // start from the address as it is now: a delayed search update must not undo a newer change
        const next = new URLSearchParams(window.location.search);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true },
    );

  const [textQuery, setTextQuery] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => textQuery.trim() !== search && update({ q: textQuery.trim(), page: '' }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textQuery]);

  const allCourses = useQuery((signal) => courseOptions(lang, signal), [lang]);
  const list = useQuery(
    (signal) => teachers.list({ lang, page, limit: LIMIT, search, is_active: status, course_id: course }, signal),
    [lang, page, search, status, course],
  );
  const [editing, setEditing] = useState(null); // a teacher, or {} for a new one
  const [removing, setRemoving] = useState(null);

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const filtered = Boolean(search || status || course);
  const courseTitle = (c) => pick(c.title ?? allCourses.data?.find((x) => x.id === c.id)?.title, lang);

  return (
    <>
      <PageHead title={t('teachers.title')} text={t('teachers.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('teachers.new')}
        </button>
      </PageHead>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input
              type="search"
              value={textQuery}
              placeholder={t('teachers.search')}
              aria-label={t('teachers.search')}
              onChange={(e) => setTextQuery(e.target.value)}
            />
          </div>
          <Field
            type="select"
            className="adm-toolbar__select"
            aria-label={t('col.status')}
            value={status}
            onChange={(e) => update({ status: e.target.value, page: '' })}
          >
            <option value="">{t('courses.allStatus')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </Field>
          <Field
            type="select"
            className="adm-toolbar__select"
            aria-label={t('teachers.colCourses')}
            value={course}
            onChange={(e) => update({ course: e.target.value, page: '' })}
          >
            <option value="">{t('teachers.allCourses')}</option>
            {(allCourses.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.title, lang)}
              </option>
            ))}
          </Field>
        </div>

        {list.error ? (
          <div className="adm-pad">
            <Alert tone="error">{errorText(list.error, t)}</Alert>
            <button type="button" className="adm-btn adm-btn--ghost adm-mt" onClick={list.reload}>
              <Icon name="refresh" />
              {t('boot.retry')}
            </button>
          </div>
        ) : list.loading && !list.data ? (
          <div className="adm-loading">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          filtered ? (
            <Empty icon="search" title={t('courses.nothing')} text={t('courses.nothingText')} />
          ) : (
            <Empty icon="users" title={t('teachers.empty')} text={t('teachers.emptyText')}>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
                <Icon name="plus" />
                {t('teachers.new')}
              </button>
            </Empty>
          )
        ) : (
          <div className="adm-table-wrap" data-loading={list.loading || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('teachers.colName')}</th>
                  <th>{t('teachers.colCourses')}</th>
                  <th className="num">{t('teachers.colExp')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const name = pick(p.full_name, lang);
                  const linked = Array.isArray(p.courses) ? p.courses : [];
                  return (
                    <tr key={p.id}>
                      <td>
                        <button type="button" className="adm-course-cell adm-cell-btn" onClick={() => setEditing(p)}>
                          {p.image ? (
                            <img className="adm-thumb adm-thumb--round" src={mediaUrl(p.image)} alt="" loading="lazy" />
                          ) : (
                            <span className="adm-avatar">{initials(name)}</span>
                          )}
                          <span>
                            <b>{name || '—'}</b>
                            {pick(p.note, lang) && <small className="adm-clip">{pick(p.note, lang)}</small>}
                          </span>
                        </button>
                      </td>
                      <td>
                        {linked.length ? (
                          <ul className="adm-names">
                            {linked.slice(0, 3).map((c) => (
                              <li key={c.id}>{courseTitle(c)}</li>
                            ))}
                            {linked.length > 3 && <li>+{linked.length - 3}</li>}
                          </ul>
                        ) : (
                          <span className="adm-muted">—</span>
                        )}
                      </td>
                      <td className="num">{p.experience_years != null ? t('teachers.years', { n: p.experience_years }) : '—'}</td>
                      <td>
                        <span className={`adm-status${p.is_active === false ? ' adm-status--off' : ''}`}>
                          {t(p.is_active === false ? 'common.inactive' : 'common.active')}
                        </span>
                      </td>
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="adm-icon-btn" onClick={() => setEditing(p)} title={t('common.edit')} aria-label={t('common.edit')}>
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            onClick={() => setRemoving(p)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
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
          <TeacherDialog
            teacherId={item.id ?? null}
            courses={allCourses.data ?? []}
            presetCourse={item.id ? null : course || null}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'teacher.created' : 'teacher.saved'));
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('teacher.deleteTitle')}
            text={t('teacher.deleteText', { name: pick(item.full_name, lang) })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await teachers.remove(item.id);
              notify(t('teacher.deleted'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

const toForm = (p, presetCourse) => ({
  full_name: text(p?.full_name),
  note: text(p?.note),
  image: p?.image ?? null,
  experience_years: p?.experience_years ?? '',
  course_ids: p ? teacherCourseIds(p) : presetCourse ? [presetCourse] : [],
  sort_order: p?.sort_order ?? 0,
  is_active: p ? p.is_active !== false : true,
});

const toBody = (f) => {
  const body = {
    full_name: {},
    note: {},
    image: f.image || null,
    experience_years: f.experience_years === '' ? null : Number(f.experience_years),
    course_ids: [...f.course_ids].sort(),
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
  };
  LANG_KEYS.forEach((l) => {
    body.full_name[l] = f.full_name[l].trim();
    body.note[l] = f.note[l].trim();
  });
  return body;
};

/** Add / edit a teacher. Editing loads the teacher in all three languages first. */
function TeacherDialog({ teacherId, courses, presetCourse, onClose, onSaved }) {
  const t = useT();
  const { lang } = useI18n();
  const formId = useId();
  const loaded = useQuery((signal) => (teacherId ? teachers.get(teacherId, signal) : Promise.resolve(null)), [teacherId]);
  // a new teacher starts from an empty form straight away; an existing one waits for its data
  const [initial, setInitial] = useState(() => (teacherId ? null : toForm(null, presetCourse)));
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState(lang);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState(null); // { text, field?, langs? }
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!teacherId || loaded.loading || loaded.error) return;
    const values = toForm(loaded.data, null);
    setInitial(values);
    setForm(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded.loading, loaded.data]);

  const visibleCourses = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? courses.filter((c) => pick(c.title, lang).toLowerCase().includes(q)) : courses;
  }, [courses, filter, lang]);

  const setText = (key, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [tab]: value } }));
  const toggleCourse = (id) =>
    setForm((f) => ({ ...f, course_ids: f.course_ids.includes(id) ? f.course_ids.filter((x) => x !== id) : [...f.course_ids, id] }));

  async function submit(e) {
    e.preventDefault();
    if (busy || uploading) return;
    const body = toBody(form);
    if (!body.full_name.uz) {
      setTab('uz');
      setError({ text: t('teacher.errName'), field: 'name', langs: ['uz'] });
      return;
    }
    const years = body.experience_years;
    if (years != null && (!Number.isInteger(years) || years < 0 || years > 80)) {
      setError({ text: t('teacher.errExp'), field: 'exp' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (teacherId) {
        const patch = changes(toBody(initial), body);
        if (Object.keys(patch).length) await teachers.update(teacherId, patch);
        onSaved(false);
      } else {
        if (LANG_KEYS.every((l) => !body.note[l])) delete body.note;
        if (!body.image) delete body.image;
        if (body.experience_years == null) delete body.experience_years;
        await teachers.create(body);
        onSaved(true);
      }
    } catch (err) {
      const langs = err.status === 400 ? [...new Set(err.messages.join(' ').match(/\.(uz|ru|en)\b/g)?.map((m) => m.slice(1)) ?? [])] : [];
      setError({ text: errorText(err, t), langs });
      if (langs.length && !langs.includes(tab)) setTab(langs[0]);
      setBusy(false);
    }
  }

  const title = t(teacherId ? 'teacher.editTitle' : 'teacher.newTitle');

  if (!form) {
    return (
      <Modal title={title} size="lg" onClose={onClose}>
        {loaded.error ? (
          <Alert tone="error">{errorText(loaded.error, t)}</Alert>
        ) : (
          <div className="adm-loading adm-loading--sm">
            <Spinner />
          </div>
        )}
      </Modal>
    );
  }

  const missing = error?.langs ?? [];
  const picked = form.course_ids.length;
  return (
    <Modal
      title={title}
      size="lg"
      onClose={onClose}
      busy={busy || uploading > 0}
      footer={<FormFooter formId={formId} busy={busy} disabled={uploading > 0} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <div className="adm-person-form">
          <MediaField
            portrait
            label={t('teacher.photo')}
            hint={t('teacher.photoHint')}
            value={form.image}
            onChange={(v) => setForm((f) => ({ ...f, image: v }))}
            onBusy={(on) => setUploading((n) => n + (on ? 1 : -1))}
          />
          <Section title={t('teacher.about')} aside={<LangTabs value={tab} onChange={setTab} missing={missing} />}>
            <Field
              key={`n-${tab}`}
              label={`${t('teacher.name')} · ${tab.toUpperCase()}`}
              autoFocus
              value={form.full_name[tab]}
              maxLength={120}
              invalid={error?.field === 'name' && missing.includes(tab)}
              onChange={(e) => setText('full_name', e.target.value)}
            />
            <Field
              key={`d-${tab}`}
              type="textarea"
              rows={6}
              label={`${t('teacher.note')} · ${tab.toUpperCase()}`}
              hint={t('teacher.noteHint')}
              value={form.note[tab]}
              onChange={(e) => setText('note', e.target.value)}
            />
          </Section>
        </div>

        <Section
          title={
            <>
              {t('teacher.courses')}
              {picked > 0 && <b className="adm-count">{picked}</b>}
            </>
          }
          aside={
            courses.length > 8 && (
              <div className="adm-search adm-search--sm">
                <Icon name="search" />
                <input type="search" value={filter} placeholder={t('teacher.filterCourses')} onChange={(e) => setFilter(e.target.value)} />
              </div>
            )
          }
        >
          {courses.length ? (
            <div className="adm-chips" role="group" aria-label={t('teacher.courses')}>
              {visibleCourses.map((c) => {
                const on = form.course_ids.includes(c.id);
                return (
                  <button key={c.id} type="button" className="adm-chip" aria-pressed={on} onClick={() => toggleCourse(c.id)}>
                    {c.symbol && <i>{c.symbol}</i>}
                    {pick(c.title, lang)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="adm-muted">{t('teacher.noCourses')}</p>
          )}
          <small className="adm-field__hint">{t('teacher.coursesHint')}</small>
        </Section>

        <Section title={t('course.settings')}>
          <div className="adm-grid-3">
            <Field
              type="number"
              label={t('teacher.exp')}
              value={form.experience_years}
              min={0}
              max={80}
              step={1}
              invalid={error?.field === 'exp'}
              onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value }))}
            />
            <Field
              type="number"
              label={t('course.order')}
              value={form.sort_order}
              min={0}
              step={1}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
            <div className="adm-switch-cell">
              <Switch label={t('teacher.active')} checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            </div>
          </div>
        </Section>
      </form>
    </Modal>
  );
}
