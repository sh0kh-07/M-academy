import { useCallback, useEffect, useId, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { pick } from '../../lib/http.js';
import { LANG_KEYS, changes, lessons } from '../resources.js';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  FormFooter,
  Icon,
  LangTabs,
  Modal,
  Presence,
  Section,
  Spinner,
  Switch,
  errorText,
  useT,
  useToast,
} from '../ui.jsx';

const pad = (n) => String(n).padStart(2, '0');
const byOrder = (list) => [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
const emptyText = () => ({ uz: '', ru: '', en: '' });
const text = (v) => (v && typeof v === 'object' ? { ...emptyText(), ...v } : { ...emptyText(), uz: v ?? '' });

/** The lessons block on the course page: list, add/edit dialog, reorder, delete. */
export default function CourseLessons({ courseId, initial }) {
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  const [items, setItems] = useState(() => (Array.isArray(initial) ? byOrder(initial) : []));
  const [loading, setLoading] = useState(!Array.isArray(initial));
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // a lesson, or {} for a new one
  const [removing, setRemoving] = useState(null);
  const [moving, setMoving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setItems(byOrder(await lessons.list(courseId)));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!Array.isArray(initial)) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // swap two neighbours, then renumber sort_order 0…n-1 where it changed
  async function move(index, step) {
    const next = [...items];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setItems(next);
    setMoving(true);
    try {
      for (let i = 0; i < next.length; i += 1) {
        if ((next[i].sort_order ?? 0) !== i) {
          await lessons.update(next[i].id, { sort_order: i });
          next[i] = { ...next[i], sort_order: i };
        }
      }
      setItems([...next]);
    } catch (err) {
      notify(errorText(err, t), 'error');
      refresh();
    } finally {
      setMoving(false);
    }
  }

  const nextOrder = items.reduce((max, l) => Math.max(max, (l.sort_order ?? 0) + 1), 0);

  return (
    <section className="adm-card adm-card--flush">
      <div className="adm-card__bar adm-pad">
        <div>
          <h2 className="adm-card__title">{t('lessons.title')}</h2>
          <p className="adm-field__hint">{t('lessons.text')}</p>
        </div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('lessons.add')}
        </button>
      </div>

      {loading ? (
        <div className="adm-loading">
          <Spinner />
        </div>
      ) : error ? (
        <div className="adm-pad">
          <Alert tone="error">{errorText(error, t)}</Alert>
        </div>
      ) : items.length === 0 ? (
        <Empty icon="video" title={t('lessons.empty')} text={t('lessons.emptyText')} />
      ) : (
        <ol className="adm-lessons" data-busy={moving || undefined}>
          {items.map((lesson, i) => {
            const note = pick(lesson.note, lang);
            return (
              <li key={lesson.id} className="adm-lesson">
                <span className="adm-lesson__num">{pad(i + 1)}</span>
                <div className="adm-lesson__body">
                  <b>{pick(lesson.title, lang) || '—'}</b>
                  {note && <p>{note}</p>}
                </div>
                {lesson.is_active === false && <span className="adm-soon">{t('lesson.hidden')}</span>}
                <div className="adm-actions">
                  {lesson.video_url && (
                    <a className="adm-icon-btn" href={lesson.video_url} target="_blank" rel="noopener" title={t('lesson.open')} aria-label={t('lesson.open')}>
                      <Icon name="link" />
                    </a>
                  )}
                  <button type="button" className="adm-icon-btn" disabled={moving || i === 0} onClick={() => move(i, -1)} title={t('lesson.up')} aria-label={t('lesson.up')}>
                    <Icon name="arrowUp" />
                  </button>
                  <button
                    type="button"
                    className="adm-icon-btn"
                    disabled={moving || i === items.length - 1}
                    onClick={() => move(i, 1)}
                    title={t('lesson.down')}
                    aria-label={t('lesson.down')}
                  >
                    <Icon name="arrowDown" />
                  </button>
                  <button type="button" className="adm-icon-btn" onClick={() => setEditing(lesson)} title={t('common.edit')} aria-label={t('common.edit')}>
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="adm-icon-btn adm-icon-btn--danger"
                    onClick={() => setRemoving(lesson)}
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Presence when={editing}>
        {(item) => (
          <LessonDialog
            courseId={courseId}
            lesson={item.id ? item : null}
            nextOrder={nextOrder}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'lesson.created' : 'lesson.saved'));
              setEditing(null);
              refresh();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('lesson.deleteTitle')}
            text={t('lesson.deleteText', { name: pick(item.title, lang) })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await lessons.remove(item.id);
              setItems((list) => list.filter((l) => l.id !== item.id));
              setRemoving(null);
              notify(t('lesson.deleted'));
            }}
          />
        )}
      </Presence>
    </section>
  );
}

/** YouTube link → its preview picture, so a wrong link is easy to spot. */
function youtubeThumb(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : null;
}

function LessonDialog({ courseId, lesson, nextOrder, onClose, onSaved }) {
  const t = useT();
  const { lang } = useI18n();
  const formId = useId();
  const [initial] = useState(() => ({
    title: text(lesson?.title),
    note: text(lesson?.note),
    video_url: lesson?.video_url ?? '',
    is_active: lesson ? lesson.is_active !== false : true,
  }));
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field?, langs? }

  const setText = (key, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [tab]: value } }));

  const bodyOf = (f) => {
    const body = { title: { ...f.title }, note: { ...f.note }, video_url: f.video_url.trim(), is_active: f.is_active };
    LANG_KEYS.forEach((l) => {
      body.title[l] = body.title[l].trim();
      body.note[l] = body.note[l].trim();
    });
    return body;
  };

  async function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const body = bodyOf(form);
    if (!body.title.uz) {
      setTab('uz');
      setError({ text: t('lesson.errTitle'), field: 'title', langs: ['uz'] });
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(body.video_url)) {
      setError({ text: t('lesson.errUrl'), field: 'video_url' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (lesson) {
        const patch = changes(bodyOf(initial), body);
        if (Object.keys(patch).length) await lessons.update(lesson.id, patch);
        onSaved(false);
      } else {
        if (LANG_KEYS.every((l) => !body.note[l])) delete body.note;
        await lessons.create(courseId, { ...body, sort_order: nextOrder });
        onSaved(true);
      }
    } catch (err) {
      const langs = err.status === 400 ? [...new Set(err.messages.join(' ').match(/\.(uz|ru|en)\b/g)?.map((m) => m.slice(1)) ?? [])] : [];
      setError({ text: errorText(err, t), langs });
      if (langs.length && !langs.includes(tab)) setTab(langs[0]);
      setBusy(false);
    }
  }

  const missing = error?.langs ?? [];
  const thumb = youtubeThumb(form.video_url);
  return (
    <Modal
      title={t(lesson ? 'lesson.editTitle' : 'lesson.newTitle')}
      size="lg"
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section title={t('course.content')} aside={<LangTabs value={tab} onChange={setTab} missing={missing} />}>
          <Field
            key={`t-${tab}`}
            label={`${t('lesson.name')} · ${tab.toUpperCase()}`}
            value={form.title[tab]}
            maxLength={200}
            invalid={error?.field === 'title' && missing.includes(tab)}
            onChange={(e) => setText('title', e.target.value)}
          />
          <Field
            key={`n-${tab}`}
            type="textarea"
            rows={7}
            label={`${t('lesson.note')} · ${tab.toUpperCase()}`}
            hint={t('lesson.noteHint')}
            value={form.note[tab]}
            onChange={(e) => setText('note', e.target.value)}
          />
        </Section>

        <Section title={t('lesson.video')}>
          <div className={`adm-video-row${thumb ? ' has-thumb' : ''}`}>
            <Field
              type="url"
              aria-label={t('lesson.video')}
              hint={t('lesson.videoHint')}
              placeholder="https://www.youtube.com/watch?v=…"
              value={form.video_url}
              invalid={error?.field === 'video_url'}
              onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
            />
            {thumb && (
              <a className="adm-yt" href={form.video_url.trim()} target="_blank" rel="noopener noreferrer" title={t('lesson.open')}>
                <img src={thumb} alt="" loading="lazy" />
              </a>
            )}
          </div>
        </Section>

        <Section>
          <Switch label={t('lesson.active')} checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
        </Section>
      </form>
    </Modal>
  );
}
