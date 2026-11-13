import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import markSvg from './assets/mark.svg?raw';

/**
 * The M mark, extruded into solid gold from the traced logo outline,
 * with thin orbit rings around it. Follows the pointer.
 */
export function createEmblem(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xfff2d9, 2.4);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const blue = new THREE.PointLight(0x5f82ff, 60, 30, 1.6);
  blue.position.set(5, -2, 3);
  scene.add(blue);
  const warm = new THREE.PointLight(0xffc56b, 50, 30, 1.6);
  warm.position.set(-5, -3, 4);
  scene.add(warm);

  // --- extruded mark ----------------------------------------------------
  const data = new SVGLoader().parse(markSvg);
  const shapes = [];
  data.paths.forEach((path) => shapes.push(...path.toShapes()));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 150,
    bevelEnabled: true,
    bevelThickness: 18,
    bevelSize: 9,
    bevelOffset: -9,
    bevelSegments: 5,
    curveSegments: 10,
  });
  geo.center();
  geo.rotateX(Math.PI);
  const s = 3.1 / 1629;
  geo.scale(s, s, s);

  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xe3b866,
    metalness: 1,
    roughness: 0.19,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });
  const mark = new THREE.Mesh(geo, goldMat);
  const pivot = new THREE.Group();
  pivot.add(mark);
  scene.add(pivot);

  // --- orbits -------------------------------------------------------------
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xdcb267, metalness: 1, roughness: 0.3 });
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xffe2a6,
    emissive: 0xf0c069,
    emissiveIntensity: 1.6,
    metalness: 0.6,
    roughness: 0.3,
  });
  const orbits = [
    { r: 2.35, tilt: [1.15, 0.2], speed: 0.32 },
    { r: 2.75, tilt: [1.45, -0.55], speed: -0.22 },
    { r: 3.15, tilt: [0.95, 0.75], speed: 0.16 },
  ].map(({ r, tilt, speed }, i) => {
    const holder = new THREE.Group();
    holder.rotation.set(tilt[0], tilt[1], 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 160), ringMat);
    const spinner = new THREE.Group();
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.07 - i * 0.01, 20, 20), nodeMat);
    node.position.x = r;
    spinner.add(node);
    holder.add(ring, spinner);
    scene.add(holder);
    return { holder, spinner, speed };
  });

  const state = { px: 0, py: 0, sx: 0, sy: 0, running: false, t: 0 };

  function layout() {
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole composition inside narrow canvases
    camera.position.z = camera.aspect < 1 ? 11 / camera.aspect : 11;
    camera.updateProjectionMatrix();
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.t += dt * (reducedMotion ? 0.25 : 1);
    state.sx += (state.px - state.sx) * (1 - Math.exp(-dt * 3));
    state.sy += (state.py - state.sy) * (1 - Math.exp(-dt * 3));

    pivot.rotation.y = Math.sin(state.t * 0.55) * 0.5 + state.sx * 0.55;
    pivot.rotation.x = Math.sin(state.t * 0.4) * 0.08 + state.sy * 0.28;
    pivot.position.y = Math.sin(state.t * 0.9) * 0.08;
    orbits.forEach((o) => {
      o.spinner.rotation.z = state.t * o.speed * 2.2;
      o.holder.rotation.z = state.t * o.speed * 0.25;
    });
    renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (on === state.running) return;
    state.running = on;
    last = performance.now();
    renderer.setAnimationLoop(on ? tick : null);
  }

  const onPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    state.px = clampUnit(((e.clientX - rect.left) / rect.width) * 2 - 1);
    state.py = clampUnit(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting && !document.hidden), {
    rootMargin: '120px',
  }).observe(canvas);

  layout();
  tick(performance.now());
}

function clampUnit(v) {
  return Math.max(-1.4, Math.min(1.4, v));
}
