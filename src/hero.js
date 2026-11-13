import * as THREE from 'three';
import { createUzbekistanFlag, createAcademyFlag, loadImage } from './flag-textures.js';

/* ------------------------------------------------------------------
   Cinematic flag backdrop.

   Slow-motion silk, low-key light, and a sequence of shots that dip
   to black between each other:
     'uz'   — the flag of Uzbekistan
     'ma'   — the M Academy flag
     'both' — the two together, moving in sync
   The page copy sits on top; this is deliberately a background.

   One lightweight custom shader (no PBR, no environment map) and an
   adaptive pixel ratio keep it cheap on integrated GPUs.
   ------------------------------------------------------------------ */

const FLAG_W = 3;
const FLAG_H = 1.5;

/** Seconds. One shot = fade in → hold → fade to black → short pause. */
const TIMING = { fadeIn: 1.9, hold: 6.6, fadeOut: 1.4, black: 0.45 };
const SHOT_LENGTH = TIMING.fadeIn + TIMING.hold + TIMING.fadeOut + TIMING.black;

const VERT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vFold;

const vec2 FLAG = vec2(${FLAG_W.toFixed(1)}, ${FLAG_H.toFixed(1)});

// Origin is the top of the hoist: x runs along the fly, y runs down.
vec3 flagPos(vec2 p) {
  float u = clamp(p.x / FLAG.x, 0.0, 1.0);
  float v = -p.y / FLAG.y;
  float t = uTime;

  float amp = mix(0.18, 1.0, u) * smoothstep(0.0, 0.09, u) * 1.8;
  float w =
      0.170 * sin(u * 7.0  - t * 1.25 + v * 1.7)
    + 0.085 * sin(u * 12.5 - t * 2.10 - v * 2.7 + 1.9)
    + 0.028 * sin(u * 22.0 - t * 3.30 + v * 4.6 + 4.1)
    + 0.150 * sin(u * 2.6  - t * 0.58 + v * 0.8 + 0.7);
  float edge = 0.035 * sin(v * 6.5 + t * 0.9 + u * 8.0) * abs(v - 0.5) * 2.0;

  float z = (w + edge) * amp;
  float y = p.y - 0.05 * u * u * FLAG.y + 0.022 * sin(u * 8.0 - t * 1.4) * amp;
  float x = p.x * (0.94 - 0.03 * u);
  return vec3(x, y, z);
}

void main() {
  vec3 p0 = flagPos(position.xy);
  vec3 px = flagPos(position.xy + vec2(0.02, 0.0));
  vec3 py = flagPos(position.xy + vec2(0.0, 0.02));
  vec3 n = normalize(cross(px - p0, py - p0));

  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vNormal = normalize(normalMatrix * n);
  vView = mv.xyz;
  vUv = uv;
  vFold = p0.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uMask;
uniform float uHasMask;
uniform float uExposure;
uniform float uGain;
uniform float uTime;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vFold;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 base = texture2D(uMap, vUv).rgb;
  float metal = uHasMask > 0.5 ? texture2D(uMask, vUv).r : 0.0;

  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(-vView);
  vec3 l = normalize(uLight);
  vec3 h = normalize(l + v);

  float wrap = clamp((dot(n, l) + 0.28) / 1.28, 0.0, 1.0);
  float diffuse = wrap * wrap;
  float nh = max(dot(n, h), 0.0);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float fold = mix(0.34, 1.0, smoothstep(-0.55, 0.45, vFold));   // folds fall into shadow

  // silk: soft raking light, a narrow satin highlight, a little sheen at grazing angles
  vec3 silk = base * (0.07 + 1.2 * diffuse) * fold
            + vec3(1.0, 0.96, 0.9) * pow(nh, 26.0) * 0.13
            + base * fresnel * 0.2;

  // gold thread: darker in shadow, bright where it catches the key light
  vec3 gold = base * (0.10 + 0.7 * diffuse + 1.6 * pow(nh, 12.0)) * fold
            + vec3(1.0, 0.9, 0.7) * pow(nh, 64.0) * 0.55;

  vec3 col = mix(silk, gold, metal);

  // grade: slightly desaturated, cool shadows
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, 0.84);
  col = mix(col * vec3(0.9, 0.96, 1.08), col, smoothstep(0.0, 0.35, luma));

  col *= uExposure * uGain;
  col += (hash(gl_FragCoord.xy + fract(uTime) * 71.3) - 0.5) * 0.016 * uExposure;   // film grain

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const clamp = THREE.MathUtils.clamp;
const smooth = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Where each flag sits for every shot, as fractions of the visible frame:
 * x / y = top-left corner of the flag, h = flag height (flags are 2 : 1).
 */
