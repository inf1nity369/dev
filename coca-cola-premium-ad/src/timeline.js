// Edit + choreography. 18.0 s @ 30 fps, 120 BPM (0.5 s beats, 2 s bars).
// Every cut is a designed transition centred on a beat; shots keep moving through them.
import * as THREE from 'three';

export const FPS = 30;
export const DURATION = 18.0;
export const BPM = 120;

export const CUES = {
  tab: 5.5, pop: 6.0, land: 12.5, logo: 15.0, tagline: 16.0, shine: 16.5, end: 18.0,
};

// --- easing ----------------------------------------------------------------
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; const d = dsx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 20 && Math.abs(sx(t) - x) > 1e-6; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
export const ease = {
  hero: bezier(0.83, 0, 0.17, 1),
  glide: bezier(0.42, 0.0, 0.3, 1),
  out: bezier(0.16, 1, 0.3, 1),
  in: bezier(0.55, 0, 0.9, 0.4),
  soft: bezier(0.37, 0, 0.63, 1),
  back: bezier(0.34, 1.45, 0.64, 1),
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (t, a, b) => clamp01((t - a) / (b - a));
export const sstep = (a, b, x) => { const t = range(x, a, b); return t * t * (3 - 2 * t); };

export function shake(t, t0, amp, decay = 5) {
  if (t < t0) return [0, 0, 0];
  const a = t - t0, k = amp * Math.exp(-a * decay) * Math.min(1, a * 60);
  return [k * Math.sin(a * 71.0), k * Math.sin(a * 83.0 + 0.7), 0];
}

export function ramp(x, r0, r1, slow) {
  if (x <= r0) return x;
  const steps = 64; let acc = r0; const end = Math.min(x, r1); const dt = (end - r0) / steps;
  for (let i = 0; i < steps; i++) { const u = ((i + 0.5) * dt) / (r1 - r0); const s = u * u * (3 - 2 * u); acc += dt * lerp(1, slow, s); }
  if (x > r1) acc += (x - r1) * slow;
  return acc;
}

export function orbit(target, azDeg, elDeg, dist) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(
    target.x + Math.sin(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * Math.cos(el) * dist,
  );
}

// --- edit --------------------------------------------------------------------
export const SHOTS = [
  { name: 'intro', start: 0.0, end: 1.0 },
  { name: 'macro', start: 1.0, end: 3.0 },
  { name: 'logo', start: 3.0, end: 5.0 },
  { name: 'open', start: 5.0, end: 8.0 },
  { name: 'swirl', start: 8.0, end: 12.0 },
  { name: 'hero', start: 12.0, end: 18.0 },
];
// type: 0 ribbon wipe, 1 zoom push, 2 bubble iris, 3 light burst
export const TRANSITIONS = [
  { at: 1.0, d: 0.5, type: 0, dir: [0.93, 0.36] },
  { at: 3.0, d: 0.46, type: 1, center: [0.5, 0.52] },
  { at: 5.0, d: 0.6, type: 2, center: [0.5, 0.45] },
  { at: 8.0, d: 0.5, type: 3, center: [0.5, 0.5] },
  { at: 12.0, d: 0.56, type: 0, dir: [-0.93, 0.36] },
];
export function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return i;
  return 0;
}
// returns { a, b, p, T } while a transition is on screen, else null
export function transitionAt(t) {
  for (let i = 0; i < TRANSITIONS.length; i++) {
    const T = TRANSITIONS[i];
    if (t >= T.at - T.d / 2 && t < T.at + T.d / 2) return { a: i, b: i + 1, p: (t - (T.at - T.d / 2)) / T.d, T };
  }
  return null;
}
// time window a shot may be sampled in (its own span plus the transitions around it)
export function shotWindow(i) {
  const pre = i > 0 ? TRANSITIONS[i - 1].d / 2 : 0;
  const post = i < TRANSITIONS.length ? TRANSITIONS[i].d / 2 : 0;
  return [SHOTS[i].start - pre, SHOTS[i].end + post - 1e-4];
}

