import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { createUzbekistanFlag, createAcademyFlag, loadImage } from './flag-textures.js';

/* ------------------------------------------------------------------
   Cloth: a subdivided plane displaced in the vertex shader.
   Normals are rebuilt from the displaced surface so the folds
   catch real light (PBR material, sheen, metallic gold thread).
   ------------------------------------------------------------------ */
const WAVE_GLSL = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uUnfurl;
uniform float uSeed;
uniform vec2 uFlag;
varying float vFold;

vec3 flagPos(vec2 p) {
  float u = clamp(p.x / uFlag.x, 0.0, 1.0);
  float v = p.y / uFlag.y;
  float t = uTime;
  float ph = uSeed;

  float amp = (0.22 + 0.78 * u) * u * uWind * 2.25;            // pinned at the hoist, free at the fly
  float gust = 0.78 + 0.22 * sin(t * 0.7 + u * 2.5 + ph * 1.3);
  float w =
      0.185 * sin(u * 9.0  - t * 3.3  + v * 2.3 + ph)
    + 0.095 * sin(u * 15.5 - t * 5.6  - v * 3.6 + ph * 1.7)
    + 0.036 * sin(u * 26.0 - t * 8.8  + v * 6.0 + ph * 2.9)
    + 0.230 * sin(u * 3.1  - t * 1.45 + v * 0.8 + ph * 0.6);
  float edge = 0.06 * sin(v * 7.0 + t * 2.4 + u * 9.0 + ph) * abs(v) * 2.0;

  float z = (w * gust + edge) * amp;
  float sag = mix(0.5, 0.075, uUnfurl);
  float y = p.y - sag * u * u * uFlag.y + 0.035 * sin(u * 8.0 - t * 3.6 + ph) * amp;
  float x = p.x * (0.9 - 0.035 * uWind * u);

  x *= mix(0.12, 1.0, uUnfurl);
  z *= mix(0.4, 1.0, uUnfurl);
  return vec3(x, y, z);
}
`;

const NORMAL_GLSL = /* glsl */ `
vec3 fp0 = flagPos(position.xy);
vec3 fpx = flagPos(position.xy + vec2(0.02, 0.0));
vec3 fpy = flagPos(position.xy + vec2(0.0, 0.02));
vec3 objectNormal = normalize(cross(fpx - fp0, fpy - fp0));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
#endif
`;

function injectWave(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WAVE_GLSL}`)
      .replace('#include <beginnormal_vertex>', NORMAL_GLSL)
      .replace('#include <begin_vertex>', 'vec3 transformed = fp0;\nvFold = fp0.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFold;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.58, 1.08, smoothstep(-0.62, 0.62, vFold));',
      );
  };
  material.customProgramCacheKey = () => 'ma-flag-wave';
}

const DUST_VERT = /* glsl */ `
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.10 + aSeed * 0.16) + 7.0, 14.0) - 7.0;
  p.x += sin(uTime * 0.35 + aSeed * 31.0) * 0.35;
  p.z += cos(uTime * 0.28 + aSeed * 17.0) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (34.0 / -mv.z);
  float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.2) + aSeed * 60.0);
  vAlpha = (0.25 + 0.75 * tw) * smoothstep(7.0, 4.5, abs(p.y));
}
`;

