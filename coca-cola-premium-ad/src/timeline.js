// Edit decision list + choreography. 18.0 s @ 30 fps. Cuts sit on a 150 BPM grid (0.4 s beats,
// 1.6 s bars) so picture and the sound design land together.
import * as THREE from 'three';

export const FPS = 30;
export const DURATION = 18.0;
export const BPM = 150;

export const CUES = {
  s1: 0.0, s2: 2.8, s3: 5.2, tabLift: 6.0, pop: 6.4, s4: 8.0, s5: 11.6, land: 12.0, s6: 14.4,
  logo: 15.2, tagline: 15.8, sweep: 16.2, end: 18.0,
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
  hero: bezier(0.83, 0, 0.17, 1),      // big, confident moves
  glide: bezier(0.45, 0.05, 0.25, 1),  // long drifts
  out: bezier(0.16, 1, 0.3, 1),        // snappy settle
  in: bezier(0.7, 0, 0.84, 0),         // gravity / acceleration
  soft: bezier(0.37, 0, 0.63, 1),
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (t, a, b) => clamp01((t - a) / (b - a));
export const sstep = (a, b, x) => { const t = range(x, a, b); return t * t * (3 - 2 * t); };

// deterministic camera shake (decaying), sum of incommensurate sines
export function shake(t, t0, amp, decay = 5) {
  if (t < t0) return [0, 0, 0];
  const a = t - t0, k = amp * Math.exp(-a * decay) * Math.min(1, a * 60);
  return [
    k * (Math.sin(a * 71.0) * 0.6 + Math.sin(a * 113.0 + 1.3) * 0.4),
    k * (Math.sin(a * 83.0 + 0.7) * 0.6 + Math.sin(a * 131.0 + 2.1) * 0.4),
    k * 0.5 * Math.sin(a * 97.0 + 0.3),
  ];
}

// speed ramp: real time -> effect time. 1x, then ramps to `slow` over [r0, r1]
export function ramp(x, r0, r1, slow) {
  if (x <= r0) return x;
  const steps = 64; let acc = r0; const end = Math.min(x, r1); const dt = (end - r0) / steps;
  for (let i = 0; i < steps; i++) { const u = ((i + 0.5) * dt) / (r1 - r0); const s = u * u * (3 - 2 * u); acc += dt * lerp(1, slow, s); }
  if (x > r1) acc += (x - r1) * slow;
  return acc;
}

// orbit camera helper: azimuth/elevation in degrees around target
export function orbit(target, azDeg, elDeg, dist) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(
    target.x + Math.sin(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * Math.cos(el) * dist,
  );
}

export const SHOTS = [
  { name: 'cold-reveal', start: CUES.s1, end: CUES.s2 },
  { name: 'logo-glide', start: CUES.s2, end: CUES.s3 },
  { name: 'phsst', start: CUES.s3, end: CUES.s4 },
  { name: 'swirl', start: CUES.s4, end: CUES.s5 },
  { name: 'hero-landing', start: CUES.s5, end: CUES.s6 },
  { name: 'packshot', start: CUES.s6, end: CUES.end },
];
export function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return i;
  return 0;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Full scene state for time t (shot index fixed by the caller so motion-blur sub-frames
// never straddle a cut).
export function stateAt(t, si) {
  const S = SHOTS[si];
  const p = range(t, S.start, S.end);
  const st = {
    shot: S.name,
    cam: { pos: V(0, 6, 30), target: V(0, 6, 0), focal: 50, fstop: 5.6, focus: null, roll: 0, maxCoc: 22 },
    can: { y: 0, rotY: 0, tab: 0, panel: 0, tilt: 0 },
    env: { rot: 0, intensity: 1 },
    sweep: { on: false, az: 0, intensity: 0, height: 6, radius: 16 },
    back: { glowPos: [0.5, 0.45], glowRad: 0.55, glow: 1, shaft: 0, glowCol: [0.55, 0.02, 0.015] },
    floor: false, frost: 1,
    ribbon: { head: 0, tail: 0, t: 0, width: 0 }, drops: { t: 0, amt: 0 },
    bubbles: { amt: 0, spread: 1 }, ice: { p: 0, on: false, rest: false },
    mist: { age: -1 }, spray: { age: -1 }, crown: { age: -1 },
    post: { exposure: 1, flash: 0, fade: 1, bloom: 0.55, overlay: 0 },
    shake: [0, 0, 0],
    title: { logo: 0, tagline: 0, shine: -1 },
  };
  const c = st.cam;

  if (S.name === 'cold-reveal') {
    // extreme macro on the frosted shoulder; a strip light slides across and the droplets ignite
    const e = ease.glide(p);
    const tgt = V(-1.15, lerp(9.35, 8.85, e), 3.08);
    c.target = tgt;
    c.pos = orbit(V(0, tgt.y, 0), lerp(-31, -20, e), lerp(9, 4, e), lerp(11.6, 10.1, e));
    c.focal = 100; c.fstop = 16; c.maxCoc = 30;
    c.focus = c.pos.distanceTo(tgt) - 0.05;
    st.can.rotY = lerp(-0.05, 0.1, e);
    st.sweep = { on: true, az: lerp(-95, 40, ease.soft(range(t, 0.15, 2.7))), intensity: 26, height: 9, radius: 14 };
    st.env.intensity = lerp(0.25, 0.85, sstep(0.3, 2.4, t));
    st.back.glow = lerp(0.0, 0.45, sstep(0.6, 2.8, t));
    st.back.glowPos = [0.75, 0.6]; st.back.glowRad = 0.7;
    st.post.fade = sstep(0.0, 0.7, t);
    st.post.bloom = 0.7;
    // stick-slip drip: holds, lets go, slides, catches again
    const slide = ease.in(range(t, 0.9, 1.5)) * 0.55 + ease.glide(range(t, 1.5, 2.6)) * 0.45;
    const yb = lerp(10.25, 8.05, slide);
    const v = range(t, 0.9, 1.6) * (1 - range(t, 1.9, 2.6)) * 3;
    st.bead = { ang: -0.36 - 0.08 - st.can.rotY + 0.08, y: yb, v };
  }

  if (S.name === 'logo-glide') {
    // tracking along the wordmark, can turning against the move; whip out at the end
    const e = ease.glide(range(t, S.start, S.end - 0.18));
    const x = lerp(6.5, -4.2, e);
    c.pos = V(x, lerp(7.9, 7.2, e), lerp(14.8, 13.6, e));
    c.target = V(x * 0.3, 7.05, 0);
    const whip = ease.in(range(t, S.end - 0.22, S.end));
    c.target.x -= whip * 14; c.target.z += whip * 2;
    c.focal = 85; c.fstop = 6.3; c.maxCoc = 26;
    c.focus = c.pos.distanceTo(V(c.pos.x * 0.32, 7.05, 0)) - 3.25;
    st.can.rotY = lerp(-0.5, 0.42, ease.soft(p));
    st.env.rot = lerp(-0.25, 0.15, p);
    st.back.glow = 0.75; st.back.glowPos = [0.5, 0.55]; st.back.glowRad = 0.85;
    st.sweep = { on: true, az: lerp(60, -40, ease.soft(range(t, 3.2, 5.0))), intensity: 14, height: 7, radius: 16 };
  }

  if (S.name === 'phsst') {
    // 3/4 top-down on the lid. click -> lift -> PHSST (bar 5 downbeat)
    const whipIn = 1 - ease.out(range(t, S.start, S.start + 0.32));
    const e = ease.glide(p);
    c.target = V(0, 11.45, 0.45);
    c.pos = orbit(c.target, lerp(30, 8, e) + whipIn * 30, lerp(31, 39, e), lerp(27, 21.5, ease.hero(range(t, S.start, 7.7))));
    c.focal = 70; c.fstop = 11; c.maxCoc = 22;
    c.focus = c.pos.distanceTo(V(0, 11.9, 0.7));
    const lift = ease.out(range(t, CUES.tabLift, CUES.tabLift + 0.36));
    const down = ease.hero(range(t, 6.75, 7.35));
    st.can.tab = lerp(0, 1.15, lift) * (1 - 0.8 * down);
    st.can.panel = ease.out(range(t, CUES.pop - 0.04, CUES.pop + 0.1)) * 1.3;
    st.can.rotY = lerp(0.35, 0.1, e);
    st.env.rot = lerp(0.5, 0.1, e);
    st.mist.age = t - CUES.pop;
    st.spray.age = t - CUES.pop;
    st.post.flash = 0.35 * Math.exp(-Math.max(0, t - CUES.pop) * 9) * (t >= CUES.pop ? 1 : 0);
    st.post.bloom = 0.35;
    st.shake = shake(t, CUES.pop, 0.05, 6);
    st.back.glow = 0.55 + 0.45 * sstep(CUES.pop, CUES.pop + 0.6, t); st.back.glowPos = [0.5, 0.78]; st.back.glowRad = 0.7;
    st.bubbles = { amt: 0.6 * sstep(CUES.pop, CUES.pop + 0.8, t), spread: 0.85 };
    st.sweep = { on: true, az: lerp(-70, 50, ease.soft(range(t, 5.3, 7.9))), intensity: 8, height: 18, radius: 12 };
  }

  if (S.name === 'swirl') {
    // the pour-energy beat: cola ribbon spirals up, ice tumbles in slow motion, fizz everywhere
    const x = t - S.start;
    const tau = ramp(x, 0.45, 1.15, 0.2);
    const e = ease.glide(p);
    c.target = V(0, 6.3, 0);
    c.pos = orbit(c.target, lerp(-38, 30, e), lerp(4, 12, e), lerp(47, 41, e));
    c.focal = 50; c.fstop = 4.5; c.maxCoc = 24;
    c.focus = c.pos.distanceTo(c.target) - 3.0;
    const g = ease.out(clamp01(tau / 0.95));
    st.ribbon = { head: lerp(0.0, 1.04, g), tail: Math.max(0, lerp(0, 0.6, ease.soft(clamp01((tau - 0.5) / 0.7)))), t: tau, width: 1.55 };
    st.drops = { t: tau, amt: 1 };
    st.ice = { p: clamp01(tau / 1.05), on: true };
    st.bubbles = { amt: 1, spread: 1 };
    st.can.rotY = lerp(-0.4, 0.5, p);
    st.env.rot = lerp(0.3, -0.2, p);
    st.back.glow = 1.0; st.back.glowPos = [0.5, 0.5]; st.back.glowRad = 0.6; st.back.shaft = 0.6;
    st.sweep = { on: true, az: lerp(-60, 60, ease.soft(p)), intensity: 8, height: 10, radius: 18 };
    st.post.bloom = 0.6;
    st.shake = shake(t, S.start, 0.03, 4);
  }

  if (S.name === 'hero-landing') {
    // the can drops into a low hero frame and lands on wet black lacquer (downbeat), crown splash
    const fall = ease.in(range(t, S.start, CUES.land));
    const bounce = Math.sin(range(t, CUES.land, CUES.land + 0.22) * Math.PI) * 0.22 * (t > CUES.land ? 1 : 0);
    st.can.y = lerp(11, 0, fall) + bounce;
    st.can.tilt = lerp(0.1, 0, fall);
    st.can.rotY = lerp(-1.1, 0.0, ease.out(range(t, S.start, 12.7))) + 0.08 * p;
    const e = ease.glide(range(t, CUES.land, S.end));
    c.target = V(0, lerp(7.2, 6.1, ease.out(range(t, S.start, 12.5))), 0);
    c.pos = orbit(V(0, 4.8, 0), lerp(18, 6, e), lerp(0, 3.5, e), lerp(48, 42, e));
    c.focal = 50; c.fstop = 4.0; c.maxCoc = 20;
    c.focus = c.pos.distanceTo(V(0, 6, 0)) - 3.2;
    st.floor = true;
    st.crown.age = t - CUES.land;
    st.shake = shake(t, CUES.land, 0.16, 7);
    st.post.flash = 0.16 * Math.exp(-Math.max(0, t - CUES.land) * 10) * (t >= CUES.land ? 1 : 0);
    st.bubbles = { amt: 0.35, spread: 1.15 };
    st.back.glow = lerp(0.8, 1.25, sstep(CUES.land, 13.0, t)); st.back.glowPos = [0.5, 0.55]; st.back.glowRad = 0.5; st.back.shaft = 0.9;
    st.sweep = { on: true, az: lerp(-80, 70, ease.soft(range(t, 12.5, 14.3))), intensity: 16, height: 8, radius: 15 };
  }

  if (S.name === 'packshot') {
    // settle into the final frame: can on the right third, wordmark lands on the left
    const e = ease.hero(range(t, S.start, 16.2));
    const drift = range(t, 16.2, S.end);
    c.target = V(lerp(0, -6.6, e) - drift * 0.2, lerp(6.1, 5.6, e), 0);
    c.pos = orbit(V(0, 5.6, 0), lerp(-2, 15, e) + drift * 1.6, lerp(4, 6, e), lerp(43, 50, e) - drift * 0.9);
    c.focal = 50; c.fstop = 5.6; c.maxCoc = 18;
    c.focus = c.pos.distanceTo(V(0, 6, 0)) - 3.2;
    st.floor = true;
    st.can.rotY = lerp(0.08, -0.14, ease.soft(p));
    st.bubbles = { amt: 0.22, spread: 1.15 };
    st.back.glow = 1.2; st.back.glowPos = [lerp(0.5, 0.67, e), 0.52]; st.back.glowRad = 0.42; st.back.shaft = 0.4;
    st.back.shaftX = lerp(0.5, 0.67, e);
    st.sweep = { on: true, az: lerp(-80, 75, ease.soft(range(t, CUES.sweep, CUES.sweep + 1.2))), intensity: 18, height: 8, radius: 15 };
    st.title.logo = range(t, CUES.logo, CUES.logo + 0.9);
    st.title.tagline = range(t, CUES.tagline, CUES.tagline + 1.0);
    st.title.shine = range(t, 16.35, 17.15);
    st.post.overlay = 1;
    st.post.fade = 1 - sstep(17.55, 18.0, t);
  }
  return st;
}
