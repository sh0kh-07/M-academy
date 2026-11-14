import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/index.jsx';
import { pick } from '../../lib/http.js';
import { DateFilter, PersonFields, PhoneCell, PhoneHero, ageLabel, personForm, readPerson } from '../people.jsx';
import { ENROLL_STATUSES, changes, courseOptions, enrollmentsOf, formatPhone, leadsChanged, regions, students } from '../resources.js';
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
  Students (Swagger "Admin · Studentlar").
  · filters: name / phone, course (+ the status in that course), region, the date they became a student — all in the URL
  · every row shows the student's courses, coloured by status
  · click a row → side panel: call, courses (status per course, add, remove), note, details, back to leads, delete
*/

const LIMIT = 25;

/** A student's status in one course, as a coloured pill dropdown. */
function EnrollSelect({ value, onChange, disabled }) {
  const t = useT();
  return (
    <span className={`adm-pill-select adm-pill-select--${value}`}>
      <select value={value} disabled={disabled} aria-label={t('lead.status')} onChange={(e) => onChange(e.target.value)}>
        {ENROLL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`enroll.${s}`)}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" />
    </span>
  );
}

export default function StudentsList() {
  const t = useT();
  const fmt = useFormat();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('nav.students'));

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const course = params.get('course') ?? '';
  const est = params.get('est') ?? '';
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
  const list = useQuery(
    (signal) =>
      students.list(
        { lang, page, limit: LIMIT, search, region, course_id: course, enrollment_status: course ? est : '', from, to },
        signal,
      ),
    [lang, page, search, course, est, region, from, to],
  );

  const [open, setOpen] = useState(null);
  const changedInPanel = useRef(false); // refresh the list once the panel closes
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [reverting, setReverting] = useState(null);

  const rows = list.data?.records ?? [];
  const pages = list.data?.pagination ?? {};
  const filtered = Boolean(search || course || region || from || to);
  const regionName = (key) => pick(regs.data?.find((r) => r.key === key)?.name, lang) || key || '—';
  const titleOf = (e) => pick(e.title ?? courses.data?.find((c) => c.id === e.id)?.title, lang) || '—';

  const applyRow = (next) =>
    list.setData((d) => (d ? { ...d, records: d.records.map((r) => (r.id === next.id ? { ...r, ...next } : r)) } : d));

  return (
    <>
      <PageHead title={t('students.title')} text={t('students.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>
          <Icon name="plus" />
          {t('students.add')}
        </button>
      </PageHead>

      <section className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Icon name="search" />
            <input type="search" value={text} placeholder={t('leads.search')} aria-label={t('leads.search')} onChange={(e) => setText(e.target.value)} />
          </div>
          <Field type="select" className="adm-toolbar__select" aria-label={t('leads.colCourse')} value={course} onChange={(e) => update({ course: e.target.value, est: '', page: '' })}>
            <option value="">{t('leads.allCourses')}</option>
            {(courses.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.title, lang)}
              </option>
            ))}
          </Field>
          {course && (
            <Field type="select" className="adm-toolbar__select" aria-label={t('lead.status')} value={est} onChange={(e) => update({ est: e.target.value, page: '' })}>
              <option value="">{t('students.allStatus')}</option>
              {ENROLL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`enroll.${s}`)}
                </option>
              ))}
            </Field>
          )}
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
                update({ q: '', course: '', est: '', region: '', from: '', to: '', page: '' });
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
          filtered ? (
            <Empty icon="search" title={t('courses.nothing')} text={t('courses.nothingText')} />
          ) : (
            <Empty icon="student" title={t('students.empty')} text={t('students.emptyText')}>
              <button type="button" className="adm-btn adm-btn--primary" onClick={() => setAdding(true)}>
                <Icon name="plus" />
                {t('students.add')}
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
                  <th>{t('students.colCourses')}</th>
                  <th>{t('leads.colRegion')}</th>
                  <th>{t('students.colSince')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {rows.map((st) => {
                  const enrolls = enrollmentsOf(st);
                  const since = st.converted_at ?? st.created_at;
                  return (
                    <tr
                      key={st.id}
                      className="adm-row-link"
                      tabIndex={0}
                      onClick={() => setOpen(st)}
                      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && setOpen(st)}
                    >
                      <td>
                        <div className="adm-lead-name">
                          <b>{st.full_name}</b>
                          <small>
                            {ageLabel(st.age, lang)}
                            {st.admin_note && (
                              <span className="adm-note-mark" title={st.admin_note}>
                                <Icon name="note" />
                              </span>
                            )}
                          </small>
                        </div>
                      </td>
                      <td className="adm-nowrap" onClick={(e) => e.stopPropagation()}>
                        <PhoneCell phone={st.phone} />
                      </td>
                      <td>
                        {enrolls.length ? (
                          <ul className="adm-enrolls">
                            {enrolls.slice(0, 3).map((e) => (
                              <li key={e.id} className={`adm-enroll adm-pill-select--${e.status}`} title={t(`enroll.${e.status}`)}>
                                <i className="adm-dot" />
                                {titleOf(e)}
                              </li>
                            ))}
                            {enrolls.length > 3 && <li className="adm-enroll">+{enrolls.length - 3}</li>}
                          </ul>
                        ) : (
                          <span className="adm-muted">—</span>
                        )}
                      </td>
                      <td className="adm-muted">{regionName(st.region)}</td>
                      <td className="adm-muted adm-nowrap" title={fmt.date(since)}>
                        {fmt.day(since)}
                      </td>
                      <td className="adm-chevron">
                        <Icon name="chevronRight" />
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

      <Presence when={open}>
        {(item) => (
          <StudentPanel
            key={item.id}
            student={item}
            courses={courses.data ?? []}
            regionList={regs.data ?? []}
            regionName={regionName}
            onClose={() => {
              setOpen(null);
              if (changedInPanel.current) list.reload(); // the row may no longer match the filters
              changedInPanel.current = false;
            }}
            onChanged={(next, edited = true) => {
              if (edited) changedInPanel.current = true;
              applyRow(next);
              setOpen((o) => (o?.id === next.id ? next : o));
            }}
            onRevert={() => setReverting(item)}
            onDelete={() => setRemoving(item)}
          />
        )}
      </Presence>

      <Presence when={reverting}>
        {(item) => (
          <Confirm
            title={t('student.revert')}
            text={t('student.revertText', { name: item.full_name })}
            confirmLabel={t('student.revert')}
            tone="primary"
            onClose={() => setReverting(null)}
            onConfirm={async () => {
              await students.revert(item.id);
              notify(t('student.reverted', { name: item.full_name }));
              setReverting(null);
              setOpen(null);
              list.reload();
              leadsChanged();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('student.deleteTitle')}
            text={t('student.deleteText', { name: item.full_name })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await students.remove(item.id);
              notify(t('student.deleted'));
              setRemoving(null);
              setOpen(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={adding}>
        {() => (
          <AddStudentDialog
            courses={courses.data ?? []}
            regionList={regs.data ?? []}
            presetCourse={course}
            onClose={() => setAdding(false)}
            onDone={() => {
              notify(t('student.created'));
              setAdding(false);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

/* ---------------- side panel ---------------- */

function StudentPanel({ student, courses, regionList, regionName, onClose, onChanged, onRevert, onDelete }) {
  const t = useT();
  const fmt = useFormat();
  const { lang } = useI18n();
  const notify = useToast();
  const [current, setCurrent] = useState(student);
  const [busy, setBusy] = useState(null); // what is being saved: 'courses' | 'note' | 'details' | a course id
  const [picking, setPicking] = useState(false);
  const [unlinking, setUnlinking] = useState(null); // an enrolment to remove
  const [note, setNote] = useState(student.admin_note ?? '');
  const [savedNote, setSavedNote] = useState(student.admin_note ?? '');
  const [base, setBase] = useState(() => personForm(student));
  const [details, setDetails] = useState(base);
  const [error, setError] = useState(null); // { text, field? }
  const formId = useId();

  // the full record: all courses with their status and date, and the course they first asked about
  const reload = async (edited = true) => {
    const fresh = await students.get(student.id);
    if (fresh && typeof fresh === 'object') {
      setCurrent(fresh);
      onChanged(fresh, edited);
    }
    return fresh;
  };
  useEffect(() => {
    reload(false).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (what, job, done) => {
    setBusy(what);
    setError(null);
    try {
      await job();
      if (done) notify(done);
    } catch (err) {
      setError({ text: errorText(err, t) });
    } finally {
      setBusy(null);
    }
  };

  const enrolls = enrollmentsOf(current);
  const enrolledIds = enrolls.map((e) => e.id);
  const titleOf = (e) => pick(e.title ?? courses.find((c) => c.id === e.id)?.title, lang) || '—';
  const available = courses.filter((c) => !enrolledIds.includes(c.id));
  const interested = current.interested_course ?? current.course ?? null;

  const addCourse = (id) =>
    run('courses', async () => {
      await students.setCourses(current.id, [...enrolledIds, id]);
      await reload();
      setPicking(false);
    }, t('student.courseAdded'));

  const setEnrollStatus = (e, status) =>
    run(e.id, async () => {
      await students.setCourseStatus(current.id, e.id, status);
      const next = { ...current, courses: (current.courses ?? []).map((c) => (enrollmentsOf({ courses: [c] })[0].id === e.id ? { ...c, status } : c)) };
      setCurrent(next);
      onChanged(next);
    }, t('student.courseStatus', { course: titleOf(e), status: t(`enroll.${status}`) }));

  const saveNote = () =>
    run('note', async () => {
      const value = note.trim();
      await students.update(current.id, { admin_note: value });
      const next = { ...current, admin_note: value };
      setCurrent(next);
      onChanged(next);
      setSavedNote(value);
      setNote(value);
    }, t('lead.noteSaved'));

  function saveDetails(e) {
    e.preventDefault();
    const read = readPerson(details, t);
    if (read.error) {
      setError({ text: read.error, field: read.field });
      return;
    }
    const body = changes(readPerson(base, t).body ?? {}, read.body);
    if (!Object.keys(body).length) return;
    run('details', async () => {
      await students.update(current.id, body);
      const next = { ...current, ...body };
      setCurrent(next);
      onChanged(next);
      const fresh = { ...details, phone: formatPhone(read.body.phone) };
      setBase(fresh);
      setDetails(fresh);
    }, t('lead.saved'));
  }

  const detailsDirty = JSON.stringify(details) !== JSON.stringify(base);
  const since = current.converted_at ?? current.created_at;

  return (
    <>
      <Modal
        drawer
        title={current.full_name}
        subtitle={`${t('student.since')} ${fmt.day(since)}`}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--danger-ghost" onClick={onDelete}>
              <Icon name="trash" />
              {t('common.delete')}
            </button>
            <div className="adm-modal__msg" />
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onRevert}>
              <Icon name="refresh" />
              {t('student.revert')}
            </button>
          </>
        }
      >
        <div className="adm-form">
          <PhoneHero
            phone={current.phone ?? ''}
            facts={[
              [t('student.since'), fmt.day(since)],
              [t('lead.region'), regionName(current.region)],
              [t('lead.ageField'), current.age],
            ]}
          />

          <Section
            title={
              <>
                {t('student.courses')}
                {enrolls.length > 0 && <b className="adm-count">{enrolls.length}</b>}
              </>
            }
            aside={
              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
                <Icon name={picking ? 'close' : 'plus'} />
                {t('student.addCourse')}
              </button>
            }
          >
            {picking && (
              <div className="adm-picker">
                <p className="adm-field__hint">{t('student.pickCourse')}</p>
                {available.length ? (
                  <div className="adm-chips">
                    {available.map((c) => (
                      <button key={c.id} type="button" className="adm-chip" disabled={busy === 'courses'} onClick={() => addCourse(c.id)}>
                        {c.symbol && <i>{c.symbol}</i>}
                        {pick(c.title, lang)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="adm-muted">{t('student.allEnrolled')}</p>
                )}
              </div>
            )}

            {enrolls.length ? (
              <ul className="adm-enroll-list">
                {enrolls.map((e) => (
                  <li key={e.id}>
                    <div>
                      <b>{titleOf(e)}</b>
                      {e.enrolled_at && <small>{t('student.enrolled', { date: fmt.day(e.enrolled_at) })}</small>}
                    </div>
                    <EnrollSelect value={e.status} disabled={busy === e.id} onChange={(s) => setEnrollStatus(e, s)} />
                    <button
                      type="button"
                      className="adm-icon-btn adm-icon-btn--danger"
                      title={t('student.removeCourse')}
                      aria-label={t('student.removeCourse')}
                      onClick={() => setUnlinking(e)}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-muted">{t('student.noCourses')}</p>
            )}
            {interested && (
              <small className="adm-field__hint">
                {t('student.interested')}: {pick(interested.title, lang)}
              </small>
            )}
          </Section>

          <Section
            title={t('lead.note')}
            aside={
              note.trim() !== savedNote.trim() && (
                <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" disabled={busy === 'note'} onClick={saveNote}>
                  {busy === 'note' && <Spinner />}
                  {t('lead.noteSave')}
                </button>
              )
            }
          >
            <Field type="textarea" rows={3} aria-label={t('lead.note')} placeholder={t('lead.notePh')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </Section>

          <Section title={t('lead.details')}>
            <form id={formId} className="adm-stack" onSubmit={saveDetails} noValidate>
              <PersonFields form={details} setForm={setDetails} error={error} regionList={regionList} />
              {detailsDirty && (
                <div>
                  <button type="submit" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy === 'details'}>
                    {busy === 'details' && <Spinner />}
                    {t('lead.detailsSave')}
                  </button>
                </div>
              )}
            </form>
          </Section>

          {error && <Alert tone="error">{error.text}</Alert>}
        </div>
      </Modal>

      <Presence when={unlinking}>
        {(e) => (
          <Confirm
            title={t('student.removeCourse')}
            text={t('student.removeCourseText', { course: titleOf(e) })}
            confirmLabel={t('student.removeCourse')}
            onClose={() => setUnlinking(null)}
            onConfirm={async () => {
              await students.setCourses(current.id, enrolledIds.filter((id) => id !== e.id));
              await reload();
              notify(t('student.courseRemoved'));
              setUnlinking(null);
            }}
          />
        )}
      </Presence>
    </>
  );
}

/* ---------------- add a student ---------------- */

function AddStudentDialog({ courses, regionList, presetCourse, onClose, onDone }) {
  const t = useT();
  const { lang } = useI18n();
  const formId = useId();
  const [form, setForm] = useState(() => personForm());
  const [ids, setIds] = useState(() => (presetCourse ? [presetCourse] : []));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field? }
  const toggle = (id) => setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function submit(e) {
    e.preventDefault();
    const read = readPerson(form, t);
    if (read.error) {
      setError({ text: read.error, field: read.field });
      return;
    }
    if (!ids.length) {
      setError({ text: t('lead.convertNeed') });
      return;
    }
    const body = { ...read.body, course_ids: ids };
    if (note.trim()) body.admin_note = note.trim();
    setBusy(true);
    setError(null);
    try {
      await students.create(body);
      onDone();
    } catch (err) {
      setError({ text: errorText(err, t) });
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t('student.newTitle')}
      subtitle={t('student.newText')}
      size="lg"
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section>
          <PersonFields form={form} setForm={setForm} error={error} regionList={regionList} />
        </Section>
        <Section title={<>{t('student.courses')}{ids.length > 0 && <b className="adm-count">{ids.length}</b>}</>}>
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
        <Section title={t('student.noteOptional')}>
          <Field type="textarea" rows={3} aria-label={t('lead.note')} placeholder={t('lead.notePh')} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Section>
      </form>
    </Modal>
  );
}