const DUST_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, a * a * vAlpha);
}
`;

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

export async function createHero(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, -0.7, 12);

  scene.add(new THREE.HemisphereLight(0xc6d4ff, 0x0b0f22, 0.32));
  const key = new THREE.DirectionalLight(0xfff0d8, 3.3);
  key.position.set(-7.5, 4.5, 4.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f9dff, 2.2);
  rim.position.set(6, 2.5, -4);
  scene.add(rim);
  const warm = new THREE.PointLight(0xe2b765, 40, 22, 1.8);
  warm.position.set(2.5, -3, 4.5);
  scene.add(warm);

  // --- artwork --------------------------------------------------------
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const logo = await loadImage(`${import.meta.env.BASE_URL}img/logo-full.webp`).catch(() => null);
  const uzArt = createUzbekistanFlag(anisotropy);
  const maArt = createAcademyFlag(logo, anisotropy);

  const timeU = { value: 0 };
  const POLE_R = 0.036;
  const gold = new THREE.MeshStandardMaterial({ color: 0xdcb267, metalness: 1, roughness: 0.22 });

  const finialGeo = new THREE.LatheGeometry(
    [
      [0, 0], [0.062, 0], [0.072, 0.03], [0.05, 0.062], [0.038, 0.09], [0.06, 0.14],
      [0.086, 0.22], [0.076, 0.32], [0.046, 0.46], [0.014, 0.6], [0, 0.63],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    36,
  );
  const ringGeo = new THREE.TorusGeometry(POLE_R * 1.35, 0.012, 10, 28);
  const POLE_LEN = 16;
  const poleGeo = new THREE.CylinderGeometry(POLE_R, POLE_R, POLE_LEN, 28, 1);

  function buildFlag({ width, height, material, seed }) {
    const group = new THREE.Group();
    const uniforms = {
      uTime: timeU,
      uWind: { value: 1 },
      uUnfurl: { value: reducedMotion ? 1 : 0 },
      uSeed: { value: seed },
      uFlag: { value: new THREE.Vector2(width, height) },
    };
    injectWave(material, uniforms);

    const geo = new THREE.PlaneGeometry(width, height, 120, 60);
    geo.translate(width / 2, 0, 0);
    const cloth = new THREE.Mesh(geo, material);
    cloth.position.set(POLE_R * 0.9, -height / 2, 0);
    cloth.frustumCulled = false;
    group.add(cloth);

    const top = 0.14;
    const pole = new THREE.Mesh(poleGeo, gold);
    pole.position.y = top - POLE_LEN / 2;
    group.add(pole);

    const finial = new THREE.Mesh(finialGeo, gold);
    finial.position.y = top;
    group.add(finial);

    [-0.04, -height + 0.04].forEach((y) => {
      const ring = new THREE.Mesh(ringGeo, gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    });

    return { group, uniforms };
  }

  const uzFlag = buildFlag({
    width: 3.0,
    height: 1.5,
    seed: 0.0,
    material: new THREE.MeshPhysicalMaterial({
      map: uzArt.map,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0,
      sheen: 0.28,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xffffff),
    }),
  });

  const maFlag = buildFlag({
    width: 2.46,
    height: 1.64,
    seed: 2.4,
    material: new THREE.MeshPhysicalMaterial({
      map: maArt.map,
      roughnessMap: maArt.pbr,
      metalnessMap: maArt.pbr,
      roughness: 1,
      metalness: 1,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
      alphaToCoverage: true,
      sheen: 0.55,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0x4a66d8),
    }),
  });

  // national flag: place of honour — viewer's left and higher
  uzFlag.group.position.set(-1.95, 2.0, -0.7);
  maFlag.group.position.set(-0.55, 0.28, 0.6);

  const rig = new THREE.Group();
  rig.add(uzFlag.group, maFlag.group);
  scene.add(rig);

  // --- gold dust --------------------------------------------------------
  const isSmall = window.matchMedia('(max-width: 760px)').matches;
  const COUNT = isSmall ? 110 : 240;
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 9 - 0.5;
    sizes[i] = 0.6 + Math.pow(Math.random(), 3) * 3.4;
    seeds[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: {
        uTime: timeU,
        uPixelRatio: { value: pixelRatio },
        uColor: { value: new THREE.Color(0xf2cf8a) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  // --- state ------------------------------------------------------------
  const state = {
    baseX: 0,
    baseY: 0,
    baseRot: -0.5,
    intro: reducedMotion ? 0 : 1, // 1 = poles still below the frame
    scroll: 0,
    px: 0,
    py: 0,
    sx: 0,
    sy: 0,
    gust: 0,
    gustTarget: 0,
    nextGust: 7,
    running: false,
    visible: true,
  };

  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * aspect;
    // Portrait: flags sit above the copy. Landscape: flags on the right.
    // Keep in sync with the `max-aspect-ratio: 1/1` block in styles.css.
    const k = aspect <= 1 ? 0 : 1;

    const scale = Math.min((visW * lerp(1.16, 0.54, k)) / 4.3, (visH * lerp(0.47, 0.8, k)) / 3.9);
    rig.scale.setScalar(scale);
    state.baseX = lerp(0.2 * scale, visW * 0.262, k);
    state.baseY = lerp(visH * 0.135, -0.35, k);
    state.baseRot = lerp(-0.42, -0.52, k);
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // the wind is never perfectly steady: a stronger gust rolls through every few seconds
    if (!reducedMotion && timeU.value > state.nextGust) {
      state.gustTarget = Math.max(state.gustTarget, 0.45 + Math.random() * 0.4);
      state.nextGust = timeU.value + 5 + Math.random() * 6;
    }
    state.gustTarget *= Math.exp(-dt * 2.4);
    state.gust += (state.gustTarget - state.gust) * (1 - Math.exp(-dt * 3.2));
    state.sx += (state.px - state.sx) * (1 - Math.exp(-dt * 2.6));
    state.sy += (state.py - state.sy) * (1 - Math.exp(-dt * 2.6));

    const speed = reducedMotion ? 0.35 : 1;
    timeU.value += dt * speed * (1 + state.gust * 0.9);
    const t = timeU.value;
    uzFlag.uniforms.uWind.value = (1 + state.gust * 0.5) * (0.94 + 0.06 * Math.sin(t * 0.31));
    maFlag.uniforms.uWind.value = (1 + state.gust * 0.5) * (0.94 + 0.06 * Math.sin(t * 0.27 + 1.7));

    rig.position.set(state.baseX, state.baseY - state.intro * 9 + state.scroll * 2.4, 0);
    rig.rotation.y = state.baseRot + state.sx * 0.11 + state.scroll * 0.42;
    rig.rotation.x = state.sy * 0.04;

    camera.position.x = state.sx * 0.45;
    camera.position.y = -0.7 - state.sy * 0.28;
    camera.lookAt(0, 0.15, 0);

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
    const v = Math.hypot(e.movementX || 0, e.movementY || 0);
    state.gustTarget = Math.min(1, state.gustTarget + v / 500);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([entry]) => {
      state.visible = entry.isIntersecting;
      setRunning(state.visible && !document.hidden);
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => setRunning(state.visible && !document.hidden));

  layout();
  renderer.compile(scene, camera);
  tick(performance.now());
  setRunning(true);

  return {
    /** Poles rise into frame, then the cloth unfurls. */
    intro() {
      if (reducedMotion) return gsap.timeline();
      return gsap
        .timeline()
        .to(state, { intro: 0, duration: 2.1, ease: 'expo.out' }, 0)
        .to(uzFlag.uniforms.uUnfurl, { value: 1, duration: 2.6, ease: 'power3.out' }, 0.55)
        .to(maFlag.uniforms.uUnfurl, { value: 1, duration: 2.6, ease: 'power3.out' }, 0.85);
    },
    setScroll(p) {
      state.scroll = clamp(p, 0, 1);
    },
    gust(amount = 1) {
      state.gustTarget = Math.min(1, state.gustTarget + amount);
    },
    dispose() {
      setRunning(false);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      renderer.dispose();
    },
  };
}
