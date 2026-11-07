// Studio: HDR environment built from emissive softboxes, screen-space cyc backdrop,
// glossy black floor with a mirrored reflection of the hero.
import * as THREE from 'three';

function softboxMaterial(color, intensity, falloff = 3.0, vertical = true) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(intensity) }, uFall: { value: falloff } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uFall;
      void main(){
        vec2 p = abs(vUv*2.0-1.0);
        float across = ${vertical ? 'p.x' : 'p.y'};
        float along  = ${vertical ? 'p.y' : 'p.x'};
        float m = (1.0 - pow(across, uFall)) * (1.0 - pow(along, 8.0));
        gl_FragColor = vec4(uColor * m, 1.0);
      }`,
  });
}

export function buildEnvironment(renderer, look = 'studio') {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const add = (w, h, pos, color, intensity, fall, vertical = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), softboxMaterial(color, intensity, fall, vertical));
    m.position.set(...pos); m.lookAt(0, pos[1] * 0.25, 0); env.add(m); return m;
  };
  const addTop = (w, h, pos, color, intensity, fall) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), softboxMaterial(color, intensity, fall));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  if (look === 'warm') {
    // cinematic tabletop: tungsten key, golden back rims, amber backlight, almost no fill
    add(2.6, 60, [-20, 8, 22], 0xffd2a0, 6.0, 3.0);
    add(1.6, 60, [24, 8, 12], 0xffe2c0, 2.5, 4.0);
    add(1.4, 60, [-13, 8, -20], 0xffb766, 16.0, 4.0);
    add(1.4, 60, [13, 8, -20], 0xffc27a, 12.0, 4.0);
    addTop(6, 40, [-5, 40, 6], 0xffdcb0, 2.4, 3.0);
    add(80, 50, [0, 10, -45], 0xff8a2a, 0.5, 1.5, false);
    add(60, 12, [0, -16, 24], 0x7a2a08, 0.35, 2.0, false);
    add(40, 26, [0, 12, 40], 0xffe6cc, 0.12, 1.5, false);
  } else {
    add(3.2, 60, [-19, 8, 25], 0xfff4ea, 7.5, 3.0);
    add(2.0, 60, [25, 8, 16], 0xf0f4ff, 4.5, 4.0);
    add(1.6, 60, [-15, 8, -18], 0xffffff, 14.0, 4.0);
    add(1.6, 60, [15, 8, -18], 0xffffff, 14.0, 4.0);
    addTop(7, 46, [-6, 40, 6], 0xffffff, 3.2, 3.0);
    addTop(30, 30, [0, 44, -10], 0xffffff, 0.35, 1.5);
    add(60, 12, [0, -16, 24], 0xff1a10, 0.8, 2.0, false);
    add(80, 50, [0, 10, -45], 0xd0100a, 0.55, 1.5, false);
    add(40, 26, [0, 12, 40], 0xfff4ee, 0.7, 1.5, false);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.0, 0.1, 200);
  pmrem.dispose();
  return rt.texture;
}

// screen-space cyc: luminous gradient + art-directable glow, soft light rays and drifting bokeh
export function buildBackdrop() {
  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uAspect: { value: 16 / 9 },
      uTop: { value: new THREE.Color(0.3, 0.0, 0.012) },
      uBottom: { value: new THREE.Color(0.2, 0.0, 0.01) },
      uGlowPos: { value: new THREE.Vector2(0.5, 0.45) },
      uGlowRad: { value: 0.55 },
      uGlowCol: { value: new THREE.Color(0.75, 0.06, 0.04) },
      uGlow: { value: 1.0 },
      uRays: { value: 0.0 },
      uBokeh: { value: 0.0 },
      uBokehCol: { value: new THREE.Color(1.0, 0.6, 0.55) },
      uPar: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.9999,1.0); }',
    fragmentShader: `varying vec2 vUv;
      uniform float uAspect, uGlowRad, uGlow, uRays, uBokeh, uTime;
      uniform vec2 uGlowPos, uPar; uniform vec3 uTop, uBottom, uGlowCol, uBokehCol;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float bokeh(vec2 uv, float scale, float t, float seed){
        vec2 p = uv * scale; p.y -= t;
        vec2 id = floor(p), f = fract(p);
        float acc = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 cid = id + vec2(float(i), float(j));
          if (h21(cid + seed) > 0.5) continue;
          vec2 c = vec2(float(i), float(j)) + 0.5 + (vec2(h21(cid + 1.3 + seed), h21(cid + 2.7 + seed)) - 0.5) * 0.7;
          float rad = mix(0.1, 0.34, h21(cid + 4.1 + seed));
          float d = length(f - c);
          float disc = smoothstep(rad, rad * 0.86, d);
          float rim = smoothstep(rad * 0.62, rad * 0.94, d) * disc;
          float tw = 0.7 + 0.3 * sin(uTime * 1.7 + h21(cid + 7.7) * 40.0);
          acc += (disc * 0.5 + rim * 0.5) * mix(0.25, 1.0, h21(cid + 9.0 + seed)) * tw;
        }
        return acc;
      }
      void main(){
        vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
        vec2 d = (vUv - uGlowPos) * vec2(uAspect, 1.0);
        float r = length(d) / uGlowRad;
        col += uGlowCol * (exp(-r * r * 1.6) * 0.9 + exp(-r * r * 0.45) * 0.22) * uGlow;
        float ang = atan(d.y, d.x);
        float rays = pow(0.5 + 0.5 * sin(ang * 9.0 + uTime * 0.22), 6.0) * 0.6 + pow(0.5 + 0.5 * sin(ang * 5.0 - uTime * 0.15 + 1.0), 8.0) * 0.4;
        col += uGlowCol * vec3(1.0, 0.9, 0.85) * rays * exp(-r * 0.8) * 0.22 * uRays;
        vec2 bu = vec2(vUv.x * uAspect, vUv.y) + uPar;
        float b = bokeh(bu, 3.2, uTime * 0.07, 0.0) * 0.65 + bokeh(bu + 3.1, 6.0, uTime * 0.11, 5.0) * 0.35;
        col += uBokehCol * b * uBokeh;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = -1000;
  return quad;
}

export function buildFloor() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: {
      uFade: { value: new THREE.Vector2(14, 70) },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Color(0.11, 0.0, 0.006) },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW; uniform vec2 uFade; uniform float uOpacity; uniform vec3 uTint;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float ndv = clamp(V.y, 0.0, 1.0);
        float R = 0.07 + 0.93 * pow(1.0 - ndv, 5.0);
        R = mix(R, 1.0, 0.0);
        float dist = length(vW.xz);
        float far = 1.0 - smoothstep(uFade.x, uFade.y, dist);
        // the floor itself is black lacquer; alpha < 1 lets the mirrored scene read as reflection
        float a = (1.0 - R * 0.85) * far;
        gl_FragColor = vec4(uTint, a * uOpacity);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = 10;
  return floor;
}
