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

export function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const add = (w, h, pos, color, intensity, fall, vertical = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), softboxMaterial(color, intensity, fall, vertical));
    m.position.set(...pos); m.lookAt(0, pos[1] * 0.25, 0); env.add(m); return m;
  };
  // key strip, camera-left: the hero vertical highlight on the body
  add(3.2, 60, [-19, 8, 25], 0xfff4ea, 7.5, 3.0);
  // secondary strip, camera-right
  add(2.0, 60, [25, 8, 16], 0xf0f4ff, 4.5, 4.0);
  // back rims -> crisp white edge lines on both silhouettes
  add(1.6, 60, [-15, 8, -18], 0xffffff, 14.0, 4.0);
  add(1.6, 60, [15, 8, -18], 0xffffff, 14.0, 4.0);
  // big overhead soft gradient -> the silver neck/lid read as polished metal
  const top = new THREE.Mesh(new THREE.PlaneGeometry(7, 46), softboxMaterial(0xffffff, 3.2, 3.0));
  top.position.set(-6, 40, 6); top.lookAt(0, 0, 0); env.add(top);
  const top2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), softboxMaterial(0xffffff, 0.35, 1.5));
  top2.position.set(0, 44, -10); top2.lookAt(0, 0, 0); env.add(top2);
  // low warm-red bounce (brand colour picked up by the silver lid/neck)
  add(60, 12, [0, -16, 24], 0xff1a10, 0.8, 2.0, false);
  // deep red glow behind (matches the screen-space cyc)
  add(80, 50, [0, 10, -45], 0xd0100a, 0.55, 1.5, false);
  // soft front fill so whites stay white
  add(40, 26, [0, 12, 40], 0xffffff, 0.42, 1.5, false);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.0, 0.1, 200);
  pmrem.dispose();
  return rt.texture;
}

// screen-space cyc: deep black with an art-directable red glow + light shaft
export function buildBackdrop() {
  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uAspect: { value: 16 / 9 },
      uGlowPos: { value: new THREE.Vector2(0.5, 0.45) },
      uGlowRad: { value: 0.55 },
      uGlowCol: { value: new THREE.Color(0.55, 0.02, 0.015) },
      uGlow: { value: 1.0 },
      uBase: { value: new THREE.Color(0.006, 0.004, 0.004) },
      uShaft: { value: 0.0 },
      uShaftX: { value: 0.5 },
      uTime: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.9999,1.0); }',
    fragmentShader: `varying vec2 vUv;
      uniform float uAspect, uGlowRad, uGlow, uShaft, uShaftX, uTime;
      uniform vec2 uGlowPos; uniform vec3 uGlowCol, uBase;
      void main(){
        vec2 d = (vUv - uGlowPos) * vec2(uAspect, 1.0);
        float r = length(d) / uGlowRad;
        float g = exp(-r*r*2.2) * 0.85 + exp(-r*r*0.6) * 0.13;
        vec3 col = uBase + uGlowCol * g * uGlow;
        // hot core
        col += uGlowCol * vec3(1.6, 0.9, 0.8) * exp(-r*r*9.0) * 0.35 * uGlow;
        // soft vertical light shaft
        float sx = (vUv.x - uShaftX) * uAspect;
        col += vec3(1.0, 0.86, 0.8) * exp(-sx*sx*18.0) * smoothstep(-0.1, 1.0, vUv.y) * 0.05 * uShaft;
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
      uFade: { value: new THREE.Vector2(12, 60) },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Color(0.0, 0.0, 0.0) },
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
