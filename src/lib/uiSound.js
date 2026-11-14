/*
  Tiny interface sounds, synthesised with the Web Audio API (no audio files):
    tick  — a soft, very short "tik" when the mouse moves onto something clickable
    click — a slightly fuller "chik" when something is pressed

  Browsers keep audio locked until the visitor's first click or key press, so nothing
  sounds before that. The sounds follow the music button: when the visitor turns the
  music off (stored as ma-music = "off"), the site goes completely quiet.
*/

const HOVER = 'a, button, [role="tab"], select, label, input[type="checkbox"], input[type="radio"], .tilt';
const MIN_GAP_MS = 45; // never more than ~20 sounds a second

let ctx = null;
let master = null;
let noise = null;
let lastAt = 0;

function muted() {
  try {
    return localStorage.getItem('ma-music') === 'off';
  } catch {
    return false;
  }
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
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // 60 ms of white noise, reused for every click
  noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.06), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
}

/** A filtered burst of noise: the "tik" of a mechanical switch. */
function burst(t, { freq, q, gain, decay }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(band).connect(env).connect(master);
  src.start(t);
  src.stop(t + decay + 0.01);
}

/** A short pitched blip under the click, so it doesn't sound like plain noise. */
function blip(t, { from, to, gain, decay }) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + decay);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + decay + 0.01);
}

function play(kind) {
  if (!ctx || ctx.state !== 'running' || document.hidden || muted()) return;
  const now = performance.now();
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;
  const t = ctx.currentTime + 0.002;
  // a touch of randomness so repeated sounds don't feel mechanical
  const vary = 1 + (Math.random() - 0.5) * 0.08;

  if (kind === 'tick') {
    burst(t, { freq: 4200 * vary, q: 2.2, gain: 0.16, decay: 0.018 });
    blip(t, { from: 2600 * vary, to: 1800, gain: 0.025, decay: 0.02 });
  } else {
    burst(t, { freq: 2300 * vary, q: 1.4, gain: 0.32, decay: 0.035 });
    blip(t, { from: 900 * vary, to: 240, gain: 0.12, decay: 0.05 });
  }
}

/** Wire the sounds to the page. Returns a function that removes them. */
export function startUiSounds() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hovered = null;

  const onDown = (e) => {
    unlock();
    const target = e.target instanceof Element ? e.target.closest(HOVER) : null;
    if (target && !target.closest('[disabled], [aria-disabled="true"]')) play('click');
  };
  const onKey = (e) => {
    unlock();
    if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.closest('a, button')) play('click');
  };
  const onOver = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const target = e.target instanceof Element ? e.target.closest(HOVER) : null;
    if (target === hovered) return;
    hovered = target;
    if (target && !target.closest('[disabled], [aria-disabled="true"]')) play('tick');
  };

  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey, true);
  if (finePointer) document.addEventListener('pointerover', onOver, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerover', onOver);
  };
}
