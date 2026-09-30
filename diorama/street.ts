import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, glow, noOutline } from './materials';
import { add, box, cyl, plane, rod, rand, pick, acUnit } from './primitives';
import type { Textures } from './textures';

const WALL_TILE_METERS = 1.2;

function wallMaterials(tex: THREE.Texture, w: number, h: number, d: number, tileY = true): THREE.Material[] {
  const faceSizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  return faceSizes.map(([fw, fh]) => {
    const face = tex.clone();
    face.wrapS = face.wrapT = THREE.RepeatWrapping;
    face.repeat.set(fw / WALL_TILE_METERS, tileY ? fh / WALL_TILE_METERS : 1);
    return toon('#fff', { map: face });
  });
}

interface Lamp {
  m: THREE.MeshBasicMaterial;
  base: THREE.Color;
}

function signalHead(parent: THREE.Object3D, x: number, y: number, z: number, ry: number, name?: string): Lamp[] {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  if (name) g.name = name;
  parent.add(g);
  box(g, 1.15, 0.36, 0.22, toon('#3a4150'), 0, -0.18, 0);
  return ['#35e0b0', '#ffc233', '#ff3b3b'].map((color, i) => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const lamp = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), m, -0.36 + i * 0.36, 0, 0.115);
    lamp.rotation.x = Math.PI / 2;
    box(g, 0.32, 0.03, 0.18, toon('#2b303b'), -0.36 + i * 0.36, 0.15, 0.2);
    return { m, base: new THREE.Color(color) };
  });
}

function stopSignGeometry(): THREE.BufferGeometry {
  const w = 256;
  const h = 230;
  const corners = [[4, 4], [128, 226], [252, 4]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(([px, py]) => [(px / w - 0.5) * 0.8, (0.5 - py / h) * 0.72, 0]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(corners.flatMap(([px, py]) => [px / w, 1 - py / h]), 2));
  g.computeVertexNormals();
  return g;
}

function pedHead(parent: THREE.Object3D, x: number, y: number, z: number, ry: number): Lamp[] {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  box(g, 0.34, 0.7, 0.2, toon('#3a4150'), 0, -0.35, 0);
  return ['#ff3b3b', '#35e0b0'].map((color, i) => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    plane(g, 0.24, 0.26, m, 0, 0.17 - i * 0.34, 0.102);
    return { m, base: new THREE.Color(color) };
  });
}

function streetLamp(scene: THREE.Scene, x: number, y0: number, z: number, ry: number, color = '#d6e6ff'): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  g.rotation.y = ry;
  scene.add(g);
  const pole = toon('#8e96a3');
  cyl(g, 0.06, 0.08, 5.0, pole, 0, 0, 0, 10);
  rod(g, new THREE.Vector3(0, 4.95, 0), new THREE.Vector3(0, 5.15, 0.4), 0.05, pole);
  rod(g, new THREE.Vector3(0, 5.15, 0.4), new THREE.Vector3(0, 5.15, 1.0), 0.05, pole);
  box(g, 0.22, 0.12, 0.5, toon('#5b6371'), 0, 5.05, 1.05);
  box(g, 0.18, 0.03, 0.42, glow(color, 2.4, { noOutline: true }), 0, 4.97, 1.05);
  const coneGeo = new THREE.ConeGeometry(1.5, 4.9, 24, 1, true);
  coneGeo.translate(0, -2.45, 0);
  add(
    g,
    coneGeo,
    noOutline(
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uColor; varying float vY; void main(){ float t = clamp(1.+vY/4.9, 0., 1.); gl_FragColor = vec4(uColor*.06*t*t, 1.); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    ),
    0,
    5.0,
    1.05,
  );
  const sl = new THREE.SpotLight(color, 30, 11, 0.85, 0.6, 1.3);
  sl.position.set(0, 4.95, 1.05);
  g.add(sl);
  sl.target.position.set(0, 0, 1.05);
  g.add(sl.target);
  return g;
}

