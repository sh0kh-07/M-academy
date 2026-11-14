import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { catLabel, pick } from '../../lib/http.js';
import { LANG_KEYS, changes, courseCategories, newsCategories, slugify } from '../resources.js';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  FormFooter,
  Icon,
  Modal,
  PageHead,
  Presence,
  Section,
  Spinner,
  Switch,
  errorText,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/*
  Two kinds of categories share this page:
    course — "Admin · Kurs kategoriyalari": can be hidden (is_active); deleting one with courses → 409
    news   — "Admin · Yangiliklar": no is_active; deleting keeps its posts, just uncategorised
*/
const KINDS = {
  course: {
    api: courseCategories,
    count: 'courses_count',
    href: (id) => `/admin/courses?cat=${id}`,
    canHide: true,
    text: {
      nav: 'nav.categories',
      title: 'cats.title',
      intro: 'cats.text',
      colCount: 'cats.colCourses',
      showItems: 'cats.showCourses',
      emptyText: 'cats.emptyText',
      deleteText: 'cat.deleteText',
    },
  },
  news: {
    api: newsCategories,
    count: 'news_count',
    href: (id) => `/admin/news?cat=${id}`,
    canHide: false,
    text: {
      nav: 'ncats.title',
      title: 'ncats.title',
      intro: 'ncats.text',
      colCount: 'ncats.colNews',
      showItems: 'ncats.showItems',
      emptyText: 'ncats.emptyText',
      deleteText: 'ncats.deleteText',
    },
  },
};

