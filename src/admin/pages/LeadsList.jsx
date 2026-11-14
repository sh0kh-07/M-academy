import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { DateFilter, PersonFields, PhoneCell, PhoneHero, ageLabel, personForm, readPerson } from '../people.jsx';
import { pick } from '../../lib/http.js';
import {
  LEAD_STATUSES,
  changes,
  courseOptions,
  formatPhone,
  leads,
  leadsChanged,
  regions,
} from '../resources.js';
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
  errorText,
  useFormat,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

/*
  Leads — the admin's daily inbox (Swagger "Admin · Lidlar").
  · status tabs with counts; search by name / phone; course, region and date filters (all in the URL)
  · change the status right in the row; call / copy the phone from the row
  · click a row → a side panel: call, Telegram, status, internal note, edit details, make a student, delete
  · new applications are picked up every minute (with a toast), the sidebar badge follows
*/

const LIMIT = 25;
const TABS = ['', ...LEAD_STATUSES]; // '' = all
const courseOf = (lead) => lead.interested_course ?? lead.course ?? null;
const courseIdOf = (lead) => courseOf(lead)?.id ?? lead.course_id ?? '';

/** The status as a coloured pill that is also a dropdown. */
function StatusSelect({ value, onChange, disabled }) {
  const t = useT();
  const options = LEAD_STATUSES.includes(value) ? LEAD_STATUSES : [value, ...LEAD_STATUSES];
  return (
    <span className={`adm-pill-select adm-pill-select--${value}`}>
      <select value={value} disabled={disabled} aria-label={t('lead.status')} onChange={(e) => onChange(e.target.value)}>
        {options.map((s) => (
          <option key={s} value={s}>
            {t(`lead.${s}`)}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" />
    </span>
  );
}

export default function LeadsList() {
  const t = useT();
  const fmt = useFormat();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('nav.leads'));

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') ?? '';
  const search = params.get('q') ?? '';
  const course = params.get('course') ?? '';
  const region = params.get('region') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
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

  const courses = useQuery((signal) => courseOptions(lang, signal), [lang]);
  const regs = useQuery((signal) => regions(signal), []);
  const filters = { search, region, course_id: course, from, to };
  const filterKey = JSON.stringify(filters);
  const list = useQuery(
    (signal) => leads.list({ lang, page, limit: LIMIT, status, ...filters }, signal),
    [lang, page, status, filterKey],
  );
  const counts = useQuery(
    (signal) =>
      Promise.all(TABS.map((s) => leads.list({ ...filters, status: s, limit: 1 }, signal))).then((all) =>
        Object.fromEntries(TABS.map((s, i) => [s || 'all', all[i]?.pagination?.total_count ?? 0])),
      ),
    [filterKey],
  );

  const [openLead, setOpenLead] = useState(null);
  const [converting, setConverting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busyRow, setBusyRow] = useState(null);

  // pick up new applications every minute (not while a panel or dialog is open)
  const quiet = Boolean(openLead || converting || removing || adding);
  useEffect(() => {
    if (quiet) return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      list.reload();
      counts.reload();
    }, 60000);
    return () => clearInterval(id);
  }, [quiet, list.reload, counts.reload]);

  const seen = useRef(null); // { key, n } — the new-lead count we last showed for these filters
  const ownChange = useRef(false); // our own edit changed the counts: not an "arrival"
  useEffect(() => {
    if (!counts.data) return;
    const n = counts.data.new;
    const mine = ownChange.current;
    ownChange.current = false;
    if (!mine && seen.current?.key === filterKey && n > seen.current.n) {
      notify(t('leads.newArrived', { n: n - seen.current.n }), 'info');
      leadsChanged();
    }
    seen.current = { key: filterKey, n };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.data]);

  const regionName = (key) => pick(regs.data?.find((r) => r.key === key)?.name, lang) || key || '—';
  const courseTitle = (lead) =>
    pick(courseOf(lead)?.title ?? courses.data?.find((c) => c.id === courseIdOf(lead))?.title, lang);

  const refresh = () => {
    ownChange.current = true;
    list.reload();
    counts.reload();
    leadsChanged();
  };

  // apply a changed lead everywhere it is shown
  const applyLead = (next) => {
    list.setData((d) => (d ? { ...d, records: d.records.map((r) => (r.id === next.id ? { ...r, ...next } : r)) } : d));
    setOpenLead((o) => (o?.id === next.id ? { ...o, ...next } : o));
  };

  async function changeStatus(lead, next) {
    if (next === lead.status) return;
    setBusyRow(lead.id);
    applyLead({ ...lead, status: next }); // optimistic
    try {
      await leads.update(lead.id, { status: next });
      notify(t('lead.statusSaved', { status: t(`lead.${next}`) }));
      ownChange.current = true;
      counts.reload();
      leadsChanged();
      if (status && status !== next) setTimeout(list.reload, 500); // it no longer belongs on this tab
    } catch (err) {
      applyLead(lead);
      notify(errorText(err, t), 'error');
    } finally {
      setBusyRow(null);
    }
  }

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const filtered = Boolean(search || course || region || from || to);

  return (
    <>
      <PageHead title={t('leads.title')} text={t('leads.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>
          <Icon name="plus" />
          {t('leads.add')}
        </button>
      </PageHead>

      <div className="adm-status-tabs" role="tablist">
        {TABS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            role="tab"
            aria-selected={status === s}
            className={`adm-status-tab adm-status-tab--${s || 'all'}`}
            onClick={() => update({ status: s, page: '' })}
          >
            {s && <i className="adm-dot" />}
            {t(s ? `lead.${s}` : 'leads.all')}
            <b>{counts.data ? counts.data[s || 'all'] : '·'}</b>
          </button>
        ))}
      </div>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input
              type="search"
              value={text}
              placeholder={t('leads.search')}
              aria-label={t('leads.search')}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <Field type="select" className="adm-toolbar__select" aria-label={t('leads.colCourse')} value={course} onChange={(e) => update({ course: e.target.value, page: '' })}>
            <option value="">{t('leads.allCourses')}</option>
            {(courses.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.title, lang)}
              </option>
            ))}
          </Field>
          <Field type="select" className="adm-toolbar__select" aria-label={t('leads.colRegion')} value={region} onChange={(e) => update({ region: e.target.value, page: '' })}>
            <option value="">{t('leads.allRegions')}</option>
            {(regs.data ?? []).map((r) => (
              <option key={r.key} value={r.key}>
                {pick(r.name, lang)}
              </option>
            ))}
          </Field>
        </div>
        <div className="adm-toolbar adm-toolbar--dates">
          <DateFilter from={from} to={to} onChange={(range) => update({ ...range, page: '' })} />
          {filtered && (
            <button
              type="button"
              className="adm-link adm-link--sm adm-reset"
              onClick={() => {
                setText('');
                update({ q: '', course: '', region: '', from: '', to: '', page: '' });
              }}
            >
              <Icon name="close" />
              {t('leads.reset')}
            </button>
          )}
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
          filtered || status ? (
            <Empty icon="search" title={t('courses.nothing')} text={t('courses.nothingText')} />
          ) : (
            <Empty icon="inbox" title={t('leads.empty')} text={t('leads.emptyText')}>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>
                <Icon name="plus" />
                {t('leads.add')}
              </button>
            </Empty>
          )
        ) : (
          <div className="adm-table-wrap" data-loading={list.loading || undefined}>
            <table className="adm-table adm-table--leads">
              <thead>
                <tr>
                  <th>{t('leads.colName')}</th>
                  <th>{t('leads.colPhone')}</th>
                  <th>{t('leads.colCourse')}</th>
                  <th>{t('leads.colRegion')}</th>
                  <th>{t('leads.colDate')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('lead.convert')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => {
                  const stop = (e) => e.stopPropagation();
                  return (
                    <tr
                      key={lead.id}
                      className="adm-row-link"
                      data-new={lead.status === 'new' || undefined}
                      tabIndex={0}
                      onClick={() => setOpenLead(lead)}
                      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && setOpenLead(lead)}
                    >
                      <td>
                        <div className="adm-lead-name">
                          <b>{lead.full_name}</b>
                          <small>
                            {ageLabel(lead.age, lang)}
                            {lead.source === 'admin' && <span> · {t('lead.source.admin')}</span>}
                            {lead.admin_note && (
                              <span className="adm-note-mark" title={lead.admin_note}>
                                <Icon name="note" />
                              </span>
                            )}
                          </small>
                        </div>
                      </td>
                      <td className="adm-nowrap" onClick={stop}>
                        <PhoneCell phone={lead.phone} />
                      </td>
                      <td>{courseTitle(lead) || <span className="adm-muted">—</span>}</td>
                      <td className="adm-muted">{regionName(lead.region)}</td>
                      <td className="adm-muted adm-nowrap" title={fmt.date(lead.created_at)}>
                        {fmt.ago(lead.created_at)}
                      </td>
                      <td onClick={stop}>
                        <StatusSelect value={lead.status} disabled={busyRow === lead.id} onChange={(next) => changeStatus(lead, next)} />
                      </td>
                      <td onClick={stop}>
                        <button
                          type="button"
                          className="adm-icon-btn adm-icon-btn--gold"
                          title={t('lead.convert')}
                          aria-label={t('lead.convert')}
                          onClick={() => setConverting(lead)}
                        >
                          <Icon name="student" />
                        </button>
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

      <Presence when={openLead}>
        {(item) => (
          <LeadPanel
            key={item.id}
            lead={item}
            courses={courses.data ?? []}
            regionList={regs.data ?? []}
            regionName={regionName}
            courseTitle={courseTitle}
            onClose={() => setOpenLead(null)}
            onChanged={(next) => {
              applyLead(next);
              ownChange.current = true;
              counts.reload();
              leadsChanged();
            }}
            onConvert={() => setConverting(item)}
            onDelete={() => setRemoving(item)}
          />
        )}
      </Presence>

      <Presence when={converting}>
        {(item) => (
          <ConvertDialog
            lead={item}
            courses={courses.data ?? []}
            onClose={() => setConverting(null)}
            onDone={() => {
              notify(t('lead.converted', { name: item.full_name }));
              setConverting(null);
              setOpenLead(null);
              refresh();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('lead.deleteTitle')}
            text={t('lead.deleteText', { name: item.full_name })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await leads.remove(item.id);
              notify(t('lead.deleted'));
              setRemoving(null);
              setOpenLead(null);
              refresh();
            }}
          />
        )}
      </Presence>

      <Presence when={adding}>
        {() => (
          <AddLeadDialog
            courses={courses.data ?? []}
            regionList={regs.data ?? []}
            onClose={() => setAdding(false)}
            onDone={() => {
              notify(t('lead.created'));
              setAdding(false);
              refresh();
            }}
          />
        )}
      </Presence>
    </>
  );
}

/* ---------------- side panel ---------------- */

const leadForm = (lead) => personForm(lead, { course_id: courseIdOf(lead) });

function LeadPanel({ lead, courses, regionList, regionName, courseTitle, onClose, onChanged, onConvert, onDelete }) {
  const t = useT();
  const fmt = useFormat();
  const notify = useToast();
  const [current, setCurrent] = useState(lead);
  const [statusBusy, setStatusBusy] = useState(false);
  const [note, setNote] = useState(lead.admin_note ?? '');
  const [savedNote, setSavedNote] = useState(lead.admin_note ?? '');
  const [noteBusy, setNoteBusy] = useState(false);
  const [base, setBase] = useState(() => leadForm(lead));
  const [details, setDetails] = useState(base);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field? }

  async function patch(body) {
    const updated = await leads.update(current.id, body);
    let next = { ...current, ...body, ...(updated && typeof updated === 'object' ? updated : {}) };
    if ('course_id' in body && !(updated && courseOf(updated))) {
      const c = courses.find((x) => x.id === body.course_id);
      next = { ...next, interested_course: c ? { id: c.id, title: c.title } : null };
    }
    setCurrent(next);
    onChanged(next);
    return next;
  }

  async function setStatus(next) {
    if (next === current.status || statusBusy) return;
    setStatusBusy(true);
    setError(null);
    try {
      await patch({ status: next });
      notify(t('lead.statusSaved', { status: t(`lead.${next}`) }));
    } catch (err) {
      setError({ text: errorText(err, t) });
    } finally {
      setStatusBusy(false);
    }
  }

  async function saveNote() {
    setNoteBusy(true);
    setError(null);
    try {
      await patch({ admin_note: note.trim() });
      setSavedNote(note.trim());
      setNote(note.trim());
      notify(t('lead.noteSaved'));
    } catch (err) {
      setError({ text: errorText(err, t) });
    } finally {
      setNoteBusy(false);
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    const read = readPerson(details, t, { withCourse: true });
    if (read.error) {
      setError({ text: read.error, field: read.field });
      return;
    }
    const before = readPerson(base, t, { withCourse: true }).body ?? {};
    const body = changes(before, read.body);
    if (!Object.keys(body).length) return;
    setDetailsBusy(true);
    setError(null);
    try {
      await patch(body);
      const fresh = { ...details, phone: formatPhone(read.body.phone) };
      setBase(fresh);
      setDetails(fresh);
      notify(t('lead.saved'));
    } catch (err) {
      setError({ text: errorText(err, t) });
    } finally {
      setDetailsBusy(false);
    }
  }

  const detailsDirty = JSON.stringify(details) !== JSON.stringify(base);
  const phone = current.phone ?? '';
  const subtitle = [fmt.ago(current.created_at), current.source ? t(`lead.source.${current.source}`) : null].filter(Boolean).join(' · ');
  const formId = useId();

  return (
    <Modal
      drawer
      title={current.full_name}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={onDelete}>
            <Icon name="trash" />
            {t('common.delete')}
          </button>
          <div className="adm-modal__msg" />
          <button type="button" className="adm-btn adm-btn--primary" onClick={onConvert}>
            <Icon name="student" />
            {t('lead.convert')}
          </button>
        </>
      }
    >
      <div className="adm-form">
        <PhoneHero
          phone={phone}
          facts={[
            [t('lead.course'), courseTitle(current)],
            [t('lead.region'), regionName(current.region)],
            [t('lead.ageField'), current.age],
          ]}
        />

        <Section title={t('lead.status')}>
          <div className="adm-segment" role="group" aria-label={t('lead.status')}>
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`adm-segment__btn adm-segment__btn--${s}`}
                aria-pressed={current.status === s}
                disabled={statusBusy}
                onClick={() => setStatus(s)}
              >
                <i className="adm-dot" />
                {t(`lead.${s}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title={t('lead.note')}
          aside={
            note.trim() !== savedNote.trim() && (
              <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" disabled={noteBusy} onClick={saveNote}>
                {noteBusy && <Spinner />}
                {t('lead.noteSave')}
              </button>
            )
          }
        >
          <Field type="textarea" rows={3} aria-label={t('lead.note')} placeholder={t('lead.notePh')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Section>

        <Section title={t('lead.details')}>
          <form id={formId} className="adm-stack" onSubmit={saveDetails} noValidate>
            <PersonFields withCourse form={details} setForm={setDetails} error={error} courses={courses} regionList={regionList} />
            {detailsDirty && (
              <div>
                <button type="submit" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={detailsBusy}>
                  {detailsBusy && <Spinner />}
                  {t('lead.detailsSave')}
                </button>
              </div>
            )}
          </form>
        </Section>

        {error && <Alert tone="error">{error.text}</Alert>}
      </div>
    </Modal>
  );
}

/* ---------------- dialogs ---------------- */

function ConvertDialog({ lead, courses, onClose, onDone }) {
  const t = useT();
  const { lang } = useI18n();
  const formId = useId();
  const [ids, setIds] = useState(() => (courseIdOf(lead) ? [courseIdOf(lead)] : []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toggle = (id) => setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function submit(e) {
    e.preventDefault();
    if (!ids.length) {
      setError(t('lead.convertNeed'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await leads.convert(lead.id, ids);
      onDone();
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('lead.convert')}
      subtitle={lead.full_name}
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error} onCancel={onClose} submitLabel={t('lead.convert')} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <p className="adm-muted">{t('lead.convertText', { name: lead.full_name })}</p>
        <Section title={<>{t('teacher.courses')}{ids.length > 0 && <b className="adm-count">{ids.length}</b>}</>}>
          {courses.length ? (
            <div className="adm-chips" role="group">
              {courses.map((c) => (
                <button key={c.id} type="button" className="adm-chip" aria-pressed={ids.includes(c.id)} onClick={() => toggle(c.id)}>
                  {c.symbol && <i>{c.symbol}</i>}
                  {pick(c.title, lang)}
                </button>
              ))}
            </div>
          ) : (
            <p className="adm-muted">{t('teacher.noCourses')}</p>
          )}
        </Section>
      </form>
    </Modal>
  );
}

function AddLeadDialog({ courses, regionList, onClose, onDone }) {
  const t = useT();
  const formId = useId();
  const [form, setForm] = useState({ full_name: '', age: '', phone: '', region: '', course_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field? }

  async function submit(e) {
    e.preventDefault();
    const read = readPerson(form, t, { withCourse: true });
    if (read.error) {
      setError({ text: read.error, field: read.field });
      return;
    }
    const body = { ...read.body };
    if (!body.course_id) delete body.course_id;
    setBusy(true);
    setError(null);
    try {
      await leads.create(body);
      onDone();
    } catch (err) {
      setError({ text: errorText(err, t) });
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('lead.newTitle')}
      subtitle={t('lead.newText')}
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-stack" onSubmit={submit} noValidate>
        <PersonFields withCourse form={form} setForm={setForm} error={error} courses={courses} regionList={regionList} />
      </form>
    </Modal>
  );
}
