import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CAN, buildCan } from './can.js';
import { loadLogo, makeLabelTextures, makeCondensation, makeLidNormal, softDot } from './textures.js';
import { buildEnvironment, buildBackdrop, buildFloor } from './stage.js';
import { colaMaterial, LiquidRibbon, Droplets, Bubbles, Ice, iceMaterial, Mist, Burst, waterMaterial } from './fx.js';
import { Post } from './post.js';
import { Overlay } from './overlay.js';
import { AsmrOverlay } from './overlay_asmr.js';
import { buildGlass } from './glass.js';
import { LiquidStream, StreamBubbles, StreamSpray, BubbleField } from './fx.js';

const params = new URLSearchParams(location.search);
const EDIT = params.get('edit') || 'bright';
const TL = await import(EDIT === 'asmr' ? './timeline_asmr.js' : './timeline.js');
const { FPS, DURATION, SHOTS, shotAt, stateAt, transitionAt, shotWindow, titlesAt } = TL;
const W = +(params.get('w') || (EDIT === 'asmr' ? 1080 : 1920)), H = +(params.get('h') || (EDIT === 'asmr' ? 1920 : 1080));

async function loadFonts() {
  const base = '/node_modules/@fontsource/inter-tight/files/inter-tight-latin-';
  await Promise.all([500, 600, 700, 800].map(async (w) => {
    const f = new FontFace('Inter Tight', `url(${base}${w}-normal.woff2)`, { weight: String(w) });
    await f.load(); document.fonts.add(f);
  }));
  const pf = '/node_modules/@fontsource/playfair-display/files/playfair-display-latin-';
  await Promise.all([400, 500, 600].map(async (w) => {
    const f = new FontFace('Playfair Display', `url(${pf}${w}-italic.woff2)`, { weight: String(w), style: 'italic' });
    await f.load(); document.fonts.add(f);
  }));
}

