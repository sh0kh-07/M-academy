import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { getJSON, mediaUrl, records } from '../lib/http.js';

/*
  Site background music (GET /api/music: active tracks in sort_order; tracks are
  managed in the admin panel → Musiqa).

  Browsers do not let a page start sound by itself, so the music starts on the
  visitor's first click, tap or key press anywhere on the site (or straight away
  where the browser allows it). The round button bottom-left turns it off and on;
  the choice is remembered. One track loops; several play in order, round and round.
*/

const STORAGE_KEY = 'ma-music';
const VOLUME = 0.35;
const FADE_MS = 2200;

function remembered() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function remember(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: the choice lasts until the tab closes */
  }
}

export default function MusicPlayer() {
  const { t } = useI18n();
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [wanted, setWanted] = useState(remembered); // the visitor wants music
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const button = useRef(null);
  const fade = useRef(0);

  // the playlist
  useEffect(() => {
    const ctrl = new AbortController();
    getJSON('/music', { signal: ctrl.signal })
      .then((data) => {
        const list = records(data)
          .filter((x) => x?.file && x.is_active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setTracks(list);
      })
      .catch(() => {}); // no music is fine
    return () => ctrl.abort();
  }, []);

  const track = tracks[index] ?? null;

  /**
   * Ramp the volume to `to`, then call `done`. A timer rather than animation frames,
   * so the fade finishes even when the browser holds frames back.
   */
  function rampTo(to, done) {
    const el = audio.current;
    clearInterval(fade.current);
    const from = el.volume;
    const start = performance.now();
    fade.current = setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / FADE_MS);
      el.volume = from + (to - from) * k * k * (3 - 2 * k);
      if (k < 1) return;
      clearInterval(fade.current);
      done?.();
    }, 40);
  }

  function start() {
    const el = audio.current;
    if (!el || !el.src) return Promise.resolve(false);
    if (!el.paused) return Promise.resolve(true);
    el.volume = 0;
    return el.play().then(
      () => {
        rampTo(VOLUME);
        return true;
      },
      () => false,
    );
  }

  function stop() {
    const el = audio.current;
    if (!el || el.paused) return;
    rampTo(0, () => el.pause());
  }

  // load the current track (the effect below starts it)
  useEffect(() => {
    const el = audio.current;
    if (!el || !track) return;
    el.src = mediaUrl(track.file);
    el.loop = tracks.length === 1;
  }, [track, tracks.length]);

  // start: right away if the browser allows it, otherwise on the first gesture
  useEffect(() => {
    if (!track || !wanted) return undefined;
    let cancelled = false;
    const onGesture = (e) => {
      if (button.current?.contains(e.target)) return; // the button handles itself
      start().then((ok) => ok && cleanup());
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const cleanup = () => events.forEach((type) => window.removeEventListener(type, onGesture, true));

    start().then((ok) => {
      if (cancelled || ok) return;
      events.forEach((type) => window.addEventListener(type, onGesture, true));
    });
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, wanted]);

  // pause while the tab is hidden, pick up again when it comes back
  useEffect(() => {
    let resume = false;
    const onVisibility = () => {
      const el = audio.current;
      if (!el) return;
      if (document.hidden) {
        resume = !el.paused;
        clearInterval(fade.current);
        el.pause();
      } else if (resume) {
        resume = false;
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearInterval(fade.current), []);

  function toggle() {
    if (wanted && playing) {
      setWanted(false);
      remember(false);
      stop();
    } else {
      setWanted(true);
      remember(true);
      start();
    }
  }

  if (!track) return null;

  const on = wanted && playing;
  const label = t(on ? 'music.off' : 'music.on');
  const name = [track.title, track.artist].filter(Boolean).join(' — ');

  return (
    <div className={`music${on ? ' is-on' : ''}`}>
      <audio
        ref={audio}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => tracks.length > 1 && setIndex((i) => (i + 1) % tracks.length)}
        onError={() => tracks.length > 1 && setIndex((i) => (i + 1) % tracks.length)}
      />
      <button ref={button} type="button" className="music__btn magnetic" onClick={toggle} aria-label={label} aria-pressed={on}>
        <span className="music__bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <span className="music__label" aria-hidden="true">
        <small>{label}</small>
        <b>{name}</b>
      </span>
    </div>
  );
}
