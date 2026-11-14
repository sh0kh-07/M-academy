import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { pick } from '../../lib/http.js';
import { BarList, ColumnChart, Heatmap, Meter, SERIES, StatTile, TrendChart, useNumber } from '../charts.jsx';
import { daysAgo, isoDay } from '../people.jsx';
import { regions } from '../resources.js';
import { breakdown, byHour, byWeekday, dateLabel, dayIndex, heatCells, list, num, series, statistics, str } from '../stats.js';
import { Alert, Icon, PageHead, Spinner, errorText, usePageTitle, useQuery, useT } from '../ui.jsx';

/*
  /admin/statistics — four tabs over the statistics endpoints. One row of filters above the
  charts (period presets + custom dates, chart step) scopes everything below it; the period
  and the tab live in the URL. Refetching keeps the previous charts at reduced opacity.
*/

const TABS = ['leads', 'students', 'visits', 'courses'];
const PRESETS = [
  ['7', 'st.days7', 6],
  ['30', 'st.days30', 29],
  ['90', 'st.days90', 89],
  ['365', 'st.year', 364],
];
const STEPS = [
  ['day', 'st.byDay'],
  ['week', 'st.byWeek'],
  ['month', 'st.byMonth'],
];
const AGE_KEYS = ['group', 'age_group', 'range', 'label', 'name', 'key'];
const REGION_KEYS = ['name', 'region_name', 'title', 'region', 'label'];

/** Region keys → names via GET /api/regions when the API sends only the key. */
function useRegionNames() {
  const { lang } = useI18n();
  const regs = useQuery((signal) => regions(signal), []);
  return (item) => {
    const raw = item.raw ?? item;
    const key = raw.region ?? raw.key;
    const named = regs.data?.find((r) => r.key === key)?.name;
    return named ? pick(named, lang) : item.label;
  };
}

