/*
  Interface sounds (Web Audio API).

  Pressing anything clickable plays the site's click — public/sfx/click.wav, a short
  "chik-tak" chosen by the client. It plays dry and at its own volume, and is
  fetched once, on the visitor's first click or key press.

  Hovering is synthesised: every kind of element has its own voice, all tuned to
  one pentatonic scale so they never clash with each other or with the music:

    menu links       glass notes that rise from left to right, like a little xylophone
    course cards     crystal chimes, each card its own note
    gold buttons     a warm two-note swell
    outline buttons  a soft wooden knock
    news cards       a paper rustle
    tabs, filters    a crisp mechanical tick (the iPhone picker)
    language switch  two quick notes going up
    course ring      a detent tick each time a card passes the front while you spin it
    page change      a low airy whoosh while the screen dips to black

  Browsers keep audio locked until the visitor's first click or key press, so nothing
  sounds before that. The sounds follow the music button: when the visitor turns the
  music off (stored as ma-music = "off"), the site goes completely quiet.
*/

const HOVER = 'a, button, [role="tab"], select, label, input[type="checkbox"], input[type="radio"], .tilt';
const MIN_GAP_MS = 40; // never more than ~25 sounds a second
const CLICK_URL = `${import.meta.env.BASE_URL}sfx/click.wav`;
const CLICK_VOLUME = 0.8;

// E-major pentatonic over two octaves (Hz) — bright, never dissonant
const SCALE = [659.3, 740, 830.6, 987.8, 1108.7, 1318.5, 1480, 1661.2, 1975.5, 2217.5];

let ctx = null;
let master = null;
let noise = null;
let lastAt = 0;
let clickBuffer = null; // the decoded click sample
let clickOut = null; // its own gain, straight to the speakers (no echo)
let lastClickAt = 0;

function muted() {
  try {
    return localStorage.getItem('ma-music') === 'off';
  } catch {
    return false;
  }
}

/** The click file's bytes, fetched once (ahead of time, so the very first press can use it). */
let clickBytes = null;
function loadClick() {
  clickBytes ??= fetch(CLICK_URL).then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))));
  return clickBytes;
}

/** Create the audio graph; only allowed inside a user gesture. */
function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  ctx = new AudioContext();

  // a short, soft room so the notes don't sound dry
  master = ctx.createGain();
  master.gain.value = 0.5;
  const dry = ctx.createGain();
  dry.gain.value = 1;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  const echo = ctx.createDelay(0.5);
  echo.delayTime.value = 0.09;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  master.connect(dry).connect(ctx.destination);
  master.connect(echo).connect(tone).connect(wet).connect(ctx.destination);
  tone.connect(feedback).connect(echo);

  clickOut = ctx.createGain();
  clickOut.gain.value = CLICK_VOLUME;
  clickOut.connect(ctx.destination);
  loadClick()
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
    .then((buffer) => (clickBuffer = buffer))
    .catch(() => {}); // until it arrives (or if it can't), a synthesised click stands in

  noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 1.0), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
}

/* ---------------- building blocks ---------------- */

function envelope(t, peak, attack, decay) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  env.connect(master);
  return env;
}

function tone(t, { freq, to, type = 'sine', gain, attack = 0.003, decay }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  osc.connect(envelope(t, gain, attack, decay));
  osc.start(t);
  osc.stop(t + attack + decay + 0.02);
}

function hiss(t, { type = 'bandpass', freq, to, q = 1, gain, attack = 0.002, decay, length }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + (length ?? attack + decay));
  filter.Q.value = q;
  src.connect(filter).connect(envelope(t, gain, attack, decay));
  src.start(t, Math.random() * 0.3);
  src.stop(t + attack + decay + 0.02);
}

/** A bell-like note: a sine with a quiet, faster-fading overtone. */
function bell(t, freq, { gain = 0.05, decay = 0.35 } = {}) {
  tone(t, { freq, gain, decay });
  tone(t, { freq: freq * 2.76, gain: gain * 0.25, decay: decay * 0.35 });
}

const note = (i) => SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];

/* ---------------- voices ---------------- */

