import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { catLabel, mediaUrl, pick } from '../../lib/http.js';
import { categories, courses } from '../resources.js';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  Icon,
  PageHead,
  Pagination,
  Presence,
  Spinner,
  errorText,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

const LIMIT = 20;

/** Small square: the course image, or its symbol when there is none. */
export function CourseThumb({ course }) {
  return course.image ? (
    <img className="adm-thumb" src={mediaUrl(course.image)} alt="" loading="lazy" />
  ) : (
    <span className="adm-thumb adm-thumb--glyph" aria-hidden="true">
      {course.symbol || '—'}
    </span>
  );
}

export default function CoursesList() {
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('courses.title'));

  // filters live in the URL, so "Back" from a course returns to the same view
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const cat = params.get('cat') ?? '';
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

  const [text, setText] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => text.trim() !== search && update({ q: text.trim(), page: '' }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const cats = useQuery((signal) => categories(signal), []);
  const list = useQuery(
    (signal) => courses.list({ lang, page, limit: LIMIT, search, is_active: status, category_id: cat }, signal),
    [lang, page, search, status, cat],
  );
  const [removing, setRemoving] = useState(null);

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const filtered = Boolean(search || status || cat);
  const catName = (c) => {
    const title = catLabel(c.category) ?? c.category_name ?? catLabel(cats.data?.find((x) => x.id === c.category_id));
    return title ? pick(title, lang) : '—';
  };

  const remove = async () => {
    await courses.remove(removing.id);
    notify(t('courses.deleted'));
    setRemoving(null);
    list.reload();
  };
  const deactivate = async () => {
    await courses.update(removing.id, { is_active: false });
    notify(t('courses.deactivated'));
    setRemoving(null);
    list.reload();
  };

  return (
    <>
      <PageHead title={t('courses.title')} text={t('courses.text')}>
        <Link to="/admin/courses/new" className="adm-btn adm-btn--primary">
          <Icon name="plus" />
          {t('courses.new')}
        </Link>
      </PageHead>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input
              type="search"
              value={text}
              placeholder={t('courses.search')}
              aria-label={t('courses.search')}
              onChange={(e) => setText(e.target.value)}
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
            aria-label={t('col.category')}
            value={cat}
            onChange={(e) => update({ cat: e.target.value, page: '' })}
          >
            <option value="">{t('courses.allCats')}</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {pick(catLabel(c), lang)}
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
            <Empty icon="courses" title={t('courses.empty')} text={t('courses.emptyText')}>
              <Link to="/admin/courses/new" className="adm-btn adm-btn--primary">
                <Icon name="plus" />
                {t('courses.new')}
              </Link>
            </Empty>
          )
        ) : (
          <div className="adm-table-wrap" data-loading={list.loading || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('col.course')}</th>
                  <th>{t('col.category')}</th>
                  <th className="num">{t('col.lessons')}</th>
                  <th className="num">{t('col.students')}</th>
                  <th className="num">{t('col.leads')}</th>
                  <th className="num">{t('col.teachers')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/courses/${c.id}`} className="adm-course-cell">
                        <CourseThumb course={c} />
                        <span>
                          <b>{pick(c.title, lang) || '—'}</b>
                          {c.slug && <small>/{c.slug}</small>}
                        </span>
                      </Link>
                    </td>
                    <td className="adm-muted">{catName(c)}</td>
                    <td className="num">{c.lessons_count ?? 0}</td>
                    <td className="num">{c.students_count ?? 0}</td>
                    <td className="num">{c.leads_count ?? 0}</td>
                    <td className="num">{c.teachers_count ?? 0}</td>
                    <td>
                      <span className={`adm-status${c.is_active === false ? ' adm-status--off' : ''}`}>
                        {t(c.is_active === false ? 'common.inactive' : 'common.active')}
                      </span>
                    </td>
                    <td>
                      <div className="adm-actions">
                        <Link to={`/admin/courses/${c.id}`} className="adm-icon-btn" title={t('common.edit')} aria-label={t('common.edit')}>
                          <Icon name="edit" />
                        </Link>
                        <button
                          type="button"
                          className="adm-icon-btn adm-icon-btn--danger"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                          onClick={() => setRemoving(c)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pages.page ?? page}
          totalPages={pages.total_pages ?? 1}
          total={pages.total_count ?? 0}
          limit={pages.limit ?? LIMIT}
          onPage={(p) => update({ page: p > 1 ? String(p) : '' })}
        />
      </section>

      <Presence when={removing}>
        {(item) => (
          <DeleteCourse
            course={item}
            name={pick(item.title, lang)}
            onDelete={remove}
            onDeactivate={deactivate}
            onClose={() => setRemoving(null)}
          />
        )}
      </Presence>
    </>
  );
}

/** Delete confirmation. A 409 means students are enrolled: offer to hide the course instead. */
export function DeleteCourse({ course, name, onDelete, onDeactivate, onClose }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const extra = (err) =>
    err.status === 409 ? (
      <div className="adm-stack">
        <Alert tone="info">{t('courses.hasStudents')}</Alert>
        {course.is_active !== false && (
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
            {t('courses.deactivate')}
          </button>
        )}
      </div>
    ) : (
      <Alert tone="error">{errorText(err, t)}</Alert>
    );
  return (
    <Confirm
      title={t('courses.deleteTitle')}
      text={t('courses.deleteText', { name })}
      confirmLabel={t('common.delete')}
      onConfirm={onDelete}
      onClose={onClose}
      extra={extra}
    />
  );
}
