// Finishing chain: sub-frame accumulation (real motion blur) -> physical-lens DOF (half res,
// golden-angle gather) -> bloom/halation -> neutral tonemap + grade, vignette, CA, grain, dither.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const DEPTH_FN = `
  uniform float uNear, uFar;
  float viewDist(float d){ // perspective depth -> view distance (cm)
    float z = d * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
  }
  uniform float uFocal, uFstop, uFocus, uSensor, uImgW, uMaxCoc;
  // signed circle of confusion in *full-res* pixels (negative = foreground)
  float coc(float distCm){
    float D = distCm * 10.0, S = uFocus * 10.0, f = uFocal;
    float A = f / uFstop;
    float c = A * f * (D - S) / (D * S);
    return clamp(c / uSensor * uImgW, -uMaxCoc, uMaxCoc);
  }`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const hf = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0, depthBuffer: true });
    this.rtScene.depthTexture = new THREE.DepthTexture(W, H, THREE.FloatType);
    this.rtAccum = new THREE.WebGLRenderTarget(W, H, hf);
    this.rtHalf = new THREE.WebGLRenderTarget(W / 2, H / 2, hf);
    this.rtDof = new THREE.WebGLRenderTarget(W, H, hf);
    this.rtOut = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.rtA = new THREE.WebGLRenderTarget(W, H, hf);
    this.rtB = new THREE.WebGLRenderTarget(W, H, hf);
    this.rtMix = new THREE.WebGLRenderTarget(W, H, hf);
    this.plain = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: 'varying vec2 vUv; uniform sampler2D tSrc; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }',
    }));
    this.trans = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tA: { value: null }, tB: { value: null }, uType: { value: 0 }, uP: { value: 0 }, uAspect: { value: W / H },
        uDir: { value: new THREE.Vector2(1, 0) }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: TRANSITION_FS,
    }));

    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uW: { value: 1 } },
      vertexShader: VS, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      fragmentShader: 'varying vec2 vUv; uniform sampler2D tSrc; uniform float uW; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * uW, 1.0); }',
    }));

    const lens = () => ({
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uFocal: { value: 50 }, uFstop: { value: 4 }, uFocus: { value: 30 },
      uSensor: { value: 36 }, uImgW: { value: W }, uMaxCoc: { value: 26 },
    });

    // half-res gather blur
    this.dofBlur = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2(2 / W, 2 / H) }, ...lens() },
      vertexShader: VS,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tColor, tDepth; uniform vec2 uTexel;
        ${DEPTH_FN}
        const float GOLDEN = 2.39996323;
        void main(){
          float cd = viewDist(texture2D(tDepth, vUv).r);
          float cs = abs(coc(cd)) * 0.5;                       // half-res px
          vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.0;
          float maxR = uMaxCoc * 0.5;
          float rad = 0.75;
          for (float ang = 0.0; rad < 30.0; ang += GOLDEN) {
            if (rad >= maxR) break;
            vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uTexel * rad;
            vec3 sc = texture2D(tColor, tc).rgb;
            float sd = viewDist(texture2D(tDepth, tc).r);
            float ss = abs(coc(sd)) * 0.5;
            if (sd > cd) ss = clamp(ss, 0.0, cs * 2.0);
            float m = smoothstep(rad - 0.5, rad + 0.5, ss);
            // a touch of highlight boost gives cat's-eye-free, glassy bokeh balls
            sc *= 1.0 + 0.6 * smoothstep(1.5, 6.0, max(sc.r, max(sc.g, sc.b))) * m;
            col += mix(col / tot, sc, m);
            tot += 1.0;
            rad += 0.75 / rad;
          }
          gl_FragColor = vec4(col / tot, cs);
        }`,
    }));
    Object.assign(this.dofBlur.material.uniforms, {});

    // composite sharp full-res with blurred half-res by CoC
    this.dofComp = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tBlur: { value: null }, tDepth: { value: null }, ...lens() },
      vertexShader: VS,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tColor, tBlur, tDepth;
        ${DEPTH_FN}
        void main(){
          vec3 sharp = texture2D(tColor, vUv).rgb;
          vec4 b = texture2D(tBlur, vUv);
          float c = abs(coc(viewDist(texture2D(tDepth, vUv).r)));
          float m = smoothstep(0.6, 2.4, max(c, b.a * 2.0 * 0.85));
          gl_FragColor = vec4(mix(sharp, b.rgb, m), 1.0);
        }`,
    }));
    this.dofUniforms = [this.dofBlur.material.uniforms, this.dofComp.material.uniforms];

    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.65, 1.15);
    // warm halation tint on the wide mips
    this.bloom.bloomTintColors = [
      new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 0.95, 0.92), new THREE.Vector3(1, 0.85, 0.78),
      new THREE.Vector3(1, 0.7, 0.6), new THREE.Vector3(1, 0.55, 0.45),
    ];
    this.bloom.compositeMaterial.uniforms.bloomTintColors.value = this.bloom.bloomTintColors;

    this.grade = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tSrc: { value: null }, tOverlay: { value: null }, uOverlay: { value: 0 },
        uExposure: { value: 1 }, uFrame: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
        uVignette: { value: 0.14 }, uCA: { value: 0.0008 }, uGrain: { value: 0.012 }, uFade: { value: 1 },
        uContrast: { value: 1.03 }, uSat: { value: 1.03 }, uFlash: { value: 0 },
      },
      vertexShader: VS,
      fragmentShader: `varying vec2 vUv;
        uniform sampler2D tSrc, tOverlay; uniform float uOverlay;
        uniform float uExposure, uFrame, uVignette, uCA, uGrain, uFade, uContrast, uSat, uFlash; uniform vec2 uRes;
        // Khronos PBR Neutral: keeps the brand red's hue instead of skewing it orange
        vec3 neutral(vec3 color){
          const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
          float x = min(color.r, min(color.g, color.b));
          float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
          color -= offset;
          float peak = max(color.r, max(color.g, color.b));
          if (peak < startCompression) return color;
          float d = 1.0 - startCompression;
          float newPeak = 1.0 - d * d / (peak + d - startCompression);
          color *= newPeak / peak;
          float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
          return mix(color, newPeak * vec3(1.0), g);
        }
        float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423) + uFrame * 0.6180339); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
        vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
        void main(){
          vec2 d = vUv - 0.5;
          float r2 = dot(d, d);
          vec2 off = d * uCA * (0.5 + 2.0 * r2);
          vec3 c;
          c.r = texture2D(tSrc, vUv - off).r;
          c.g = texture2D(tSrc, vUv).g;
          c.b = texture2D(tSrc, vUv + off).b;
          c *= uExposure;
          c = c * (1.0 + uFlash * 3.0) + vec3(1.0, 0.9, 0.8) * uFlash * 0.03;
          c = neutral(c);
          // contrast around mid-grey in a perceptual-ish space, keep blacks rich
          vec3 s = toSRGB(clamp(c, 0.0, 1.0));
          s = clamp((s - 0.5) * uContrast + 0.5, 0.0, 1.0);
          float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
          s = mix(vec3(l), s, uSat);
          // subtle split tone: cool shadows, warm highlights
          s += vec3(0.006, 0.002, -0.002) * (1.0 - l) + vec3(0.006, 0.003, -0.004) * l;
          // vignette (elliptical, soft)
          vec2 vd = d * vec2(uRes.x / uRes.y, 1.0) * 0.9;
          s *= mix(1.0, smoothstep(1.05, 0.15, length(vd)), uVignette);
          s *= uFade;
          // overlay (titles), premultiplied
          vec4 o = texture2D(tOverlay, vUv);
          s = s * (1.0 - o.a * uOverlay) + o.rgb * uOverlay;
          // film grain, luminance-weighted, then fade + dither
          float n = hash(vUv * uRes) + hash(vUv * uRes + 17.0) - 1.0;
          s += n * uGrain * (0.35 + 0.65 * (1.0 - abs(l - 0.45) * 1.6));
          s += (hash(vUv * uRes + 3.7) - 0.5) / 255.0;
          gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
        }`,
    }));
  }

  setLens(cam, focusCm, fstop, maxCoc = 26) {
    for (const u of this.dofUniforms) {
      u.uNear.value = cam.near; u.uFar.value = cam.far; u.uFocal.value = cam.getFocalLength();
      u.uFstop.value = fstop; u.uFocus.value = focusCm; u.uSensor.value = cam.getFilmWidth(); u.uMaxCoc.value = maxCoc;
    }
  }

  // render N sub-frames; renderSub(i) must update the scene for sub-frame i (center last)
  renderFrame(scene, camera, n, renderSub) {
    const r = this.r;
    r.setRenderTarget(this.rtAccum); r.setClearColor(0x000000, 1); r.clear();
    for (let i = 0; i < n; i++) {
      renderSub(i);
      r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
      this.copy.material.uniforms.tSrc.value = this.rtScene.texture;
      this.copy.material.uniforms.uW.value = 1 / n;
      r.setRenderTarget(this.rtAccum); r.autoClear = false; this.copy.render(r); r.autoClear = true;
    }
  }

  // DOF + bloom of the accumulated shot -> target (HDR)
  finishShot(dofOn, target) {
    const r = this.r;
    if (dofOn) {
      for (const q of [this.dofBlur, this.dofComp]) { q.material.uniforms.tDepth.value = this.rtScene.depthTexture; }
      this.dofBlur.material.uniforms.tColor.value = this.rtAccum.texture;
      r.setRenderTarget(this.rtHalf); this.dofBlur.render(r);
      this.dofComp.material.uniforms.tColor.value = this.rtAccum.texture;
      this.dofComp.material.uniforms.tBlur.value = this.rtHalf.texture;
      r.setRenderTarget(target); this.dofComp.render(r);
    } else {
      this.plain.material.uniforms.tSrc.value = this.rtAccum.texture;
      r.setRenderTarget(target); this.plain.render(r);
    }
    this.bloom.render(r, null, target, 0, false);
    r.setRenderTarget(null);
  }

  transition(type, p, { dir = [1, 0], center = [0.5, 0.5] } = {}) {
    const u = this.trans.material.uniforms;
    u.tA.value = this.rtA.texture; u.tB.value = this.rtB.texture;
    u.uType.value = type; u.uP.value = p;
    u.uDir.value.set(dir[0], dir[1]).normalize(); u.uCenter.value.set(center[0], center[1]);
    this.r.setRenderTarget(this.rtMix); this.trans.render(this.r); this.r.setRenderTarget(null);
    return this.rtMix;
  }

  finish(src, toScreen) {
    const r = this.r;
    this.grade.material.uniforms.tSrc.value = src.texture;
    r.setRenderTarget(this.rtOut); this.grade.render(r);
    if (toScreen) { r.setRenderTarget(null); this.grade.render(r); }
    r.setRenderTarget(null);
  }
}

// ------------------------------------------------------------------ transitions
// 0 ribbon wipe (white Coca-Cola swoosh), 1 zoom push, 2 bubble iris, 3 light burst
const TRANSITION_FS = `varying vec2 vUv;
  uniform sampler2D tA, tB; uniform float uType, uP, uAspect; uniform vec2 uDir, uCenter;
  float e3(float x){ return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0; }
  vec3 radial(sampler2D t, vec2 uv, vec2 c, float scale, float blur){
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 14; i++) { float k = float(i) / 13.0; acc += texture2D(t, c + (uv - c) / (scale * (1.0 + blur * k))).rgb; }
    return acc / 14.0;
  }
  void main(){
    vec2 uv = vUv; float p = clamp(uP, 0.0, 1.0); vec3 col;
    if (uType < 0.5) {
      vec2 q = (uv - 0.5) * vec2(uAspect, 1.0);
      float along = dot(q, vec2(-uDir.y, uDir.x));
      float across = dot(q, uDir);
      float pe = e3(p);
      float edge = mix(-1.35, 1.35, pe);
      float wave = 0.11 * sin(along * 3.0 + 1.3) + 0.04 * sin(along * 7.3 + 0.4);
      float s = across - edge - wave;
      vec2 push = uDir * vec2(1.0 / uAspect, 1.0) * 0.05;
      vec3 a = texture2D(tA, uv - push * pe).rgb;
      vec3 b = texture2D(tB, uv + push * (1.0 - pe)).rgb;
      col = mix(b, a, smoothstep(-0.003, 0.003, s));
      float thick = 0.06 + 0.035 * sin(along * 2.2 + 0.5);
      float band = smoothstep(thick, thick - 0.005, abs(s + thick));
      float line2 = smoothstep(0.011, 0.005, abs(s + thick * 2.0 + 0.05));
      float glow = exp(-abs(s + thick) / 0.07);
      col = mix(col, vec3(1.7, 1.62, 1.58), max(band, line2 * 0.95));
      col += vec3(1.0, 0.82, 0.78) * glow * 0.22;
    } else if (uType < 1.5) {
      float pe = e3(p);
      vec3 a = radial(tA, uv, uCenter, 1.0 + 2.2 * pe * pe, 0.45 * sin(3.14159 * min(1.0, p * 1.6)));
      vec3 b = radial(tB, uv, uCenter, 1.0 / (1.0 + 1.4 * (1.0 - pe) * (1.0 - pe)), 0.45 * sin(3.14159 * clamp(p * 1.6 - 0.6, 0.0, 1.0)));
      col = mix(a, b, smoothstep(0.4, 0.6, p)) * (1.0 + 0.7 * exp(-pow((p - 0.5) / 0.1, 2.0)));
    } else if (uType < 2.5) {
      vec2 q = (uv - uCenter) * vec2(uAspect, 1.0);
      float r = length(q);
      float R = e3(p) * 1.4;
      float s = r - R;
      float lens = exp(-abs(s) / 0.07);
      vec2 dv = normalize(q + 1e-5) / vec2(uAspect, 1.0);
      vec3 a = texture2D(tA, uv + dv * lens * 0.035).rgb;
      vec3 b = texture2D(tB, uCenter + (uv - uCenter) * (0.82 + 0.18 * e3(p)) - dv * lens * 0.05).rgb;
      col = mix(b, a, smoothstep(-0.003, 0.003, s));
      float fade = 1.0 - smoothstep(0.85, 1.0, p);
      vec3 irid = 0.55 + 0.45 * cos(6.2831 * (r * 2.5 + vec3(0.0, 0.33, 0.67)));
      col += (vec3(1.3) * exp(-abs(s) / 0.005) + irid * exp(-abs(s) / 0.025) * 0.3) * fade;
      float ga = atan(q.y, q.x);
      col += vec3(2.2) * exp(-pow((ga - 2.3) / 0.22, 2.0)) * exp(-abs(s + 0.025) / 0.01) * 0.6 * fade;
    } else if (uType > 3.5) {
      col = mix(texture2D(tA, uv).rgb, texture2D(tB, uv).rgb, smoothstep(0.0, 1.0, p));
    } else {
      float flash = exp(-pow((p - 0.5) / 0.15, 2.0));
      vec3 a = radial(tA, uv, uCenter, 1.0 + 0.3 * p, 0.2 * flash);
      vec3 b = radial(tB, uv, uCenter, 1.0 / (1.0 + 0.25 * (1.0 - p)), 0.2 * flash);
      col = mix(a, b, smoothstep(0.38, 0.62, p));
      col = col * (1.0 + 0.9 * flash) + vec3(1.0, 0.78, 0.66) * flash * 0.35;
      float st = exp(-pow((uv.y - 0.5 - 0.35 * (uv.x - 0.5)) / 0.22, 2.0));
      col += vec3(1.0, 0.6, 0.4) * st * flash * 0.4;
    }
    gl_FragColor = vec4(col, 1.0);
  }`;
