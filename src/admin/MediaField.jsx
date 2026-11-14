import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../lib/http.js';
import { upload } from './api.js';
import { Alert, Icon, errorText, useT } from './ui.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * One uploaded image (the course photo). Picking or dropping a file uploads it
 * straight away and reports the stored path through onChange; "Remove" sets it to null.
 * onBusy(true/false) lets the form hold its Save button while a file is on its way.
 */
export default function MediaField({ kind = 'image', label, hint, value, onChange, onBusy, portrait = false }) {
  const t = useT();
  const input = useRef(null);
  const ctrl = useRef(null);
  const [progress, setProgress] = useState(null); // 0…1 while uploading
  const [local, setLocal] = useState(null); // object URL of the file being sent / just sent
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);

  const sent = useRef(null); // the path our last upload produced

  useEffect(() => () => ctrl.current?.abort(), []);
  useEffect(() => () => local && URL.revokeObjectURL(local), [local]);
  // the form reset the value (e.g. "discard changes"): stop showing our local preview
  useEffect(() => {
    if (value !== sent.current && progress === null) setLocal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function send(file) {
    if (!file) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setError(null);
    setLocal(URL.createObjectURL(file));
    setProgress(0);
    onBusy?.(true);
    try {
      const path = await upload(kind, file, { onProgress: setProgress, signal: ctrl.current.signal });
      sent.current = path;
      onChange(path);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      setLocal(null);
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }

  const src = local || mediaUrl(value);
  const uploading = progress !== null;

  const choose = () => input.current?.click();
  const clear = () => {
    ctrl.current?.abort();
    setLocal(null);
    onChange(null);
  };

  return (
    <div className="adm-field">
      <span className="adm-field__label">{label}</span>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          send(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {src ? (
        <div className={`adm-media${portrait ? ' adm-media--portrait' : ''}`}>
          <img src={src} alt="" />
          {uploading && (
            <div className="adm-media__progress">
              <span>{t('course.uploading', { p: Math.round(progress * 100) })}</span>
              <i style={{ transform: `scaleX(${progress})` }} />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={`adm-drop${portrait ? ' adm-media--portrait' : ''}${over ? ' is-over' : ''}`}
          onClick={choose}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            send(e.dataTransfer.files?.[0]);
          }}
        >
          <Icon name="image" />
          <b>{t('course.choose')}</b>
          <small>{hint}</small>
        </button>
      )}

      {src && (
        <div className="adm-row">
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={choose}>
            <Icon name="upload" />
            {t('course.replace')}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={clear}>
            <Icon name="trash" />
            {t('course.remove')}
          </button>
        </div>
      )}
      {error && <Alert tone="error">{errorText(error, t)}</Alert>}
    </div>
  );
}
