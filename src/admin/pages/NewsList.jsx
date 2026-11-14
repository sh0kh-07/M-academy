import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { catLabel, mediaUrl, pick } from '../../lib/http.js';
import { news, newsCategories } from '../resources.js';
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
  useFormat,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

const LIMIT = 20;

/** Small cover thumbnail; the drawn "M" when the post has no picture. */
function Cover({ post }) {
  return post.image ? (
    <img className="adm-thumb adm-thumb--wide" src={mediaUrl(post.image)} alt="" loading="lazy" />
  ) : (
    <span className="adm-thumb adm-thumb--wide adm-thumb--glyph" aria-hidden="true">
      M
    </span>
  );
}

/** Posts: list with search / status / category filters, delete (Swagger "Admin · Yangiliklar"). */
export default function NewsList() {
  const t = useT();
  const fmt = useFormat();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('news.title'));

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

  const cats = useQuery((signal) => newsCategories.list(signal), []);
  const list = useQuery(
    (signal) => news.list({ lang, page, limit: LIMIT, search, is_published: status, category_id: cat }, signal),
    [lang, page, search, status, cat],
  );
  const [removing, setRemoving] = useState(null);

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const filtered = Boolean(search || status || cat);
  const catName = (p) => {
    const label = catLabel(p.category) ?? catLabel(cats.data?.find((c) => c.id === p.category_id));
    return label ? pick(label, lang) : '—';
  };

  return (
    <>
      <PageHead title={t('news.title')} text={t('news.text')}>
        <Link to="/admin/news/new" className="adm-btn adm-btn--primary">
          <Icon name="plus" />
          {t('news.new')}
        </Link>
      </PageHead>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input
              type="search"
              value={text}
              placeholder={t('news.search')}
              aria-label={t('news.search')}
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
            <option value="true">{t('news.published')}</option>
            <option value="false">{t('news.draft')}</option>
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
            <Empty icon="news" title={t('news.empty')} text={t('news.emptyText')}>
              <Link to="/admin/news/new" className="adm-btn adm-btn--primary">
                <Icon name="plus" />
                {t('news.new')}
              </Link>
            </Empty>
          )
        ) : (
          <div className="adm-table-wrap" data-loading={list.loading || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('news.colPost')}</th>
                  <th>{t('col.category')}</th>
                  <th>{t('news.colDate')}</th>
                  <th className="num">{t('news.colViews')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const published = p.is_published !== false;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/admin/news/${p.id}`} className="adm-course-cell">
                          <Cover post={p} />
                          <span>
                            <b className="adm-clip adm-clip--wide">{pick(p.title, lang) || '—'}</b>
                            {p.slug && <small>/news/{p.slug}</small>}
                          </span>
                        </Link>
                      </td>
                      <td className="adm-muted">{catName(p)}</td>
                      <td className="adm-muted adm-nowrap">{fmt.date(p.published_at ?? p.created_at)}</td>
                      <td className="num">{p.views ?? p.views_count ?? 0}</td>
                      <td>
                        <span className={`adm-status${published ? '' : ' adm-status--draft'}`}>
                          {t(published ? 'news.published' : 'news.draft')}
                        </span>
                      </td>
                      <td>
                        <div className="adm-actions">
                          <Link to={`/admin/news/${p.id}`} className="adm-icon-btn" title={t('common.edit')} aria-label={t('common.edit')}>
                            <Icon name="edit" />
                          </Link>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                            onClick={() => setRemoving(p)}
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

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('news.deleteTitle')}
            text={t('news.deleteText', { name: pick(item.title, lang) })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await news.remove(item.id);
              notify(t('news.deleted'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}