// --- palettes (linear HDR, before the neutral tonemap) ---------------------------
const RED = { top: [0.32, 0.0, 0.014], bottom: [0.2, 0.0, 0.01], glowCol: [0.8, 0.075, 0.045], bokehCol: [1.0, 0.62, 0.56] };
const CREAM = { top: [0.92, 0.82, 0.75], bottom: [0.86, 0.6, 0.55], glowCol: [0.28, 0.12, 0.08], bokehCol: [0.35, 0.3, 0.28] };

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function stateAt(t, si) {
  const S = SHOTS[si];
  const [w0, w1] = shotWindow(si);
  const p = range(t, w0, w1); // progress through everything we see of this shot
  const st = {
    shot: S.name,
    cam: { pos: V(0, 6, 30), target: V(0, 6, 0), focal: 50, fstop: 5.6, focus: null, roll: 0, maxCoc: 22 },
    can: { y: 0, rotY: 0, tab: 0, panel: 0, tilt: 0 },
    env: { rot: 0, intensity: 1.15 },
    sweep: { on: false, az: 0, intensity: 0, height: 6, radius: 16 },
    back: { ...RED, glowPos: [0.5, 0.48], glowRad: 0.6, glow: 1, rays: 0.6, bokeh: 0.14, par: [0, 0] },
    floor: false,
    ribbon: { head: 0, tail: 0, t: 0, width: 0 }, drops: { t: 0, amt: 0 },
    bubbles: { amt: 0, spread: 1 }, ice: { p: 0, on: false },
    mist: { age: -1 }, spray: { age: -1 }, crown: { age: -1 },
    post: { exposure: 1.0, flash: 0, bloom: 0.5 },
    shake: [0, 0, 0],
  };
  const c = st.cam;

  if (S.name === 'intro') {
    // dreamy open: carbonation rising in focus, the can a soft red shape behind
    const e = ease.glide(p);
    c.target = V(0, 6.6, 0);
    c.pos = orbit(c.target, lerp(-14, -4, e), lerp(3, 5, e), lerp(32, 28, e));
    c.focal = 70; c.fstop = 2.2; c.maxCoc = 26;
    c.focus = lerp(19, 21, e);
    st.bubbles = { amt: 1.3, spread: 1.25 };
    st.back.bokeh = 0.3; st.back.rays = 1.0; st.back.glowPos = [0.5, 0.55]; st.back.glowRad = 0.7;
    st.back.par = [e * 0.15, 0];
    st.post.bloom = 0.7;
  }

  if (S.name === 'macro') {
    // macro on the frosted shoulder; a strip light glides across and the droplets sparkle
    const e = ease.glide(p);
    const tgt = V(-1.15, lerp(9.3, 8.8, e), 3.08);
    c.target = tgt;
    c.pos = orbit(V(0, tgt.y, 0), lerp(-31, -21, e), lerp(8, 4, e), lerp(11.4, 10.2, e));
    c.focal = 100; c.fstop = 16; c.maxCoc = 26;
    c.focus = c.pos.distanceTo(tgt) - 0.05;
    st.can.rotY = lerp(-0.05, 0.1, e);
    st.sweep = { on: true, az: lerp(-95, 40, ease.soft(p)), intensity: 22, height: 9, radius: 14 };
    st.env.intensity = 1.25;
    st.back.glowPos = [0.75, 0.6];
    st.post.bloom = 0.6;
  }

  if (S.name === 'logo') {
    // tracking along the wordmark, can counter-rotating
    const e = ease.glide(p);
    const x = lerp(6.0, -4.0, e);
    c.pos = V(x, lerp(7.9, 7.2, e), lerp(14.8, 13.8, e));
    c.target = V(x * 0.3, 7.05, 0);
    c.focal = 85; c.fstop = 6.3; c.maxCoc = 24;
    c.focus = c.pos.distanceTo(V(c.pos.x * 0.32, 7.05, 0)) - 3.25;
    st.can.rotY = lerp(-0.5, 0.42, ease.soft(p));
    st.env.rot = lerp(-0.25, 0.15, p);
    st.back.glowPos = [0.5, 0.55]; st.back.glowRad = 0.9;
    st.sweep = { on: true, az: lerp(60, -40, ease.soft(p)), intensity: 14, height: 7, radius: 16 };
  }

  if (S.name === 'open') {
    // bright cream studio, 3/4 on the lid: click -> PHSST on the downbeat
    const e = ease.glide(p);
    Object.assign(st.back, CREAM, { glowPos: [0.5, 0.62], glowRad: 0.75, glow: 1, rays: 0.0, bokeh: 0.1 });
    c.target = V(0, 11.45, 0.45);
    c.pos = orbit(c.target, lerp(28, 8, e), lerp(30, 38, e), lerp(27, 21.5, e));
    c.focal = 70; c.fstop = 11; c.maxCoc = 20;
    c.focus = c.pos.distanceTo(V(0, 11.9, 0.7));
    const lift = ease.out(range(t, CUES.tab, CUES.tab + 0.32));
    const down = ease.hero(range(t, 6.4, 7.0));
    st.can.tab = lerp(0, 1.15, lift) * (1 - 0.8 * down);
    st.can.panel = ease.out(range(t, CUES.pop - 0.04, CUES.pop + 0.1)) * 1.3;
    st.can.rotY = lerp(0.35, 0.1, e);
    st.env.rot = lerp(0.5, 0.1, e);
    st.env.intensity = 1.3;
    st.mist.age = t - CUES.pop;
    st.spray.age = t - CUES.pop;
    st.post.flash = 0.25 * Math.exp(-Math.max(0, t - CUES.pop) * 10) * (t >= CUES.pop ? 1 : 0);
    st.post.bloom = 0.35;
    st.bubbles = { amt: 0.5 * sstep(CUES.pop, CUES.pop + 0.8, t), spread: 0.85 };
    st.sweep = { on: true, az: lerp(-70, 50, ease.soft(p)), intensity: 8, height: 18, radius: 12 };
  }

  if (S.name === 'swirl') {
    // showpiece: cola ribbon spirals up (speed ramp), ice tumbles, fizz and bokeh sparkle
    const x = t - S.start;
    const tau = ramp(Math.max(0, x + 0.15), 0.5, 1.2, 0.22);
    const e = ease.glide(p);
    c.target = V(0, 6.3, 0);
    c.pos = orbit(c.target, lerp(-36, 30, e), lerp(4, 11, e), lerp(47, 41, e));
    c.focal = 50; c.fstop = 4.5; c.maxCoc = 24;
    c.focus = c.pos.distanceTo(c.target) - 3.0;
    const g = ease.out(clamp01(tau / 0.95));
    st.ribbon = { head: lerp(0.0, 1.04, g), tail: Math.max(0, lerp(0, 0.6, ease.soft(clamp01((tau - 0.5) / 0.7)))), t: tau, width: 1.55 };
    st.drops = { t: tau, amt: 1 };
    st.ice = { p: clamp01(tau / 1.05), on: true };
    st.bubbles = { amt: 1, spread: 1 };
    st.can.rotY = lerp(-0.4, 0.5, p);
    st.env.rot = lerp(0.3, -0.2, p);
    st.back.glowRad = 0.62; st.back.rays = 1.0; st.back.bokeh = 0.22; st.back.par = [lerp(-0.2, 0.2, e), 0];
    st.sweep = { on: true, az: lerp(-60, 60, ease.soft(p)), intensity: 8, height: 10, radius: 18 };
    st.post.bloom = 0.55;
  }

  if (S.name === 'hero') {
    // can drops onto glossy red lacquer on the beat, then glides into the packshot
    const fall = ease.in(range(t, 11.8, CUES.land));
    const bounce = Math.sin(range(t, CUES.land, CUES.land + 0.24) * Math.PI) * 0.2 * (t > CUES.land ? 1 : 0);
    st.can.y = lerp(12, 0, fall) + bounce;
    st.can.tilt = lerp(0.08, 0, fall);
    st.can.rotY = lerp(-1.0, 0.0, ease.out(range(t, 11.8, 13.0))) + lerp(0, -0.14, ease.soft(range(t, 14, 18)));
    const k = ease.hero(range(t, 13.4, 15.2));       // glide to the final frame
    const drift = range(t, 15.2, 18.0);
    const heroPos = orbit(V(0, 4.8, 0), lerp(14, 4, ease.glide(range(t, 12, 13.6))), lerp(1, 3.5, ease.glide(range(t, 12, 13.6))), 44);
    const packPos = orbit(V(0, 5.6, 0), 15 + drift * 1.6, 6, 50 - drift * 0.9);
    c.pos = heroPos.clone().lerp(packPos, k);
    c.target = V(lerp(0, -6.6, k) - drift * 0.2, lerp(lerp(7.0, 6.1, ease.out(range(t, 11.8, 12.8))), 5.6, k), 0);
    c.focal = 50; c.fstop = lerp(4.0, 5.6, k); c.maxCoc = 20;
    c.focus = c.pos.distanceTo(V(0, 6, 0)) - 3.2;
    st.floor = true;
    st.crown.age = t - CUES.land;
    st.shake = shake(t, CUES.land, 0.035, 8);
    st.post.flash = 0.12 * Math.exp(-Math.max(0, t - CUES.land) * 10) * (t >= CUES.land ? 1 : 0);
    st.bubbles = { amt: 0.4, spread: 1.15 };
    st.back.glow = lerp(1.0, 1.15, sstep(CUES.land, 13.0, t));
    st.back.glowPos = [lerp(0.5, 0.67, k), 0.55]; st.back.glowRad = lerp(0.55, 0.48, k);
    st.back.rays = 0.8; st.back.bokeh = lerp(0.12, 0.18, k); st.back.par = [k * 0.25 + drift * 0.05, 0];
    const sw1 = range(t, 12.9, 14.1), sw2 = range(t, CUES.shine - 0.2, CUES.shine + 1.0);
    st.sweep = { on: true, az: t < 15 ? lerp(-80, 70, ease.soft(sw1)) : lerp(-80, 75, ease.soft(sw2)), intensity: 16, height: 8, radius: 15 };
  }
  return st;
}

// --- typography (global time) ---------------------------------------------------
export function titlesAt(t) {
  return {
    phrases: [
      { text: 'Ice cold.', start: 1.4, end: 2.75, x: 0.075, y: 0.24, align: 'left', color: '#ffffff', shadow: true },
      { text: 'Open happiness.', start: 6.2, end: 7.75, x: 0.06, y: 0.13, align: 'left', color: '#c8001e', shadow: false },
    ].map((ph) => ({ ...ph, t })),
    logo: range(t, CUES.logo, CUES.logo + 0.9),
    tagline: range(t, CUES.tagline, CUES.tagline + 1.0),
    shine: range(t, CUES.shine, CUES.shine + 0.8),
  };
}
