// Coca-Cola glass: frosted/condensed glass (transmission), printed white wordmark, backlit cola,
// bubbles clinging to the inner wall, and water drips that run down the outside.
import * as THREE from 'three';
import { rng, drawLogo, makeCondensation } from './textures.js';

export const GLASS = { H: 11.0, RB: 3.3, RT: 3.85, WALL: 0.12, BASE: 0.9, FILL: 9.4 };
const outerR = (y) => GLASS.RB + (GLASS.RT - GLASS.RB) * Math.min(1, Math.max(0, y / GLASS.H));
const innerR = (y) => outerR(y) - GLASS.WALL;

function lathe(points, segs, uvV) {
  const geo = new THREE.LatheGeometry(points, segs);
  if (uvV) {
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setY(i, uvV(pos.getY(i)));
    uv.needsUpdate = true;
  }
  return geo;
}
const V2 = (x, y) => new THREE.Vector2(x, y);

function glassProfile() {
  const p = [V2(0.001, 0), V2(2.9, 0), V2(3.15, 0.04), V2(3.27, 0.16)];
  for (let y = 0.3; y <= 10.95; y += 0.25) p.push(V2(outerR(y), y));
  p.push(V2(GLASS.RT + 0.005, 11.0), V2(GLASS.RT - 0.03, 11.07), V2(GLASS.RT - 0.09, 11.07), V2(GLASS.RT - GLASS.WALL, 11.0));
  for (let y = 10.9; y >= GLASS.BASE + 0.1; y -= 0.25) p.push(V2(innerR(y), y));
  p.push(V2(innerR(GLASS.BASE) - 0.1, GLASS.BASE), V2(0.001, GLASS.BASE - 0.02));
  return p;
}

function colaProfile() {
  const r = (y) => innerR(y) - 0.025;
  const p = [V2(0.001, GLASS.BASE + 0.01), V2(r(GLASS.BASE) - 0.12, GLASS.BASE + 0.01), V2(r(GLASS.BASE + 0.1), GLASS.BASE + 0.12)];
  for (let y = GLASS.BASE + 0.3; y < GLASS.FILL; y += 0.25) p.push(V2(r(y), y));
  p.push(V2(r(GLASS.FILL), GLASS.FILL), V2(r(GLASS.FILL) - 0.05, GLASS.FILL + 0.06), V2(r(GLASS.FILL) - 0.25, GLASS.FILL + 0.02), V2(0.001, GLASS.FILL));
  return p;
}

