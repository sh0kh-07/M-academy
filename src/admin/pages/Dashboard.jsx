import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { pick } from '../../lib/http.js';
import { useAuth } from '../auth.jsx';
import { BarList, Meter, StatTile, TrendChart, useNumber } from '../charts.jsx';
import { formatPhone } from '../resources.js';
import { breakdown, dateLabel, last30Days, list, statistics } from '../stats.js';
import { Alert, Icon, PageHead, Spinner, errorText, useFormat, usePageTitle, useQuery, useT } from '../ui.jsx';

/*
  The admin's home: GET /api/admin/statistics/dashboard (one request).
  Headline tiles from `overview`, the last 30 days as two charts (applications + new students share a
  scale; visits get their own chart — one axis per chart), the latest applications, top courses / pages
  and the content counts. Refreshes every two minutes while open.
*/

export default function Dashboard() {
  const t = useT();
  const fmt = useFormat();
  const num = useNumber();
  const { lang } = useI18n();
  const { user } = useAuth();
  usePageTitle(t('nav.dashboard'));

  const dash = useQuery((signal) => statistics.dashboard(lang, signal), [lang]);
  useEffect(() => {
    const id = setInterval(() => !document.hidden && dash.reload(), 120000);
    return () => clearInterval(id);
  }, [dash.reload]);

  const d = dash.data;
  const o = d?.overview ?? {};
  const people = o.people ?? {};
  const visits = o.visits ?? {};
  const content = o.content ?? {};
  const enroll = o.enrollments ?? {};
  const daily = last30Days(d?.last_30_days);
  const hasVisits = daily.some((p) => p.visits);
  const topCourses = breakdown(d?.top_courses, ['title', 'name'], ['students_total', 'students', 'students_count', 'count', 'total'], lang);
  const topPages = breakdown(d?.top_pages, ['path', 'page', 'url'], ['visits', 'views', 'count', 'total'], lang);
  const latest = list(d?.latest_leads);
  const label = (p, long) => dateLabel(p.label, lang, 'day', long);

  return (
    <>
      <PageHead
        title={t('dash.helloShort', { name: user.full_name || user.username })}
        text={t('dash.today', { date: fmt.day(new Date()) })}
      >
        <Link to="/admin/statistics" className="adm-btn adm-btn--ghost">
          <Icon name="chart" />
          {t('dash.openStats')}
        </Link>
      </PageHead>

      {dash.error && !d ? (
        <div className="adm-stack">
          <Alert tone="error">{errorText(dash.error, t)}</Alert>
          <div>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={dash.reload}>
              <Icon name="refresh" />
              {t('boot.retry')}
            </button>
          </div>
        </div>
      ) : !d ? (
        <div className="adm-loading">
          <Spinner />
        </div>
      ) : (
        <div className="adm-dash" data-loading={dash.loading || undefined}>
          <section className="adm-tiles">
            <StatTile
              label={t('st.applicationsToday')}
              value={num.n(people.applications_today)}
              sub={t('st.d7d30', { a: num.n(people.applications_7d), b: num.n(people.applications_30d) })}
            />
            <Link to="/admin/leads?status=new" className="adm-tile-link">
              <StatTile
                label={t('st.newLeads')}
                value={num.n(people.leads_new)}
                tone={people.leads_new > 0 ? 'accent' : undefined}
                sub={`${t('lead.contacted')}: ${num.n(people.leads_contacted)} · ${t('lead.rejected')}: ${num.n(people.leads_rejected)}`}
              />
            </Link>
            <Link to="/admin/students" className="adm-tile-link">
              <StatTile label={t('st.students')} value={num.n(people.students_total)} sub={t('st.new30', { n: num.n(people.new_students_30d) })} />
            </Link>
            <StatTile label={t('st.conversion')} value={num.pct(people.conversion_rate)}>
              <Meter value={people.conversion_rate} />
            </StatTile>
            <StatTile label={t('st.visitsToday')} value={num.n(visits.today)} sub={t('st.unique', { n: num.n(visits.unique_today) })} />
            <StatTile
              label={t('st.visits30')}
              value={num.n(visits.last_30d)}
              sub={t('st.visitToLead', { p: num.pct(visits.visit_to_application_rate_30d) })}
            />
          </section>

          <section className="adm-dash__charts">
            <article className="adm-card">
              <h2 className="adm-card__title">{t('st.trend30')}</h2>
              {daily.length ? (
                <TrendChart
                  title={t('st.trend30')}
                  points={daily}
                  xLabel={label}
                  series={[
                    { key: 'leads', label: t('st.applications') },
                    { key: 'students', label: t('st.newStudents') },
                  ]}
                />
              ) : (
                <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
              )}
            </article>
            <article className="adm-card">
              <h2 className="adm-card__title">{t('st.visitsTrend30')}</h2>
              {hasVisits ? (
                <TrendChart title={t('st.visitsTrend30')} points={daily} xLabel={label} series={[{ key: 'visits', label: t('st.visits') }]} />
              ) : (
                <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
              )}
            </article>
          </section>

          <section className="adm-dash__lists">
            <article className="adm-card adm-card--flush">
              <div className="adm-card__bar adm-pad">
                <h2 className="adm-card__title">{t('st.latestLeads')}</h2>
                <Link to="/admin/leads" className="adm-link adm-link--sm">
                  {t('st.allLeads')}
                  <Icon name="chevronRight" />
                </Link>
              </div>
              {latest.length ? (
                <ul className="adm-latest">
                  {latest.map((l) => (
                    <li key={l.id}>
                      <Link to={`/admin/leads?q=${encodeURIComponent((l.phone ?? '').replace('+', ''))}`}>
                        <span>
                          <b>{l.full_name}</b>
                          <small>
                            {formatPhone(l.phone)}
                            {(l.interested_course ?? l.course) && ` · ${pick((l.interested_course ?? l.course).title, lang)}`}
                          </small>
                        </span>
                        <span className="adm-latest__side">
                          {l.status && (
                            <span className={`adm-enroll adm-pill-select--${l.status}`}>
                              <i className="adm-dot" />
                              {t(`lead.${l.status}`)}
                            </span>
                          )}
                          <small>{fmt.ago(l.created_at)}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-muted adm-pad">{t('leads.emptyText')}</p>
              )}
            </article>
            <article className="adm-card">
              <h2 className="adm-card__title adm-mb">{t('st.topCourses')}</h2>
              <BarList items={topCourses} empty={t('st.noData')} />
            </article>
            <article className="adm-card">
              <h2 className="adm-card__title adm-mb">{t('st.topPages')}</h2>
              <BarList items={topPages} color="#3987e5" empty={t('st.noData')} />
            </article>
          </section>

          <section className="adm-card">
            <h2 className="adm-card__title adm-mb">{t('st.content')}</h2>
            <dl className="adm-counts">
              {[
                [t('st.coursesActive'), `${num.n(content.courses_active)} / ${num.n(content.courses_total)}`, '/admin/courses'],
                [t('st.lessons'), num.n(content.lessons_total)],
                [t('st.teachers'), num.n(content.teachers_total), '/admin/teachers'],
                [t('st.newsPublished'), `${num.n(content.news_published)} / ${num.n(content.news_total)}`, '/admin/news'],
                [t('st.newsViews'), num.n(content.news_views_total)],
                [t('st.enrollments'), `${num.n(enroll.active)} / ${num.n(enroll.total)}`],
                [t('st.multiCourse'), num.n(enroll.students_in_multiple_courses)],
                [t('st.admins'), num.n(content.admins_total)],
              ].map(([k, v, to]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{to ? <Link to={to}>{v}</Link> : v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
