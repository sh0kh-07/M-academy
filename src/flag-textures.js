import * as THREE from 'three';

/* ------------------------------------------------------------------
   Flag artwork is painted on <canvas> at runtime and used as textures.
   Both flags are 2 : 1, so they read as equals when shown together.
   ------------------------------------------------------------------ */

const UZ = { blue: '#0099b5', white: '#ffffff', green: '#1eb53a', red: '#ce1126' };

function star(ctx, cx, cy, R) {
  const r = R * 0.381966;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function toTexture(canvas, { srgb = true, anisotropy = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * State flag of Uzbekistan, drawn from the official 250 × 125 construction sheet:
 * blue / white / green bands of 40, red fimbriations of 2.5,
 * crescent Ø30 placed 20 from the hoist, twelve Ø6 stars in rows of 3-4-5.
 */
export function createUzbekistanFlag(anisotropy, size = 2048) {
  const W = size;
  const H = size / 2;
  const s = H / 125;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = UZ.red;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = UZ.blue;
  ctx.fillRect(0, 0, W, 40 * s);
  ctx.fillStyle = UZ.white;
  ctx.fillRect(0, 42.5 * s, W, 40 * s);
  ctx.fillStyle = UZ.green;
  ctx.fillRect(0, 85 * s, W, 40 * s);

  // crescent (horns open towards the fly)
  ctx.fillStyle = UZ.white;
  ctx.beginPath();
  ctx.arc(35 * s, 20 * s, 15 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = UZ.blue;
  ctx.beginPath();
  ctx.arc(40.2 * s, 20 * s, 12.6 * s, 0, Math.PI * 2);
  ctx.fill();

  // 12 stars: 3 / 4 / 5, right-aligned
  ctx.fillStyle = UZ.white;
  const cols = [73, 85, 97, 109, 121];
  const rows = [8, 20, 32];
  rows.forEach((y, r) => {
    const count = 3 + r;
    cols.slice(5 - count).forEach((x) => star(ctx, x * s, y * s, 3 * s));
  });

  return { map: toTexture(canvas, { anisotropy }) };
}

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0.0, '#8f6424');
  g.addColorStop(0.22, '#d9b061');
  g.addColorStop(0.45, '#fbe9b7');
  g.addColorStop(0.62, '#e2bb6c');
  g.addColorStop(0.82, '#b07f33');
  g.addColorStop(1.0, '#e8c57c');
  return g;
}

/** Diagonal corner band (45°): `o` = offset from the corner, `t` = thickness. */
function cornerBand(ctx, corner, W, H, o, t) {
  ctx.beginPath();
  if (corner === 'tl') {
    ctx.moveTo(0, o);
    ctx.lineTo(o, 0);
    ctx.lineTo(o + t, 0);
    ctx.lineTo(0, o + t);
  } else {
    ctx.moveTo(W, H - o);
    ctx.lineTo(W - o, H);
    ctx.lineTo(W - o - t, H);
    ctx.lineTo(W, H - o - t);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * M Academy flag: navy silk, restrained gold corner bands, gold logo in the centre.
 * `mask` is white wherever the artwork is gold — the shader lights those parts as metal thread.
 */
export function createAcademyFlag(logoImage, anisotropy, size = 2048) {
  const W = size;
  const H = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = W / 2;
  maskCanvas.height = H / 2;
  const mctx = maskCanvas.getContext('2d');
  mctx.scale(0.5, 0.5);
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, W, H);

  const navy = ctx.createRadialGradient(W * 0.5, H * 0.5, 60, W * 0.5, H * 0.5, W * 0.62);
  navy.addColorStop(0, '#17244f');
  navy.addColorStop(0.55, '#0d1633');
  navy.addColorStop(1, '#080d21');
  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, W, H);

  // gold corner bands
  const bands = [
    ['tl', H * 0.34, H * 0.085],
    ['tl', H * 0.455, H * 0.018],
    ['br', H * 0.34, H * 0.085],
    ['br', H * 0.455, H * 0.018],
  ];
  bands.forEach(([corner, o, t]) => {
    const span = (o + t) * 0.72;
    ctx.fillStyle =
      corner === 'tl' ? goldGradient(ctx, 0, 0, span, span) : goldGradient(ctx, W - span, H - span, W, H);
    cornerBand(ctx, corner, W, H, o, t);
    mctx.fillStyle = '#fff';
    cornerBand(mctx, corner, W, H, o, t);
  });

  // thin gold hem
  const hem = Math.round(H * 0.008);
  [ctx, mctx].forEach((c) => {
    c.fillStyle = c === ctx ? '#d8b062' : '#fff';
    c.fillRect(0, 0, W, hem);
    c.fillRect(0, H - hem, W, hem);
    c.fillRect(W - hem, 0, hem, H);
  });

  // logo
  if (logoImage) {
    const lh = H * 0.5;
    const lw = lh * (logoImage.width / logoImage.height);
    const lx = (W - lw) / 2;
    const ly = (H - lh) / 2;
    ctx.drawImage(logoImage, lx, ly, lw, lh);

    const stencil = document.createElement('canvas');
    stencil.width = Math.ceil(lw);
    stencil.height = Math.ceil(lh);
    const sctx = stencil.getContext('2d');
    sctx.drawImage(logoImage, 0, 0, stencil.width, stencil.height);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#fff';
    sctx.fillRect(0, 0, stencil.width, stencil.height);
    mctx.drawImage(stencil, lx, ly);
  }

  return {
    map: toTexture(canvas, { anisotropy }),
    mask: toTexture(maskCanvas, { srgb: false, anisotropy: 4 }),
  };
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
