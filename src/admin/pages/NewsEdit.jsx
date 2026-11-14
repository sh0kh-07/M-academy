import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { catLabel, pick } from '../../lib/http.js';
import { LANG_KEYS, changes, news, newsCategories, slugify } from '../resources.js';
import MediaField from '../MediaField.jsx';
import {
  Alert,
  Confirm,
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
const TEXT_KEYS = ['title', 'excerpt', 'content'];
const emptyText = () => ({ uz: '', ru: '', en: '' });
const text = (v) => (v && typeof v === 'object' ? { ...emptyText(), ...v } : { ...emptyText(), uz: v ?? '' });
const pad = (n) => String(n).padStart(2, '0');

/** ISO date → value for <input type="datetime-local"> (local time), and back. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const BLANK = {
  title: emptyText(),
  excerpt: emptyText(),
  content: emptyText(),
  image: null,
  category_id: '',
  slug: '',
  is_published: true,
  published_at: '',
};

const toForm = (p) => ({
  title: text(p.title),
  excerpt: text(p.excerpt),
  content: text(p.content),
  image: p.image ?? null,
  category_id: p.category_id ?? p.category?.id ?? '',
  slug: p.slug ?? '',
  is_published: p.is_published !== false,
  published_at: toLocalInput(p.published_at),
});

function toBody(form, isNew) {
  const body = {
    image: form.image || null,
    category_id: form.category_id || null,
    slug: form.slug.trim(),
    is_published: form.is_published,
    published_at: fromLocalInput(form.published_at),
  };
  TEXT_KEYS.forEach((key) => {
    body[key] = {};
    LANG_KEYS.forEach((l) => (body[key][l] = form[key][l].trim()));
  });
  if (isNew) Object.keys(body).forEach((k) => (body[k] === null || body[k] === '') && delete body[k]);
  return body;
}

/** Languages where the title, the summary or the full text is still empty. */
const missingLangs = (body) => LANG_KEYS.filter((l) => TEXT_KEYS.some((key) => !body[key][l]));

/** Keyed by id, so going from "new" to the saved post starts from a clean state. */
export default function NewsEditPage() {
  const { id } = useParams();
  return <NewsEdit key={id ?? 'new'} id={id} />;
}

function NewsEdit({ id }) {
  const isNew = !id;
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  const navigate = useNavigate();

  const loaded = useQuery((signal) => (isNew ? Promise.resolve(null) : news.get(id, signal)), [id]);
  const cats = useQuery((signal) => newsCategories.list(signal), []);

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

  const post = loaded.data;
  const heading = isNew ? t('news.newTitle') : pick(post?.title, lang) || t('news.newTitle');
  usePageTitle(heading);

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
    const missing = missingLangs(body);
    if (missing.length) {
      if (!missing.includes(tab)) setTab(missing[0]);
      setError({ text: t('news.errLangs'), langs: missing });
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
        const created = await news.create(body);
        setInitial(form);
        notify(t('news.created'));
        navigate(created?.id ? `/admin/news/${created.id}` : '/admin/news', { replace: true });
        return;
      }
      const patch = changes(toBody(initial, false), body);
      if (!Object.keys(patch).length) {
        notify(t('course.noChanges'), 'info');
      } else {
        const updated = await news.update(id, patch);
        const values = updated && typeof updated === 'object' && updated.title ? toForm(updated) : { ...form, slug: body.slug };
        setInitial(values);
        setForm(values);
        loaded.setData((p) => ({ ...p, ...(updated && typeof updated === 'object' ? updated : patch) }));
        notify(t('course.saved'));
      }
    } catch (err) {
      if (err.status === 409) setError({ text: t('course.slugTaken'), field: 'slug' });
      else {
        const langs = err.status === 400 ? [...new Set(err.messages.join(' ').match(/\.(uz|ru|en)\b/g)?.map((m) => m.slice(1)) ?? [])] : [];
        setError({ text: langs.length ? `${t('news.errLangs')} ${errorText(err, t)}` : errorText(err, t), langs });
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
        {loaded.error.status === 404 ? <Empty icon="news" title={t('news.notFound')} /> : <Alert tone="error">{errorText(loaded.error, t)}</Alert>}
      </>
    );
  }
  if (!isNew && !post) {
    return (
      <div className="adm-loading">
        <Spinner />
      </div>
    );
  }

  const missing = error?.langs ?? [];
  const bad = (key) => missing.includes(tab) && !form[key][tab].trim();
  const words = form.content[tab].trim().split(/\s+/).filter(Boolean).length;
  const catList = cats.data ?? [];
  const live = !isNew && post.is_published !== false && post.slug;
  const saveLabel = isNew ? t(form.is_published ? 'news.publishNow' : 'news.saveDraft') : t('course.save');

  return (
    <>
      <BackLink />
      <PageHead title={heading} text={isNew ? t('news.edText') : post.slug ? `/news/${post.slug}` : null}>
        {live && (
          <a className="adm-btn adm-btn--ghost" href={`/news/${post.slug}`} target="_blank" rel="noopener">
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
              key={`t-${tab}`}
              label={`${t('news.fTitle')} · ${tab.toUpperCase()}`}
              value={form.title[tab]}
              maxLength={250}
              invalid={bad('title')}
              onChange={(e) => setText('title', e.target.value)}
            />
            <Field
              key={`e-${tab}`}
              type="textarea"
              rows={3}
              label={`${t('news.fExcerpt')} · ${tab.toUpperCase()}`}
              hint={t('news.excerptHint')}
              value={form.excerpt[tab]}
              maxLength={500}
              invalid={bad('excerpt')}
              onChange={(e) => setText('excerpt', e.target.value)}
            />
            <Field
              key={`c-${tab}`}
              type="textarea"
              rows={16}
              label={`${t('news.fContent')} · ${tab.toUpperCase()}`}
              hint={`${t('news.contentHint')} · ${t('news.words', { n: words })}`}
              value={form.content[tab]}
              invalid={bad('content')}
              onChange={(e) => setText('content', e.target.value)}
            />
          </section>
        </div>

        <aside className="adm-editor__side">
          <section className="adm-card">
            <MediaField
              label={t('news.cover')}
              hint={t('news.coverHint')}
              value={form.image}
              onChange={(v) => set('image', v)}
              onBusy={(on) => setUploads((n) => n + (on ? 1 : -1))}
            />
          </section>

          <section className="adm-card adm-stack">
            <h2 className="adm-card__title">{t('news.publishing')}</h2>
            <Switch
              label={t('news.isPublished')}
              hint={t('news.isPublishedHint')}
              checked={form.is_published}
              onChange={(v) => set('is_published', v)}
            />
            <Field
              type="datetime-local"
              label={t('news.date')}
              hint={t('news.dateHint')}
              value={form.published_at}
              onChange={(e) => set('published_at', e.target.value)}
            />
            <Field type="select" label={t('course.category')} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">{t('course.noCategory')}</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(catLabel(c), lang)}
                </option>
              ))}
            </Field>
            {cats.data && !catList.length && (
              <p className="adm-field__hint adm-hint-row">
                {t('news.noCats')}{' '}
                <Link to="/admin/news-categories" className="adm-link adm-link--sm">
                  {t('course.addCats')}
                  <Icon name="chevronRight" />
                </Link>
              </p>
            )}
            <Field
              label={t('course.slug')}
              hint={t('news.slugHint', { slug: form.slug || '…' })}
              value={form.slug}
              maxLength={120}
              invalid={error?.field === 'slug'}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
            />
          </section>

          {!isNew && (
            <div className="adm-editor__after adm-stack">
              <section className="adm-card adm-stack">
                <h2 className="adm-card__title">{t('course.stats')}</h2>
                <dl className="adm-dl adm-dl--compact">
                  <div>
                    <dt>{t('news.views')}</dt>
                    <dd>{post.views ?? post.views_count ?? 0}</dd>
                  </div>
                  {post.reading_minutes != null && (
                    <div>
                      <dt>{t('news.reading')}</dt>
                      <dd>{t('news.minutes', { n: post.reading_minutes })}</dd>
                    </div>
                  )}
                </dl>
              </section>
              <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" onClick={() => setRemoving(true)}>
                <Icon name="trash" />
                {t('news.delete')}
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
          {saving ? t('common.saving') : saveLabel}
        </button>
      </div>

      <Presence when={removing}>
        {() => (
          <Confirm
            title={t('news.deleteTitle')}
            text={t('news.deleteText', { name: pick(post.title, lang) })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(false)}
            onConfirm={async () => {
              await news.remove(id);
              setInitial(form);
              notify(t('news.deleted'));
              navigate('/admin/news', { replace: true });
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
    <Link to="/admin/news" className="adm-link adm-back">
      <Icon name="arrowLeft" />
      {t('news.title')}
    </Link>
  );
}
