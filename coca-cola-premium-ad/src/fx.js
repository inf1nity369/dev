// FX: cola liquid ribbon, splash droplets, carbonation bubbles, ice, CO2 mist.
// All effects are pure functions of time (deterministic, scrubbable, motion-blur friendly).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './textures.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ cola material
export function colaMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x6a1c06, roughness: 0.02, metalness: 0,
    transmission: 0.92, thickness: 0.55, ior: 1.345,
    attenuationColor: new THREE.Color(0.62, 0.17, 0.035), attenuationDistance: 0.9,
    clearcoat: 1, clearcoatRoughness: 0.0, specularIntensity: 1, envMapIntensity: 1.8,
  });
  // amber glow where the liquid is thin (grazing angles) — fakes the backlit caramel edge
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        float ndv = saturate(abs(dot(normal, normalize(vViewPosition))));
        float fr = pow(1.0 - ndv, 1.6);
        // backlit caramel: thin edges glow amber, thick core stays deep cola-brown
        outgoingLight += vec3(1.0, 0.36, 0.07) * fr * 0.55 + vec3(0.32, 0.07, 0.015) * pow(ndv, 3.0) * 0.25;
      }
      #include <opaque_fragment>`);
  };
  return m;
}

// ------------------------------------------------------------------ liquid ribbon
// A flattened tube spiralling up around the can. head/tail in [0,1] along the path.
export class LiquidRibbon {
  constructor(material) {
    this.SEG = 360; this.RAD = 28;
    const n = (this.SEG + 1) * (this.RAD + 1);
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = [];
    for (let i = 0; i < this.SEG; i++) for (let j = 0; j < this.RAD; j++) {
      const a = i * (this.RAD + 1) + j, b = a + this.RAD + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
  }
  // centerline of the swirl
  path(s, t) {
    const turns = 1.55;
    const ang = -0.6 + s * turns * Math.PI * 2 + t * 0.35;
    const R = 5.2 + 0.8 * Math.sin(s * 5.0 + 0.6) + 0.4 * Math.sin(s * 11.0 + t * 1.3);
    const y = 0.8 + s * 10.4 + 0.35 * Math.sin(s * 9.0 + t * 0.9);
    return new THREE.Vector3(Math.sin(ang) * R, y, Math.cos(ang) * R);
  }
  update(t, head, tail, width = 1) {
    const { SEG, RAD } = this, P = this.pos;
    const v = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const span = Math.max(1e-4, head - tail);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const s = tail + u * span;
      const c = this.path(s, t);
      const c2 = this.path(Math.min(1.2, s + 0.002), t);
      T.subVectors(c2, c).normalize();
      // binormal ~ radial direction so the ribbon is wide in the vertical/tangential plane
      B.set(c.x, 0, c.z).normalize();
      N.crossVectors(T, B).normalize();
      B.crossVectors(N, T).normalize();
      // width profile: rounded caps at both ends, swelling in the middle, rippling
      const cap = Math.sqrt(Math.max(0, Math.sin(Math.PI * u)));
      const w = width * (0.5 + 0.22 * Math.sin(s * 13.0 - t * 2.2) + 0.1 * Math.sin(s * 31.0 + t * 3.1)) * (0.3 + 0.7 * cap) * cap;
      const th = w * 0.62;
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI * 2;
        const ripple = 1 + 0.08 * Math.sin(a * 3 + s * 40 - t * 6);
        const cx = Math.cos(a) * th * ripple, cy = Math.sin(a) * w * ripple;
        v.copy(c).addScaledVector(B, cx).addScaledVector(N, cy);
        const o = (i * (RAD + 1) + j) * 3;
        P[o] = v.x; P[o + 1] = v.y; P[o + 2] = v.z;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.mesh.visible = span > 0.002 && width > 0.01;
  }
}

// ------------------------------------------------------------------ splash droplets (ballistic)
export class Droplets {
  constructor(material, count = 140, seed = 3) {
    this.n = count;
    const geo = new THREE.SphereGeometry(1, 20, 14);
    this.mesh = new THREE.InstancedMesh(geo, material, count);
    this.mesh.frustumCulled = false;
    const r = rng(seed);
    this.p = Array.from({ length: count }, () => ({
      s: r(), t0: r() * 0.9, ang: r() * Math.PI * 2, v: 2 + r() * 6, up: 1 + r() * 5,
      size: 0.035 + Math.pow(r(), 3) * 0.16, stretch: 1 + r() * 1.2,
    }));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sc = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  // emitted from the ribbon between e0..e1 (ribbon local time), at time t (in emitter time)
  update(ribbon, t, amount) {
    let k = 0;
    for (const d of this.p) {
      const age = t - d.t0;
      if (age <= 0 || amount <= 0) { this.mesh.setMatrixAt(k++, this.m.makeScale(0, 0, 0)); continue; }
      const origin = ribbon.path(0.15 + d.s * 0.8, d.t0);
      const out = new THREE.Vector3(origin.x, 0, origin.z).normalize();
      const vx = out.x * d.v + Math.cos(d.ang) * d.v * 0.4, vz = out.z * d.v + Math.sin(d.ang) * d.v * 0.4;
      const vy = d.up;
      const g = -9.0;
      this.v.set(origin.x + vx * age, origin.y + vy * age + 0.5 * g * age * age, origin.z + vz * age);
      const life = sstep(0, 0.08, age) * (1 - sstep(1.6, 2.2, age));
      const sz = d.size * life * amount;
      // stretch along velocity
      const vel = new THREE.Vector3(vx, vy + g * age, vz).normalize();
      this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vel);
      this.sc.set(sz, sz * d.stretch, sz);
      this.m.compose(this.v, this.q, this.sc);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ carbonation bubbles
export class Bubbles {
  constructor(count = 380, seed = 11) {
    this.n = count;
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uAmt: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uAmt;
        void main(){
          vec3 n = normalize(vN), v = normalize(vV);
          float f = pow(1.0 - abs(dot(n, v)), 3.0);
          // tiny specular glint from the key strip, upper-left
          float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-0.5, 0.6, 0.6))), 0.0), 60.0);
          vec3 c = vec3(1.0, 0.93, 0.88) * (f * 0.9 + spec * 3.0) + vec3(0.6, 0.12, 0.05) * 0.04;
          gl_FragColor = vec4(c * uAmt, 1.0);
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.mat = mat;
    const r = rng(seed);
    this.b = Array.from({ length: count }, () => ({
      ang: r() * Math.PI * 2, rad: 3.6 + Math.pow(r(), 0.7) * 6.5, y0: -2 - r() * 14, speed: 1.2 + r() * 2.6,
      size: 0.03 + Math.pow(r(), 2.4) * 0.16, wob: r() * 10, wobA: 0.05 + r() * 0.15,
    }));
    this.m = new THREE.Matrix4();
  }
  update(t, amt, spread = 1) {
    this.mat.uniforms.uAmt.value = amt;
    this.mesh.visible = amt > 0.001;
    let k = 0;
    for (const b of this.b) {
      const y = ((b.y0 + t * b.speed) % 16 + 16) % 16 - 1.5;
      const ang = b.ang + t * 0.12;
      const rr = b.rad * spread;
      const x = Math.sin(ang) * rr + Math.sin(t * 3 + b.wob) * b.wobA;
      const z = Math.cos(ang) * rr + Math.cos(t * 2.6 + b.wob) * b.wobA;
      const s = b.size * (1 + y * 0.025) * sstep(-1.5, 0, y) * (1 - sstep(12.5, 14.5, y));
      this.m.makeScale(s, s * 1.05, s).setPosition(x, y, z);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ ice
export function iceMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.16, metalness: 0, transmission: 1, thickness: 0.8, ior: 1.31,
    attenuationColor: new THREE.Color(0.9, 0.96, 1.0), attenuationDistance: 6,
    clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1, envMapIntensity: 2.0,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        float ndv = saturate(abs(dot(normal, normalize(vViewPosition))));
        // light trapped in the ice: glowing core + bright frosted edges
        outgoingLight += vec3(0.75, 0.85, 1.0) * (0.06 + 0.1 * pow(ndv, 2.0)) + vec3(1.0) * pow(1.0 - ndv, 3.0) * 0.35;
      }
      #include <opaque_fragment>`);
  };
  return m;
}

