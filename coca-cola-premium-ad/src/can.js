// 330 ml can, built to real proportions (1 unit = 1 cm).
import * as THREE from 'three';

export const CAN = {
  H: 12.2, R: 3.3, CIRC: 2 * Math.PI * 3.3,
  PRINT_BOT: 1.18, PRINT_TOP: 10.62,
  FROST_BOT: 0.55, FROST_TOP: 11.25,
  LID_Y: 11.86,
};

function sampleSpline(ctrl, n) {
  const c = new THREE.SplineCurve(ctrl.map(([x, y]) => new THREE.Vector2(x, y)));
  return c.getSpacedPoints(n);
}
function line(a, b, step) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  const out = [];
  for (let i = 0; i <= n; i++) out.push(new THREE.Vector2(a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)));
  return out;
}
function join(...parts) {
  const pts = [];
  for (const p of parts) for (const v of p) {
    const last = pts[pts.length - 1];
    if (!last || last.distanceTo(v) > 1e-4) pts.push(v);
  }
  return pts;
}

export function bodyProfile() {
  return join(
    sampleSpline([[0.001, 1.0], [1.0, 0.9], [1.7, 0.63], [2.06, 0.3], [2.18, 0.1], [2.27, 0.02]], 40),
    sampleSpline([[2.27, 0.02], [2.37, 0.0], [2.5, 0.06], [2.76, 0.32], [3.06, 0.7], [3.25, 1.06], [3.3, 1.32]], 60),
    line([3.3, 1.32], [3.3, 10.48], 0.2),
    sampleSpline([[3.3, 10.48], [3.272, 10.8], [3.16, 11.15], [2.99, 11.46], [2.87, 11.68], [2.805, 11.82]], 60),
    sampleSpline([[2.805, 11.82], [2.835, 11.9], [2.862, 12.0], [2.862, 12.1], [2.835, 12.18], [2.775, 12.205], [2.715, 12.16]], 40),
    sampleSpline([[2.715, 12.16], [2.692, 12.0], [2.665, 11.83], [2.625, 11.725], [2.572, 11.7], [2.522, 11.76], [2.485, 11.84]], 40),
  );
}

export function lidProfile() {
  return join(
    sampleSpline([[2.485, 11.84], [2.3, 11.858], [2.0, 11.862], [1.9, 11.872], [1.82, 11.862], [1.2, 11.866], [0.5, 11.87]], 80),
    sampleSpline([[0.5, 11.87], [0.27, 11.872], [0.2, 11.9], [0.12, 11.935], [0.001, 11.94]], 20),
  );
}

function lathe(points, segs, uvV) {
  const geo = new THREE.LatheGeometry(points, segs);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uv.setY(i, uvV(Math.hypot(x, z), y));
  }
  uv.needsUpdate = true;
  return geo;
}

function tabShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.66);
  s.bezierCurveTo(0.3, -0.66, 0.5, -0.5, 0.56, -0.2);
  s.bezierCurveTo(0.62, 0.15, 0.64, 0.6, 0.64, 1.0);
  s.bezierCurveTo(0.64, 1.45, 0.35, 1.62, 0, 1.62);
  s.bezierCurveTo(-0.35, 1.62, -0.64, 1.45, -0.64, 1.0);
  s.bezierCurveTo(-0.64, 0.6, -0.62, 0.15, -0.56, -0.2);
  s.bezierCurveTo(-0.5, -0.5, -0.3, -0.66, 0, -0.66);
  const hole = new THREE.Path();
  hole.absellipse(0, 1.0, 0.4, 0.34, 0, Math.PI * 2, false);
  s.holes.push(hole);
  const slot = new THREE.Path();
  slot.moveTo(-0.26, 0.38); slot.bezierCurveTo(-0.3, -0.05, -0.18, -0.3, 0, -0.3);
  slot.bezierCurveTo(0.18, -0.3, 0.3, -0.05, 0.26, 0.38); slot.lineTo(0.2, 0.38);
  slot.bezierCurveTo(0.22, 0.0, 0.12, -0.22, 0, -0.22); slot.bezierCurveTo(-0.12, -0.22, -0.22, 0.0, -0.2, 0.38);
  slot.lineTo(-0.26, 0.38);
  s.holes.push(slot);
  return s;
}

// opening (score panel) outline, in lid-local (x, -z) coordinates; hinge near the rivet
function panelShape(grow = 0) {
  const s = new THREE.Shape();
  const g = grow;
  s.moveTo(0, -0.52 + g);
  s.bezierCurveTo(0.42 + g, -0.52 + g, 0.72 + g, -0.8, 0.8 + g, -1.25);
  s.bezierCurveTo(0.86 + g, -1.75, 0.55 + g, -2.18 - g, 0, -2.2 - g);
  s.bezierCurveTo(-0.55 - g, -2.18 - g, -0.86 - g, -1.75, -0.8 - g, -1.25);
  s.bezierCurveTo(-0.72 - g, -0.8, -0.42 - g, -0.52 + g, 0, -0.52 + g);
  return s;
}

