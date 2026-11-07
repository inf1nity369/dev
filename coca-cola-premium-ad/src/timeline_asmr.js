// "Nothing sounds like an ice-cold Coke" — vertical 9:16 cinematic ASMR cut. 15 s @ 25 fps.
// Macro, warm amber light, sensory captions, black end card with the red disc.
import * as THREE from 'three';
import { ease, range, lerp, clamp01, sstep, orbit, shake } from './timeline.js';

export const FPS = 25;
export const DURATION = 15.0;
export const ENV = 'warm';
export const GRADE = { vignette: 0.38, grain: 0.02, contrast: 1.16, sat: 1.08, ca: 0.0012 };

export const CUES = { tab: 2.2, pop: 2.5, black: 13.45, line: 13.55, disc: 14.25 };

export const SHOTS = [
  { name: 'drops', start: 0.0, end: 2.0 },
  { name: 'open', start: 2.0, end: 3.6 },
  { name: 'pour', start: 3.6, end: 6.4 },
  { name: 'bubbles', start: 6.4, end: 9.6 },
  { name: 'glass', start: 9.6, end: 12.0 },
  { name: 'hero', start: 12.0, end: 15.0 },
];
// one entry per boundary; d = 0 is a hard cut. type 1 zoom (dive into the drink), 4 dissolve
export const TRANSITIONS = [
  { at: 2.0, d: 0, type: 4 },
  { at: 3.6, d: 0, type: 4 },
  { at: 6.4, d: 0.5, type: 1, center: [0.5, 0.45] },
  { at: 9.6, d: 0.4, type: 4 },
  { at: 12.0, d: 0.32, type: 4 },
];
export function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return i;
  return 0;
}
export function transitionAt(t) {
  for (let i = 0; i < TRANSITIONS.length; i++) {
    const T = TRANSITIONS[i];
    if (T.d > 0 && t >= T.at - T.d / 2 && t < T.at + T.d / 2) return { a: i, b: i + 1, p: (t - (T.at - T.d / 2)) / T.d, T };
  }
  return null;
}
export function shotWindow(i) {
  const pre = i > 0 ? TRANSITIONS[i - 1].d / 2 : 0;
  const post = i < TRANSITIONS.length ? TRANSITIONS[i].d / 2 : 0;
  return [SHOTS[i].start - pre, SHOTS[i].end + post - 1e-4];
}