/** Categories: list, add/edit dialog, reorder, delete. `top` renders above the heading (section tabs). */
export default function CategoriesList({ kind = 'course', top = null }) {
  const cfg = KINDS[kind];
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t(cfg.text.nav));

  const list = useQuery((signal) => cfg.api.list(signal), [kind]);
  const [editing, setEditing] = useState(null); // a category, or {} for a new one
  const [removing, setRemoving] = useState(null);
  const [moving, setMoving] = useState(false);
  const rows = list.data ?? [];

  // swap two neighbours, then renumber sort_order 0…n-1 where it changed
  async function move(index, step) {
    const next = [...rows];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    list.setData(next);
    setMoving(true);
    try {
      for (let i = 0; i < next.length; i += 1) {
        if ((next[i].sort_order ?? 0) !== i) {
          await cfg.api.update(next[i].id, { sort_order: i });
          next[i] = { ...next[i], sort_order: i };
        }
      }
      list.setData([...next]);
    } catch (err) {
      notify(errorText(err, t), 'error');
      list.reload();
    } finally {
      setMoving(false);
    }
  }

  const nextOrder = rows.reduce((max, c) => Math.max(max, (c.sort_order ?? 0) + 1), 0);
  const name = (c) => pick(catLabel(c), lang);

  return (
    <>
      {top}
      <PageHead title={t(cfg.text.title)} text={t(cfg.text.intro)}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('cats.new')}
        </button>
      </PageHead>

      <section className="adm-card adm-card--flush">
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
          <Empty icon="layers" title={t('cats.empty')} text={t(cfg.text.emptyText)}>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
              <Icon name="plus" />
              {t('cats.new')}
            </button>
          </Empty>
        ) : (
          <div className="adm-table-wrap" data-loading={moving || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('cats.colName')}</th>
                  <th>Slug</th>
                  <th className="num">{t(cfg.text.colCount)}</th>
                  {cfg.canHide && <th>{t('col.status')}</th>}
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const label = catLabel(c);
                  const others = LANG_KEYS.filter((l) => l !== lang)
                    .map((l) => label?.[l])
                    .filter(Boolean);
                  return (
                    <tr key={c.id}>
                      <td>
                        <button type="button" className="adm-cell-btn" onClick={() => setEditing(c)}>
                          <b>{name(c) || '—'}</b>
                          {others.length > 0 && <small>{others.join(' · ')}</small>}
                        </button>
                      </td>
                      <td className="adm-muted">{c.slug || '—'}</td>
                      <td className="num">
                        {c[cfg.count] ? (
                          <Link to={cfg.href(c.id)} className="adm-count-link" title={t(cfg.text.showItems)}>
                            {c[cfg.count]}
                          </Link>
                        ) : (
                          <span className="adm-muted">0</span>
                        )}
                      </td>
                      {cfg.canHide && (
                        <td>
                          <span className={`adm-status${c.is_active === false ? ' adm-status--off' : ''}`}>
                            {t(c.is_active === false ? 'common.inactive' : 'common.active')}
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="adm-icon-btn" disabled={moving || i === 0} onClick={() => move(i, -1)} title={t('lesson.up')} aria-label={t('lesson.up')}>
                            <Icon name="arrowUp" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn"
                            disabled={moving || i === rows.length - 1}
                            onClick={() => move(i, 1)}
                            title={t('lesson.down')}
                            aria-label={t('lesson.down')}
                          >
                            <Icon name="arrowDown" />
                          </button>
                          <button type="button" className="adm-icon-btn" onClick={() => setEditing(c)} title={t('common.edit')} aria-label={t('common.edit')}>
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            onClick={() => setRemoving(c)}
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
      </section>

      <Presence when={editing}>
        {(item) => (
          <CategoryDialog
            cfg={cfg}
            category={item.id ? item : null}
            nextOrder={nextOrder}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'cat.created' : 'cat.saved'));
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <DeleteCategory
            cfg={cfg}
            category={item}
            name={name(item)}
            onClose={() => setRemoving(null)}
            onDelete={async () => {
              await cfg.api.remove(item.id);
              notify(t('cat.deleted'));
              setRemoving(null);
              list.reload();
            }}
            onDeactivate={async () => {
              await cfg.api.update(item.id, { is_active: false });
              notify(t('cat.deactivated'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

function CategoryDialog({ cfg, category, nextOrder, onClose, onSaved }) {
  const t = useT();
  const formId = useId();
  const [initial] = useState(() => {
    const label = catLabel(category);
    return {
      name: { uz: '', ru: '', en: '', ...(label && typeof label === 'object' ? label : { uz: label ?? '' }) },
      slug: category?.slug ?? '',
      sort_order: category?.sort_order ?? nextOrder,
      is_active: category ? category.is_active !== false : true,
    };
  });
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field?, langs? }

  const bodyOf = (f) => ({
    name: { uz: f.name.uz.trim(), ru: f.name.ru.trim(), en: f.name.en.trim() },
    slug: f.slug.trim(),
    sort_order: Number(f.sort_order) || 0,
    ...(cfg.canHide && { is_active: f.is_active }),
  });

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const body = bodyOf(form);
    const empty = LANG_KEYS.filter((l) => !body.name[l]);
    if (empty.length) {
      setError({ text: t('cat.errName'), field: 'name', langs: empty });
      return;
    }
    if (body.slug && !SLUG_RE.test(body.slug)) {
      setError({ text: t('course.errSlug'), field: 'slug' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (category) {
        const patch = changes(bodyOf(initial), body);
        if (patch.slug === '') delete patch.slug; // an empty slug can't clear it; keep what is there
        if (Object.keys(patch).length) await cfg.api.update(category.id, patch);
        onSaved(false);
      } else {
        if (!body.slug) delete body.slug; // the server builds it from the Uzbek name
        await cfg.api.create(body);
        onSaved(true);
      }
    } catch (err) {
      setError(err.status === 409 ? { text: t('course.slugTaken'), field: 'slug' } : { text: errorText(err, t) });
      setBusy(false);
    }
  }

  const bad = (l) => error?.field === 'name' && error.langs?.includes(l);
  return (
    <Modal
      title={t(category ? 'cat.editTitle' : 'cat.newTitle')}
      size="md"
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section title={t('cat.name')}>
          <div className="adm-grid-3">
            {LANG_KEYS.map((l, i) => (
              <Field
                key={l}
                label={l.toUpperCase()}
                autoFocus={i === 0}
                value={form.name[l]}
                maxLength={100}
                invalid={bad(l)}
                onChange={(e) => setForm((f) => ({ ...f, name: { ...f.name, [l]: e.target.value } }))}
              />
            ))}
          </div>
        </Section>

        <Section title={t('course.settings')}>
          <div className="adm-grid-2">
            <Field
              label={t('course.slug')}
              hint={t('cat.slugHint')}
              value={form.slug}
              placeholder={slugify(form.name.uz) || undefined}
              maxLength={80}
              spellCheck={false}
              autoCapitalize="off"
              invalid={error?.field === 'slug'}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
            />
            <Field
              type="number"
              label={t('course.order')}
              hint={t('course.orderHint')}
              value={form.sort_order}
              min={0}
              step={1}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          {cfg.canHide && (
            <Switch
              label={t('cat.active')}
              hint={t('cat.activeHint')}
              checked={form.is_active}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          )}
        </Section>
      </form>
    </Modal>
  );
}

/** Delete confirmation. A 409 means the category still has courses: offer to hide it instead. */
function DeleteCategory({ cfg, category, name, onDelete, onDeactivate, onClose }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const extra = (err) =>
    err.status === 409 && cfg.canHide ? (
      <div className="adm-stack">
        <Alert tone="info">{t('cat.hasCourses')}</Alert>
        {category.is_active !== false && (
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDeactivate();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Spinner />}
            {t('cat.deactivate')}
          </button>
        )}
      </div>
    ) : (
      <Alert tone="error">{errorText(err, t)}</Alert>
    );
  return (
    <Confirm
      title={t('cat.deleteTitle')}
      text={t(cfg.text.deleteText, { name })}
      confirmLabel={t('common.delete')}
      onConfirm={onDelete}
      onClose={onClose}
      extra={extra}
    />
  );
}
