import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { catLabel, pick } from '../../lib/http.js';
import { LANG_KEYS, categories, changes, courses, slugify } from '../resources.js';
import MediaField from '../MediaField.jsx';
import CourseLessons from './CourseLessons.jsx';
import { DeleteCourse } from './CoursesList.jsx';
import {
  Alert,
  Empty,
  Field,
  Icon,
  LangTabs,
  PageHead,
  Presence,
  Spinner,
  Switch,
  errorText,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyText = () => ({ uz: '', ru: '', en: '' });
const BLANK = {
  title: emptyText(),
  description: emptyText(),
  category_id: '',
  image: null,
  symbol: '',
  slug: '',
  sort_order: 0,
  is_active: true,
};

/** API course → editable form values. */
function toForm(c) {
  const text = (v) => (v && typeof v === 'object' ? { ...emptyText(), ...v } : { ...emptyText(), uz: v ?? '' });
  return {
    title: text(c.title),
    description: text(c.description),
    category_id: c.category_id ?? c.category?.id ?? '',
    image: c.image ?? null,
    symbol: c.symbol ?? '',
    slug: c.slug ?? '',
    sort_order: c.sort_order ?? 0,
    is_active: c.is_active !== false,
  };
}

/** Form values → request body. A new course leaves out what was never filled in. */
function toBody(form, isNew) {
  const body = {
    ...form,
    title: { ...form.title },
    description: { ...form.description },
    symbol: form.symbol.trim(),
    slug: form.slug.trim(),
    sort_order: Number(form.sort_order) || 0,
    category_id: form.category_id || null,
  };
  LANG_KEYS.forEach((l) => {
    body.title[l] = body.title[l].trim();
    body.description[l] = body.description[l].trim();
  });
  if (isNew) {
    Object.keys(body).forEach((k) => (body[k] === null || body[k] === '') && delete body[k]);
    if (LANG_KEYS.every((l) => !body.description[l])) delete body.description;
  }
  return body;
}

/** Languages the server complained about, e.g. "title.ru should not be empty" → ['ru']. */
const langsIn = (messages = []) => [...new Set(messages.join(' ').match(/\.(uz|ru|en)\b/g)?.map((m) => m.slice(1)) ?? [])];

/** Keyed by id: going from "new" to the saved course (same component) must start from a clean state. */
export default function CourseEditPage() {
  const { id } = useParams();
  return <CourseEdit key={id ?? 'new'} id={id} />;
}

function CourseEdit({ id }) {
  const isNew = !id;
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  const navigate = useNavigate();

  const loaded = useQuery((signal) => (isNew ? Promise.resolve(null) : courses.get(id, signal)), [id]);
  const cats = useQuery((signal) => categories(signal), []);

  const [initial, setInitial] = useState(BLANK);
  const [form, setForm] = useState(BLANK);
  const [tab, setTab] = useState(lang);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [uploads, setUploads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null); // { text, field?, langs? }
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!loaded.data) return;
    const values = toForm(loaded.data);
    setInitial(values);
    setForm(values);
  }, [loaded.data]);

  const course = loaded.data;
  const title = isNew ? t('course.newTitle') : pick(course?.title, lang) || t('course.newTitle');
  usePageTitle(title);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setText = (key, value) =>
    setForm((f) => {
      const next = { ...f, [key]: { ...f[key], [tab]: value } };
      if (key === 'title' && tab === 'uz' && !slugTouched) next.slug = slugify(value);
      return next;
    });

  async function save() {
    if (saving || uploads) return;
    const body = toBody(form, isNew);
    if (!body.title.uz) {
      setTab('uz');
      setError({ text: t('course.errTitle'), field: 'title', langs: ['uz'] });
      return;
    }
    if (!body.slug) body.slug = slugify(body.title.uz);
    if (body.slug && !SLUG_RE.test(body.slug)) {
      setError({ text: t('course.errSlug'), field: 'slug' });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        const created = await courses.create(body);
        setInitial(form); // nothing left unsaved before we move on
        notify(t('course.created'));
        navigate(created?.id ? `/admin/courses/${created.id}` : '/admin/courses', { replace: true });
        return;
      }
      const patch = changes(toBody(initial, false), body);
      if (!Object.keys(patch).length) {
        notify(t('course.noChanges'), 'info');
      } else {
        const updated = await courses.update(id, patch);
        const values = updated && typeof updated === 'object' && updated.title ? toForm(updated) : { ...form, slug: body.slug };
        setInitial(values);
        setForm(values);
        loaded.setData((c) => ({ ...c, ...(updated && typeof updated === 'object' ? updated : patch) }));
        notify(t('course.saved'));
      }
    } catch (err) {
      if (err.status === 409) setError({ text: t('course.slugTaken'), field: 'slug' });
      else {
        const langs = err.status === 400 ? langsIn(err.messages) : [];
        setError({ text: langs.length ? `${t('course.errLangs')} ${errorText(err, t)}` : errorText(err, t), langs });
        if (langs.length && !langs.includes(tab)) setTab(langs[0]);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && loaded.error) {
    return (
      <>
        <BackLink />
        {loaded.error.status === 404 ? (
          <Empty icon="courses" title={t('course.notFound')} />
        ) : (
          <Alert tone="error">{errorText(loaded.error, t)}</Alert>
        )}
      </>
    );
  }
  if (!isNew && !course) {
    return (
      <div className="adm-loading">
        <Spinner />
      </div>
    );
  }

  const missing = error?.langs ?? [];
  const catList = cats.data ?? [];

  return (
    <>
      <BackLink />
      <PageHead title={title} text={isNew ? t('course.text') : course.slug ? `/courses/${course.slug}` : null}>
        {!isNew && course.is_active !== false && course.slug && (
          <a className="adm-btn adm-btn--ghost" href={`/courses/${course.slug}`} target="_blank" rel="noopener">
            <Icon name="external" />
            {t('course.view')}
          </a>
        )}
      </PageHead>

      <div className="adm-editor">
        <div className="adm-editor__main">
          <section className="adm-card adm-stack">
            <div className="adm-card__bar">
              <h2 className="adm-card__title">{t('course.content')}</h2>
              <LangTabs value={tab} onChange={setTab} missing={missing} />
            </div>
            <Field
              key={`title-${tab}`}
              label={`${t('course.name')} · ${tab.toUpperCase()}`}
              value={form.title[tab]}
              maxLength={200}
              invalid={error?.field === 'title' && missing.includes(tab)}
              onChange={(e) => setText('title', e.target.value)}
            />
            <Field
              key={`desc-${tab}`}
              type="textarea"
              rows={8}
              label={`${t('course.description')} · ${tab.toUpperCase()}`}
              hint={t('course.descHint')}
              value={form.description[tab]}
              onChange={(e) => setText('description', e.target.value)}
            />
          </section>

          {!isNew && (
            <div className="adm-editor__lessons">
              <CourseLessons courseId={id} initial={course.lessons} />
            </div>
          )}
        </div>

        <aside className="adm-editor__side">
          {/* the course photo: on the card and the course page (no demo video — not needed) */}
          <section className="adm-card">
            <MediaField
              kind="image"
              label={t('course.image')}
              hint={t('course.imageHint')}
              value={form.image}
              onChange={(v) => set('image', v)}
              onBusy={(on) => setUploads((n) => n + (on ? 1 : -1))}
            />
          </section>

          <section className="adm-card adm-stack">
            <h2 className="adm-card__title">{t('course.settings')}</h2>
            <Switch
              label={t('course.active')}
              hint={t('course.activeHint')}
              checked={form.is_active}
              onChange={(v) => set('is_active', v)}
            />
            <Field
              type="select"
              label={t('course.category')}
              value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
            >
              <option value="">{t('course.noCategory')}</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(catLabel(c), lang)}
                  {c.is_active === false ? ` (${t('common.inactive').toLowerCase()})` : ''}
                </option>
              ))}
            </Field>
            {cats.data && !catList.length && (
              <p className="adm-field__hint adm-hint-row">
                {t('course.noCats')}{' '}
                <Link to="/admin/categories" className="adm-link adm-link--sm">
                  {t('course.addCats')}
                  <Icon name="chevronRight" />
                </Link>
              </p>
            )}
            <Field
              label={t('course.symbol')}
              hint={t('course.symbolHint')}
              value={form.symbol}
              maxLength={4}
              onChange={(e) => set('symbol', e.target.value)}
            />
            <Field
              label={t('course.slug')}
              hint={t('course.slugHint', { slug: form.slug || '…' })}
              value={form.slug}
              maxLength={80}
              invalid={error?.field === 'slug'}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
            />
            <Field
              type="number"
              label={t('course.order')}
              hint={t('course.orderHint')}
              value={form.sort_order}
              min={0}
              step={1}
              onChange={(e) => set('sort_order', e.target.value)}
            />
          </section>

          {!isNew && (
            <div className="adm-editor__after adm-stack">
              <CourseStats course={course} />
              <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" onClick={() => setRemoving(true)}>
                <Icon name="trash" />
                {t('course.delete')}
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="adm-savebar" data-dirty={dirty || isNew || undefined}>
        <div className="adm-savebar__msg">
          {error ? <Alert tone="error">{error.text}</Alert> : dirty && <span>{t('course.unsaved')}</span>}
        </div>
        {dirty && !isNew && (
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            disabled={saving}
            onClick={() => {
              setForm(initial);
              setError(null);
            }}
          >
            {t('common.cancel')}
          </button>
        )}
        <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving || uploads > 0 || (!dirty && !isNew)}>
          {(saving || uploads > 0) && <Spinner />}
          {saving ? t('common.saving') : isNew ? t('course.create') : t('course.save')}
        </button>
      </div>

      <Presence when={removing}>
        {() => (
          <DeleteCourse
            course={course}
            name={pick(course.title, lang)}
            onClose={() => setRemoving(false)}
            onDelete={async () => {
              await courses.remove(id);
              setInitial(form);
              notify(t('courses.deleted'));
              navigate('/admin/courses', { replace: true });
            }}
            onDeactivate={async () => {
              await courses.update(id, { is_active: false });
              setInitial((v) => ({ ...v, is_active: false }));
              setForm((v) => ({ ...v, is_active: false }));
              loaded.setData((c) => ({ ...c, is_active: false }));
              notify(t('courses.deactivated'));
              setRemoving(false);
            }}
          />
        )}
      </Presence>
    </>
  );
}

