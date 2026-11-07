// Typography: kinetic slogans + end card, drawn on a 2D canvas and composited in the grade
// pass (premultiplied, display space).
import * as THREE from 'three';
import { drawLogo } from './textures.js';
import { ease, clamp01, lerp } from './timeline.js';

const SERIF = '"Playfair Display"';
const SANS = '"Inter Tight"';

export class Overlay {
  constructor(W, H, logo) {
    this.W = W; this.H = H; this.logo = logo;
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H;
    this.g = this.c.getContext('2d');
    this.tmp = document.createElement('canvas'); this.tmp.width = W; this.tmp.height = H;
    this.tg = this.tmp.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.NoColorSpace;
    this.tex.premultiplyAlpha = true;
  }

  // per-character rise + fade in (staggered), drift up + blur out
  phrase(ph) {
    const { g, H } = this;
    const t = ph.t;
    if (t < ph.start || t > ph.end) return;
    const size = Math.round(H * 0.072);
    g.save();
    g.font = `italic 500 ${size}px ${SERIF}`;
    g.textBaseline = 'alphabetic';
    const chars = [...ph.text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = ph.align === 'right' ? ph.x * this.W - total : ph.x * this.W;
    const y = ph.y * H;
    const out = ease.soft(clamp01((t - (ph.end - 0.4)) / 0.4));
    if (ph.shadow) { g.shadowColor = 'rgba(60,0,8,0.35)'; g.shadowBlur = size * 0.35; g.shadowOffsetY = size * 0.04; }
    chars.forEach((ch, i) => {
      const cp = ease.out(clamp01((t - ph.start - i * 0.035) / 0.55));
      g.globalAlpha = cp * (1 - out);
      g.fillStyle = ph.color;
      g.fillText(ch, x, y + (1 - cp) * size * 0.55 - out * size * 0.25);
      x += widths[i];
    });
    // hairline that draws on under the phrase
    const lp = ease.hero(clamp01((t - ph.start - 0.25) / 0.7));
    g.shadowColor = 'transparent';
    g.globalAlpha = 0.85 * (1 - out);
    g.fillStyle = ph.color;
    const lw = total * 0.42 * lp;
    const lx = ph.align === 'right' ? ph.x * this.W - lw : ph.x * this.W;
    g.fillRect(lx, y + size * 0.3, lw, Math.max(1.5, H * 0.0018));
    g.restore();
  }

  draw(titles) {
    const { g, tg, W, H } = this;
    const key = JSON.stringify([titles.phrases.map((p) => (p.t >= p.start && p.t <= p.end ? p.t.toFixed(3) : 'x')), titles.logo.toFixed(4), titles.tagline.toFixed(4), titles.shine.toFixed(4)]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    g.clearRect(0, 0, W, H);
    for (const ph of titles.phrases) this.phrase(ph);

    const cx = W * 0.305, cy = H * 0.45, lw = W * 0.335;
    const lp = ease.out(clamp01(titles.logo));
    if (lp > 0) {
      tg.clearRect(0, 0, W, H);
      tg.save();
      tg.filter = `blur(${(1 - lp) * 10}px)`;
      drawLogo(tg, this.logo, cx, cy + (1 - lp) * 18, lw * lerp(0.94, 1, lp), '#ffffff');
      tg.restore();
      tg.globalCompositeOperation = 'destination-in';
      const x0 = cx - lw / 2 - 80, x1 = cx + lw / 2 + 80;
      const edge = lerp(x0, x1 + 200, ease.hero(clamp01(titles.logo * 1.15)));
      const gr = tg.createLinearGradient(edge - 200, 0, edge, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-atop';
      if (titles.shine > 0 && titles.shine < 1) {
        const sx = lerp(x0 - 200, x1 + 200, ease.soft(titles.shine));
        const sg = tg.createLinearGradient(sx - 120, cy - 120, sx + 120, cy + 120);
        sg.addColorStop(0, 'rgba(255,225,215,0)'); sg.addColorStop(0.5, 'rgba(255,244,236,1)'); sg.addColorStop(1, 'rgba(255,225,215,0)');
        tg.fillStyle = sg; tg.fillRect(0, 0, W, H);
      }
      tg.globalCompositeOperation = 'source-over';
      g.save(); g.globalAlpha = 0.3 * lp; g.filter = 'blur(20px)'; g.drawImage(this.tmp, 0, 0); g.restore();
      g.drawImage(this.tmp, 0, 0);
    }

    const tp = ease.out(clamp01(titles.tagline));
    if (tp > 0) {
      g.save();
      const px = Math.round(H * 0.05);
      g.font = `italic 500 ${px}px ${SERIF}`;
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.shadowColor = 'rgba(60,0,8,0.3)'; g.shadowBlur = 14;
      g.fillStyle = '#ffffff';
      g.globalAlpha = tp;
      g.fillText('Taste the Feeling.', cx, cy + H * 0.15 + (1 - tp) * 14);
      g.shadowColor = 'transparent';
      g.globalAlpha = tp * 0.6;
      g.font = `600 ${Math.round(H * 0.016)}px ${SANS}`;
      const small = 'ICE COLD  ·  SINCE 1886';
      const sp = lerp(10, 5, tp);
      const chars = [...small]; const ws = chars.map((ch) => g.measureText(ch).width);
      const tot = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
      let x = cx - tot / 2; g.textAlign = 'left';
      chars.forEach((ch, i) => { g.fillText(ch, x, cy + H * 0.215); x += ws[i] + sp; });
      g.restore();
    }
    this.tex.needsUpdate = true;
  }
}