const DARK = { top: [0.010, 0.0045, 0.0018], bottom: [0.003, 0.0015, 0.0008], glowCol: [0.3, 0.1, 0.022], bokehCol: [1.0, 0.55, 0.22] };
const AMBER = { top: [0.3, 0.075, 0.009], bottom: [0.045, 0.011, 0.0018], glowCol: [0.55, 0.17, 0.025], bokehCol: [1.0, 0.6, 0.25] };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function stateAt(t, si) {
  const S = SHOTS[si];
  const [w0, w1] = shotWindow(si);
  const p = range(t, w0, w1);
  const st = {
    shot: S.name,
    cam: { pos: V(0, 6, 30), target: V(0, 6, 0), focal: 85, fstop: 5.6, focus: null, roll: 0, maxCoc: 26 },
    can: { y: 0, x: 0, rotY: 0, tab: 0, panel: 0, tilt: 0, visible: true },
    env: { rot: 0, intensity: 0.75 },
    sweep: { on: false, az: 0, intensity: 0, height: 6, radius: 16, color: 0xffd2a0 },
    back: { ...DARK, glowPos: [0.5, 0.5], glowRad: 0.7, glow: 1, rays: 0, bokeh: 0, par: [0, 0] },
    floor: false,
    ribbon: { head: 0, tail: 0, t: 0, width: 0 }, drops: { t: 0, amt: 0 },
    bubbles: { amt: 0, spread: 1 }, ice: { p: 0, on: false },
    mist: { age: -1 }, spray: { age: -1 }, crown: { age: -1 },
    glass: { on: false, x: 0, t: 0, drips: null },
    stream: { on: false, t: 0 }, field: { amt: 0, t: 0 },
    post: { exposure: 1.0, flash: 0, bloom: 0.3, fade: 1 },
    shake: [0, 0, 0], skip: false,
  };
  const c = st.cam;

  if (S.name === 'drops') {
    // macro on the frosted label, droplets catching tungsten light; focus breathes in
    const e = ease.glide(p);
    const tgt = V(-0.35, lerp(7.9, 7.2, e), 3.28);
    c.target = tgt;
    c.pos = orbit(V(0, tgt.y, 0), lerp(-18, -9, e), lerp(7, 3, e), lerp(14.6, 13.6, e));
    c.focal = 100; c.fstop = 10; c.maxCoc = 30;
    c.focus = c.pos.distanceTo(tgt) + lerp(1.2, 0, ease.out(range(t, 0.1, 0.9)));
    st.can.rotY = lerp(-0.12, 0.06, e);
    st.env.rot = lerp(-0.4, 0.1, e);
    st.sweep = { on: true, az: lerp(-70, 25, ease.soft(p)), intensity: 12, height: 8, radius: 12, color: 0xffc890 };
    st.env.intensity = 0.3;
    st.back.glowPos = [0.8, 0.7]; st.back.glow = 0.7;
    st.post.fade = sstep(0.0, 0.4, t);
  }

  if (S.name === 'open') {
    const e = ease.glide(p);
    c.target = V(0, 11.85, 0.75);
    c.pos = orbit(c.target, lerp(16, 6, e), lerp(38, 46, e), lerp(15.5, 12.5, e));
    c.focal = 85; c.fstop = 8; c.maxCoc = 26;
    c.focus = c.pos.distanceTo(V(0, 11.9, 0.9));
    const lift = ease.out(range(t, CUES.tab, CUES.tab + 0.25));
    const down = ease.hero(range(t, 2.95, 3.5));
    st.can.tab = lerp(0, 1.15, lift) * (1 - 0.75 * down);
    st.can.panel = ease.out(range(t, CUES.pop - 0.03, CUES.pop + 0.08)) * 1.3;
    st.can.rotY = lerp(0.3, 0.12, e);
    st.env.rot = lerp(0.6, 0.2, e);
    st.mist.age = t - CUES.pop; st.spray.age = t - CUES.pop;
    st.post.flash = 0.18 * Math.exp(-Math.max(0, t - CUES.pop) * 12) * (t >= CUES.pop ? 1 : 0);
    st.shake = shake(t, CUES.pop, 0.02, 9);
    st.back.glowPos = [0.5, 0.86]; st.back.glowRad = 0.55; st.back.glow = lerp(0.5, 0.85, sstep(CUES.pop, CUES.pop + 0.5, t));
    st.mist.amt = 0.55; st.post.bloom = 0.22;
    st.sweep = { on: true, az: lerp(-60, 40, ease.soft(p)), intensity: 6, height: 18, radius: 12, color: 0xffc890 };
  }

  if (S.name === 'pour') {
    // slow-motion jet of cola, backlit gold against the dark
    const e = ease.glide(p);
    const ts = (t - S.start) * 0.42;
    st.stream = { on: true, t: ts };
    st.can.visible = false;
    c.target = V(lerp(-1.3, 0.3, e), lerp(12.2, 8.6, e), 0.3);
    c.pos = V(lerp(1.6, 2.6, e), lerp(12.6, 8.4, e), lerp(14.5, 13.0, e));
    c.focal = 85; c.fstop = 4.5; c.maxCoc = 26;
    c.focus = c.pos.distanceTo(c.target) - 0.4;
    st.back.glowPos = [lerp(0.42, 0.55, e), lerp(0.6, 0.45, e)]; st.back.glowRad = 0.38; st.back.glow = 1.6; st.back.rays = 0.25;
    st.back.bokeh = 0.05; st.back.par = [0, -e * 0.3];
    st.env.rot = lerp(-0.3, 0.3, p);
    st.post.bloom = 0.32;
  }

  if (S.name === 'bubbles') {
    // inside the drink: amber light, bubbles rising through a slow rack focus
    const e = ease.glide(p);
    Object.assign(st.back, AMBER, { glowPos: [0.5, 0.95], glowRad: 0.6, glow: 1.0, rays: 0.8, bokeh: 0.1, par: [0, -e * 0.4] });
    st.can.visible = false;
    st.field = { amt: 1, t: (t - S.start) * 0.55 + 3.0 };
    c.target = V(0, lerp(-0.6, 0.8, e), 0);
    c.pos = V(lerp(0.4, -0.3, e), lerp(-1.0, 0.4, e), 12.5);
    c.focal = 100; c.fstop = 2.8; c.maxCoc = 30;
    c.focus = lerp(16.5, 11.5, ease.soft(range(t, 6.6, 9.4)));
    st.post.bloom = 0.35; st.post.exposure = 1.0;
  }

  if (S.name === 'glass') {
    // condensation drips run down over the printed wordmark
    const e = ease.glide(p);
    st.can.visible = false;
    st.glass = { on: true, x: 0, t: t - S.start, drips: dripsAt(t - S.start) };
    c.target = V(0.3, lerp(7.2, 5.9, e), 3.75);
    c.pos = orbit(V(0, c.target.y, 0), lerp(12, 3, e), lerp(5, 1, e), lerp(21, 19.5, e));
    c.focal = 100; c.fstop = 5.6; c.maxCoc = 26;
    c.focus = c.pos.distanceTo(c.target);
    st.back.glowPos = [0.5, 0.6]; st.back.glowRad = 0.7; st.back.glow = 1.2; st.back.rays = 0.2;
    st.env.rot = lerp(0.2, -0.2, p);
    st.sweep = { on: true, az: lerp(-50, 40, ease.soft(p)), intensity: 6, height: 7, radius: 16, color: 0xffd2a0 };
  }

  if (S.name === 'hero') {
    // the pair in warm light, then to black for the end card
    const e = ease.glide(range(t, w0, CUES.black));
    st.can.x = -2.7; st.can.rotY = lerp(0.35, 0.25, e); st.can.tab = 0.2; st.can.panel = 1.3;
    st.glass = { on: true, x: 3.7, t: t - 9.6, drips: null };
    st.floor = true;
    c.target = V(0.4, lerp(6.6, 6.0, e), 0);
    c.pos = orbit(V(0.4, 4.0, 0), lerp(10, 2, e), lerp(5, 3, e), lerp(64, 58, e));
    c.focal = 70; c.fstop = 5.6; c.maxCoc = 18;
    c.focus = c.pos.distanceTo(V(0.4, 6, 0)) - 1;
    st.back.glowPos = [0.52, 0.56]; st.back.glowRad = 0.42; st.back.glow = 1.3; st.back.rays = 0.4; st.back.bokeh = 0.05;
    st.sweep = { on: true, az: lerp(-60, 50, ease.soft(range(t, 12.0, 13.4))), intensity: 10, height: 8, radius: 18, color: 0xffd2a0 };
    st.post.fade = 1 - sstep(13.1, CUES.black, t);
    st.skip = t >= CUES.black;
  }
  return st;
}

