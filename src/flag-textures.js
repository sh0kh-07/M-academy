import * as THREE from 'three';

/* ------------------------------------------------------------------
   Flag artwork is painted on <canvas> at runtime and used as textures.
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
export function createUzbekistanFlag(anisotropy) {
  const W = 2048;
  const H = 1024;
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

  return { map: toTexture(canvas, { anisotropy }), aspect: W / H };
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

/** Diagonal corner band (45°) expressed as a polygon; `o` = offset, `t` = thickness. */
function cornerBand(ctx, corner, rect, o, t) {
  const { x, y, w, h } = rect;
  ctx.beginPath();
  if (corner === 'tl') {
    ctx.moveTo(x, y + o);
    ctx.lineTo(x + o, y);
    ctx.lineTo(x + o + t, y);
    ctx.lineTo(x, y + o + t);
  } else {
    ctx.moveTo(x + w, y + h - o);
    ctx.lineTo(x + w - o, y + h);
    ctx.lineTo(x + w - o - t, y + h);
    ctx.lineTo(x + w, y + h - o - t);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * M Academy flag: navy satin, gold corner bands, gold logo, gold fringe on the three free edges.
 * Returns colour map (with alpha for the fringe) and a roughness/metalness map so the
 * gold parts catch the light like metallic thread.
 */
export function createAcademyFlag(logoImage, anisotropy) {
  const W = 2048;
  const H = 1366;
  const F = 44; // fringe length in px
  const cloth = { x: 0, y: F, w: W - F, h: H - F * 2 };

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const pbr = document.createElement('canvas');
  pbr.width = W;
  pbr.height = H;
  const pctx = pbr.getContext('2d');
  const CLOTH_PBR = 'rgb(0,150,0)'; // G = roughness .59, B = metalness 0
  const GOLD_PBR = 'rgb(0,84,225)'; // G = roughness .33, B = metalness .88

  // --- fringe strands -------------------------------------------------
  const strand = (c, color, px, py, w, h) => {
    c.fillStyle = color;
    c.fillRect(px, py, w, h);
  };
  const tones = ['#e7c172', '#c99a48', '#f3d999', '#b88a3c', '#dcb362'];
  let i = 0;
  for (let x = 2; x < cloth.w; x += 11) {
    const tone = tones[i++ % tones.length];
    const len = F - ((i * 7) % 9);
    strand(ctx, tone, x, cloth.y + cloth.h - 2, 7, len);
    strand(ctx, tone, x, cloth.y - len + 2, 7, len);
    strand(pctx, GOLD_PBR, x, cloth.y + cloth.h - 2, 7, len);
    strand(pctx, GOLD_PBR, x, cloth.y - len + 2, 7, len);
  }
  for (let y = cloth.y + 2; y < cloth.y + cloth.h; y += 11) {
    const tone = tones[i++ % tones.length];
    const len = F - ((i * 5) % 9);
    strand(ctx, tone, cloth.x + cloth.w - 2, y, len, 7);
    strand(pctx, GOLD_PBR, cloth.x + cloth.w - 2, y, len, 7);
  }

  // --- cloth ----------------------------------------------------------
  const navy = ctx.createRadialGradient(cloth.w * 0.5, H * 0.5, 80, cloth.w * 0.5, H * 0.5, cloth.w * 0.75);
  navy.addColorStop(0, '#16224d');
  navy.addColorStop(0.55, '#0d1633');
  navy.addColorStop(1, '#080d21');
  ctx.fillStyle = navy;
  ctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h);
  pctx.fillStyle = CLOTH_PBR;
  pctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h);

  // --- gold corner bands ----------------------------------------------
  const bands = [
    ['tl', cloth.h * 0.36, cloth.h * 0.105],
    ['tl', cloth.h * 0.5, cloth.h * 0.022],
    ['br', cloth.h * 0.36, cloth.h * 0.105],
    ['br', cloth.h * 0.5, cloth.h * 0.022],
  ];
  [ctx, pctx].forEach((c) => {
    c.save();
    c.beginPath();
    c.rect(cloth.x, cloth.y, cloth.w, cloth.h);
    c.clip();
    bands.forEach(([corner, o, t]) => {
      if (c === ctx) {
        c.fillStyle =
          corner === 'tl'
            ? goldGradient(c, cloth.x, cloth.y, cloth.x + (o + t) * 0.72, cloth.y + (o + t) * 0.72)
            : goldGradient(
                c,
                cloth.x + cloth.w - (o + t) * 0.72,
                cloth.y + cloth.h - (o + t) * 0.72,
                cloth.x + cloth.w,
                cloth.y + cloth.h,
              );
      } else {
        c.fillStyle = GOLD_PBR;
      }
      cornerBand(c, corner, cloth, o, t);
    });
    c.restore();
  });

  // gold hem along the edges
  ctx.fillStyle = '#d8b062';
  pctx.fillStyle = GOLD_PBR;
  [ctx, pctx].forEach((c) => {
    c.fillRect(cloth.x, cloth.y, cloth.w, 9);
    c.fillRect(cloth.x, cloth.y + cloth.h - 9, cloth.w, 9);
    c.fillRect(cloth.x + cloth.w - 9, cloth.y, 9, cloth.h);
  });

  // --- logo -----------------------------------------------------------
  if (logoImage) {
    const lh = cloth.h * 0.6;
    const lw = lh * (logoImage.width / logoImage.height);
    const lx = cloth.x + (cloth.w - lw) / 2;
    const ly = cloth.y + (cloth.h - lh) / 2;
    ctx.drawImage(logoImage, lx, ly, lw, lh);

    const mask = document.createElement('canvas');
    mask.width = Math.ceil(lw);
    mask.height = Math.ceil(lh);
    const mctx = mask.getContext('2d');
    mctx.drawImage(logoImage, 0, 0, mask.width, mask.height);
    mctx.globalCompositeOperation = 'source-in';
    mctx.fillStyle = GOLD_PBR;
    mctx.fillRect(0, 0, mask.width, mask.height);
    pctx.drawImage(mask, lx, ly);
  }

  return {
    map: toTexture(canvas, { anisotropy }),
    pbr: toTexture(pbr, { srgb: false, anisotropy }),
    aspect: W / H,
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