function logoTexture(logo) {
  const C = 2 * Math.PI * 3.6, W = 4096, H = Math.round((W * GLASS.H) / C);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const Y = (ycm) => (1 - ycm / GLASS.H) * H;
  drawLogo(g, logo, 0.5 * W, Y(6.0), (9.6 / C) * W, '#ffffff');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildGlass(logo) {
  const group = new THREE.Group();

  // condensation on glass (reuse the can generator on a blank ORM canvas)
  const W = 4096, H = Math.round((W * 12.2) / (2 * Math.PI * 3.3));
  const blank = document.createElement('canvas'); blank.width = W; blank.height = H;
  const bg = blank.getContext('2d'); bg.fillStyle = 'rgb(0,0,0)'; bg.fillRect(0, 0, W, H);
  const cond = makeCondensation(blank, W, H, 731);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 1, roughnessMap: cond.cc,
    transmission: 1, thickness: 0.2, ior: 1.5, specularIntensity: 1,
    normalMap: cond.normal, normalScale: new THREE.Vector2(0.9, 0.9),
    clearcoat: 1, clearcoatRoughness: 0.02, clearcoatNormalMap: cond.normal, clearcoatNormalScale: new THREE.Vector2(1.2, 1.2),
    envMapIntensity: 1.0, side: THREE.DoubleSide, depthWrite: false,
  });
  // the generator maps roughness 0.07..0.27; frosted glass wants a little more range
  glassMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `
      float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
        roughnessFactor = mix(0.02, 0.16, smoothstep(0.05, 0.3, texelRoughness.g));
      #endif`);
  };
  const glass = new THREE.Mesh(lathe(glassProfile(), 200, (y) => y / 12.2), glassMat);
  glass.rotation.y = Math.PI;
  glass.renderOrder = 5;
  group.add(glass);

  const decal = new THREE.Mesh(
    lathe(Array.from({ length: 41 }, (_, i) => { const y = 1 + (i / 40) * 9.9; return V2(outerR(y) + 0.006, y); }), 200, (y) => y / GLASS.H),
    new THREE.MeshPhysicalMaterial({ map: logoTexture(logo), transparent: true, roughness: 0.32, metalness: 0, envMapIntensity: 1.4, depthWrite: false, emissive: 0x8a7a6a }),
  );
  decal.rotation.y = Math.PI; decal.renderOrder = 7;
  group.add(decal);

  // backlit cola
  const colaMat = new THREE.MeshPhysicalMaterial({ color: 0x1a0601, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9 });
  colaMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      { float ndv = saturate(abs(dot(normal, normalize(vViewPosition))));
        outgoingLight += vec3(1.0, 0.36, 0.06) * (0.06 + 0.42 * pow(1.0 - ndv, 1.6)) + vec3(0.4, 0.11, 0.015) * 0.08; }
      #include <opaque_fragment>`);
  };
  const cola = new THREE.Mesh(lathe(colaProfile(), 160), colaMat);
  group.add(cola);

  // bubbles clinging to / rising along the inner wall (front half)
  const bubMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = normalize(vN), v = normalize(vV);
        float ndv = abs(dot(n, v)); float rim = pow(1.0 - ndv, 2.2);
        float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 50.0);
        vec3 c = vec3(1.0, 0.62, 0.24) * rim * 1.8 + vec3(1.0, 0.92, 0.8) * spec * 3.5 + vec3(0.7, 0.3, 0.07) * 0.4;
        gl_FragColor = vec4(c, clamp(rim * 0.85 + spec + 0.18, 0.0, 1.0)); }`,
  });
  const NB = 2600, r = rng(99);
  const bubbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), bubMat, NB);
  bubbles.frustumCulled = false; bubbles.renderOrder = 4;
  const bdata = Array.from({ length: NB }, () => {
    const size = 0.022 + Math.pow(r(), 2.5) * 0.13;
    return { ang: (r() - 0.5) * 2.6, y: GLASS.BASE + 0.2 + r() * (GLASS.FILL - GLASS.BASE - 0.4), size,
      rise: r() < 0.22 ? 0.4 + r() * 1.6 : 0, ph: r() * 10 };
  });
  group.add(bubbles);
  const m4 = new THREE.Matrix4();
  function updateBubbles(t) {
    bdata.forEach((b, i) => {
      let y = b.y + b.rise * t;
      const span = GLASS.FILL - GLASS.BASE - 0.4;
      y = GLASS.BASE + 0.2 + ((((y - GLASS.BASE - 0.2) % span) + span) % span);
      const rr = innerR(y) - 0.03 - b.size * 0.8;
      const a = b.ang + (b.rise ? Math.sin(t * 3 + b.ph) * 0.004 : 0);
      const s = b.size * (b.rise ? 1 : 1);
      m4.makeScale(s, s, s).setPosition(Math.sin(a) * rr, y, Math.cos(a) * rr);
      bubbles.setMatrixAt(i, m4);
    });
    bubbles.instanceMatrix.needsUpdate = true;
  }

  // running drips on the outside (water beads + wet trails)
  const dripMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, ior: 1.33, thickness: 0.3, clearcoat: 1, envMapIntensity: 2.0 });
  const trailMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.02, ior: 1.33, thickness: 0.05, clearcoat: 1, envMapIntensity: 1.6 });
  const beadGeo = new THREE.SphereGeometry(1, 32, 20);
  const trailGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true); trailGeo.translate(0, 0.5, 0);
  const drips = [0, 1, 2].map(() => {
    const bead = new THREE.Mesh(beadGeo, dripMat), trail = new THREE.Mesh(trailGeo, trailMat);
    group.add(bead, trail); return { bead, trail };
  });
  // state: [{ ang, y0, y, size }]
  function updateDrips(list) {
    drips.forEach((d, i) => {
      const s = list && list[i];
      d.bead.visible = d.trail.visible = !!s;
      if (!s) return;
      const rr = outerR(s.y) + s.size * 0.35;
      d.bead.position.set(Math.sin(s.ang) * rr, s.y, Math.cos(s.ang) * rr);
      d.bead.rotation.set(0, s.ang, 0);
      d.bead.scale.set(s.size, s.size * 1.25, s.size * 0.55);
      const len = Math.max(0.001, s.y0 - s.y);
      const tr = outerR(s.y) + 0.01;
      d.trail.position.set(Math.sin(s.ang) * tr, s.y, Math.cos(s.ang) * tr);
      d.trail.rotation.set(0, s.ang, 0);
      d.trail.scale.set(s.size * 0.42, len, s.size * 0.12);
    });
  }

  return { group, glass, cola, bubbles, glassMat, updateBubbles, updateDrips };
}