function utilityPole(scene: THREE.Scene, x: number, y0: number, z: number, ry: number, textures: Textures, addr = false): (dx: number) => THREE.Vector3 {
  const poleMat = toon('#a8adb5');
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  g.rotation.y = ry;
  scene.add(g);
  cyl(g, 0.12, 0.16, 8.4, poleMat, 0, 0, 0, 12);
  for (let i = 0; i < 6; i++) cyl(g, 0.165, 0.165, 0.2, toon(i % 2 ? '#1c1c1c' : '#f2c230'), 0, 0.2 + i * 0.2, 0, 12);
  box(g, 1.6, 0.1, 0.1, toon('#6b727d'), 0, 7.7, 0);
  box(g, 1.2, 0.1, 0.1, toon('#6b727d'), 0, 7.1, 0);
  for (const dx of [-0.7, -0.25, 0.25, 0.7]) cyl(g, 0.04, 0.05, 0.14, toon('#e8ecef'), dx, 7.8, 0, 8);
  cyl(g, 0.22, 0.22, 0.6, toon('#8f98a3'), 0, 6.0, 0.3, 14);
  for (let i = 0; i < 8; i++) box(g, 0.14, 0.03, 0.03, toon('#555'), 0.12 * (i % 2 ? 1 : -1), 2.4 + i * 0.45, 0);
  if (addr) plane(g, 0.24, 0.9, toon('#fff', { map: textures.addressPlate, glow: 0.25 }), 0, 2.4, 0.165);
  g.updateMatrixWorld();
  return (dx: number) => new THREE.Vector3(dx, 7.82, 0).applyMatrix4(g.matrixWorld);
}

function wire(scene: THREE.Scene, a: THREE.Vector3, b: THREE.Vector3, sag = 0.7): void {
  const wireMat = noOutline(new THREE.MeshBasicMaterial({ color: '#0d0f16' }));
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  add(scene, new THREE.TubeGeometry(curve, 28, 0.018, 4), wireMat);
}

function guardrail(scene: THREE.Scene, a: THREE.Vector3, b: THREE.Vector3): void {
  const m = toon('#e6eaef');
  const len = a.distanceTo(b);
  const n = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    cyl(scene, 0.035, 0.035, 0.85, m, p.x, p.y, p.z, 8);
  }
  rod(scene, a.clone().setY(a.y + 0.85), b.clone().setY(b.y + 0.85), 0.04, m);
  rod(scene, a.clone().setY(a.y + 0.5), b.clone().setY(b.y + 0.5), 0.025, m);
}

function bike(scene: THREE.Scene, x: number, y: number, z: number, ry: number, color: string): void {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.rotation.x = 0.05;
  scene.add(g);
  const tire = toon('#1a1b22');
  const fr = toon(color);
  const mt = toon('#c9ced6');
  const spoke = toon('#c9ced6', { noOutline: true });
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.028, 8, 28);
  add(g, wheelGeo, tire, -0.5, 0.33, 0);
  add(g, wheelGeo, tire, 0.5, 0.33, 0);
  for (const wx of [-0.5, 0.5]) {
    for (let i = 0; i < 6; i++) {
      const s = add(g, new THREE.BoxGeometry(0.006, 0.58, 0.006), spoke, wx, 0.33, 0);
      s.rotation.z = (i * Math.PI) / 6;
    }
  }
  rod(g, new THREE.Vector3(-0.5, 0.33, 0), new THREE.Vector3(-0.1, 0.36, 0), 0.02, fr);
  rod(g, new THREE.Vector3(-0.1, 0.36, 0), new THREE.Vector3(-0.2, 0.78, 0), 0.02, fr);
  rod(g, new THREE.Vector3(-0.1, 0.36, 0), new THREE.Vector3(0.38, 0.72, 0), 0.022, fr);
  rod(g, new THREE.Vector3(0.5, 0.33, 0), new THREE.Vector3(0.4, 0.86, 0), 0.02, fr);
  rod(g, new THREE.Vector3(0.4, 0.86, -0.25), new THREE.Vector3(0.4, 0.86, 0.25), 0.015, mt);
  rod(g, new THREE.Vector3(-0.5, 0.33, 0), new THREE.Vector3(-0.2, 0.7, 0), 0.015, fr);
  box(g, 0.22, 0.05, 0.12, toon('#2a2a30'), -0.22, 0.8, 0);
  box(g, 0.28, 0.2, 0.32, toon('#b8c0cc', { opacity: 0.9 }), 0.58, 0.72, 0);
  box(g, 0.35, 0.03, 0.2, mt, -0.55, 0.64, 0);
  rod(g, new THREE.Vector3(-0.5, 0.64, 0), new THREE.Vector3(-0.5, 0.33, 0), 0.012, mt);
}