const LAYOUTS = {
  hero(shot, aspect) {
    if (aspect > 1) {
      if (shot === 'uz') return { uz: { x: -0.015, y: 0.035, h: 1.04 } };
      if (shot === 'ma') {
        const h = clamp(0.72 * aspect, 1.1, 1.38); // logo (flag centre) lands at ~70 % of the width
        return { ma: { x: 0.7 - h / aspect, y: 0.52 - h / 2, h } };
      }
      const h = Math.min(0.3 * aspect, 0.5);
      const w = (2 * h) / aspect;
      return { uz: { x: 0.02, y: 0.075, h }, ma: { x: 1.02 - w, y: 0.075 + h * 0.8, h } };
    }
    // portrait: flags live in the upper half, the copy sits below
    if (shot === 'both') {
      const h = Math.min(0.47 * aspect, 0.215);
      const x = 0.5 - h / aspect;
      return { uz: { x, y: 0.1, h }, ma: { x, y: 0.12 + h, h } };
    }
    const h = Math.min(0.95 * aspect, 0.46);
    const y = 0.095 + (0.46 - h) / 2;
    return shot === 'uz' ? { uz: { x: -0.02, y, h } } : { ma: { x: 0.5 - h / aspect, y, h } };
  },

  // Sign-up page: a close crop of navy silk and the gold corner band, logo out of frame.
  register(shot, aspect) {
    const h = Math.max(1.6 * aspect, 1.3);
    return { ma: { x: -0.05, y: -0.07, h } };
  },
};