export default function Statistics() {
  const t = useT();
  usePageTitle(t('nav.statistics'));
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'leads';
  const from = params.get('from') ?? daysAgo(29);
  const to = params.get('to') ?? isoDay(new Date());
  const groupBy = params.get('by') ?? 'day';
  const set = (patch) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true },
    );
  const preset = !params.get('to') || params.get('to') === isoDay(new Date()) ? PRESETS.find(([, , n]) => from === daysAgo(n))?.[0] : null;
  const period = { from, to, group_by: groupBy };

  return (
    <>
      <PageHead title={t('st.title')} text={t('st.text')} />

      <div className="adm-status-tabs" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className="adm-status-tab" onClick={() => set({ tab: key })}>
            {t(`st.tab${key[0].toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      {tab !== 'courses' && (
        <div className="adm-filterbar">
          <div className="adm-presets" role="group">
            {PRESETS.map(([key, label, n]) => (
              <button key={key} type="button" className="adm-chip adm-chip--sm" aria-pressed={preset === key} onClick={() => set({ from: daysAgo(n), to: '' })}>
                {t(label)}
              </button>
            ))}
          </div>
          <label className="adm-date">
            <span>{t('leads.from')}</span>
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && set({ from: e.target.value })} />
          </label>
          <label className="adm-date">
            <span>{t('leads.to')}</span>
            <input type="date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => e.target.value && set({ to: e.target.value })} />
          </label>
          <div className="adm-tabs adm-tabs--step" role="group" aria-label={t('st.byDay')}>
            {STEPS.map(([key, label]) => (
              <button key={key} type="button" aria-selected={groupBy === key} onClick={() => set({ by: key === 'day' ? '' : key })}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'leads' && <LeadsTab period={period} />}
      {tab === 'students' && <StudentsTab period={period} />}
      {tab === 'visits' && <VisitsTab period={period} />}
      {tab === 'courses' && <CoursesTab />}
    </>
  );
}

/** Loading / error / content with the previous render kept (dimmed) while refetching. */
function Frame({ q, children }) {
  const t = useT();
  if (q.error && !q.data) {
    return (
      <div className="adm-stack">
        <Alert tone="error">{errorText(q.error, t)}</Alert>
        <div>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={q.reload}>
            <Icon name="refresh" />
            {t('boot.retry')}
          </button>
        </div>
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="adm-loading">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="adm-dash" data-loading={q.loading || undefined}>
      {children(q.data)}
    </div>
  );
}

function Card({ title, children, wide, flush }) {
  return (
    <article className={`adm-card${wide ? ' adm-card--wide' : ''}${flush ? ' adm-card--flush' : ''}`}>
      {title && <h2 className={`adm-card__title adm-mb${flush ? ' adm-pad' : ''}`}>{title}</h2>}
      {children}
    </article>
  );
}

const useAxis = (groupBy) => {
  const { lang } = useI18n();
  return (p, long) => dateLabel(p.label, lang, groupBy, long);
};

function useDays() {
  const t = useT();
  return { short: t('st.days'), long: t('st.daysLong') };
}

/* ---------------- applications ---------------- */

function LeadsTab({ period }) {
  const t = useT();
  const n = useNumber();
  const { lang } = useI18n();
  const regionName = useRegionNames();
  const days = useDays();
  const axis = useAxis(period.group_by);
  const q = useQuery((signal) => statistics.leads({ lang, ...period }, signal), [lang, period.from, period.to, period.group_by]);

  return (
    <Frame q={q}>
      {(d) => {
        const tot = d.totals ?? {};
        const source = tot.by_source ?? tot.source ?? {};
        const hours = num(tot, ['avg_hours_to_convert', 'avg_conversion_hours', 'avg_time_to_convert_hours', 'avg_hours'], null);
        const points = series(d.dynamics, { applications: ['applications', 'count', 'leads'], converted: ['converted', 'students'] });
        const regionsList = breakdown(d.by_region, REGION_KEYS, ['count', 'applications', 'leads', 'total'], lang).map((r) => ({ ...r, label: regionName(r) }));
        const courses = breakdown(d.by_course, ['title', 'name'], ['count', 'applications', 'leads', 'total'], lang).map((c) =>
          c.raw.id == null && c.raw.course_id == null ? { ...c, label: t('st.noCourse') } : c,
        );
        const ages = breakdown(d.by_age_group, AGE_KEYS, ['count', 'applications', 'leads', 'total'], lang);
        const hourly = byHour(d.by_hour);
        const weekly = byWeekday(d.by_weekday);
        const peakHour = hourly.indexOf(Math.max(...hourly));
        const peakDay = weekly.indexOf(Math.max(...weekly));
        const stages = [
          ['new', num(tot, ['new', 'leads_new', 'status_new'])],
          ['contacted', num(tot, ['contacted', 'leads_contacted', 'status_contacted'])],
          ['rejected', num(tot, ['rejected', 'leads_rejected', 'status_rejected'])],
          ['student', num(tot, ['converted', 'students', 'student'])],
        ];
        return (
          <>
            <section className="adm-tiles">
              <StatTile label={t('st.applications')} value={n.n(num(tot, ['applications', 'total', 'applications_total', 'count']))} />
              <StatTile label={t('st.converted')} value={n.n(num(tot, ['converted', 'students', 'converted_total']))} />
              <StatTile label={t('st.conversion')} value={n.pct(num(tot, ['conversion_rate'], null))}>
                <Meter value={num(tot, ['conversion_rate'])} />
              </StatTile>
              <StatTile label={t('st.avgAge')} value={n.n(Math.round(num(tot, ['avg_age', 'average_age']) * 10) / 10)} />
              <StatTile
                label={t('st.avgTime')}
                value={hours == null ? '—' : hours >= 48 ? t('st.daysN', { n: n.n(Math.round(hours / 24)) }) : t('st.hours', { n: n.n(Math.round(hours)) })}
              />
              <StatTile
                label={t('st.fromSite')}
                value={n.n(num(source, ['site', 'web'], num(tot, ['source_site', 'from_site'])))}
                sub={`${t('st.fromAdmin')}: ${n.n(num(source, ['admin', 'manual'], num(tot, ['source_admin', 'from_admin'])))}`}
              />
            </section>

            <Card title={t('st.stages')}>
              <div className="adm-stages">
                {stages.map(([key, value]) => (
                  <div key={key} className={`adm-stage adm-pill-select--${key === 'student' ? 'active' : key}`}>
                    <i className="adm-dot" />
                    <span>{key === 'student' ? t('st.converted') : t(`lead.${key}`)}</span>
                    <b>{n.n(value)}</b>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={`${t('st.applications')} · ${t('st.converted')}`}>
              {points.length ? (
                <TrendChart
                  title={t('st.applications')}
                  points={points}
                  xLabel={axis}
                  series={[
                    { key: 'applications', label: t('st.applications') },
                    { key: 'converted', label: t('st.converted') },
                  ]}
                />
              ) : (
                <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
              )}
            </Card>

            <section className="adm-grid-cards">
              <Card title={t('st.byRegion')}>
                <BarList items={regionsList} limit={14} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.byCourse')}>
                <BarList items={courses} limit={14} empty={t('st.noData')} />
              </Card>
            </section>

            <section className="adm-grid-cards adm-grid-cards--3">
              <Card title={t('st.byAge')}>
                <ColumnChart items={ages.map((a) => ({ label: a.label, value: a.value }))} valueLabel={t('st.applications')} />
              </Card>
              <Card title={t('st.byHour')}>
                <ColumnChart
                  items={hourly.map((v, h) => ({ label: String(h).padStart(2, '0'), title: `${String(h).padStart(2, '0')}:00`, value: v }))}
                  showEvery={3}
                  highlight={Math.max(...hourly) > 0 ? peakHour : undefined}
                  valueLabel={t('st.applications')}
                />
              </Card>
              <Card title={t('st.byWeekday')}>
                <ColumnChart
                  items={weekly.map((v, i) => ({ label: days.short[i], title: days.long[i], value: v }))}
                  highlight={Math.max(...weekly) > 0 ? peakDay : undefined}
                  valueLabel={t('st.applications')}
                />
              </Card>
            </section>
          </>
        );
      }}
    </Frame>
  );
}

/* ---------------- students ---------------- */

function StudentsTab({ period }) {
  const t = useT();
  const n = useNumber();
  const { lang } = useI18n();
  const regionName = useRegionNames();
  const axis = useAxis(period.group_by);
  const q = useQuery((signal) => statistics.students({ lang, ...period }, signal), [lang, period.from, period.to, period.group_by]);

  return (
    <Frame q={q}>
      {(d) => {
        const tot = d.totals ?? {};
        const points = series(d.dynamics, { new_students: ['new_students', 'count', 'students'], total: ['total', 'students_total', 'cumulative'] });
        const courses = list(d.by_course);
        const regionsList = breakdown(d.by_region, REGION_KEYS, ['count', 'students', 'total'], lang).map((r) => ({ ...r, label: regionName(r) }));
        const ages = breakdown(d.by_age_group, AGE_KEYS, ['count', 'students', 'total'], lang);
        const counts = list(d.by_courses_count).map((p) => ({
          label: String(num(p, ['courses', 'courses_count', 'count_courses', 'n'])),
          title: t('st.coursesN', { n: num(p, ['courses', 'courses_count', 'count_courses', 'n']) }),
          value: num(p, ['students', 'students_count', 'count', 'total']),
        }));
        return (
          <>
            <section className="adm-tiles adm-tiles--3">
              <StatTile label={t('st.newStudents')} value={n.n(num(tot, ['new_students', 'new', 'added']))} />
              <StatTile label={t('st.totalNow')} value={n.n(num(tot, ['total', 'students_total', 'total_students']))} />
              <StatTile label={t('st.avgAge')} value={n.n(Math.round(num(tot, ['avg_age', 'average_age']) * 10) / 10)} />
            </section>

            <section className="adm-grid-cards">
              <Card title={t('st.newStudents')}>
                {points.length ? (
                  <TrendChart title={t('st.newStudents')} points={points} xLabel={axis} series={[{ key: 'new_students', label: t('st.newStudents') }]} />
                ) : (
                  <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
                )}
              </Card>
              <Card title={t('st.growth')}>
                {points.length ? (
                  <TrendChart title={t('st.growth')} points={points} xLabel={axis} series={[{ key: 'total', label: t('st.totalNow'), color: SERIES[1] }]} />
                ) : (
                  <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
                )}
              </Card>
            </section>

            <Card title={t('st.byCourse')} flush>
              {courses.length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>{t('col.course')}</th>
                        <th className="num">{t('st.studentsCol')}</th>
                        <th className="num">{t('st.activeCol')}</th>
                        <th className="num">{t('st.finishedCol')}</th>
                        <th className="num">{t('st.leftCol')}</th>
                        <th className="num">{t('st.newInPeriod')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c, i) => (
                        <tr key={c.id ?? i}>
                          <td>{pick(c.title ?? c.name, lang) || '—'}</td>
                          <td className="num">
                            <b>{n.n(num(c, ['total', 'students_total', 'students']))}</b>
                          </td>
                          <td className="num">{n.n(num(c, ['active', 'students_active']))}</td>
                          <td className="num">{n.n(num(c, ['finished', 'students_finished']))}</td>
                          <td className="num">{n.n(num(c, ['left', 'students_left']))}</td>
                          <td className="num">{n.n(num(c, ['new_in_period', 'enrolled_in_period', 'new', 'enrolled']))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="adm-muted adm-pad">{t('st.noData')}</p>
              )}
            </Card>

            <section className="adm-grid-cards adm-grid-cards--3">
              <Card title={t('st.byRegion')}>
                <BarList items={regionsList} limit={14} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.byAge')}>
                <ColumnChart items={ages.map((a) => ({ label: a.label, value: a.value }))} valueLabel={t('st.studentsCol')} />
              </Card>
              <Card title={t('st.byCoursesCount')}>
                <ColumnChart items={counts} valueLabel={t('st.studentsCol')} />
              </Card>
            </section>
          </>
        );
      }}
    </Frame>
  );
}

/* ---------------- site visits ---------------- */

function VisitsTab({ period }) {
  const t = useT();
  const n = useNumber();
  const { lang } = useI18n();
  const days = useDays();
  const axis = useAxis(period.group_by);
  const q = useQuery((signal) => statistics.visits({ lang, ...period }, signal), [lang, period.from, period.to, period.group_by]);
  const share = (v, item) => (item.share != null ? `${n.pct(item.share)}` : n.n(v));
  const shares = (arr, keys) => breakdown(arr, keys, ['count', 'visits', 'value', 'total'], lang);

  return (
    <Frame q={q}>
      {(d) => {
        const tot = d.totals ?? {};
        const peak = d.peak ?? {};
        const points = series(d.dynamics, { visits: ['visits', 'count', 'total'], unique: ['unique_visitors', 'unique', 'visitors'] });
        const hourly = byHour(d.by_hour);
        const weekly = byWeekday(d.by_weekday);
        const peakHour = num(peak, ['hour'], hourly.indexOf(Math.max(...hourly)));
        const peakDayRaw = str(peak, ['weekday', 'day', 'day_of_week']);
        const peakDayIndex = weekly.indexOf(Math.max(...weekly));
        // the server's own answer first (a weekday number or name), else the busiest bar
        const peakIndex = peakDayRaw != null ? dayIndex(peakDayRaw) : -1;
        const peakDay = peakIndex >= 0 ? days.long[peakIndex] : peakDayRaw != null ? String(peakDayRaw) : null;
        const pages = breakdown(d.top_pages, ['path', 'page', 'url'], ['visits', 'views', 'count', 'total'], lang);
        const referrers = breakdown(d.referrers, ['referrer', 'host', 'domain', 'source', 'name', 'url'], ['visits', 'count', 'total'], lang).map((r) =>
          !r.raw.referrer && !r.raw.host && !r.raw.domain && !r.raw.source && !r.raw.name && !r.raw.url ? { ...r, label: t('st.direct') } : r,
        );
        return (
          <>
            <section className="adm-tiles">
              <StatTile label={t('st.visits')} value={n.n(num(tot, ['visits', 'total', 'total_visits']))} />
              <StatTile label={t('st.uniqueVisitors')} value={n.n(num(tot, ['unique_visitors', 'unique', 'visitors']))} />
              <StatTile label={t('st.perDay')} value={n.n(Math.round(num(tot, ['avg_per_day', 'avg_daily', 'average_per_day', 'visits_per_day'])))} />
              <StatTile label={t('st.pagesPerVisitor')} value={n.n(Math.round(num(tot, ['pages_per_visitor', 'pages_per_visit']) * 10) / 10)} />
              <StatTile label={t('st.returning')} value={n.n(num(tot, ['returning_visitors', 'returning']))} />
              <StatTile
                label={t('st.peak')}
                value={Math.max(...hourly) > 0 || peak.hour != null ? `${String(peakHour).padStart(2, '0')}:00` : '—'}
                sub={peakDay ?? (Math.max(...weekly) > 0 ? days.long[peakDayIndex] : undefined)}
              />
            </section>

            <Card title={`${t('st.visits')} · ${t('st.uniqueVisitors')}`}>
              {points.length ? (
                <TrendChart
                  title={t('st.visits')}
                  points={points}
                  xLabel={axis}
                  series={[
                    { key: 'visits', label: t('st.visits') },
                    { key: 'unique', label: t('st.uniqueVisitors') },
                  ]}
                />
              ) : (
                <p className="adm-muted adm-chart__empty">{t('st.noData')}</p>
              )}
            </Card>

            <section className="adm-grid-cards">
              <Card title={t('st.heatmap')}>
                <Heatmap cells={heatCells(d.heatmap)} dayLabels={days.short} valueLabel={t('st.visits')} />
              </Card>
              <Card title={t('st.byWeekday')}>
                <ColumnChart
                  items={weekly.map((v, i) => ({ label: days.short[i], title: days.long[i], value: v }))}
                  highlight={Math.max(...weekly) > 0 ? peakDayIndex : undefined}
                  valueLabel={t('st.visits')}
                />
              </Card>
            </section>

            <Card title={t('st.byHour')}>
              <ColumnChart
                items={hourly.map((v, h) => ({ label: String(h).padStart(2, '0'), title: `${String(h).padStart(2, '0')}:00`, value: v }))}
                showEvery={2}
                highlight={Math.max(...hourly) > 0 ? hourly.indexOf(Math.max(...hourly)) : undefined}
                valueLabel={t('st.visits')}
              />
            </Card>

            <section className="adm-grid-cards">
              <Card title={t('st.topPages')}>
                <BarList items={pages} limit={20} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.referrers')}>
                <BarList items={referrers} limit={12} color={SERIES[1]} empty={t('st.noData')} />
              </Card>
            </section>

            <section className="adm-grid-cards adm-grid-cards--4">
              <Card title={t('st.devices')}>
                <BarList items={shares(d.devices, ['device', 'name', 'type', 'key', 'label'])} format={share} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.browsers')}>
                <BarList items={shares(d.browsers, ['browser', 'name', 'key', 'label'])} format={share} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.os')}>
                <BarList items={shares(d.operating_systems, ['os', 'name', 'key', 'label'])} format={share} empty={t('st.noData')} />
              </Card>
              <Card title={t('st.languages')}>
                <BarList items={shares(d.languages, ['language', 'lang', 'name', 'key', 'label'])} format={share} empty={t('st.noData')} />
              </Card>
            </section>
          </>
        );
      }}
    </Frame>
  );
}

/* ---------------- courses (no period) ---------------- */

function CoursesTab() {
  const t = useT();
  const n = useNumber();
  const { lang } = useI18n();
  const q = useQuery((signal) => statistics.courses(lang, signal), [lang]);

  return (
    <Frame q={q}>
      {(d) => {
        const tot = d.totals ?? {};
        const popular = tot.most_popular_course ?? tot.most_popular ?? tot.top_course;
        const courses = list(d.by_course);
        const cats = breakdown(d.by_category, ['name', 'title'], ['students', 'students_total', 'students_count', 'total'], lang).map((c) => ({
          ...c,
          sub: `${t('st.coursesInCat', { n: num(c.raw, ['courses', 'courses_count', 'courses_total']) })} · ${t('st.openLeads')}: ${n.n(num(c.raw, ['leads_open', 'open_leads']))}`,
        }));
        return (
          <>
            <section className="adm-tiles">
              <StatTile label={t('st.coursesTotal')} value={n.n(num(tot, ['courses', 'courses_total', 'total_courses']))} />
              <StatTile label={t('st.categoriesTotal')} value={n.n(num(tot, ['categories', 'categories_total', 'total_categories']))} />
              <StatTile
                label={t('st.mostPopular')}
                value={popular ? pick(popular.title ?? popular.name ?? popular, lang) : '—'}
                sub={popular && typeof popular === 'object' ? `${t('st.studentsCol')}: ${n.n(num(popular, ['students_total', 'students', 'count']))}` : undefined}
              />
              <StatTile label={t('st.leadsNoCourse')} value={n.n(num(tot, ['leads_without_course', 'leads_no_course', 'no_course_leads']))} />
            </section>

            <Card title={t('st.byCourse')} flush>
              {courses.length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table adm-table--stats">
                    <thead>
                      <tr>
                        <th>{t('col.course')}</th>
                        <th className="num">{t('st.studentsCol')}</th>
                        <th className="num">{t('st.activeCol')}</th>
                        <th className="num">{t('st.finishedCol')}</th>
                        <th className="num">{t('st.leftCol')}</th>
                        <th className="num">{t('st.openLeads')}</th>
                        <th className="num">{t('st.rejectedCol')}</th>
                        <th className="num">{t('st.applicationsCol')}</th>
                        <th className="num">{t('st.lessonsCol')}</th>
                        <th className="num">{t('st.teachersCol')}</th>
                        <th>{t('st.demo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c, i) => {
                        const total = num(c, ['students_total', 'students']);
                        const max = Math.max(1, ...courses.map((x) => num(x, ['students_total', 'students'])));
                        return (
                          <tr key={c.id ?? i}>
                            <td>
                              <span className="adm-course-stat">
                                {pick(c.title ?? c.name, lang) || '—'}
                                <Meter value={(total / max) * 100} />
                              </span>
                            </td>
                            <td className="num">
                              <b>{n.n(total)}</b>
                            </td>
                            <td className="num">{n.n(num(c, ['students_active', 'active']))}</td>
                            <td className="num">{n.n(num(c, ['students_finished', 'finished']))}</td>
                            <td className="num">{n.n(num(c, ['students_left', 'left']))}</td>
                            <td className="num">{n.n(num(c, ['leads_open', 'open_leads']))}</td>
                            <td className="num">{n.n(num(c, ['leads_rejected', 'rejected']))}</td>
                            <td className="num">{n.n(num(c, ['applications_total', 'applications']))}</td>
                            <td className="num">{n.n(num(c, ['lessons_count', 'lessons', 'lessons_total']))}</td>
                            <td className="num">{n.n(num(c, ['teachers_count', 'teachers', 'teachers_total']))}</td>
                            <td>{c.has_demo_video ?? c.demo_video ? <Icon name="check" className="adm-yes" /> : <span className="adm-muted">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="adm-muted adm-pad">{t('st.noData')}</p>
              )}
            </Card>

            <Card title={t('st.byCategory')}>
              <BarList items={cats} empty={t('st.noData')} />
            </Card>
          </>
        );
      }}
    </Frame>
  );
}