// three drips with stick-slip motion: hold, release, slide, catch
function dripsAt(lt) {
  const mk = (ang, y0, y1, start, slide, size) => {
    const k = range(lt, start, start + slide);
    const m = k < 0.35 ? ease.in(k / 0.35) * 0.3 : 0.3 + ease.glide((k - 0.35) / 0.65) * 0.7;
    return { ang, y0, y: lerp(y0, y1, m), size };
  };
  return [
    mk(0.05, 9.4, 4.6, 0.1, 2.1, 0.26),
    mk(0.2, 10.0, 6.0, 0.5, 1.7, 0.2),
    mk(-0.1, 8.8, 5.4, 0.85, 1.4, 0.17),
  ];
}

export function titlesAt(t) {
  const cap = (text, a, b) => ({ text, a, b, t });
  return {
    captions: [
      cap('[ ICE-COLD CONDENSATION ]', 0.45, 1.92),
      cap('[ THAT ICONIC PSST ]', 2.45, 3.55),
      cap('[ MOUTHWATERING POUR ]', 3.75, 6.25),
      cap('[ A SYMPHONY OF BUBBLES ]', 6.7, 9.45),
      cap('[ DRIPS OF PURE REFRESHMENT ]', 9.8, 11.92),
    ],
    line: range(t, CUES.line, CUES.line + 0.5) * (1 - range(t, CUES.disc - 0.15, CUES.disc + 0.05)),
    disc: range(t, CUES.disc, CUES.disc + 0.55),
    t,
  };
}
