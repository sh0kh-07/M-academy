import { useEffect, useId, useRef, useState } from 'react';
import { mediaUrl } from '../../lib/http.js';
import { changes, music } from '../resources.js';
import AudioField from '../AudioField.jsx';
import MediaField from '../MediaField.jsx';
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

/** 184 → "3:04" */
const clock = (seconds) => {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '—';
  const s = Math.round(Number(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/*
  Site background music (Swagger "Admin · Musiqa"): list, listen, add / edit, turn on or
  off for the site, reorder, delete. The site plays the active tracks in this order.
*/
export default function MusicList() {
  const t = useT();
  const notify = useToast();
  usePageTitle(t('music.title'));

  const list = useQuery((signal) => music.list(signal), []);
  const [editing, setEditing] = useState(null); // a track, or {} for a new one
  const [removing, setRemoving] = useState(null);
  const [moving, setMoving] = useState(false);
  const [playing, setPlaying] = useState(null); // id of the track being previewed
  const player = useRef(null);
  const rows = list.data ?? [];

  // one preview at a time; stop it when leaving the page
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.onended = () => setPlaying(null);
    player.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
    };
  }, []);

  function preview(track) {
    const audio = player.current;
    if (playing === track.id) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = mediaUrl(track.file);
    audio.play().then(
      () => setPlaying(track.id),
      () => {
        setPlaying(null);
        notify(t('err.network'), 'error');
      },
    );
  }

  // swap two neighbours, then renumber sort_order 0…n-1 where it changed
  async function move(index, step) {
    const next = [...rows];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    list.setData(next);
    setMoving(true);
    try {
      for (let i = 0; i < next.length; i += 1) {
        if ((next[i].sort_order ?? 0) !== i) {
          await music.update(next[i].id, { sort_order: i });
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

  async function toggle(track) {
    const on = track.is_active === false;
    list.setData((all) => all.map((x) => (x.id === track.id ? { ...x, is_active: on } : x)));
    try {
      await music.update(track.id, { is_active: on });
      notify(t(on ? 'music.shown' : 'music.hidden'));
    } catch (err) {
      notify(errorText(err, t), 'error');
      list.reload();
    }
  }

  const nextOrder = rows.reduce((max, x) => Math.max(max, (x.sort_order ?? 0) + 1), 0);
  // the site starts with the first active track
  const onAir = rows.find((x) => x.is_active !== false)?.id;

  return (
    <>
      <PageHead title={t('music.title')} text={t('music.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('music.new')}
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
          <Empty icon="music" title={t('music.empty')} text={t('music.emptyText')}>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
              <Icon name="plus" />
              {t('music.new')}
            </button>
          </Empty>
        ) : (
          <div className="adm-table-wrap" data-loading={moving || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('music.colTrack')}</th>
                  <th className="num">{t('music.colLength')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((track, i) => (
                  <tr key={track.id}>
                    <td>
                      <div className="adm-track">
                        <button
                          type="button"
                          className={`adm-track__play${playing === track.id ? ' is-playing' : ''}`}
                          onClick={() => preview(track)}
                          title={t(playing === track.id ? 'music.pause' : 'music.play')}
                          aria-label={t(playing === track.id ? 'music.pause' : 'music.play')}
                        >
                          {track.cover && <img src={mediaUrl(track.cover)} alt="" loading="lazy" />}
                          <Icon name={playing === track.id ? 'pause' : 'play'} />
                        </button>
                        <button type="button" className="adm-cell-btn" onClick={() => setEditing(track)}>
                          <b>{track.title || '—'}</b>
                          <small>
                            {track.artist || '—'}
                            {track.id === onAir && <em className="adm-track__air"> · {t('music.playing')}</em>}
                          </small>
                        </button>
                      </div>
                    </td>
                    <td className="num">{clock(track.duration_seconds)}</td>
                    <td>
                      <button type="button" className="adm-cell-btn" onClick={() => toggle(track)}>
                        <span className={`adm-status${track.is_active === false ? ' adm-status--off' : ''}`}>
                          {t(track.is_active === false ? 'common.inactive' : 'common.active')}
                        </span>
                      </button>
                    </td>
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
                        <button type="button" className="adm-icon-btn" onClick={() => setEditing(track)} title={t('common.edit')} aria-label={t('common.edit')}>
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn adm-icon-btn--danger"
                          onClick={() => setRemoving(track)}
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
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
      </section>

      <Presence when={editing}>
        {(item) => (
          <TrackDialog
            track={item.id ? item : null}
            nextOrder={nextOrder}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'music.created' : 'music.saved'));
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('music.deleteTitle')}
            text={t('music.deleteText', { name: item.title })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              if (playing === item.id) {
                player.current.pause();
                setPlaying(null);
              }
              await music.remove(item.id);
              notify(t('music.deleted'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

function TrackDialog({ track, nextOrder, onClose, onSaved }) {
  const t = useT();
  const formId = useId();
  const [initial] = useState(() => ({
    title: track?.title ?? '',
    artist: track?.artist ?? 'M.ACADEMY',
    file: track?.file ?? null,
    cover: track?.cover ?? null,
    duration_seconds: track?.duration_seconds ?? null,
    sort_order: track?.sort_order ?? nextOrder,
    is_active: track ? track.is_active !== false : true,
  }));
  const [form, setForm] = useState(initial);
  const [uploads, setUploads] = useState(0); // files still on their way
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field? }

  const busyFlag = (on) => setUploads((n) => Math.max(0, n + (on ? 1 : -1)));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const bodyOf = (f) => ({
    title: f.title.trim(),
    artist: f.artist.trim() || null,
    file: f.file,
    cover: f.cover || null,
    duration_seconds: f.duration_seconds == null ? null : Number(f.duration_seconds),
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
  });

  async function submit(e) {
    e.preventDefault();
    if (busy || uploads) return;
    const body = bodyOf(form);
    if (!body.file) {
      setError({ text: t('music.errFile'), field: 'file' });
      return;
    }
    if (!body.title) {
      setError({ text: t('music.errTitle'), field: 'title' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (track) {
        const patch = changes(bodyOf(initial), body);
        if (Object.keys(patch).length) await music.update(track.id, patch);
        onSaved(false);
      } else {
        Object.keys(body).forEach((key) => body[key] == null && delete body[key]);
        await music.create(body);
        onSaved(true);
      }
    } catch (err) {
      setError({ text: errorText(err, t) });
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t(track ? 'music.editTitle' : 'music.newTitle')}
      size="md"
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} disabled={uploads > 0} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section title={t('music.audio')}>
          <AudioField
            hint={t('music.audioHint')}
            value={form.file}
            onBusy={busyFlag}
            onChange={(path, seconds) => {
              setForm((f) => ({
                ...f,
                file: path,
                duration_seconds: seconds ?? f.duration_seconds,
              }));
              if (error?.field === 'file') setError(null);
            }}
          />
        </Section>

        <Section title={t('music.colTrack')}>
          <div className="adm-grid-2">
            <Field
              label={t('music.name')}
              autoFocus={!track}
              value={form.title}
              maxLength={150}
              placeholder="Beyond Limits"
              invalid={error?.field === 'title'}
              onChange={(e) => set({ title: e.target.value })}
            />
            <Field label={t('music.artist')} value={form.artist} maxLength={150} onChange={(e) => set({ artist: e.target.value })} />
          </div>
          <div className="adm-grid-2">
            <Field
              type="number"
              label={t('music.colLength')}
              hint={clock(form.duration_seconds)}
              value={form.duration_seconds ?? ''}
              min={0}
              step={1}
              onChange={(e) => set({ duration_seconds: e.target.value === '' ? null : e.target.value })}
            />
            <Field
              type="number"
              label={t('course.order')}
              hint={t('course.orderHint')}
              value={form.sort_order}
              min={0}
              step={1}
              onChange={(e) => set({ sort_order: e.target.value })}
            />
          </div>
          <Switch label={t('music.active')} hint={t('music.activeHint')} checked={form.is_active} onChange={(v) => set({ is_active: v })} />
        </Section>

        <Section title={t('music.cover')}>
          <MediaField hint={t('music.coverHint')} value={form.cover} onBusy={busyFlag} onChange={(path) => set({ cover: path })} portrait={false} />
        </Section>
      </form>
    </Modal>
  );
}