export async function createHero(
  canvas,
  { reducedMotion = false, shots = ['uz', 'ma', 'both'], layout = 'hero', brightness = 1 } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x03040a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // A soft, dim backdrop does not need retina resolution.
  const MAX_RATIO = Math.min(window.devicePixelRatio || 1, 1.5);
  let pixelRatio = MAX_RATIO;
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const CAM_Z = 12;
  camera.position.set(0, 0, CAM_Z);

  // --- artwork ----------------------------------------------------------
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const texSize = window.innerWidth < 760 ? 1024 : 2048;
  const needs = { uz: shots.includes('uz') || shots.includes('both'), ma: shots.includes('ma') || shots.includes('both') };
  const logo = needs.ma ? await loadImage(`${import.meta.env.BASE_URL}img/logo-full.webp`).catch(() => null) : null;

  const shared = {
    uTime: { value: 0 },
    uExposure: { value: 0 },
    uLight: { value: new THREE.Vector3(-0.62, 0.42, 0.66).normalize() },
  };
  const geometry = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 96, 48);
  geometry.translate(FLAG_W / 2, -FLAG_H / 2, 0);

  const rig = new THREE.Group();
  scene.add(rig);

  function makeFlag(art, gain) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        ...shared,
        uMap: { value: art.map },
        uMask: { value: art.mask ?? null },
        uHasMask: { value: art.mask ? 1 : 0 },
        uGain: { value: gain },
      },
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    rig.add(mesh);
    return mesh;
  }

  const flags = {
    uz: needs.uz ? makeFlag(createUzbekistanFlag(anisotropy, texSize), 0.86) : null,
    // navy silk is far darker than the national colours, so it is lit a little harder
    ma: needs.ma ? makeFlag(createAcademyFlag(logo, anisotropy, texSize), 1.7) : null,
  };

  // --- state ------------------------------------------------------------
  const state = {
    started: reducedMotion,
    shot: 0,
    shotTime: reducedMotion ? TIMING.fadeIn : 0,
    scroll: 0,
    pulse: 0,
    px: 0,
    py: 0,
    sx: 0,
    sy: 0,
    visW: 1,
    visH: 1,
    aspect: 1,
    running: false,
    visible: true,
    slowFrames: 0,
    frames: 0,
    acc: 0,
  };
  const listeners = new Set();
  const cycling = shots.length > 1 && !reducedMotion;

  function applyShot() {
    const placement = LAYOUTS[layout](shots[state.shot], state.aspect);
    Object.entries(flags).forEach(([key, mesh]) => {
      if (!mesh) return;
      const p = placement[key];
      mesh.visible = Boolean(p);
      if (!p) return;
      mesh.scale.setScalar((p.h * state.visH) / FLAG_H);
      mesh.position.set((p.x - 0.5) * state.visW, (0.5 - p.y) * state.visH, key === 'ma' ? 0.25 : 0);
    });
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    state.aspect = w / h;
    camera.aspect = state.aspect;
    camera.updateProjectionMatrix();
    state.visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    state.visW = state.visH * state.aspect;
    applyShot();
  }

  function nextShot() {
    state.shot = (state.shot + 1) % shots.length;
    state.shotTime = 0;
    applyShot();
    listeners.forEach((fn) => fn(state.shot, SHOT_LENGTH));
  }

  function exposureAt(t) {
    if (!state.started) return 0;
    if (!cycling) return smooth(t / TIMING.fadeIn);
    if (t < TIMING.fadeIn) return smooth(t / TIMING.fadeIn);
    if (t < TIMING.fadeIn + TIMING.hold) return 1;
    return 1 - smooth((t - TIMING.fadeIn - TIMING.hold) / TIMING.fadeOut);
  }

  let last = performance.now();
  function tick(now) {
    // `real` drives the edit (fades land on time even at a low frame rate);
    // `dt` drives the cloth, clamped so it never jumps after a stall.
    const real = Math.min((now - last) / 1000, 1);
    const dt = Math.min(real, 0.05);
    last = now;

    // adaptive resolution: if frames run long, render fewer pixels
    state.acc += real;
    if (++state.frames >= 50) {
      const avg = state.acc / state.frames;
      state.frames = 0;
      state.acc = 0;
      if (avg > 0.036 && pixelRatio > 0.8) {
        pixelRatio = Math.max(0.8, pixelRatio - 0.25);
        resize();
      }
    }

    shared.uTime.value += dt * (reducedMotion ? 0.3 : 1);
    if (state.started) state.shotTime += real;
    if (cycling && state.shotTime >= SHOT_LENGTH) nextShot();

    state.pulse *= Math.exp(-real * 1.6);
    state.sx += (state.px - state.sx) * (1 - Math.exp(-dt * 1.8));
    state.sy += (state.py - state.sy) * (1 - Math.exp(-dt * 1.8));

    shared.uExposure.value = exposureAt(state.shotTime) * 0.6 * brightness * (1 - state.scroll * 0.85) * (1 + state.pulse * 0.7);

    // slow push-in over the length of the shot, a breath of parallax from the pointer
    const p = cycling ? state.shotTime / SHOT_LENGTH : 0.5 + 0.5 * Math.sin(shared.uTime.value * 0.12);
    camera.position.z = CAM_Z - 0.55 * p;
    camera.position.x = (p - 0.5) * 0.16 + state.sx * 0.07;
    camera.position.y = -state.sy * 0.05;
    rig.rotation.y = -0.06 + state.sx * 0.02;
    rig.position.y = state.scroll * 0.7;

    renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (on === state.running) return;
    state.running = on;
    last = performance.now();
    renderer.setAnimationLoop(on ? tick : null);
  }

  const onPointer = (e) => {
    state.px = (e.clientX / window.innerWidth) * 2 - 1;
    state.py = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([entry]) => {
      state.visible = entry.isIntersecting;
      setRunning(state.visible && !document.hidden);
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  const onVisibility = () => setRunning(state.visible && !document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  renderer.compile(scene, camera);
  tick(performance.now());
  setRunning(true);

  const api = {
    shots,
    shotLength: SHOT_LENGTH,
    /** Fade the first shot up from black. */
    intro() {
      if (state.started) return;
      state.started = true;
      state.shotTime = 0;
      listeners.forEach((fn) => fn(state.shot, SHOT_LENGTH));
    },
    /** fn(shotIndex, seconds) — called whenever a new shot begins. */
    onShot(fn) {
      listeners.add(fn);
    },
    setScroll(p) {
      state.scroll = clamp(p, 0, 1);
    },
    /** A brief swell of light (used when the sign-up succeeds). */
    pulse() {
      state.pulse = 1;
    },
    dispose() {
      setRunning(false);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };

  // Dev only: jump to a shot at a given moment and draw exactly one frame.
  if (import.meta.env.DEV) {
    api.debugFrame = (shotIndex, seconds = TIMING.fadeIn + 1, time = 12) => {
      setRunning(false);
      state.started = true;
      state.shot = shotIndex;
      state.shotTime = seconds;
      shared.uTime.value = time;
      applyShot();
      last = performance.now();
      tick(last);
      return { pixelRatio, aspect: state.aspect, exposure: shared.uExposure.value };
    };
    window.__maScene = api;
  }
  return api;
}
