import * as THREE from 'three';
import { toon, glow } from './materials';
import { add, box } from './primitives';
import { CAR_CENTER } from './layout';
import { contactShadow } from './wet-ground';

export interface CarBuild {
  group: THREE.Group;
  hazardMaterial: THREE.MeshBasicMaterial;
  hazardLights: THREE.PointLight[];
}

export function buildCar(): CarBuild {
  const car = new THREE.Group();
  car.name = 'porsche';
  const hazardMaterial = glow('#ffa21a', 1, { noOutline: true });
  const red = toon('#c8102a');
  const black = toon('#16171d');
  const darkGlass = toon('#1b2436', { glow: 0.05 });
  const wf = 1.2;
  const wr = -1.25;
  const arch = 0.44;

  const s = new THREE.Shape();
  s.moveTo(-2.12, 0.26);
  s.lineTo(wr - arch, 0.26); s.lineTo(wr - arch, 0.36); s.absarc(wr, 0.36, arch, Math.PI, 0, true); s.lineTo(wr + arch, 0.26);
  s.lineTo(wf - arch, 0.26); s.lineTo(wf - arch, 0.36); s.absarc(wf, 0.36, arch, Math.PI, 0, true); s.lineTo(wf + arch, 0.26);
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

  for (const sz of [-1, 1]) {
    const hl = add(car, new THREE.SphereGeometry(1, 20, 14), toon('#dfe8f5'), 2.085, 0.66, sz * 0.6);
    hl.scale.set(0.12, 0.02, 0.13);
    hl.rotation.z = -0.375;
    add(car, new THREE.SphereGeometry(0.018, 8, 6), hazardMaterial, 1.9, 0.71, sz * 0.8);
    add(car, new THREE.BoxGeometry(0.06, 0.035, 0.02), hazardMaterial, 1.5, 0.64, sz * 0.915);
  }

  box(car, 0.08, 0.12, 0.5, black, 2.22, 0.3, -0.55);
  box(car, 0.08, 0.12, 0.5, black, 2.22, 0.3, 0.55);
  box(car, 0.08, 0.1, 0.5, black, 2.25, 0.3, 0);

  const TAIL_TILT = -25 * (Math.PI / 180);
  box(car, 0.03, 0.06, 1.42, glow('#ff1f35', 1.6), -2.26, 0.66, 0).rotation.z = TAIL_TILT;
  for (const sz of [-1, 1]) {
    add(car, new THREE.BoxGeometry(0.02, 0.05, 0.1), hazardMaterial, -2.24, 0.69, sz * 0.77).rotation.z = TAIL_TILT;
  }
  box(car, 0.06, 0.08, 0.6, black, -2.3, 0.5, 0);

  box(car, 0.34, 0.02, 0.8, black, -1.96, 0.9, 0);
  box(car, 0.04, 0.02, 0.4, glow('#ff1f35', 1.3), -1.8, 0.915, 0);

  for (const sz of [-1, 1]) box(car, 0.16, 0.22, 0.04, black, -2.02, 0.88, sz * 0.42);
  const wing = box(car, 0.38, 0.035, 1.64, red, -2.05, 1.08, 0); wing.rotation.z = -0.08;
  box(car, 0.38, 0.02, 1.6, black, -2.05, 1.06, 0).rotation.z = -0.08;
  for (const sz of [-1, 1]) box(car, 0.42, 0.14, 0.02, black, -2.05, 1.01, sz * 0.83);

  box(car, 0.3, 0.14, 1.5, black, -2.12, 0.18, 0);
  for (const sz of [-1, 1]) {
    const ex = add(car, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 14), toon('#a3aab5'), -2.3, 0.3, sz * 0.42);
    ex.rotation.z = Math.PI / 2; ex.scale.set(1, 1, 1.5);
  }

  for (const sz of [-1, 1]) {
    box(car, 0.08, 0.04, 0.12, black, 0.6, 0.84, sz * 0.93);
    box(car, 0.12, 0.1, 0.16, red, 0.58, 0.88, sz * 1.02);
  }

  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.27, 28);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 28);
  const wheelPositions: [number, number][] = [[wf, 1], [wf, -1], [wr, 1], [wr, -1]];
  for (const [wx, sz] of wheelPositions) {
    const wg = new THREE.Group(); wg.position.set(wx, 0.34, sz * 0.8); car.add(wg);
    add(wg, tireGeo, black).rotation.x = Math.PI / 2;
    const rim = add(wg, rimGeo, toon('#3d434f'), 0, 0, sz * 0.14); rim.rotation.x = Math.PI / 2;
  }

  const hazardLights: THREE.PointLight[] = [];
  for (const lx of [2.5, -2.5]) {
    for (const lz of [0.85, -0.85]) {
      const light = new THREE.PointLight('#ffa025', 0, 1.05, 1.5);
      light.position.set(lx, 0.45, lz);
      car.add(light);
      hazardLights.push(light);
    }
  }

  contactShadow(car, 4.6, 1.9, 0, 0.025, 0);

  car.position.set(...CAR_CENTER);
  car.rotation.y = -Math.PI / 2;

  return { group: car, hazardMaterial, hazardLights };
}
