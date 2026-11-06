// End-card typography drawn on a 2D canvas and composited in the grade pass (premultiplied).
import * as THREE from 'three';
import { drawLogo } from './textures.js';
import { ease, clamp01, lerp } from './timeline.js';

export class Overlay {
  constructor(W, H, logo) {
    this.W = W; this.H = H; this.logo = logo;
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H;
    this.g = this.c.getContext('2d');
    this.tmp = document.createElement('canvas'); this.tmp.width = W; this.tmp.height = H;
    this.tg = this.tmp.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.NoColorSpace; // composited in display space
    this.tex.premultiplyAlpha = true;
  }

  draw(title) {
    const { g, tg, W, H } = this;
    const key = `${title.logo.toFixed(4)}|${title.tagline.toFixed(4)}|${title.shine.toFixed(4)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    g.clearRect(0, 0, W, H);
    if (title.logo <= 0 && title.tagline <= 0) { this.tex.needsUpdate = true; return; }
    const cx = W * 0.305, cy = H * 0.455, lw = W * 0.335;

    // --- wordmark: soft-edged wipe left->right + rise + de-blur, then a light shine
    const lp = ease.out(clamp01(title.logo));
    if (lp > 0) {
      tg.clearRect(0, 0, W, H);
      tg.save();
      tg.filter = `blur(${(1 - lp) * 10}px)`;
      drawLogo(tg, this.logo, cx, cy + (1 - lp) * 18, lw, '#ffffff');
      tg.restore();
      // wipe mask
      tg.globalCompositeOperation = 'destination-in';
      const x0 = cx - lw / 2 - 80, x1 = cx + lw / 2 + 80;
      const edge = lerp(x0, x1 + 200, ease.hero(clamp01(title.logo * 1.15)));
      const gr = tg.createLinearGradient(edge - 200, 0, edge, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
      // shine sweep (diagonal band) on the letters only
      tg.globalCompositeOperation = 'source-atop';
      if (title.shine >= 0 && title.shine <= 1) {
        const sx = lerp(x0 - 200, x1 + 200, ease.soft(title.shine));
        const sg = tg.createLinearGradient(sx - 120, cy - 120, sx + 120, cy + 120);
        sg.addColorStop(0, 'rgba(255,214,200,0)'); sg.addColorStop(0.5, 'rgba(255,236,226,1)'); sg.addColorStop(1, 'rgba(255,214,200,0)');
        tg.fillStyle = sg; tg.fillRect(0, 0, W, H);
      }
      tg.globalCompositeOperation = 'source-over';
      // glow underlay
      g.save(); g.globalAlpha = 0.35 * lp; g.filter = 'blur(18px)'; g.drawImage(this.tmp, 0, 0); g.restore();
      g.drawImage(this.tmp, 0, 0);
    }

    // --- tagline: tracking tightens while it fades up
    const tp = ease.out(clamp01(title.tagline));
    if (tp > 0) {
      g.save();
      g.globalAlpha = tp;
      g.fillStyle = '#f3ece8';
      const px = Math.round(H * 0.0215);
      g.font = `500 ${px}px "Inter Tight"`;
      g.textBaseline = 'middle';
      const txt = 'ORIGINAL TASTE   ·   ICE COLD';
      const spacing = lerp(px * 0.85, px * 0.42, tp);
      const chars = [...txt];
      const widths = chars.map((ch) => g.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      let x = cx - total / 2;
      const y = cy + H * 0.125 + (1 - tp) * 10;
      chars.forEach((ch, i) => { g.fillText(ch, x, y); x += widths[i] + spacing; });
      // hairline rule
      g.globalAlpha = tp * 0.55;
      const rw = lerp(0, W * 0.07, tp);
      g.fillRect(cx - rw / 2, cy + H * 0.088, rw, 1.5);
      g.restore();
    }
    this.tex.needsUpdate = true;
  }
}