export interface Street {
  vehicleSignals: Lamp[][];
  pedestrianSignals: Lamp[][];
  signalLight: THREE.PointLight;
  tvMaterial: THREE.Material;
}

export function buildStreet(scene: THREE.Scene, textures: Textures): Street {
  {
    const g = new THREE.Group();
    g.position.set(-6.4, 0.15, 2.9);
    g.rotation.y = -0.6;
    scene.add(g);
    cyl(g, 0.12, 0.14, 4.3, toon('#c9ced6'), 0, 0, 0, 12);
    box(g, 0.34, 1.9, 1.55, toon('#1e2438'), 0, 4.1, 0);
    const pm = new THREE.MeshBasicMaterial({ map: textures.pylon, color: new THREE.Color(0.95, 0.95, 0.95), toneMapped: false });
    plane(g, 1.45, 1.76, pm, 0.175, 5.05, 0, Math.PI / 2);
    plane(g, 1.45, 1.76, pm, -0.175, 5.05, 0, -Math.PI / 2);
    for (const y of [4.12, 5.96]) box(g, 0.36, 0.035, 1.56, glow('#e8fff9', 2.2, { noOutline: true }), 0, y, 0);
    const l = new THREE.PointLight('#c8f3ec', 4, 7, 1.4);
    l.position.set(0.8, 4.8, 0);
    g.add(l);
  }

  streetLamp(scene, -8.8, 0.15, 3.9, 0);
  streetLamp(scene, 12.2, 0.15, -5.5, -Math.PI / 2);
  streetLamp(scene, -2.5, 0.15, 12.0, Math.PI);

  const P1 = utilityPole(scene, 4.3, 0.15, -10.8, 0.55, textures, true);
  const P2 = utilityPole(scene, -11.8, 0.15, 4.0, 0.55, textures);
  const P3 = utilityPole(scene, 12.2, 0.15, 1.8, 0, textures, true);
  for (const dx of [-0.7, 0.7]) wire(scene, P1(dx), P2(dx), 1.1);
  wire(scene, P1(-0.25), P3(-0.25), 0.5);
  wire(scene, P1(0.25), P3(0.25), 0.55);
  wire(scene, P1(0.7), new THREE.Vector3(4.9, 7.5, -13), 0.2);
  wire(scene, P1(-0.7), new THREE.Vector3(3.7, 7.5, -13), 0.2);
  wire(scene, P2(-0.7), new THREE.Vector3(-13, 7.5, 3.3), 0.15);
  wire(scene, P2(0.7), new THREE.Vector3(-13, 7.5, 4.8), 0.15);
  wire(scene, P2(0.25), new THREE.Vector3(-11.8, 7.4, 13), 0.5);
  wire(scene, P3(0.7), new THREE.Vector3(13, 7.5, 7.5), 0.3);
  wire(scene, P3(-0.7), new THREE.Vector3(13, 7.4, -4), 0.3);
  wire(scene, P1(-0.25), new THREE.Vector3(3.4, 4.3, -8.9), 0.3);

  const sigMat = toon('#8e96a3');
  cyl(scene, 0.1, 0.12, 5.4, sigMat, 4.55, 0.15, 4.55, 12);
  rod(scene, new THREE.Vector3(4.55, 5.2, 4.55), new THREE.Vector3(4.55, 5.2, 8.0), 0.06, sigMat);
  const mainSignal = signalHead(scene, 4.72, 5.5, 7.6, Math.PI / 2, 'signal-main');
  const pedA = pedHead(scene, 4.55, 2.9, 4.72, 0);
  const pedB = pedHead(scene, 4.72, 2.9, 4.4, Math.PI / 2);

  cyl(scene, 0.1, 0.12, 5.4, sigMat, 11.8, 0.15, 11.8, 12);
  rod(scene, new THREE.Vector3(11.8, 5.0, 11.8), new THREE.Vector3(11.8, 5.0, 8.4), 0.06, sigMat);
  const farSignal = signalHead(scene, 11.64, 5.3, 8.9, -Math.PI / 2, 'signal-far');
  const signalLight = new THREE.PointLight('#35e0b0', 2.5, 7, 1.4);
  signalLight.position.set(5.3, 5.0, 7.6);
  scene.add(signalLight);

  guardrail(scene, new THREE.Vector3(4.62, 0.15, -12.6), new THREE.Vector3(4.62, 0.15, 0.9));
  guardrail(scene, new THREE.Vector3(-12.6, 0.15, 4.62), new THREE.Vector3(-7.4, 0.15, 4.62));
  guardrail(scene, new THREE.Vector3(-12.6, 0.15, 11.38), new THREE.Vector3(0.8, 0.15, 11.38));
  guardrail(scene, new THREE.Vector3(4.8, 0.15, 11.38), new THREE.Vector3(12.6, 0.15, 11.38));

  const hedge = toon('#2c5a4a');
  const hedges: [number, number, number, number][] = [
    [-8, 12.55, 9, 0.6],
    [4.5, 12.55, 15, 0.6],
    [12.55, -8.5, 0.6, 8.5],
    [12.55, -0.6, 0.6, 3.6],
  ];
  for (const [x, z, w, d] of hedges) {
    box(scene, w, 0.55, d, hedge, x, 0.15, z);
    for (let i = 0; i < w * d * 3; i++) {
      add(scene, new THREE.SphereGeometry(0.05, 6, 4), toon(pick(['#ffd6e8', '#fff3b0', '#ffffff']), { noOutline: true }), x + rand(-w / 2, w / 2), 0.72, z + rand(-d / 2, d / 2));
    }
  }

  let tvMaterial!: THREE.Material;
  {
    const neighborBuilding = new THREE.Group();
    neighborBuilding.name = 'neighbor-building';
    scene.add(neighborBuilding);
    const b = neighborBuilding;
    box(b, 5.4, 3.35, 9.5, wallMaterials(textures.wallTile1f, 5.4, 3.35, 9.5), -10.3, 0.15, -8.25).name = 'neighbor-wall-1f';
    box(b, 5.4, 3.45, 9.5, wallMaterials(textures.wallMortar2f, 5.4, 3.45, 9.5, false), -10.3, 3.5, -8.25).name = 'neighbor-wall-2f';
    box(b, 5.5, 0.12, 9.6, toon('#c9c5ba'), -10.3, 3.44, -8.25).name = 'neighbor-floor-line';
    cyl(b, 0.04, 0.04, 6.8, toon('#9aa0aa'), -7.75, 0.15, -3.4, 8).name = 'neighbor-rain-pipe';
    box(b, 0.15, 0.5, 0.4, toon('#8e96a3'), -7.525, 1.15, -6.4).name = 'neighbor-meter';
    box(b, 5.6, 0.25, 9.7, toon('#5f6678'), -10.3, 6.95, -8.25);
    plane(b, 3.2, 2.3, glow('#fff', 0.06, { map: textures.kissaFront, noOutline: true }), -10.6, 1.35, -3.49).name = 'kissa-front';
    const closedSign = new THREE.Group();
    closedSign.name = 'kissa-closed-sign';
    closedSign.position.set(-9.52, 1.7, -3.47);
    b.add(closedSign);
    box(closedSign, 0.4, 0.2, 0.02, toon('#5b3520'), 0, -0.1, 0);
    plane(closedSign, 0.36, 0.16, glow('#fff', 0.85, { map: textures.kissaClosed, noOutline: true }), 0, 0, 0.011);
    box(b, 3.6, 0.08, 0.6, toon('#a8454a'), -10.6, 2.65, -3.2);
    plane(b, 2.2, 0.55, toon('#fff', { map: textures.kissa, glow: 0.15 }), -10.6, 3.1, -3.49);
    function win(x: number, y: number, z: number, ry: number, mat: THREE.Material): THREE.Group {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      b.add(g);
      box(g, 1.3, 1.1, 0.06, toon('#3b4150'), 0, -0.55, 0);
      plane(g, 1.16, 0.96, mat, 0, 0, 0.035);
      box(g, 0.03, 0.96, 0.02, toon('#3b4150'), 0, -0.48, 0.05);
      return g;
    }
    win(-11.6, 4.8, -3.5, 0, glow('#ffc97a', 1.05, { map: textures.curtain }));
    win(-9.2, 4.8, -3.5, 0, toon('#26304a', { map: textures.curtain }));
    box(b, 3.8, 0.06, 0.7, toon('#4f5666'), -10.4, 3.9, -3.15);
    for (let i = 0; i <= 12; i++) box(b, 0.03, 0.8, 0.03, toon('#c3c8d0'), -12.3 + i * 0.32, 3.96, -2.82);
    box(b, 3.84, 0.04, 0.05, toon('#c3c8d0'), -10.4, 4.76, -2.82);
    win(-7.59, 4.8, -5.2, Math.PI / 2, glow('#e8f2ff', 0.85, { map: textures.curtain }));
    const tvWin = win(-7.59, 4.8, -8.4, Math.PI / 2, glow('#7fa8ff', 0.9, { map: textures.curtain }));
    tvMaterial = (tvWin.children[1] as THREE.Mesh).material as THREE.Material;
    win(-7.59, 2.2, -10.4, Math.PI / 2, toon('#26304a', { map: textures.curtain }));
    const waterTank = new THREE.Group();
    waterTank.name = 'neighbor-water-tank';
    b.add(waterTank);
    cyl(waterTank, 0.6, 0.6, 1.2, toon('#b8bec8'), -11.5, 7.2, -10.5, 16);
    for (const [dx, dz] of [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ]) box(waterTank, 0.06, 0.4, 0.06, toon('#6b727d'), -11.5 + dx, 7.2, -10.5 + dz);
    const antenna = new THREE.Group();
    antenna.name = 'neighbor-antenna';
    b.add(antenna);
    rod(antenna, new THREE.Vector3(-9, 7.2, -6), new THREE.Vector3(-9, 8.6, -6), 0.02, toon('#8e96a3'));
    box(antenna, 1.2, 0.03, 0.03, toon('#8e96a3'), -9, 8.3, -6);

    const balconyPole = rod(b, new THREE.Vector3(-12.2, 5.1, -3.0), new THREE.Vector3(-8.6, 5.1, -3.0), 0.02, toon('#c3c8d0'));
    balconyPole.name = 'balcony-pole';
    for (const x of [-12.2, -8.6]) box(b, 0.05, 1.14, 0.05, toon('#c3c8d0'), x, 3.96, -3.0).name = 'balcony-pole-bracket';
    const hangerLeg = (side: number): THREE.BufferGeometry =>
      new THREE.BoxGeometry(0.012, 0.227, 0.012).rotateZ(side * Math.atan(0.15 / 0.17)).translate(side * 0.075, -0.115, 0);
    const hanger = mergeGeometries([
      new THREE.TorusGeometry(0.03, 0.006, 6, 12).rotateY(Math.PI / 2),
      hangerLeg(1),
      hangerLeg(-1),
      new THREE.BoxGeometry(0.3, 0.012, 0.012).translate(0, -0.2, 0),
    ]);
    for (const x of [-11.6, -10.9, -10.2, -9.5]) add(b, hanger, toon('#9aa0aa'), x, 5.1, -3.0).name = 'balcony-hanger';
    const potMaterials = [toon('#b5654a'), toon('#4f9a5c')];
    for (const x of [-12.0, -11.5, -8.9]) {
      const pot = new THREE.CylinderGeometry(0.14, 0.1, 0.22, 10).translate(0, 0.11, 0);
      const plant = new THREE.SphereGeometry(0.16, 8, 6).translate(0, 0.36, 0);
      add(b, mergeGeometries([pot, plant], true), potMaterials, x, 3.96, -3.15).name = 'balcony-pot';
    }
    const acSide = toon('#d5d9df');
    box(b, 0.7, 0.5, 0.3, [acSide, acSide, acSide, acSide, toon('#fff', { map: textures.acFront }), acSide], -10.2, 3.96, -3.2).name = 'balcony-ac';

    const parapet = new THREE.Group();
    parapet.name = 'neighbor-parapet';
    b.add(parapet);
    const parapetMaterial = toon('#c9c5ba');
    box(parapet, 5.6, 0.3, 0.14, parapetMaterial, -10.3, 7.2, -13.03);
    box(parapet, 5.6, 0.3, 0.14, parapetMaterial, -10.3, 7.2, -3.47);
    box(parapet, 0.14, 0.3, 9.4, parapetMaterial, -13.03, 7.2, -8.25);
    box(parapet, 0.14, 0.3, 9.4, parapetMaterial, -7.57, 7.2, -8.25);
    const stairHouse = new THREE.Group();
    stairHouse.name = 'neighbor-stair-house';
    stairHouse.position.set(-11.9, 7.2, -7.5);
    b.add(stairHouse);
    box(stairHouse, 1.6, 1.5, 1.6, toon('#b9b5aa'), 0, 0, 0);
    plane(stairHouse, 0.6, 1.1, toon('#4a5566'), 0.81, 0.55, 0, Math.PI / 2).name = 'neighbor-stair-door';
    const rackPost = (x: number, z: number): THREE.BufferGeometry => new THREE.BoxGeometry(0.04, 1.1, 0.04).translate(x, 0.55, z);
    const rackBar = (z: number): THREE.BufferGeometry => new THREE.BoxGeometry(1.6, 0.03, 0.03).translate(0, 1.05, z);
    add(
      b,
      mergeGeometries([rackPost(-0.75, -0.2), rackPost(-0.75, 0.2), rackPost(0.75, -0.2), rackPost(0.75, 0.2), rackBar(-0.2), rackBar(0.2)]),
      toon('#8e96a3'),
      -11.0,
      7.2,
      -12.3,
    ).name = 'neighbor-drying-rack';

    acUnit(scene, -6.25, 0.15, -4.6, -Math.PI / 2);
    acUnit(scene, -6.25, 0.15, -6.0, -Math.PI / 2);
    acUnit(scene, -6.25, 1.9, -6.0, -Math.PI / 2);
    box(scene, 0.35, 0.06, 1.2, toon('#6b727d'), -6.2, 1.85, -6.0);
    rod(scene, new THREE.Vector3(-6.05, 0.5, -4.6), new THREE.Vector3(-6.05, 3.6, -4.6), 0.035, toon('#d8dce2'));
    rod(scene, new THREE.Vector3(-6.05, 0.5, -6.3), new THREE.Vector3(-6.05, 3.6, -6.3), 0.035, toon('#d8dce2'));
    box(scene, 0.5, 0.35, 0.4, toon('#e0b83a'), -7.2, 0.15, -9.2);
    box(scene, 0.5, 0.35, 0.4, toon('#3a7bd5'), -7.2, 0.5, -9.2);
    for (let i = 0; i < 3; i++) {
      const bag = add(scene, new THREE.SphereGeometry(0.28, 12, 10), toon(i % 2 ? '#dfe7f0' : '#a9c7e8', { opacity: 0.9 }), -7.15 + rand(-0.1, 0.1), 0.38, -11.2 + i * 0.4);
      bag.scale.set(1, 0.85, 1);
    }
    cyl(scene, 0.22, 0.2, 0.45, toon('#4a8f5f'), -6.35, 0.15, -8.1, 14);
  }

  {
    const stopSignSide = new THREE.Group();
    stopSignSide.name = 'stop-sign-side';
    scene.add(stopSignSide);
    cyl(stopSignSide, 0.03, 0.03, 2.6, toon('#dfe3ea'), 11.55, 0.15, 0.3, 8);
    const face = stopSignGeometry();
    add(stopSignSide, face, toon('#fff', { map: textures.stopSign, glow: 0.3 }), 11.55, 2.45, 0.26, Math.PI);
    add(stopSignSide, face, toon('#8e96a3'), 11.55, 2.45, 0.28, 0);
  }

  {
    cyl(scene, 0.04, 0.04, 2.9, toon('#ff7a1a'), -6.25, 0.15, -2.75, 8);
    const mg = new THREE.Group();
    mg.position.set(-6.25, 3.0, -2.75);
    mg.rotation.y = -0.9;
    scene.add(mg);
    const ring = add(mg, new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24), toon('#ff7a1a'), 0, 0, 0);
    ring.rotation.x = Math.PI / 2;
    add(mg, new THREE.CircleGeometry(0.3, 24), glow('#9fb8e0', 0.7), 0, 0, 0.035);
  }

  bike(scene, -4.8, 0.156, -2.4, 0.05, '#8fd1c4');
  bike(scene, -10.9, 0.15, -1.5, Math.PI / 2 + 0.1, '#f2f2f2');
  bike(scene, -10.1, 0.15, -1.6, Math.PI / 2 - 0.05, '#e8a0b4');
  box(scene, 2.2, 0.06, 0.06, toon('#9aa0aa'), -10.5, 0.4, -2.5);

  {
    const g = new THREE.Group();
    g.position.set(-12.2, 0.15, -3.2);
    scene.add(g);
    for (const dx of [-0.75, 0.75]) box(g, 0.08, 2.2, 0.08, toon('#6b4a33'), dx, 0, 0);
    box(g, 1.6, 1.1, 0.08, toon('#5a3d2a'), 0, 0.95, 0);
    plane(g, 1.5, 1.0, toon('#fff', { map: textures.notice, glow: 0.12 }), 0, 1.5, 0.045);
    box(g, 1.8, 0.06, 0.4, toon('#4a3325'), 0, 2.2, 0.1);
  }

  box(scene, 2.0, 1.9, 1.6, toon('#8a94a3'), -4.2, 0.15, -11.5);
  box(scene, 2.3, 0.08, 1.9, toon('#5f6b7c'), -4.2, 2.05, -11.5);
  box(scene, 11.8, 1.3, 0.18, toon('#9b9fa6'), -1.7, 0.15, -12.8);
  cyl(scene, 0.12, 0.16, 1.8, toon('#5a4636'), 2.2, 0.15, -11.3, 10);
  for (const [x, y, z, r] of [
    [2.2, 2.6, -11.3, 1.1],
    [2.8, 3.2, -11.0, 0.8],
    [1.6, 3.3, -11.6, 0.75],
    [2.4, 3.8, -11.5, 0.6],
  ]) add(scene, new THREE.IcosahedronGeometry(r, 1), toon('#2f5b4c'), x, y, z);
  for (let i = 0; i < 3; i++) box(scene, 0.5, 0.3, 0.35, toon(i % 2 ? '#3a7bd5' : '#e0b83a'), -1.2 + (i > 1 ? 0.55 : 0), 0.15 + (i === 1 ? 0.3 : 0), -9.4);
  box(scene, 0.9, 2.0, 0.05, toon('#8d96a5'), -2.5, 0.15, -9.03);

  return {
    vehicleSignals: [mainSignal, farSignal],
    pedestrianSignals: [pedA, pedB],
    signalLight,
    tvMaterial,
  };
}