const VOICES = {
  tick(t) {
    hiss(t, { freq: 4300, q: 2.5, gain: 0.14, decay: 0.016 });
    tone(t, { freq: 2600, to: 1900, gain: 0.02, decay: 0.018 });
  },
  press(t) {
    hiss(t, { freq: 2300, q: 1.4, gain: 0.28, decay: 0.035 });
    tone(t, { freq: 900, to: 240, gain: 0.1, decay: 0.05 });
  },
  glass(t, { index = 0 } = {}) {
    bell(t, note(index + 2) * 2, { gain: 0.03, decay: 0.22 });
  },
  chime(t, { index = 0 } = {}) {
    bell(t, note(index), { gain: 0.045, decay: 0.45 });
  },
  warm(t) {
    tone(t, { freq: 330, to: 494, type: 'triangle', gain: 0.05, attack: 0.02, decay: 0.22 });
    tone(t + 0.03, { freq: 494, to: 659, gain: 0.03, attack: 0.02, decay: 0.24 });
  },
  wood(t) {
    hiss(t, { freq: 1300, q: 7, gain: 0.22, decay: 0.05 });
    tone(t, { freq: 620, to: 440, gain: 0.05, decay: 0.06 });
  },
  paper(t) {
    hiss(t, { type: 'highpass', freq: 2500, to: 6000, q: 0.7, gain: 0.05, attack: 0.02, decay: 0.09 });
  },
  toggle(t) {
    bell(t, note(3), { gain: 0.035, decay: 0.15 });
    bell(t + 0.07, note(5), { gain: 0.035, decay: 0.2 });
  },
  detent(t, { index = 0 } = {}) {
    hiss(t, { freq: 5200, q: 3, gain: 0.1, decay: 0.012 });
    tone(t, { freq: note(index) * 2, gain: 0.012, decay: 0.05 });
  },
  whoosh(t) {
    hiss(t, { type: 'lowpass', freq: 250, to: 1800, q: 0.8, gain: 0.08, attack: 0.18, decay: 0.32, length: 0.45 });
    tone(t, { freq: 110, to: 82, gain: 0.03, attack: 0.1, decay: 0.4 });
  },
};

/** Play a voice now (e.g. cue('detent', { index: 3 })). Silent until audio is unlocked. */
export function cue(kind, opts) {
  if (!ctx || ctx.state !== 'running' || document.hidden || muted()) return;
  const now = performance.now();
  if (kind !== 'whoosh' && now - lastAt < MIN_GAP_MS) return;
  lastAt = now;
  VOICES[kind]?.(ctx.currentTime + 0.003, opts);
}

/** The press sound: the click sample, or a synthesised click until it has loaded. */
function click() {
  if (!ctx || document.hidden || muted()) return;
  if (ctx.state === 'suspended') ctx.resume(); // the first press both unlocks and plays
  const now = performance.now();
  if (now - lastClickAt < 30) return;
  lastClickAt = now;
  if (!clickBuffer) {
    if (ctx.state === 'running') VOICES.press(ctx.currentTime + 0.003);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = clickBuffer;
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04; // a hair of variation
  src.connect(clickOut);
  src.start(ctx.currentTime);
}

/* ---------------- which element gets which voice (hover) ---------------- */

const indexIn = (el) => (el.parentElement ? [...el.parentElement.children].indexOf(el) : 0);

function voiceFor(el) {
  if (el.closest('.music__btn')) return ['glass', { index: 4 }];
  if (el.closest('.lang')) return ['toggle'];
  if (el.closest('.btn--gold')) return ['warm'];
  if (el.closest('.btn--ghost, .link-arrow, .link-back')) return ['wood'];
  const course = el.closest('.course, .ring__card');
  if (course) return ['chime', { index: indexIn(course) }];
  if (el.closest('.post')) return ['paper'];
  const link = el.closest('.nav__links a, .menu__links a, .footer__col a');
  if (link) return ['glass', { index: indexIn(link) }];
  if (el.closest('[role="tab"], .filters button, .choice, .stepper li')) return ['tick'];
  const card = el.closest('.tilt');
  if (card) return ['chime', { index: indexIn(card) + 2 }];
  return ['tick'];
}

/** Wire the sounds to the page. Returns a function that removes them. */
export function startUiSounds() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hovered = null;

  const usable = (el) => el && !el.closest('[disabled], [aria-disabled="true"]');
  // 18 KB: fetch it once the page has settled, so it is ready for the first press
  const prefetch = setTimeout(() => loadClick().catch(() => {}), 1500);

  const onDown = (e) => {
    unlock();
    const target = e.target instanceof Element ? e.target.closest(HOVER) : null;
    if (usable(target)) click();
  };
  const onKey = (e) => {
    unlock();
    if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.closest('a, button')) {
      click();
    }
  };
  const onOver = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const target = e.target instanceof Element ? e.target.closest(HOVER) : null;
    if (target === hovered) return;
    hovered = target;
    if (usable(target)) cue(...voiceFor(target));
  };

  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey, true);
  if (finePointer) document.addEventListener('pointerover', onOver, { passive: true });

  return () => {
    clearTimeout(prefetch);
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerover', onOver);
  };
}