export function buildCan({ label, cond, lidNormal }) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: label.map,
    roughnessMap: cond.orm, metalnessMap: cond.orm, roughness: 1, metalness: 1,
    normalMap: cond.normal, normalScale: new THREE.Vector2(0.55, 0.55),
    clearcoat: 1, clearcoatRoughness: 1, clearcoatRoughnessMap: cond.cc,
    clearcoatNormalMap: cond.normal, clearcoatNormalScale: new THREE.Vector2(1.25, 1.25),
    envMapIntensity: 1.0,
  });
  // frost veil: micro-condensation scatters light -> a faint cool-white haze on the paint
  bodyMat.onBeforeCompile = (sh) => {
    sh.uniforms.uFrost = { value: 1.0 };
    bodyMat.userData.shader = sh;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFrost;')
      .replace('#include <opaque_fragment>', `
        {
          vec4 ccS = texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv );
          float fogA = ccS.r * uFrost;
          vec3 veil = vec3(0.86, 0.9, 0.95) * (0.05 + 0.4 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0));
          outgoingLight = mix(outgoingLight, outgoingLight * 0.95 + veil * (irradianceBoost), fogA * 0.3);
        }
        #include <opaque_fragment>`)
      .replace('#include <common>', '#include <common>\nconst float irradianceBoost = 0.55;');
  };

  const alu = new THREE.MeshPhysicalMaterial({
    color: 0xd9dce0, metalness: 1, roughness: 0.2,
    normalMap: lidNormal, normalScale: new THREE.Vector2(0.35, 0.35),
    clearcoat: 0.3, clearcoatRoughness: 0.15,
  });
  const tabMat = new THREE.MeshPhysicalMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 });

  const body = new THREE.Mesh(lathe(bodyProfile(), 256, (r, y) => y / CAN.H), bodyMat);
  body.rotation.y = Math.PI; // u = 0.5 (logo) faces +z
  group.add(body);

  const lid = new THREE.Mesh(lathe(lidProfile(), 160, (r) => r / 2.485), alu);
  group.add(lid);

  // opening: dark hole (slightly larger than the panel => reads as the score line)
  const lidTop = new THREE.Group();
  lidTop.position.y = CAN.LID_Y;
  group.add(lidTop);

  const holeGeo = new THREE.ShapeGeometry(panelShape(0.025), 48); holeGeo.rotateX(-Math.PI / 2);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050101 });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.position.y = 0.012;
  lidTop.add(hole);

  const panelHinge = new THREE.Group();
  panelHinge.position.set(0, 0.016, 0.52);
  lidTop.add(panelHinge);
  const panelGeo = new THREE.ExtrudeGeometry(panelShape(0), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 2, curveSegments: 40 });
  panelGeo.rotateX(-Math.PI / 2); panelGeo.translate(0, -0.02, -0.52);
  const panel = new THREE.Mesh(panelGeo, alu);
  panelHinge.add(panel);

  const tabPivot = new THREE.Group();
  tabPivot.position.set(0, 0.07, 0);
  lidTop.add(tabPivot);
  const tabGeo = new THREE.ExtrudeGeometry(tabShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.018, bevelSegments: 3, curveSegments: 48 });
  tabGeo.rotateX(-Math.PI / 2);
  const tab = new THREE.Mesh(tabGeo, tabMat);
  tabPivot.add(tab);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), alu);
  rivet.scale.y = 0.45; rivet.position.y = 0.09;
  lidTop.add(rivet);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  // hero drip: one big bead that runs down the frosted shoulder in the macro opener.
  // Added after cloning for the mirror (see main.js) so it only exists on the hero can.
  const beadMat = new THREE.MeshPhysicalMaterial({ color: 0xb0101a, roughness: 0.0, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.6 });
  beadMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      { float ndv = saturate(abs(dot(normal, normalize(vViewPosition))));
        outgoingLight *= mix(0.25, 1.15, smoothstep(0.05, 0.6, ndv)); }
      #include <opaque_fragment>`);
  };
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), beadMat);
  bead.visible = false;

  return {
    group, body, bodyMat, tabPivot, panelHinge, hole, bead,
    // angle (rad, 0 = logo centre), height y (cm), speed (stretches the bead)
    setBead(on, ang, y, speed = 0) {
      bead.visible = on;
      if (!on) return;
      if (!bead.parent) group.add(bead);
      const r = CAN.R + 0.035;
      bead.position.set(Math.sin(ang) * r, y, Math.cos(ang) * r);
      bead.rotation.set(0, ang, 0);
      const st = 1 + Math.min(0.6, speed * 0.25);
      bead.scale.set(0.15, 0.17 * st, 0.07);
    },
    setOpen(tabAngle, panelAngle) {
      tabPivot.rotation.x = tabAngle;
      panelHinge.rotation.x = panelAngle;
    },
  };
}
