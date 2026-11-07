// Captions in the closed-caption ASMR style + black end card with the red disc.
import * as THREE from 'three';
import { drawLogo } from './textures.js';
import { ease, clamp01, lerp } from './timeline.js';

const SANS = '"Inter Tight"';

export class AsmrOverlay {
  constructor(W, H, logo) {
    this.W = W; this.H = H; this.logo = logo;
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H;
    this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.NoColorSpace;
    this.tex.premultiplyAlpha = true;
  }

  caption(cp) {
    const { g, W, H } = this;
    const t = cp.t;
    if (t < cp.a || t > cp.b) return;
    const a = clamp01((t - cp.a) / 0.14) * (1 - clamp01((t - (cp.b - 0.14)) / 0.14));
    const px = Math.round(H * 0.0135);
    g.save();
    g.globalAlpha = a;
    g.font = `700 ${px}px ${SANS}`;
    const sp = px * 0.08;
    const chars = [...cp.text]; const ws = chars.map((ch) => g.measureText(ch).width);
    const tw = ws.reduce((x, y) => x + y, 0) + sp * (chars.length - 1);
    const padX = px * 0.55, padY = px * 0.42;
    const cx = W / 2, cy = H * 0.715;
    g.fillStyle = 'rgba(0,0,0,0.92)';
    g.fillRect(cx - tw / 2 - padX, cy - px / 2 - padY, tw + padX * 2, px + padY * 2);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    let x = cx - tw / 2;
    chars.forEach((ch, i) => { g.fillText(ch, x, cy + px * 0.04); x += ws[i] + sp; });
    g.restore();
  }

  draw(ti) {
    const { g, W, H } = this;
    const active = ti.captions.map((c) => (ti.t >= c.a && ti.t <= c.b ? (ti.t - c.a).toFixed(2) + (c.b - ti.t < 0.15 ? ti.t.toFixed(3) : '') : 'x'));
    const key = JSON.stringify([active, ti.line.toFixed(3), ti.disc.toFixed(3)]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    g.clearRect(0, 0, W, H);
    for (const cp of ti.captions) this.caption(cp);

    // end line: "NOTHING SOUNDS LIKE / an Ice-Cold Coke."
    if (ti.line > 0) {
      const a = ease.out(ti.line);
      g.save();
      g.globalAlpha = Math.min(1, ti.line * 1.6);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const p1 = Math.round(H * 0.03), p2 = Math.round(H * 0.037);
      g.fillStyle = '#ffffff';
      g.font = `800 ${p1}px ${SANS}`;
      const y0 = H * 0.475 + (1 - a) * H * 0.008;
      this.tracked('NOTHING SOUNDS LIKE', W / 2, y0, p1 * 0.03);
      g.font = `800 ${p2}px ${SANS}`;
      const parts = [['an Ice-Cold ', '#ffffff'], ['Coke', '#f40009'], ['.', '#ffffff']];
      const widths = parts.map(([s]) => g.measureText(s).width);
      let x = W / 2 - widths.reduce((p, q) => p + q, 0) / 2;
      g.textAlign = 'left';
      parts.forEach(([s, col], i) => { g.fillStyle = col; g.fillText(s, x, y0 + p2 * 1.25); x += widths[i]; });
      g.restore();
    }

    // red disc with the wordmark: pops in with a soft overshoot
    if (ti.disc > 0) {
      const k = ease.back(clamp01(ti.disc));
      const r = W * 0.215 * lerp(0.7, 1, k);
      g.save();
      g.globalAlpha = Math.min(1, ti.disc * 3);
      g.translate(W / 2, H * 0.5);
      g.fillStyle = '#f40009';
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
      drawLogo(g, this.logo, 0, -r * 0.02, r * 1.55, '#ffffff');
      g.restore();
    }
    this.tex.needsUpdate = true;
  }

  tracked(text, cx, cy, sp) {
    const { g } = this;
    const chars = [...text]; const ws = chars.map((ch) => g.measureText(ch).width);
    const tw = ws.reduce((x, y) => x + y, 0) + sp * (chars.length - 1);
    let x = cx - tw / 2; const al = g.textAlign; g.textAlign = 'left';
    chars.forEach((ch, i) => { g.fillText(ch, x, cy); x += ws[i] + sp; });
    g.textAlign = al;
  }
}
