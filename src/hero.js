import * as THREE from 'three';
import { createUzbekistanFlag, createAcademyFlag, loadImage } from './flag-textures.js';

/* ------------------------------------------------------------------
   Cinematic flag backdrop.

   Slow silk, low-key light, and a sequence of shots that dip to black
   between each other:
     'uz'   — the flag of Uzbekistan
     'ma'   — the M Academy flag
     'both' — one cloth, half national flag / half academy flag,
              joined along a gold seam and moving as a single piece
   The cloth always reaches past the edges of the frame, so no shot
   ever shows a black border.

   One lightweight custom shader (no PBR, no environment map) and an
   adaptive pixel ratio keep it cheap on integrated GPUs.
   ------------------------------------------------------------------ */

const FLAG_W = 3;
const FLAG_H = 1.5;

/** How fast the cloth moves (1 = the original slow motion). */
const SPEED = 1.5;

/** Seconds. One shot = fade in → hold → fade to black → short pause. */
const TIMING = { fadeIn: 1.4, hold: 4.6, fadeOut: 1.1, black: 0.3 };
const SHOT_LENGTH = TIMING.fadeIn + TIMING.hold + TIMING.fadeOut + TIMING.black;

/**
 * The cloth is larger than the flag printed on it (in flag widths / heights),
 * so its real edges stay out of the frame while it waves.
 */
const BLEED = { left: 0.35, right: 0.5, top: 0.45, bottom: 1.5 };

const VERT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vFold;

const vec2 FLAG = vec2(${FLAG_W.toFixed(1)}, ${FLAG_H.toFixed(1)});