export class Ice {
  constructor(material, seed = 5) {
    this.group = new THREE.Group();
    const r = rng(seed);
    this.cubes = [];
    for (let i = 0; i < 6; i++) {
      const s = 1.5 + r() * 0.7;
      const g = new RoundedBoxGeometry(s, s * (0.85 + r() * 0.25), s * (0.9 + r() * 0.2), 5, s * 0.2);
      // irregular, melted
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const n = 1 + 0.045 * Math.sin(x * 3.1 + y * 2.3 + i) + 0.035 * Math.sin(z * 4.2 - x * 1.7 + i * 2);
        p.setXYZ(k, x * n, y * n, z * n);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, material);
      this.group.add(m);
      this.cubes.push({ m, ang: (i / 6) * Math.PI * 2 + r() * 0.6, rad: 5.4 + r() * 2.4, y0: 15 + r() * 6, y1: 1.5 + r() * 8.5,
        spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spinV: 0.6 + r() * 1.4, delay: r() * 0.7, ph: r() * 6 });
    }
  }
  // p in [0,1]: tumble down through frame in slow motion
  update(t, p, visible) {
    this.group.visible = visible;
    for (const c of this.cubes) {
      const q = Math.min(1, Math.max(0, (p - c.delay * 0.4) / 0.75));
      const e = 1 - Math.pow(1 - q, 2.2);
      const y = c.y0 + (c.y1 - c.y0) * e - t * 0.15;
      const ang = c.ang + t * 0.22;
      c.m.position.set(Math.sin(ang) * c.rad, y, Math.cos(ang) * c.rad);
      c.m.quaternion.setFromAxisAngle(c.spin, c.ph + t * c.spinV * 0.5);
    }
  }
}

