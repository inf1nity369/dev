// Procedural textures: printed label, condensation (droplets + frost), lid machining.
// Everything is seeded so every render is identical frame-to-frame.
import * as THREE from 'three';
import { CAN } from './can.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- logo
export async function loadLogo() {
  const svg = await (await fetch('/node_modules/simple-icons/icons/cocacola.svg')).text();
  const d = svg.match(/ d="([^"]+)"/)[1];
  const path = new Path2D(d);
  // measure the real ink bbox of the wordmark (viewBox is 24x24)
  const S = 100, c = new OffscreenCanvas(24 * S, 24 * S), g = c.getContext('2d');
  g.scale(S, S); g.fill(path);
  const px = g.getImageData(0, 0, 24 * S, 24 * S).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 24 * S; y++) for (let x = 0; x < 24 * S; x++) {
    if (px[(y * 24 * S + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { path, x0: x0 / S, y0: y0 / S, w: (x1 - x0 + 1) / S, h: (y1 - y0 + 1) / S };
}

export function drawLogo(g, logo, cx, cy, width, fill) {
  const s = width / logo.w;
  g.save();
  g.translate(cx - (logo.w * s) / 2, cy - (logo.h * s) / 2);
  g.scale(s, s);
  g.translate(-logo.x0, -logo.y0);
  g.fillStyle = fill;
  g.fill(logo.path);
  g.restore();
}

// ---------------------------------------------------------------- label
// The label texture covers the whole can height (v = y / CAN.H) and the full
// circumference (u). Front of the can (facing the camera at rotation 0) is u = 0.5.
const RED = '#e8061c';

// periodic wave for the white "dynamic ribbon"
function ribbonY(u) {
  return 3.55 + 0.95 * Math.sin(2 * Math.PI * (u - 0.12)) + 0.32 * Math.sin(4 * Math.PI * u + 1.1);
}
function ribbonT(u) {
  return 0.62 + 0.42 * Math.sin(2 * Math.PI * (u + 0.22)) + 0.12 * Math.sin(6 * Math.PI * u);
}

// palette: { red, white, silver, ink } -> lets us paint either colour or material ids
function paintLabel(g, W, H, logo, pal, detail) {
  const cmX = W / CAN.CIRC, cmY = H / CAN.H; // px per cm
  const Y = (ycm) => (1 - ycm / CAN.H) * H;  // can height (cm) -> canvas y
  g.fillStyle = pal.silver; g.fillRect(0, 0, W, H);
  // printed body
  g.fillStyle = pal.red;
  g.fillRect(0, Y(CAN.PRINT_TOP), W, Y(CAN.PRINT_BOT) - Y(CAN.PRINT_TOP));

  // dynamic ribbon: main swoosh + thin companion line, drawn seamlessly around u
  const N = 720;
  const band = (offset, thickFn) => {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; g.lineTo(u * W, Y(ribbonY(u) + offset + thickFn(u) / 2)); }
    for (let i = N; i >= 0; i--) { const u = i / N; g.lineTo(u * W, Y(ribbonY(u) + offset - thickFn(u) / 2)); }
    g.closePath(); g.fill();
  };
  g.fillStyle = pal.white;
  band(0, ribbonT);
  band(-ribbonT(0) * 0 - 0.62, (u) => 0.07 + 0.05 * Math.sin(2 * Math.PI * (u + 0.4)));
  band(+0.66, (u) => 0.035 + 0.02 * Math.sin(2 * Math.PI * (u + 0.1)));

  // wordmark — big, front and centre
  drawLogo(g, logo, 0.5 * W, Y(7.15), 8.3 * cmX, pal.white);
  // smaller second wordmark on the back so a rotating can always reads
  drawLogo(g, logo, 0.0 * W, Y(7.4), 6.4 * cmX, pal.white);
  drawLogo(g, logo, 1.0 * W, Y(7.4), 6.4 * cmX, pal.white);

  // typography
  g.fillStyle = pal.white;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = (px, w = 600) => `${w} ${px}px "Inter Tight"`;
  const track = (txt, x, y, px, spacing, w) => {
    g.font = font(px, w);
    const chars = [...txt]; let total = 0;
    const widths = chars.map((c) => g.measureText(c).width);
    total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i] + spacing; });
    g.textAlign = 'center';
  };
  track('ORIGINAL TASTE', 0.5 * W, Y(5.05), 0.34 * cmY, 0.11 * cmX, 700);
  track('330 ml', 0.5 * W, Y(1.72), 0.28 * cmY, 0.03 * cmX, 600);
  track('ICE COLD', 0.22 * W, Y(1.72), 0.22 * cmY, 0.08 * cmX, 600);
  track('SINCE 1886', 0.78 * W, Y(1.72), 0.22 * cmY, 0.08 * cmX, 600);

  if (detail) {
    // back-panel micro print (reads as real packaging detail in close-ups)
    const r = rng(7);
    g.globalAlpha = 0.85;
    const bx = 0.07 * W, by = Y(10.0);
    for (let i = 0; i < 9; i++) {
      const lw = (0.6 + r() * 0.4) * 2.6 * cmX;
      g.fillRect(bx, by + i * 0.24 * cmY, lw, 0.06 * cmY);
    }
    // nutrition box
    g.lineWidth = 0.02 * cmX; g.strokeStyle = pal.white;
    const nx = 0.83 * W, ny = Y(10.2);
    g.strokeRect(nx, ny, 2.4 * cmX, 2.1 * cmY);
    for (let i = 1; i < 7; i++) g.fillRect(nx, ny + i * 0.3 * cmY, 2.4 * cmX, 0.012 * cmY);
    // barcode
    g.fillStyle = pal.white;
    g.fillRect(0.9 * W - 0.15 * cmX, Y(3.05), 1.9 * cmX, 1.25 * cmY);
    g.fillStyle = pal.ink;
    let x = 0.9 * W;
    while (x < 0.9 * W + 1.6 * cmX) { const w = (0.012 + r() * 0.03) * cmX; g.fillRect(x, Y(2.95), w, 1.0 * cmY); x += w + (0.012 + r() * 0.03) * cmX; }
    g.globalAlpha = 1;
  }
}