// Origin is the top of the hoist: x runs along the fly, y runs down.
vec3 flagPos(vec2 p) {
  float u = p.x / FLAG.x;
  float v = -p.y / FLAG.y;
  float t = uTime;

  float amp = mix(0.2, 1.0, clamp(u, 0.0, 1.0)) * smoothstep(-0.3, 0.1, u) * 1.8;
  float w =
      0.170 * sin(u * 7.0  - t * 1.25 + v * 1.7)
    + 0.085 * sin(u * 12.5 - t * 2.10 - v * 2.7 + 1.9)
    + 0.028 * sin(u * 22.0 - t * 3.30 + v * 4.6 + 4.1)
    + 0.150 * sin(u * 2.6  - t * 0.58 + v * 0.8 + 0.7);
  float edge = 0.035 * sin(v * 6.5 + t * 0.9 + u * 8.0) * min(abs(v - 0.5) * 2.0, 1.0);

  float z = (w + edge) * amp;
  float y = p.y + 0.022 * sin(u * 8.0 - t * 1.4) * amp;
  float x = p.x * (0.95 - 0.02 * clamp(u, 0.0, 1.0));
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
uniform sampler2D uMap;      // single: the flag · duo: the national flag
uniform sampler2D uMask;     // gold-thread mask of the academy flag
uniform float uHasMask;
uniform vec3 uFill;          // plain silk beyond the academy artwork
uniform float uExposure;
uniform float uGain;
uniform float uTime;
uniform vec3 uLight;
#ifdef DUO
uniform sampler2D uMapB;     // the academy flag
uniform vec4 uRectA;         // where each artwork sits in the frame: x, y, w, h
uniform vec4 uRectB;
uniform vec3 uSeam;          // a·x + b·y + c = 0 in frame coordinates
uniform float uFeather;
uniform float uGainB;
#endif
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
varying float vFold;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float inside(vec2 p) {
  return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
}

void main() {
  vec3 base;
  float metal = 0.0;
  float gain = uGain;

#ifdef DUO
  // vUv covers the frame at rest; q has its origin at the top-left corner.
  vec2 q = vec2(vUv.x, 1.0 - vUv.y);

  // national flag: its stripes simply carry on past its own edges
  vec2 a = clamp((q - uRectA.xy) / uRectA.zw, 0.001, 0.999);
  vec3 colA = texture2D(uMap, vec2(a.x, 1.0 - a.y)).rgb;

  // academy flag: plain navy silk beyond the artwork
  vec2 b = (q - uRectB.xy) / uRectB.zw;
  // only the middle of the artwork (the logo) is used here; the corner bands fade out
  vec2 win = smoothstep(vec2(0.14, 0.08), vec2(0.3, 0.2), b) * smoothstep(vec2(0.86, 0.92), vec2(0.7, 0.8), b);
  float inB = win.x * win.y;
  vec2 bt = vec2(b.x, 1.0 - b.y);
  vec3 colB = mix(uFill, texture2D(uMapB, bt).rgb, inB);
  float metalB = texture2D(uMask, bt).r * inB;

  float d = dot(vec3(q, 1.0), uSeam);
  float k = smoothstep(-uFeather, uFeather, d);
  base = mix(colA, colB, k);
  metal = metalB * k;
  gain = mix(uGain, uGainB, k);

  // a single gold thread where the two meet
  float thread = 1.0 - smoothstep(0.0012, 0.0034, abs(d));
  base = mix(base, vec3(0.86, 0.66, 0.34), thread);
  metal = max(metal, thread);
  gain = mix(gain, uGainB, thread);
#else
  float in0 = inside(vUv);
  vec3 tex = texture2D(uMap, clamp(vUv, 0.001, 0.999)).rgb;
  // uHasMask doubles as "this is the academy flag": fill, don't smear, past its edges
  base = mix(tex, mix(uFill, tex, in0), uHasMask);
  metal = uHasMask > 0.5 ? texture2D(uMask, vUv).r * in0 : 0.0;
#endif

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

  col *= uExposure * gain;
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

/** Navy silk is far darker than the national colours, so it is lit a little harder. */
const GAIN = { uz: 0.86, ma: 1.7 };

/**
 * Where the artwork sits for each shot, as fractions of the visible frame:
 * x / y = top-left corner of the flag, h = flag height (flags are 2 : 1).
 * The cloth itself always spills past the frame (see BLEED).
 */
const LAYOUTS = {
  hero(shot, aspect) {
    if (shot === 'both') return { duo: duoLayout(aspect) };

    if (aspect > 1) {
      if (shot === 'uz') {
        const h = Math.max(1.04, 0.52 * aspect); // always as wide as the frame
        return { uz: { x: -0.015, y: 0.035, h } };
      }
      const h = clamp(0.72 * aspect, 1.1, 1.38); // logo (flag centre) lands at ~70 % of the width
      return { ma: { x: 0.7 - h / aspect, y: 0.52 - h / 2, h } };
    }
    // portrait: the emblem / logo sits in the upper half, the copy below
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

/** The "both" shot: two rectangles for the artwork and the seam between them. */
function duoLayout(aspect) {
  if (aspect > 1) {
    const hA = Math.min(1.04, 0.635 * aspect); // keeps every star left of the seam
    const hB = Math.min(0.88, 0.55 * aspect); // tall enough to reach the bottom of the frame
    const wB = (2 * hB) / aspect;
    return {
      a: [-0.015, 0.035, (2 * hA) / aspect, hA],
      b: [0.815 - wB / 2, 0.56 - hB / 2, wB, hB],
      seam: [1, 0.24, -0.74], // from 74 % at the top to 50 % at the bottom
      feather: 0.03,
    };
  }
  // portrait: national flag above, academy flag below, the seam along the flag's own lower edge
  const hA = Math.min(0.62 * aspect, 0.3);
  const yA = 0.1;
  const seamY = yA + hA;
  const textTop = 0.56;
  const hB = Math.min((textTop - seamY) * 0.72, 0.16) / 0.5;
  const wB = (2 * hB) / aspect;
  const centre = seamY + (textTop - seamY) * 0.5 + 0.005;
  return {
    a: [-0.02, yA, (2 * hA) / aspect, hA],
    b: [0.5 - wB / 2, centre - hB / 2, wB, hB],
    seam: [0.05, 1, -(seamY + 0.025)],
    feather: 0.01,
  };
}

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
  const needs = {
    uz: shots.includes('uz') || shots.includes('both'),
    ma: shots.includes('ma') || shots.includes('both'),
  };
  const logo = needs.ma ? await loadImage(`${import.meta.env.BASE_URL}img/logo-full.webp`).catch(() => null) : null;
  const art = {
    uz: needs.uz ? createUzbekistanFlag(anisotropy, texSize) : null,
    ma: needs.ma ? createAcademyFlag(logo, anisotropy, texSize) : null,
  };

  const shared = {
    uTime: { value: 0 },
    uExposure: { value: 0 },
    uLight: { value: new THREE.Vector3(-0.62, 0.42, 0.66).normalize() },
    uFill: { value: new THREE.Color(0x0a1027) },
  };

  // cloth = the flag plus generous margins; uv 0…1 is the flag itself
  const gw = FLAG_W * (1 + BLEED.left + BLEED.right);
  const gh = FLAG_H * (1 + BLEED.top + BLEED.bottom);
  const geometry = new THREE.PlaneGeometry(gw, gh, 132, 124);
  geometry.translate(gw / 2 - BLEED.left * FLAG_W, BLEED.top * FLAG_H - gh / 2, 0);
  {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / FLAG_W, 1 + pos.getY(i) / FLAG_H);
  }

  const rig = new THREE.Group();
  scene.add(rig);

  function makeCloth(uniforms, defines = {}) {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        defines,
        uniforms: { ...shared, uMask: { value: null }, uHasMask: { value: 0 }, uGain: { value: 1 }, ...uniforms },
      }),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    rig.add(mesh);
    return mesh;
  }

  const cloths = {
    uz: shots.includes('uz') ? makeCloth({ uMap: { value: art.uz.map }, uGain: { value: GAIN.uz } }) : null,
    ma: shots.includes('ma')
      ? makeCloth({
          uMap: { value: art.ma.map },
          uMask: { value: art.ma.mask },
          uHasMask: { value: 1 },
          uGain: { value: GAIN.ma },
        })
      : null,
    duo: shots.includes('both')
      ? makeCloth(
          {
            uMap: { value: art.uz.map },
            uMapB: { value: art.ma.map },
            uMask: { value: art.ma.mask },
            uGain: { value: GAIN.uz },
            uGainB: { value: GAIN.ma * 0.9 },
            uRectA: { value: new THREE.Vector4() },
            uRectB: { value: new THREE.Vector4() },
            uSeam: { value: new THREE.Vector3() },
            uFeather: { value: 0.03 },
          },
          { DUO: 1 },
        )
      : null,
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
    frames: 0,
    acc: 0,
  };
  const listeners = new Set();
  const cycling = shots.length > 1 && !reducedMotion;

  function applyShot() {
    const placement = LAYOUTS[layout](shots[state.shot], state.aspect);
    Object.entries(cloths).forEach(([key, mesh]) => {
      if (!mesh) return;
      const p = placement[key];
      mesh.visible = Boolean(p);
      if (!p) return;

      if (key === 'duo') {
        // this cloth is mapped onto the frame itself: uv 0…1 = the visible frame at rest
        const sx = state.visW / FLAG_W;
        const sy = state.visH / FLAG_H;
        mesh.scale.set(sx, sy, Math.min(sx, sy) * 1.12); // wave depth follows the shorter side
        mesh.position.set(-state.visW / 2, state.visH / 2, 0);
        const u = mesh.material.uniforms;
        u.uRectA.value.fromArray(p.a);
        u.uRectB.value.fromArray(p.b);
        u.uSeam.value.fromArray(p.seam);
        u.uFeather.value = p.feather;
        return;
      }
      mesh.scale.setScalar((p.h * state.visH) / FLAG_H);
      mesh.position.set((p.x - 0.5) * state.visW, (0.5 - p.y) * state.visH, 0);
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

    shared.uTime.value += dt * SPEED * (reducedMotion ? 0.25 : 1);
    if (state.started) state.shotTime += real;
    if (cycling && state.shotTime >= SHOT_LENGTH) nextShot();

    state.pulse *= Math.exp(-real * 1.6);
    state.sx += (state.px - state.sx) * (1 - Math.exp(-dt * 1.8));
    state.sy += (state.py - state.sy) * (1 - Math.exp(-dt * 1.8));

    shared.uExposure.value =
      exposureAt(state.shotTime) * 0.6 * brightness * (1 - state.scroll * 0.85) * (1 + state.pulse * 0.7);

    // slow push-in over the length of the shot, a breath of parallax from the pointer
    const p = cycling ? state.shotTime / SHOT_LENGTH : 0.5 + 0.5 * Math.sin(shared.uTime.value * 0.1);
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