// ------------------------------------------------------------------ CO2 mist from the opening
export class Mist {
  constructor(tex, count = 90, seed = 21) {
    this.group = new THREE.Group();
    const r = rng(seed);
    this.p = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: 0xf4f2f0, transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(mat);
      this.group.add(s);
      this.p.push({ s, ang: r() * Math.PI * 2, sp: 0.6 + r() * 2.2, up: 1.0 + r() * 3.2, size: 0.3 + r() * 1.1, rot: r(), delay: r() * 0.18 });
    }
  }
  update(age, origin, amt = 1) {
    this.group.visible = age > 0 && age < 4;
    for (const d of this.p) {
      const a = Math.max(0, age - d.delay);
      const k = 1 - Math.exp(-a * 3.2);
      const x = origin.x + Math.cos(d.ang) * d.sp * k * 1.2;
      const z = origin.z + Math.sin(d.ang) * d.sp * k * 1.2 + 0.4 * k;
      const y = origin.y + d.up * k + a * 0.5;
      d.s.position.set(x, y, z);
      const sz = d.size * (0.3 + k * 1.8);
      d.s.scale.set(sz, sz, sz);
      d.s.material.opacity = 0.11 * amt * sstep(0, 0.05, a) * (1 - sstep(0.5, 2.6, a));
      d.s.material.rotation = d.rot * 6 + a * 0.3;
    }
  }
}

// ------------------------------------------------------------------ generic burst (spray, crown splash)
export class Burst {
  constructor(material, { count = 120, seed = 9, origin = new THREE.Vector3(), ring = 0, dir = new THREE.Vector3(0, 1, 0),
    spread = 0.6, speed = [2, 7], size = [0.03, 0.16], gravity = -9.8, life = 1.4, stretch = 1.8 } = {}) {
    this.geo = new THREE.SphereGeometry(1, 16, 12);
    this.mesh = new THREE.InstancedMesh(this.geo, material, count);
    this.mesh.frustumCulled = false;
    this.cfg = { origin, ring, dir, spread, gravity, life, stretch };
    const r = rng(seed);
    this.p = Array.from({ length: count }, () => {
      const ang = r() * Math.PI * 2;
      return { ang, sp: speed[0] + r() * (speed[1] - speed[0]), sz: size[0] + Math.pow(r(), 2.5) * (size[1] - size[0]),
        jx: (r() - 0.5) * 2, jy: r(), jz: (r() - 0.5) * 2, delay: r() * 0.06 };
    });
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.v = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }
  update(age, timeScale = 1) {
    const { origin, ring, dir, spread, gravity, life, stretch } = this.cfg;
    this.mesh.visible = age > 0 && age < life + 0.2;
    if (!this.mesh.visible) return;
    let k = 0;
    for (const d of this.p) {
      const a = Math.max(0, (age - d.delay) * timeScale);
      let vx, vy, vz, ox, oz;
      if (ring > 0) { // crown: radial from a ring at the can base
        ox = Math.sin(d.ang) * ring; oz = Math.cos(d.ang) * ring;
        vx = Math.sin(d.ang) * d.sp; vz = Math.cos(d.ang) * d.sp; vy = d.sp * (0.35 + d.jy * 0.7);
      } else {
        ox = 0; oz = 0;
        vx = (dir.x + d.jx * spread) * d.sp; vy = (dir.y + d.jy * spread * 0.3) * d.sp; vz = (dir.z + d.jz * spread) * d.sp;
      }
      let y = origin.y + vy * a + 0.5 * gravity * a * a;
      const floorY = ring > 0 ? 0.02 : -100;
      const alive = y > floorY ? 1 : 0;
      y = Math.max(y, floorY);
      this.v.set(origin.x + ox + vx * a, y, origin.z + oz + vz * a);
      const vel = new THREE.Vector3(vx, vy + gravity * a, vz);
      const spd = vel.length();
      this.q.setFromUnitVectors(this.up, vel.normalize());
      const fade = 1 - Math.min(1, Math.max(0, (a - life * 0.6) / (life * 0.4)));
      const sz = d.sz * fade * alive * Math.min(1, a * 30);
      this.s.set(sz, sz * (1 + Math.min(stretch, spd * 0.12)), sz);
      this.m.compose(this.v, this.q, this.s);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function waterMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.0, metalness: 0, transmission: 0.85, thickness: 0.25, ior: 1.33,
    clearcoat: 1, clearcoatRoughness: 0.0, envMapIntensity: 3.2,
  });
}