export function makeLabelTextures(logo) {
  const W = 8192, H = Math.round((W * CAN.H) / CAN.CIRC);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  paintLabel(g, W, H, logo, { red: RED, white: '#f6f3ef', silver: '#c9ccd1', ink: '#121212' }, true);
  // a whisper of print density variation
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  // material ids at 4096: R unused, G roughness, B metalness
  const W2 = 4096, H2 = Math.round((W2 * CAN.H) / CAN.CIRC);
  const c2 = document.createElement('canvas'); c2.width = W2; c2.height = H2;
  const g2 = c2.getContext('2d');
  // red ink over aluminium: semi-metallic, glossy. white ink: dielectric. bare alu: metal.
  paintLabel(g2, W2, H2, logo, { red: 'rgb(255,62,70)', white: 'rgb(255,95,0)', silver: 'rgb(255,52,255)', ink: 'rgb(255,120,0)' }, true);
  return { map, ormCanvas: c2, W2, H2 };
}

// ---------------------------------------------------------------- condensation
// Builds: normal map (droplets), clearcoat roughness, and modulates the base ORM by frost.
export function makeCondensation(ormCanvas, W, H, seed = 1886) {
  const r = rng(seed);
  const N = W * H;
  const hgt = new Float32Array(N);
  const fog = new Float32Array(N);
  const wet = new Float32Array(N); // 1 where a real droplet sits
  const cmY = H / CAN.H;
  const yPx = (ycm) => (1 - ycm / CAN.H) * H;
  const yTop = yPx(CAN.FROST_TOP), yBot = yPx(CAN.FROST_BOT);

  // low-frequency value noise for frost density
  const G = 48, grid = new Float32Array((G + 1) * (G + 1)).map(() => r());
  const vnoise = (x, y) => {
    const gx = (x / W) * G, gy = (y / H) * G;
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const s = (t) => t * t * (3 - 2 * t);
    const at = (i, j) => grid[((j % (G + 1)) * (G + 1)) + (i % G)];
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
  };
  for (let y = 0; y < H; y++) {
    const edge = Math.min(1, Math.max(0, (y - yTop) / (0.25 * cmY))) * Math.min(1, Math.max(0, (yBot - y) / (0.4 * cmY)));
    for (let x = 0; x < W; x++) {
      const n = 0.55 * vnoise(x, y) + 0.45 * vnoise(x * 3.1 + 17, y * 3.1 + 5);
      fog[y * W + x] = edge * (0.55 + 0.45 * n);
    }
  }

  const occupied = new Uint8Array(N);
  // stamp a droplet: elliptical spherical cap, bottom-heavy (gravity)
  const drop = (cx, cy, rx, ry, k = 0.55, clearFog = 1.35, check = false) => {
    const R = Math.ceil(Math.max(rx, ry) * clearFog) + 1;
    if (check) {
      for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
        const yy = Math.round(cy + dy); if (yy < 0 || yy >= H) continue;
        const xx = ((Math.round(cx + dx) % W) + W) % W;
        if (occupied[yy * W + xx]) return false;
      }
    }
    for (let dy = -R; dy <= R; dy++) {
      const yy = Math.round(cy + dy); if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = ((Math.round(cx + dx) % W) + W) % W;
        const i = yy * W + xx;
        // bottom heavier: squash the upper half
        const sy = dy < 0 ? ry * 0.82 : ry;
        const q = (dx * dx) / (rx * rx) + (dy * dy) / (sy * sy);
        if (q < 1) {
          const h = Math.sqrt(1 - q) * Math.min(rx, ry) * k;
          if (h > hgt[i]) hgt[i] = h;
          wet[i] = 1;
          if (check) occupied[i] = 1;
        }
        const qc = q / (clearFog * clearFog);
        if (qc < 1) fog[i] *= Math.min(1, qc * qc * 0.9);
      }
    }
    return true;
  };
  const inFrost = (y) => y > yTop + 2 && y < yBot - 2;

  // running drips: big bead at the bottom, cleared trail above with tiny beads
  for (let i = 0; i < 18; i++) {
    const x0 = r() * W, yEnd = yTop + (0.3 + r() * 0.65) * (yBot - yTop);
    const rr = 7 + r() * 9;
    const len = (0.12 + r() * 0.45) * (yBot - yTop);
    let x = x0; const yStart = Math.max(yTop, yEnd - len);
    for (let y = yStart; y < yEnd; y += 1) {
      x += (r() - 0.5) * 0.7;
      const w = rr * (0.45 + 0.25 * (y - yStart) / len);
      for (let dx = -Math.ceil(w * 1.4); dx <= Math.ceil(w * 1.4); dx++) {
        const xx = ((Math.round(x + dx) % W) + W) % W, idx = Math.round(y) * W + xx;
        const q = Math.abs(dx) / (w * 1.4);
        fog[idx] *= q * q;
        if (q < 0.6) { const h = 0.9 * Math.sqrt(1 - (q / 0.6) ** 2); if (h > hgt[idx]) hgt[idx] = h; wet[idx] = 1; occupied[idx] = 1; }
      }
      if (r() < 0.035) drop(x + (r() - 0.5) * w, y, 1.5 + r() * 2.5, 1.5 + r() * 3, 0.55, 1.1);
    }
    drop(x, yEnd, rr, rr * 1.35, 0.6, 1.5);
  }
  // large beads
  for (let i = 0, made = 0; i < 9000 && made < 240; i++) {
    const x = r() * W, y = yTop + r() * (yBot - yTop); if (!inFrost(y)) continue;
    const rr = 10 + Math.pow(r(), 1.6) * 20;
    if (drop(x, y, rr * (0.9 + r() * 0.15), rr * (1.0 + r() * 0.3), 0.6, 1.45, true)) made++;
  }
  // medium
  for (let i = 0, made = 0; i < 60000 && made < 3600; i++) {
    const x = r() * W, y = yTop + r() * (yBot - yTop); if (!inFrost(y)) continue;
    const rr = 4 + Math.pow(r(), 1.6) * 7;
    if (drop(x, y, rr, rr * (1 + r() * 0.2), 0.58, 1.35, true)) made++;
  }
  // small
  for (let i = 0, made = 0; i < 160000 && made < 30000; i++) {
    const x = r() * W, y = yTop + r() * (yBot - yTop); if (!inFrost(y)) continue;
    const rr = 1.6 + r() * 2.4;
    if (drop(x, y, rr, rr, 0.55, 1.2, true)) made++;
  }
  // micro frost beads (part of the frost, give it sparkle)
  const micro = Math.floor(N / 26);
  for (let i = 0; i < micro; i++) {
    const x = Math.floor(r() * W), y = Math.floor(yTop + r() * (yBot - yTop));
    const i0 = y * W + x; if (occupied[i0]) continue;
    const f = fog[i0]; if (f < 0.15) continue;
    const rr = 0.7 + r() * 0.9;
    const R = 2;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      const xx = (x + dx + W) % W, j = yy * W + xx;
      const q = (dx * dx + dy * dy) / (rr * rr);
      if (q < 1) { const h = Math.sqrt(1 - q) * rr * 0.5 * f; if (h > hgt[j]) hgt[j] = h; }
    }
  }

  // ---- normal map
  const nCanvas = document.createElement('canvas'); nCanvas.width = W; nCanvas.height = H;
  const ng = nCanvas.getContext('2d'); const nImg = ng.createImageData(W, H); const nd = nImg.data;
  const S = 1.0;
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - 1), y1 = Math.min(H - 1, y + 1);
    for (let x = 0; x < W; x++) {
      const xl = (x - 1 + W) % W, xr = (x + 1) % W;
      const dx = (hgt[y * W + xr] - hgt[y * W + xl]) * 0.5 * S;
      const dy = (hgt[y1 * W + x] - hgt[y0 * W + x]) * 0.5 * S;
      // tangent space: +x = +u, +y = +v (up). canvas y grows downward.
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = (y * W + x) * 4;
      nd[o] = (nx * 0.5 + 0.5) * 255; nd[o + 1] = (ny * 0.5 + 0.5) * 255; nd[o + 2] = (nz * 0.5 + 0.5) * 255; nd[o + 3] = 255;
    }
  }
  ng.putImageData(nImg, 0, 0);

  // ---- clearcoat roughness (water layer) + frost veil in R for the shader tint
  const ccCanvas = document.createElement('canvas'); ccCanvas.width = W; ccCanvas.height = H;
  const cg = ccCanvas.getContext('2d'); const cImg = cg.createImageData(W, H); const cd = cImg.data;
  // ---- base ORM modulated by frost (frost scatters light => rougher base)
  const og = ormCanvas.getContext('2d'); const oImg = og.getImageData(0, 0, W, H); const od = oImg.data;
  for (let i = 0; i < N; i++) {
    const f = fog[i], w = wet[i];
    const ccr = w > 0 ? 0.03 : 0.07 + 0.2 * f;
    const o = i * 4;
    cd[o] = f * 255; cd[o + 1] = ccr * 255; cd[o + 2] = w * 255; cd[o + 3] = 255;
    const baseR = od[o + 1] / 255;
    od[o + 1] = Math.min(1, baseR + f * 0.12 * (1 - w)) * 255;
  }
  cg.putImageData(cImg, 0, 0);
  og.putImageData(oImg, 0, 0);

  const tex = (c, srgb = false) => {
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    t.wrapS = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
  };
  return { normal: tex(nCanvas), cc: tex(ccCanvas), orm: tex(ormCanvas) };
}

// ---------------------------------------------------------------- lid machining
// Lid UVs: v = radius / R. Concentric spun-aluminium rings live along v.
export function makeLidNormal() {
  const W = 64, H = 2048, r = rng(42);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data;
  const h = new Float32Array(H);
  for (let y = 0; y < H; y++) h[y] = Math.sin(y * 0.9) * 0.25 + (r() - 0.5) * 0.35 + Math.sin(y * 0.07) * 0.6;
  for (let y = 0; y < H; y++) {
    const dy = (h[Math.min(H - 1, y + 1)] - h[Math.max(0, y - 1)]) * 0.5;
    const ny = dy * 0.6, l = Math.hypot(ny, 1);
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; d[o] = 128; d[o + 1] = (ny / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

export function softDot(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
