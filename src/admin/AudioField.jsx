import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../lib/http.js';
import { upload } from './api.js';
import { Alert, Icon, errorText, useT } from './ui.jsx';

const ACCEPT = 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/x-wav,audio/webm';

/** Length of a local audio file in whole seconds, read from its metadata (null if the browser can't tell). */
function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

/**
 * One uploaded audio file. Picking or dropping a file uploads it straight away
 * (POST /uploads/audio) and reports the stored path and its length:
 * onChange(path, durationSeconds). onBusy(true/false) holds the form's Save button.
 */
export default function AudioField({ label, hint, value, onChange, onBusy }) {
  const t = useT();
  const input = useRef(null);
  const ctrl = useRef(null);
  const [progress, setProgress] = useState(null); // 0…1 while uploading
  const [name, setName] = useState(null); // file name of the last pick
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);

  useEffect(() => () => ctrl.current?.abort(), []);

  async function send(file) {
    if (!file) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setError(null);
    setName(file.name);
    setProgress(0);
    onBusy?.(true);
    try {
      const [path, seconds] = await Promise.all([
        upload('audio', file, { onProgress: setProgress, signal: ctrl.current.signal }),
        readDuration(file),
      ]);
      onChange(path, seconds);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      setName(null);
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }

  const choose = () => input.current?.click();
  const uploading = progress !== null;

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

      {value || uploading ? (
        <div className="adm-audio">
          {uploading ? (
            <div className="adm-audio__progress">
              <span>
                <b>{name}</b>
                {t('course.uploading', { p: Math.round(progress * 100) })}
              </span>
              <i style={{ transform: `scaleX(${progress})` }} />
            </div>
          ) : (
            // preload="none": the file is only fetched when someone presses play
            <audio src={mediaUrl(value)} controls preload="none" />
          )}
        </div>
      ) : (
        <button
          type="button"
          className={`adm-drop adm-drop--audio${over ? ' is-over' : ''}`}
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
          <Icon name="music" />
          <b>{t('music.chooseAudio')}</b>
          <small>{hint}</small>
        </button>
      )}

      {value && !uploading && (
        <div className="adm-row">
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={choose}>
            <Icon name="upload" />
            {t('course.replace')}
          </button>
        </div>
      )}
      {error && <Alert tone="error">{errorText(error, t)}</Alert>}
    </div>
  );
}