// ------------------------------------------------------------------ pour: a living cola stream
// Thick, twisting jet with bulges that travel down the flow, bubbles carried inside, spray off it.
export class LiquidStream {
  constructor(material, { seg = 320, rad = 40 } = {}) {
    this.SEG = seg; this.RAD = rad;
    const n = (seg + 1) * (rad + 1);
    this.pos = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = [];
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
  }
  path(s, t) {
    return new THREE.Vector3(-4.2 + 7.0 * s + 0.25 * Math.sin(s * 5 + t * 0.8), 17.5 - 19.5 * Math.pow(s, 1.55), 0.5 * Math.sin(s * 3.1 + 0.4));
  }
  radius(s, a, t) {
    const R = 0.62 * (0.82 + 0.25 * s);
    return R * (1 + 0.16 * Math.sin(s * 23 - t * 13 + 0.6 * Math.sin(a * 2)) + 0.07 * Math.sin(s * 57 - t * 29 + a * 3)
      + 0.045 * Math.sin(a * 5 + s * 41 - t * 21) + 0.03 * Math.sin(a * 9 - s * 83 + t * 37));
  }
  update(t) {
    const { SEG, RAD, pos } = this;
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      const c = this.path(s, t), c2 = this.path(s + 0.002, t);
      T.subVectors(c2, c).normalize();
      N.set(0, 0, 1).cross(T).normalize(); B.crossVectors(T, N).normalize();
      const twist = s * 7.0 - t * 2.0;
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI * 2;
        const r = this.radius(s, a, t);
        const ex = Math.cos(a) * r * 1.22, ey = Math.sin(a) * r * 0.86;
        const cx = ex * Math.cos(twist) - ey * Math.sin(twist), cy = ex * Math.sin(twist) + ey * Math.cos(twist);
        v.copy(c).addScaledVector(N, cx).addScaledVector(B, cy);
        const o = (i * (RAD + 1) + j) * 3; pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

function bubbleShader({ additive = true, tint = [1.0, 0.62, 0.24], body = 0.0 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uAmt: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uAmt;
      void main(){ vec3 n = normalize(vN), v = normalize(vV);
        float ndv = abs(dot(n, v)); float rim = pow(1.0 - ndv, 2.4);
        float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-0.3, 0.8, 0.5))), 0.0), 40.0);
        float spec2 = pow(max(dot(reflect(-v, n), normalize(vec3(0.5, -0.6, 0.6))), 0.0), 18.0);
        vec3 c = vec3(${tint.join(',')}) * rim * 1.9 + vec3(1.0, 0.93, 0.82) * spec * 4.0 + vec3(1.0, 0.7, 0.4) * spec2 * 0.6 + vec3(${tint.join(',')}) * ${body.toFixed(3)};
        gl_FragColor = vec4(c * uAmt, ${additive ? '1.0' : 'clamp(rim + spec + 0.2, 0.0, 1.0) * uAmt'}); }`,
  });
}

// bubbles carried inside the stream (drawn over it, the stream is translucent)
export class StreamBubbles {
  constructor(stream, count = 260, seed = 61) {
    this.stream = stream;
    this.mat = bubbleShader({ tint: [1.0, 0.7, 0.32] });
    this.mat.depthTest = false;
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), this.mat, count);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    const r = rng(seed);
    this.b = Array.from({ length: count }, () => ({ s0: r(), a: r() * Math.PI * 2, d: Math.sqrt(r()) * 0.75, size: 0.015 + Math.pow(r(), 3) * 0.08, sp: 0.22 + r() * 0.12 }));
    this.m = new THREE.Matrix4();
  }
  update(t) {
    const st = this.stream; let k = 0;
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), p = new THREE.Vector3();
    for (const b of this.b) {
      const s = (b.s0 + t * b.sp) % 1;
      const c = st.path(s, t), c2 = st.path(s + 0.002, t);
      T.subVectors(c2, c).normalize(); N.set(0, 0, 1).cross(T).normalize(); B.crossVectors(T, N).normalize();
      const r = st.radius(s, b.a, t) * b.d;
      p.copy(c).addScaledVector(N, Math.cos(b.a) * r * 1.1).addScaledVector(B, Math.sin(b.a) * r * 0.8);
      const fade = Math.min(1, s * 12) * Math.min(1, (1 - s) * 12);
      this.m.makeScale(b.size * fade, b.size * fade, b.size * fade).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// droplets peeling off the stream (looping, deterministic)
export class StreamSpray {
  constructor(stream, material, count = 90, seed = 62) {
    this.stream = stream;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), material, count);
    this.mesh.frustumCulled = false;
    const r = rng(seed);
    this.p = Array.from({ length: count }, () => ({ s: 0.1 + r() * 0.8, per: 0.7 + r() * 0.8, ph: r(), dir: new THREE.Vector3(r() - 0.5, r() * 0.6, r() - 0.5).normalize(), sp: 1 + r() * 3.5, size: 0.02 + Math.pow(r(), 3) * 0.1 }));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sc = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  update(t) {
    let k = 0;
    for (const d of this.p) {
      const age = ((t / d.per + d.ph) % 1) * d.per;
      const born = t - age;
      const o = this.stream.path(d.s, born);
      const vel = d.dir.clone().multiplyScalar(d.sp);
      this.v.set(o.x + vel.x * age, o.y + vel.y * age - 4.9 * age * age, o.z + vel.z * age);
      const life = Math.min(1, age * 20) * (1 - Math.min(1, Math.max(0, (age - d.per * 0.6) / (d.per * 0.4))));
      const vv = new THREE.Vector3(vel.x, vel.y - 9.8 * age, vel.z);
      this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vv.clone().normalize());
      const sz = d.size * life;
      this.sc.set(sz, sz * (1 + Math.min(1.5, vv.length() * 0.15)), sz);
      this.m.compose(this.v, this.q, this.sc);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// inside the drink: a deep field of rising bubbles of every size
export class BubbleField {
  constructor(count = 1400, seed = 64) {
    this.mat = bubbleShader({ tint: [1.0, 0.58, 0.2], body: 0.16 });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), this.mat, count);
    this.mesh.frustumCulled = false;
    const r = rng(seed);
    this.b = Array.from({ length: count }, () => {
      const big = r() < 0.08;
      const size = big ? 0.18 + r() * 0.45 : 0.015 + Math.pow(r(), 2.2) * 0.16;
      const z = r() < 0.45 ? (r() - 0.5) * 3 : -16 + r() * 24;
      return { x: (r() - 0.5) * 14, y: r() * 24, z, size, sp: 0.6 + size * 5 + r() * 0.6, wob: r() * 10, wa: 0.03 + r() * 0.12 };
    });
    this.m = new THREE.Matrix4();
  }
  update(t, amt = 1) {
    this.mat.uniforms.uAmt.value = amt;
    this.mesh.visible = amt > 0.001;
    let k = 0;
    for (const b of this.b) {
      const y = ((b.y + t * b.sp) % 24) - 12;
      const x = b.x + Math.sin(t * 2.3 + b.wob) * b.wa;
      const z = b.z + Math.cos(t * 1.9 + b.wob) * b.wa;
      const s = b.size;
      this.m.makeScale(s, s * 0.95, s).setPosition(x, y, z);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
