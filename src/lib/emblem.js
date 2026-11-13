import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import markSvg from '../assets/mark.svg?raw';

/**
 * The M mark, extruded into solid gold from the traced logo outline,
 * with thin orbit rings around it. Renders only while it is on screen.
 */
export function createEmblem(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xfff2d9, 2.2);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const cool = new THREE.PointLight(0x5f82ff, 55, 30, 1.6);
  cool.position.set(5, -2, 3);
  scene.add(cool);

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
    bevelSegments: 4,
    curveSegments: 8,
  });
  geo.center();
  geo.rotateX(Math.PI);
  const s = 3.1 / 1629;
  geo.scale(s, s, s);

  const gold = new THREE.MeshStandardMaterial({ color: 0xe3b866, metalness: 1, roughness: 0.2 });
  const pivot = new THREE.Group();
  pivot.add(new THREE.Mesh(geo, gold));
  scene.add(pivot);

  // --- orbits -------------------------------------------------------------
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xdcb267, metalness: 1, roughness: 0.3 });
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xffe2a6,
    emissive: 0xf0c069,
    emissiveIntensity: 1.4,
    metalness: 0.6,
    roughness: 0.3,
  });
  const orbits = [
    { r: 2.35, tilt: [1.15, 0.2], speed: 0.2 },
    { r: 2.75, tilt: [1.45, -0.55], speed: -0.14 },
    { r: 3.15, tilt: [0.95, 0.75], speed: 0.1 },
  ].map(({ r, tilt, speed }, i) => {
    const holder = new THREE.Group();
    holder.rotation.set(tilt[0], tilt[1], 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 120), ringMat);
    const spinner = new THREE.Group();
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.065 - i * 0.01, 16, 16), nodeMat);
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
    camera.position.z = camera.aspect < 1 ? 11 / camera.aspect : 11;
    camera.updateProjectionMatrix();
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.t += dt * (reducedMotion ? 0.25 : 1);
    state.sx += (state.px - state.sx) * (1 - Math.exp(-dt * 2.5));
    state.sy += (state.py - state.sy) * (1 - Math.exp(-dt * 2.5));

    pivot.rotation.y = Math.sin(state.t * 0.4) * 0.42 + state.sx * 0.4;
    pivot.rotation.x = Math.sin(state.t * 0.3) * 0.06 + state.sy * 0.2;
    pivot.position.y = Math.sin(state.t * 0.7) * 0.06;
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
    state.px = Math.max(-1.4, Math.min(1.4, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    state.py = Math.max(-1.4, Math.min(1.4, ((e.clientY - rect.top) / rect.height) * 2 - 1));
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let visible = false;
  const sync = () => setRunning(visible && !document.hidden);
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
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
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', sync);
      geo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