function BackLink() {
  const t = useT();
  return (
    <Link to="/admin/courses" className="adm-link adm-back">
      <Icon name="arrowLeft" />
      {t('courses.title')}
    </Link>
  );
}

function CourseStats({ course }) {
  const t = useT();
  const { lang } = useI18n();
  const teachers = Array.isArray(course.teachers) ? course.teachers : [];
  const rows = [
    ['col.lessons', course.lessons_count ?? course.lessons?.length ?? 0],
    ['col.students', course.students_count ?? 0],
    ['col.leads', course.leads_count ?? 0],
    ['col.teachers', course.teachers_count ?? teachers.length],
  ];
  return (
    <section className="adm-card adm-stack">
      <h2 className="adm-card__title">{t('course.stats')}</h2>
      <dl className="adm-dl adm-dl--compact">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {teachers.length > 0 && (
        <ul className="adm-names">
          {teachers.map((p) => (
            <li key={p.id}>{pick(p.full_name ?? p.name, lang)}</li>
          ))}
        </ul>
      )}
      <div className="adm-row">
        <Link to={`/admin/students?course=${course.id}`} className="adm-link adm-link--sm">
          {t('course.showStudents')}
          <Icon name="chevronRight" />
        </Link>
        <Link to={`/admin/teachers?course=${course.id}`} className="adm-link adm-link--sm">
          {t('course.manageTeachers')}
          <Icon name="chevronRight" />
        </Link>
      </div>
    </section>
  );
}
