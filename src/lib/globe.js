import * as THREE from 'three';
import landDots from '../assets/land-dots.json';
import { PLACES } from '../data/places.js';

/* ------------------------------------------------------------------
   A dotted globe: the continents as gold points (Natural Earth land
   outline, sampled every 1.6°), a marker on the capital behind each
   language the school teaches, and thin arcs running out from
   Tashkent. It drifts slowly and can be turned by dragging.
   ------------------------------------------------------------------ */

const R = 2;
const DEG = Math.PI / 180;

/** Longitude / latitude the globe faces when it is at rest (roughly Central Asia). */
const FACE = { lon: 66, lat: 30 };

/** lat / lon in degrees → a point on the sphere. Longitude 0 faces +z, east is +x. */
function toVec(lat, lon, r = R) {
  const phi = lat * DEG;
  const lam = lon * DEG;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

const CORE_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const CORE_FRAG = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.4);
  float light = 0.5 + 0.5 * dot(normalize(vNormal), normalize(vec3(-0.5, 0.6, 0.6)));
  vec3 col = mix(vec3(0.003, 0.005, 0.014), vec3(0.008, 0.013, 0.036), light);  // linear: reads as deep navy
  col += vec3(0.05, 0.09, 0.26) * rim * 0.85;         // cool atmosphere at the limb
  col += vec3(0.9, 0.72, 0.42) * pow(rim, 6.0) * 0.16; // a thin warm edge
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const DOT_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  float facing = dot(n, normalize(-mv.xyz));
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 2.3 * uPixelRatio * (8.6 / -mv.z);
  float twinkle = 0.78 + 0.22 * sin(uTime * 0.9 + aSeed * 40.0);
  vAlpha = smoothstep(-0.05, 0.5, facing) * twinkle;
}
`;

const DOT_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

const ARC_VERT = /* glsl */ `
varying float vAlong;
void main() {
  vAlong = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ARC_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOffset;
varying float vAlong;
void main() {
  // a pulse of light travels from Tashkent outwards, over a faint steady line
  float head = fract(uTime * 0.16 + uOffset);
  float d = vAlong - head;
  float pulse = smoothstep(-0.28, 0.0, d) * (1.0 - smoothstep(0.0, 0.03, d));
  float ends = smoothstep(0.0, 0.06, vAlong) * smoothstep(1.0, 0.94, vAlong);
  float a = (0.16 + 0.84 * pulse) * ends;
  gl_FragColor = vec4(mix(vec3(0.85, 0.66, 0.36), vec3(1.0, 0.93, 0.76), pulse), a);
  #include <colorspace_fragment>
}
`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ labels?: HTMLElement[], reducedMotion?: boolean }} options
 *   labels — one element per entry of PLACES; they are moved to follow the markers.
 */
export function createGlobe(canvas, { labels = [], reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(0, 0, 8.6);

  const tilt = new THREE.Group(); // leans the globe so the northern mid-latitudes face the viewer
  const spin = new THREE.Group(); // turns it about its axis
  tilt.add(spin);
  scene.add(tilt);

  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  // --- body -----------------------------------------------------------------
  spin.add(
    new THREE.Mesh(
      keep(new THREE.SphereGeometry(R * 0.985, 64, 48)),
      keep(new THREE.ShaderMaterial({ vertexShader: CORE_VERT, fragmentShader: CORE_FRAG })),
    ),
  );

  // graticule every 30°
  {
    const pts = [];
    const TAU = Math.PI * 2;
    const ring = (fn) => {
      for (let i = 0; i < 96; i++) pts.push(fn((i / 96) * TAU), fn(((i + 1) / 96) * TAU));
    };
    [-60, -30, 0, 30, 60].forEach((lat) => ring((a) => toVec(lat, a / DEG, R * 1.001)));
    for (let lon = 0; lon < 180; lon += 30) {
      const e = toVec(0, lon, 1);
      ring((a) => new THREE.Vector3(e.x * Math.cos(a), Math.sin(a), e.z * Math.cos(a)).multiplyScalar(R * 1.001));
    }
    spin.add(
      new THREE.LineSegments(
        keep(new THREE.BufferGeometry().setFromPoints(pts)),
        keep(new THREE.LineBasicMaterial({ color: 0x8ea6ff, transparent: true, opacity: 0.07 })),
      ),
    );
  }

  // --- continents ---------------------------------------------------------------
  const time = { value: 0 };
  {
    const count = landDots.length / 2;
    const position = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const v = toVec(landDots[i * 2] / 10, landDots[i * 2 + 1] / 10, R * 1.004);
      position.set([v.x, v.y, v.z], i * 3);
      seed[i] = Math.random();
    }
    const geo = keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    spin.add(
      new THREE.Points(
        geo,
        keep(
          new THREE.ShaderMaterial({
            vertexShader: DOT_VERT,
            fragmentShader: DOT_FRAG,
            transparent: true,
            depthWrite: false,
            uniforms: {
              uTime: time,
              uPixelRatio: { value: pixelRatio },
              uColor: { value: new THREE.Color(0xe6c98c) },
            },
          }),
        ),
      ),
    );
  }

  // --- markers + arcs ---------------------------------------------------------------
  const goldMat = keep(new THREE.MeshBasicMaterial({ color: 0xf6e3b0 }));
  const dotGeo = keep(new THREE.CircleGeometry(0.026, 20));
  const homeGeo = keep(new THREE.CircleGeometry(0.042, 24));
  const ringGeo = keep(new THREE.RingGeometry(0.04, 0.047, 40));
  const out = new THREE.Vector3(0, 0, 1);
  const home = PLACES.find((p) => p.home);
  const homeVec = toVec(home.lat, home.lon, 1);

  const markers = PLACES.map((place, i) => {
    const normal = toVec(place.lat, place.lon, 1);
    const anchor = new THREE.Group();
    anchor.position.copy(normal).multiplyScalar(R * 1.012);
    anchor.quaternion.setFromUnitVectors(out, normal);
    anchor.add(new THREE.Mesh(place.home ? homeGeo : dotGeo, goldMat));

    const ringMat = keep(
      new THREE.MeshBasicMaterial({ color: 0xdcb46b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    const ring = new THREE.Mesh(ringGeo, ringMat);
    anchor.add(ring);
    spin.add(anchor);

    if (!place.home) {
      // great-circle arc from Tashkent, lifted off the surface in the middle
      const angle = homeVec.angleTo(normal);
      const lift = 0.1 + angle * 0.2;
      const points = [];
      for (let k = 0; k <= 48; k++) {
        const t = k / 48;
        const a = Math.sin((1 - t) * angle) / Math.sin(angle);
        const b = Math.sin(t * angle) / Math.sin(angle);
        points.push(
          homeVec
            .clone()
            .multiplyScalar(a)
            .addScaledVector(normal, b)
            .multiplyScalar(R * (1.012 + lift * Math.sin(Math.PI * t))),
        );
      }
      spin.add(
        new THREE.Mesh(
          keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.0075, 5, false)),
          keep(
            new THREE.ShaderMaterial({
              vertexShader: ARC_VERT,
              fragmentShader: ARC_FRAG,
              transparent: true,
              depthWrite: false,
              uniforms: { uTime: time, uOffset: { value: i * 0.137 } },
            }),
          ),
        ),
      );
    }
    return { place, normal, ring, ringMat, phase: i * 0.31, label: labels[i] ?? null };
  });

  // --- motion ---------------------------------------------------------------------------
  const state = {
    yaw: 0, // what the visitor added by dragging
    pitch: 0,
    velocity: 0,
    dragging: false,
    idle: 10,
    lastX: 0,
    lastY: 0,
    w: 1,
    h: 1,
    running: false,
    visible: false,
  };

  function layout() {
    state.w = canvas.clientWidth || 400;
    state.h = canvas.clientHeight || 400;
    renderer.setSize(state.w, state.h, false);
    camera.aspect = state.w / state.h;
    camera.position.z = camera.aspect < 1 ? 8.6 / camera.aspect : 8.6;
    camera.updateProjectionMatrix();
  }

  const world = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const facingNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time.value += dt * (reducedMotion ? 0.3 : 1);
    const t = time.value;

    if (!state.dragging) {
      state.idle += dt;
      state.yaw += state.velocity * dt;
      state.velocity *= Math.exp(-dt * 2.4);
      if (state.idle > 2.5) {
        // drift back so the markers come into view again
        const back = 1 - Math.exp(-dt * 0.5);
        state.yaw -= state.yaw * back;
        state.pitch -= state.pitch * back;
      }
    }

    spin.rotation.y = -FACE.lon * DEG + Math.sin(t * 0.11) * 0.42 + state.yaw;
    tilt.rotation.x = FACE.lat * DEG + state.pitch;
    tilt.updateMatrixWorld(true);
    normalMatrix.getNormalMatrix(spin.matrixWorld);

    markers.forEach((m) => {
      // pulsing ring
      const p = (t * 0.45 + m.phase) % 1;
      m.ring.scale.setScalar(1 + p * (m.place.home ? 2.6 : 1.9));
      m.ringMat.opacity = (1 - p) * (m.place.home ? 0.9 : 0.6);

      if (!m.label) return;
      world.copy(m.normal).multiplyScalar(R * 1.012).applyMatrix4(spin.matrixWorld);
      facingNormal.copy(m.normal).applyMatrix3(normalMatrix).normalize();
      toCamera.copy(camera.position).sub(world).normalize();
      const facing = facingNormal.dot(toCamera);
      world.project(camera);
      const x = (world.x * 0.5 + 0.5) * state.w;
      const y = (-world.y * 0.5 + 0.5) * state.h;
      m.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      m.label.style.opacity = String(Math.max(0, Math.min(1, (facing - 0.12) / 0.25)));
    });

    renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (on === state.running) return;
    state.running = on;
    last = performance.now();
    renderer.setAnimationLoop(on ? tick : null);
  }

  // --- drag to turn ------------------------------------------------------------------------
  const onDown = (e) => {
    state.dragging = true;
    state.velocity = 0;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.setAttribute('data-dragging', '');
  };
  const onMove = (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    const k = 2.2 / state.h; // a drag across the globe turns it by about a radian
    state.yaw += dx * k;
    state.pitch = Math.max(-0.5, Math.min(0.5, state.pitch + dy * k * 0.6));
    state.velocity = (dx * k) / 0.016;
  };
  const onUp = () => {
    if (!state.dragging) return;
    state.dragging = false;
    state.idle = 0;
    state.velocity = Math.max(-2.5, Math.min(2.5, state.velocity));
    canvas.removeAttribute('data-dragging');
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  const sync = () => setRunning(state.visible && !document.hidden);
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);

  layout();
  tick(performance.now());

  return {
    dispose() {
      setRunning(false);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('visibilitychange', sync);
      disposables.forEach((thing) => thing.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