export async function init() {
  await loadFonts();
  const logo = await loadLogo();

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.width = '100%'; canvas.style.height = 'auto';
  document.getElementById('stage').appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NoToneMapping;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer, TL.ENV || 'studio');
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.4, 600);
  camera.filmGauge = 36;
  // three only reads camera.viewport to size the transmission buffer -> refraction at half res
  camera.viewport = new THREE.Vector4(0, 0, W / 2, H / 2);

  // --- assets
  const label = makeLabelTextures(logo);
  const cond = makeCondensation(label.ormCanvas, label.W2, label.H2);
  const can = buildCan({ label, cond, lidNormal: makeLidNormal() });
  can.tabPivot.name = 'tabPivot'; can.panelHinge.name = 'panelHinge';

  const backdrop = buildBackdrop(); scene.add(backdrop);
  const floor = buildFloor(); scene.add(floor);

  const canRoot = new THREE.Group(); canRoot.add(can.group); scene.add(canRoot);
  const mirror = new THREE.Group(); mirror.matrixAutoUpdate = false;
  const mirrorCan = can.group.clone(true); mirror.add(mirrorCan); scene.add(mirror);
  const mTab = mirrorCan.getObjectByName('tabPivot'), mPanel = mirrorCan.getObjectByName('panelHinge');

  const sweep = new THREE.RectAreaLight(0xfff6f0, 10, 1.6, 34);
  scene.add(sweep);

  const cola = colaMaterial();
  const ribbon = new LiquidRibbon(cola); scene.add(ribbon.mesh);
  const drops = new Droplets(cola, 150); scene.add(drops.mesh);
  const bubbles = new Bubbles(); scene.add(bubbles.mesh);
  const iceMat = iceMaterial();
  const ice = new Ice(iceMat); scene.add(ice.group);
  const mirrorIce = new THREE.Group(); mirrorIce.matrixAutoUpdate = false; scene.add(mirrorIce);
  const mIceMeshes = ice.cubes.map((c) => { const m = new THREE.Mesh(c.m.geometry, iceMat); m.matrixAutoUpdate = false; mirrorIce.add(m); return m; });
  const mist = new Mist(softDot()); scene.add(mist.group);
  const spray = new Burst(cola, { count: 70, seed: 31, origin: new THREE.Vector3(0, CAN.LID_Y + 0.1, 1.3), dir: new THREE.Vector3(0, 1, 0.25),
    spread: 0.45, speed: [1.5, 6], size: [0.012, 0.06], gravity: -9.8, life: 1.0, stretch: 2.5 });
  scene.add(spray.mesh);
  const water = waterMaterial();
  const crown = new Burst(water, { count: 240, seed: 77, origin: new THREE.Vector3(0, 0.05, 0), ring: 3.4,
    speed: [3, 10], size: [0.04, 0.22], gravity: -16, life: 1.3, stretch: 2.2 });
  scene.add(crown.mesh);

  // cinematic-cut assets
  let glassA = null, mirrorGlass = null, stream = null, streamBub = null, streamSpray = null, field = null;
  if (EDIT === 'asmr') {
    glassA = buildGlass(logo); scene.add(glassA.group);
    mirrorGlass = new THREE.Group(); mirrorGlass.matrixAutoUpdate = false;
    const mg = glassA.group.clone(true); mg.children.forEach((o, i) => { if (i >= 3) o.visible = false; });
    mirrorGlass.add(mg); scene.add(mirrorGlass);
    const streamMat = colaMaterial();
    stream = new LiquidStream(streamMat); scene.add(stream.mesh);
    streamBub = new StreamBubbles(stream); scene.add(streamBub.mesh);
    streamSpray = new StreamSpray(stream, streamMat); scene.add(streamSpray.mesh);
    field = new BubbleField(); scene.add(field.mesh);
  }

  const post = new Post(renderer, W, H);
  if (TL.GRADE) {
    const gu = post.grade.material.uniforms;
    gu.uVignette.value = TL.GRADE.vignette; gu.uGrain.value = TL.GRADE.grain; gu.uContrast.value = TL.GRADE.contrast;
    gu.uSat.value = TL.GRADE.sat; gu.uCA.value = TL.GRADE.ca;
  }
  const overlay = EDIT === 'asmr' ? new AsmrOverlay(W, H, logo) : new Overlay(W, H, logo);
  post.grade.material.uniforms.tOverlay.value = overlay.tex;

  const R = new THREE.Matrix4().makeScale(1, -1, 1);
  const tmpV = new THREE.Vector3();

  function apply(st, t) {
    // camera
    const c = st.cam;
    camera.setFocalLength(c.focal);
    camera.position.copy(c.pos).add(tmpV.set(...st.shake));
    camera.lookAt(c.target);
    if (c.roll) camera.rotateZ(c.roll);
    camera.updateMatrixWorld();

    // can
    canRoot.position.set(st.can.x || 0, st.can.y, 0);
    canRoot.visible = st.can.visible !== false;
    canRoot.rotation.set(0, st.can.rotY, st.can.tilt);
    can.setOpen(st.can.tab, st.can.panel);
    can.setBead(!!st.bead, st.bead?.ang ?? 0, st.bead?.y ?? 0, st.bead?.v ?? 0);
    mTab.rotation.x = st.can.tab; mPanel.rotation.x = st.can.panel;
    canRoot.updateMatrixWorld(true);
    mirror.matrix.multiplyMatrices(R, canRoot.matrixWorld);
    mirror.matrixWorldNeedsUpdate = true;
    mirror.visible = st.floor && canRoot.visible; floor.visible = st.floor;
    if (glassA) {
      const gs = st.glass || { on: false };
      glassA.group.visible = !!gs.on;
      if (gs.on) {
        glassA.group.position.set(gs.x || 0, 0, 0);
        glassA.updateBubbles(gs.t || 0);
        glassA.updateDrips(gs.drips);
        glassA.group.updateMatrixWorld(true);
        mirrorGlass.matrix.multiplyMatrices(R, glassA.group.matrixWorld);
        mirrorGlass.matrixWorldNeedsUpdate = true;
      }
      mirrorGlass.visible = !!gs.on && st.floor;
      const ss = st.stream || { on: false };
      stream.mesh.visible = streamBub.mesh.visible = streamSpray.mesh.visible = !!ss.on;
      if (ss.on) { stream.update(ss.t); streamBub.update(ss.t); streamSpray.update(ss.t); }
      const fs = st.field || { amt: 0 };
      field.update(fs.t || 0, fs.amt || 0);
    }

    // light + environment
    scene.environmentRotation.set(0, st.env.rot, 0);
    scene.environmentIntensity = st.env.intensity;
    sweep.visible = st.sweep.on;
    if (st.sweep.on) {
      const a = THREE.MathUtils.degToRad(st.sweep.az);
      sweep.position.set(Math.sin(a) * st.sweep.radius, st.sweep.height, Math.cos(a) * st.sweep.radius);
      sweep.lookAt(0, st.sweep.height, 0);
      sweep.intensity = st.sweep.intensity;
      sweep.color.set(st.sweep.color ?? 0xfff6f0);
    }

    const bu = backdrop.material.uniforms, b = st.back;
    bu.uTop.value.setRGB(...b.top); bu.uBottom.value.setRGB(...b.bottom);
    bu.uGlowPos.value.set(...b.glowPos); bu.uGlowRad.value = b.glowRad; bu.uGlow.value = b.glow;
    bu.uGlowCol.value.setRGB(...b.glowCol); bu.uRays.value = b.rays; bu.uBokeh.value = b.bokeh;
    bu.uBokehCol.value.setRGB(...b.bokehCol); bu.uPar.value.set(...b.par); bu.uTime.value = t;
    bu.uAspect.value = W / H;

    // fx
    ribbon.update(st.ribbon.t, st.ribbon.head, st.ribbon.tail, st.ribbon.width);
    drops.mesh.visible = st.drops.amt > 0;
    if (st.drops.amt > 0) drops.update(ribbon, st.drops.t, st.drops.amt);
    bubbles.update(t, st.bubbles.amt, st.bubbles.spread);
    ice.update(t, st.ice.p, st.ice.on);
    if (st.ice.rest) {
      const rest = [[-7.2, 0.55, 4.6, 0.4], [6.4, 0.8, 3.2, 1.9], [-5.0, 0.6, -5.5, 2.7], [8.5, 0.5, -3.5, 0.9]];
      ice.cubes.forEach((cb, i) => {
        cb.m.visible = i < rest.length;
        if (i < rest.length) {
          const [x, y, z, ry] = rest[i];
          cb.m.position.set(x, y + 0.2, z); cb.m.rotation.set(0.05 * i, ry, 0.03);
        }
      });
    } else ice.cubes.forEach((cb) => (cb.m.visible = true));
    ice.group.updateMatrixWorld(true);
    mirrorIce.visible = st.floor && st.ice.on;
    ice.cubes.forEach((cb, i) => { mIceMeshes[i].matrix.multiplyMatrices(R, cb.m.matrixWorld); mIceMeshes[i].visible = cb.m.visible; mIceMeshes[i].matrixWorldNeedsUpdate = true; });

    mist.update(st.mist.age, new THREE.Vector3(0, CAN.LID_Y + 0.15, 1.3), st.mist.amt ?? 1);
    spray.update(st.spray.age);
    crown.update(st.crown.age);

    // post
    const g = post.grade.material.uniforms;
    g.uFlash.value = st.post.flash; g.uExposure.value = st.post.exposure;
    post.bloom.strength = st.post.bloom;
  }

  const J = [[0, 0], [0.25, -0.375], [-0.375, 0.125], [0.375, 0.25], [-0.125, -0.25], [0.125, 0.375], [-0.25, -0.125], [0.0625, -0.0625]];

  // render one shot (motion-blur sub-frames, DOF, bloom) into an HDR target
  function renderShot(si, t, sub, shutter, target) {
    const [w0, w1] = shotWindow(si);
    const times = [];
    for (let i = 0; i < sub; i++) {
      const o = sub === 1 ? 0 : ((i + 0.5) / sub - 0.5) * (shutter / FPS);
      times.push(Math.min(w1, Math.max(w0, t + o)));
    }
    const mid = Math.floor(sub / 2); const order = times.filter((_, i) => i !== mid).concat([times[mid]]);
    let stCenter = null;
    post.renderFrame(scene, camera, sub, (i) => {
      const st = stateAt(order[i], si);
      if (api.override) api.override(st, order[i]);
      apply(st, order[i]);
      const j = sub > 1 ? J[(i + 1) % J.length] : J[0];
      camera.setViewOffset(W, H, j[0], j[1], W, H);
      stCenter = st;
    });
    post.setLens(camera, stCenter.cam.focus ?? stCenter.cam.pos.distanceTo(stCenter.cam.target), stCenter.cam.fstop, stCenter.cam.maxCoc);
    post.finishShot(true, target);
    return stCenter;
  }

  function renderAt(t, { sub = 5, shutter = 0.5, toScreen = true, frameIndex = 0 } = {}) {
    const tr = transitionAt(t);
    let src, st;
    const probe = !tr ? stateAt(t, shotAt(t)) : null;
    if (probe && probe.skip) {
      st = probe;
      renderer.setRenderTarget(post.rtA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.setRenderTarget(null);
      src = post.rtA;
    } else if (tr) {
      const stA = renderShot(tr.a, t, sub, shutter, post.rtA);
      const stB = renderShot(tr.b, t, sub, shutter, post.rtB);
      src = post.transition(tr.T.type, tr.p, tr.T);
      st = tr.p < 0.5 ? stA : stB;
    } else {
      st = renderShot(shotAt(t), t, sub, shutter, post.rtA);
      src = post.rtA;
    }
    const g = post.grade.material.uniforms;
    g.uFlash.value = st.post.flash; g.uExposure.value = st.post.exposure;
    g.uFade.value = st.post.fade ?? 1;
    overlay.draw(titlesAt(t));
    g.uOverlay.value = 1;
    g.uFrame.value = frameIndex;
    post.finish(src, toScreen);
    return st;
  }

  function readPixels() {
    const buf = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(post.rtOut, 0, 0, W, H, buf);
    return buf;
  }

  const api = { renderAt, readPixels, renderer, W, H, FPS, DURATION, canvas, override: null };
  return api;
}
