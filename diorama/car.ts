import * as THREE from 'three';
import { toon, glow, ctex, roundRect, noOutline, toonGradientMap } from './materials';
import { add, box } from './primitives';
import { drawLicensePlate, drawRearWordmark } from './textures';
import { CAR_CENTER, CAR_SCALE } from './layout';

export interface CarBuild {
  group: THREE.Group;
  ground: THREE.Group;
  hazardMaterial: THREE.MeshBasicMaterial;
  hazardLights: THREE.PointLight[];
  plateTexture: THREE.CanvasTexture;
  wordmarkTexture: THREE.CanvasTexture;
}

export function buildCar(): CarBuild {
  const car = new THREE.Group();
  car.name = 'porsche';
  const hazardMaterial = glow('#ffa21a', 1, { noOutline: true });
  const red = new THREE.MeshToonMaterial({ color: '#c8102a', gradientMap: toonGradientMap() });
  const rimUniforms = {
    uRimColor: { value: new THREE.Color(1.0, 0.9, 0.75) },
    uRimDir: { value: new THREE.Vector3(0, 0.25, -1).normalize() },
  };
  red.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, rimUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uRimColor;\nuniform vec3 uRimDir;\nvoid main() {')
      .replace('#include <opaque_fragment>', `
        vec3 rimDirView = normalize((viewMatrix * vec4(uRimDir, 0.)).xyz);
        vec3 rimViewDir = normalize(vViewPosition);
        float fres = 1. - max(dot(normal, rimViewDir), 0.);
        float rim = step(0.72, fres) * step(0.5, dot(normal, rimDirView));
        outgoingLight += uRimColor * rim * 0.45;
        #include <opaque_fragment>`);
  };
  red.customProgramCacheKey = () => 'car-paint-rim';
  const black = toon('#16171d');
  const darkGlass = toon('#1b2436', { glow: 0.05 });
  const wf = 1.2;
  const wr = -1.25;
  const arch = 0.36;
  const archA = Math.asin((0.34 - 0.26) / arch);
  const archDx = arch * Math.cos(archA);

  const s = new THREE.Shape();
  s.moveTo(-2.12, 0.26);
  s.lineTo(wr - archDx, 0.26); s.absarc(wr, 0.34, arch, Math.PI + archA, -archA, true);
  s.lineTo(wf - archDx, 0.26); s.absarc(wf, 0.34, arch, Math.PI + archA, -archA, true);
  s.lineTo(2.05, 0.26);
  s.quadraticCurveTo(2.2, 0.28, 2.2, 0.42);
  s.quadraticCurveTo(2.18, 0.58, 1.9, 0.63);
  s.quadraticCurveTo(1.4, 0.7, 0.8, 0.76);
  s.lineTo(-1.0, 0.8);
  s.quadraticCurveTo(-1.85, 0.82, -2.14, 0.72);
  s.quadraticCurveTo(-2.24, 0.58, -2.2, 0.4);
  s.quadraticCurveTo(-2.18, 0.28, -2.12, 0.26);
  const W = 1.84;
  const body = new THREE.ExtrudeGeometry(s, { depth: W - 0.24, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 5, curveSegments: 24 });
  body.translate(0, 0, -(W - 0.24) / 2);
  add(car, body, red);

  for (const sz of [-1, 1]) {
    const hip = add(car, new THREE.SphereGeometry(1, 24, 14), red, -1.15, 0.6, sz * 0.72);
    hip.scale.set(0.95, 0.24, 0.2);
  }

  const gh = new THREE.Shape();
  gh.moveTo(0.85, 0.76);
  gh.quadraticCurveTo(0.45, 1.02, 0.05, 1.2);
  gh.quadraticCurveTo(-0.35, 1.28, -0.75, 1.2);
  gh.quadraticCurveTo(-1.4, 1.02, -1.95, 0.78);
  gh.lineTo(0.85, 0.76);
  const GW = 1.34;
  const cabin = new THREE.ExtrudeGeometry(gh, { depth: GW - 0.24, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 });
  cabin.translate(0, 0, -(GW - 0.24) / 2);
  add(car, cabin, red);

  const dlo = new THREE.Shape();
  dlo.moveTo(0.62, 0.84);
  dlo.quadraticCurveTo(0.3, 1.04, 0.02, 1.14);
  dlo.quadraticCurveTo(-0.35, 1.2, -0.7, 1.13);
  dlo.quadraticCurveTo(-1.1, 1.03, -1.36, 0.88);
  dlo.lineTo(-1.3, 0.84); dlo.lineTo(0.62, 0.84);
  const dloGeo = new THREE.ShapeGeometry(dlo, 16);
  for (const sz of [-1, 1]) {
    const m = add(car, dloGeo, darkGlass, 0, 0, sz * (GW / 2 + 0.006));
    if (sz < 0) { m.rotation.y = Math.PI; m.scale.x = -1; }
  }

  const cabinHalfDepth = (GW - 0.24) / 2;
  const cabinRing: [number, number][] = [];
  {
    const pos = cabin.attributes.position;
    const seen = new Set<string>();
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(Math.abs(pos.getZ(i)) - cabinHalfDepth) > 1e-4) continue;
      const x = pos.getX(i), y = pos.getY(i);
      if (y <= 0.8) continue;
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cabinRing.push([x, y]);
    }
    cabinRing.sort((a, b) => b[0] - a[0]);
  }

  const glassBand = (xMin: number, xMax: number, halfWidth: number, offset: number): THREE.BufferGeometry => {
    const pts = cabinRing.filter(([x]) => x >= xMin && x <= xMax);
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[Math.max(0, i - 1)];
      const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
      const tx = nx - px, ty = ny - py, len = Math.hypot(tx, ty);
      const ox = x + (ty / len) * offset, oy = y - (tx / len) * offset;
      positions.push(ox, oy, -halfWidth, ox, oy, halfWidth);
      if (i < pts.length - 1) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };
  add(car, glassBand(0.02, 0.95, 0.5, 0.006), darkGlass);
  add(car, glassBand(-1.66, -0.75, 0.5, 0.006), darkGlass);

  const bezelGeo = new THREE.SphereGeometry(1, 20, 14);
  const bezelMat = toon('#1b2048');
  const lensGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const lensMat = toon('#dfe8f5');
  const dotGeo = new THREE.SphereGeometry(0.012, 8, 6);
  const dotMat = toon('#9aa0aa');
  for (const sz of [-1, 1]) {
    const hl = new THREE.Group();
    hl.position.set(2.085, 0.65, sz * 0.6);
    hl.rotation.z = -0.4;
    car.add(hl);
    const bezel = add(hl, bezelGeo, bezelMat, 0, 0.01, 0);
    bezel.name = 'headlight-bezel';
    bezel.scale.set(0.14, 0.012, 0.15);
    const lens = add(hl, lensGeo, lensMat);
    lens.name = 'headlight-lens';
    lens.scale.set(0.12, 0.068, 0.13);
    for (const dx of [-0.04, 0.04]) {
      for (const dz of [-0.045, 0.045]) {
        const dot = add(hl, dotGeo, dotMat, dx, 0.06, dz);
        dot.name = 'headlight-dot';
        dot.scale.y = 0.5;
      }
    }
    add(car, new THREE.SphereGeometry(0.018, 8, 6), hazardMaterial, 1.9, 0.71, sz * 0.8);
    add(car, new THREE.BoxGeometry(0.06, 0.035, 0.02), hazardMaterial, 1.5, 0.64, sz * 0.915);
  }

  const slat = toon('#3d434f');
  const drl = toon('#c4cad4');
  box(car, 0.08, 0.1, 0.5, black, 2.25, 0.3, 0).name = 'intake-center';
  for (const y of [0.325, 0.365]) box(car, 0.01, 0.012, 0.44, slat, 2.293, y, 0).name = 'intake-slat';
  for (const sz of [-1, 1]) {
    box(car, 0.08, 0.16, 0.56, black, 2.25, 0.26, sz * 0.55).name = 'intake-side';
    for (const y of [0.29, 0.33, 0.37]) box(car, 0.01, 0.012, 0.5, slat, 2.293, y, sz * 0.55).name = 'intake-slat';
    box(car, 0.012, 0.016, 0.42, drl, 2.294, 0.4, sz * 0.55).name = 'drl-strip';
  }

  const badge = add(car, new THREE.SphereGeometry(1, 12, 8), toon('#d8b25a'), 2.152, 0.627, 0);
  badge.name = 'hood-badge';
  badge.scale.set(0.022, 0.006, 0.018);
  badge.rotation.z = -0.63;
  box(car, 0.14, 0.03, 1.6, black, 2.14, 0.15, 0).name = 'front-lip';

  const TAIL_TILT = -25 * (Math.PI / 180);
  box(car, 0.03, 0.06, 1.42, glow('#ff1f35', 1.6), -2.26, 0.66, 0).rotation.z = TAIL_TILT;
  for (const sz of [-1, 1]) {
    add(car, new THREE.BoxGeometry(0.02, 0.05, 0.1), hazardMaterial, -2.24, 0.69, sz * 0.77).rotation.z = TAIL_TILT;
  }
  box(car, 0.03, 0.21, 0.48, toon('#9c0d21'), -2.3, 0.415, 0).name = 'plate-recess';

  box(car, 0.34, 0.02, 0.8, black, -1.96, 0.9, 0);
  box(car, 0.04, 0.02, 0.4, glow('#ff1f35', 1.3), -1.8, 0.915, 0);

  for (const sz of [-1, 1]) box(car, 0.16, 0.22, 0.04, black, -2.02, 0.88, sz * 0.42);
  const wing = box(car, 0.38, 0.035, 1.64, red, -2.05, 1.08, 0); wing.rotation.z = -0.08;
  box(car, 0.38, 0.02, 1.6, black, -2.05, 1.06, 0).rotation.z = -0.08;
  for (const sz of [-1, 1]) box(car, 0.42, 0.14, 0.02, black, -2.05, 1.01, sz * 0.83);

  box(car, 0.3, 0.2, 1.56, black, -2.15, 0.18, 0).name = 'rear-diffuser';
  const exhaustTipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 14);
  const exhaustTipMat = toon('#a3aab5');
  const exhaustInnerGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.01, 14);
  const exhaustInnerMat = toon('#101116');
  const reflectorMat = toon('#ff4a5a');
  for (const sz of [-1, 1]) {
    const ex = add(car, exhaustTipGeo, exhaustTipMat, -2.3, 0.28, sz * 0.42);
    ex.name = 'exhaust-tip';
    ex.rotation.z = Math.PI / 2; ex.scale.set(1, 1, 1.5);
    const inner = add(car, exhaustInnerGeo, exhaustInnerMat, -2.361, 0.28, sz * 0.42);
    inner.name = 'exhaust-inner';
    inner.rotation.z = Math.PI / 2; inner.scale.set(1, 1, 1.5);
    box(car, 0.012, 0.022, 0.1, reflectorMat, -2.288, 0.39, sz * 0.72).name = 'rear-reflector';
  }
  for (let i = 0; i < 9; i++) {
    const slat = box(car, 0.09, 0.01, 0.03, black, -1.72, 0.948, -0.32 + i * 0.08);
    slat.name = 'engine-grille-slat';
    slat.rotation.z = 0.38;
  }

  for (const sz of [-1, 1]) {
    box(car, 0.08, 0.04, 0.12, black, 0.6, 0.84, sz * 0.93);
    box(car, 0.12, 0.1, 0.16, red, 0.58, 0.88, sz * 1.02);
  }

  const line = toon('#7d1217');
  const pillarGeo = new THREE.BoxGeometry(0.05, 0.32, 0.006);
  const pillarMat = toon('#0c0d12');
  for (const sz of [-1, 1]) {
    box(car, 0.012, 0.42, 0.008, line, 0.64, 0.33, sz * 0.922).name = 'door-line';
    box(car, 0.012, 0.44, 0.008, line, -0.55, 0.33, sz * 0.922).name = 'door-line';
    box(car, 1.2, 0.012, 0.008, line, 0.045, 0.33, sz * 0.922).name = 'door-line';
    box(car, 0.14, 0.02, 0.012, line, -0.36, 0.7, sz * 0.924).name = 'door-handle';
    box(car, 1.67, 0.045, 0.02, black, -0.025, 0.26, sz * 0.925).name = 'side-skirt';
    const pillar = add(car, pillarGeo, pillarMat, -0.53, 1.0, sz * 0.68);
    pillar.name = 'window-pillar';
    pillar.rotation.z = 0.36;
  }

  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.27, 28);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 28);
  const silver = toon('#aab2c0');
  const rimMat = toon('#3d434f');
  const caliperGeo = new THREE.BoxGeometry(0.16, 0.055, 0.003);
  const caliperMat = toon('#d8232f');
  const spokeGeo = new THREE.BoxGeometry(0.035, 0.23, 0.003);
  const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.003, 14);
  const wheelPositions: [number, number][] = [[wf, 1], [wf, -1], [wr, 1], [wr, -1]];
  for (const [wx, sz] of wheelPositions) {
    const wg = new THREE.Group(); wg.position.set(wx, 0.34, sz * 0.8); car.add(wg);
    add(wg, tireGeo, black).rotation.x = Math.PI / 2;
    const rim = add(wg, rimGeo, rimMat, 0, 0, sz * 0.14); rim.rotation.x = Math.PI / 2;
    const caliper = add(wg, caliperGeo, caliperMat, -0.113, 0.113, sz * 0.1515);
    caliper.name = 'wheel-caliper';
    caliper.rotation.z = Math.PI / 4;
    for (let i = 0; i < 5; i++) {
      const a = i * 2 * Math.PI / 5;
      const spoke = add(wg, spokeGeo, silver, -Math.sin(a) * 0.115, Math.cos(a) * 0.115, sz * 0.1545);
      spoke.name = 'wheel-spoke';
      spoke.rotation.z = a;
    }
    const hub = add(wg, hubGeo, silver, 0, 0, sz * 0.1555);
    hub.name = 'wheel-hub';
    hub.rotation.x = Math.PI / 2;
  }

  const plateGeo = new THREE.PlaneGeometry(0.33, 0.165);
  const plateTexture = ctex(512, 256, drawLicensePlate);
  const plateMat = toon('#d9dbd6', { map: plateTexture });
  const plateFront = add(car, plateGeo, plateMat, 2.275, 0.51, 0);
  plateFront.name = 'license-plate-front';
  plateFront.rotation.order = 'ZYX';
  plateFront.rotation.set(0, Math.PI / 2, 15 * Math.PI / 180);
  const plateRear = add(car, plateGeo, plateMat, -2.33, 0.52, 0);
  plateRear.name = 'license-plate-rear';
  plateRear.rotation.y = -Math.PI / 2;

  const wordmarkTexture = ctex(512, 64, drawRearWordmark);
  const wordmark = add(car, new THREE.PlaneGeometry(0.5, 0.04), toon('#8f9bb3', { map: wordmarkTexture }), -2.278, 0.698, 0);
  wordmark.name = 'rear-wordmark';
  wordmark.rotation.order = 'ZYX';
  wordmark.rotation.set(0, -Math.PI / 2, TAIL_TILT);

  const hazardLights: THREE.PointLight[] = [];
  for (const lx of [2.5, -2.5]) {
    for (const lz of [0.85, -0.85]) {
      const light = new THREE.PointLight('#ffa025', 0, 1.05, 1.5);
      light.position.set(lx, 0.45, lz);
      car.add(light);
      hazardLights.push(light);
    }
  }

  const bounds = new THREE.Box3().setFromObject(car);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  const ground = new THREE.Group();
  ground.name = 'porsche-ground';
  const decal = (
    name: string, geo: THREE.PlaneGeometry, mat: THREE.Material, x: number, z: number, renderOrder: number,
  ): void => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.renderOrder = renderOrder;
    ground.add(mesh);
  };
  const maskTex = (tex: THREE.CanvasTexture) => {
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  };
  const blobAlpha = () => maskTex(ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    const layers = 12;
    for (let i = 0; i < layers; i++) {
      const inset = 1.5 + (i / (layers - 1)) * (w * 0.15 - 1.5);
      const iw = w - inset * 2, ih = h - inset * 2;
      roundRect(g, inset, inset, iw, ih, Math.min(iw, ih) * 0.25);
      g.fill();
    }
  }));
  const ellipseAlpha = () => maskTex(ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.translate(w / 2, h / 2);
    g.scale(w / 2, h / 2);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#fff');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(-1, -1, 2, 2);
  }));
  const shadowMaterial = (opacity: number, alphaMap: THREE.Texture) => noOutline(new THREE.MeshBasicMaterial({
    color: '#04050b', alphaMap, transparent: true, opacity, depthWrite: false, side: THREE.FrontSide,
  }));

  decal('car-contact-shadow', new THREE.PlaneGeometry(size.x + 0.5, size.z + 0.5), shadowMaterial(0.8, blobAlpha()), center.x, center.z, 3);

  const tireShadowGeo = new THREE.PlaneGeometry(0.5, 0.3);
  const tireShadowMat = shadowMaterial(0.9, ellipseAlpha());
  for (const [wx, sz] of wheelPositions) decal('car-tire-shadow', tireShadowGeo, tireShadowMat, wx, sz * 0.8, 4);

  const tailAlpha = maskTex(ctex(128, 128, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.translate(w, h / 2);
    g.scale(w, h / 2);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(-1, -1, 2, 2);
  }));
  const tailGlowMat = noOutline(new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 0.14, 0.18), alphaMap: tailAlpha, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.FrontSide,
  }));
  decal('car-tail-glow', new THREE.PlaneGeometry(0.9, 1.4), tailGlowMat, bounds.min.x - 0.45, 0, 3);

  for (const obj of [car, ground]) {
    obj.position.set(...CAR_CENTER);
    obj.rotation.y = -Math.PI / 2;
    obj.scale.setScalar(CAR_SCALE);
  }

  return { group: car, ground, hazardMaterial, hazardLights, plateTexture, wordmarkTexture };
}
