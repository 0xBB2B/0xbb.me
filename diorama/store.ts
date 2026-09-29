import * as THREE from 'three';
import { toon, glow, noOutline, sharedTime, toonGradientMap } from './materials';
import { add, box, cyl, plane, flat, rod, rand, pick, acUnit } from './primitives';
import { TEAL, ORANGE, type Textures } from './textures';
import { contactShadow } from './wet-ground';

const GLSL_HASH = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }`;
const UV_VERTEX_SHADER = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

export function glassRainMaterial(w: number, h: number): THREE.ShaderMaterial {
  return noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uTime: sharedTime, uSize: { value: new THREE.Vector2(w, h) }, uSeed: { value: Math.random() * 100 } },
      vertexShader: UV_VERTEX_SHADER,
      fragmentShader: `uniform float uTime; uniform vec2 uSize; uniform float uSeed; varying vec2 vUv; ${GLSL_HASH}
        void main(){ vec2 p=vUv*uSize; float cols=8.;
          float cx=p.x*cols; float id=floor(cx); float fx=fract(cx)-.5;
          float h=fract(sin(id*1.37+uSeed)*43758.5453); float sp=.12+.3*h;
          float head=uSize.y*(1.-fract(uTime*sp/uSize.y+h*5.3));
          float dy=p.y-head; float fxw=fx+sin(p.y*5.+h*20.)*.12;
          float drop=smoothstep(.2,.05,length(vec2(fxw,dy*cols*.8)));
          float trail=smoothstep(.09,0.,abs(fxw))*step(0.,dy)*exp(-dy*2.2)*.5;
          vec2 gq=p*16.; vec2 gi=floor(gq); vec2 gf=fract(gq)-.5; float gh=hash(gi+uSeed);
          float bead=step(.8,gh)*smoothstep(.2,.06,length(gf-(vec2(hash(gi+1.7),hash(gi+4.1))-.5)*.5));
          float a=(drop+trail)*step(.45,h)+bead*.5;
          gl_FragColor=vec4(vec3(.8,.9,1.)*a*.5,1.); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

const glassMat = noOutline(
  new THREE.MeshPhongMaterial({ color: '#9fc2ee', specular: '#ffffff', shininess: 90, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
);

function glassPane(parent: THREE.Object3D, w: number, h: number, x: number, yc: number, z: number, ry = 0, rain = true): void {
  plane(parent, w, h, glassMat, x, yc, z, ry).renderOrder = 1;
  if (rain) {
    const nx = Math.sin(ry) * 0.02;
    const nz = Math.cos(ry) * 0.02;
    plane(parent, w, h, glassRainMaterial(w, h), x + nx, yc, z + nz, ry).renderOrder = 2;
  }
}

interface InstEntry {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
  rx: number;
  ry: number;
  rz: number;
}

export interface Store {
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  fasciaMaterial: THREE.MeshBasicMaterial;
  noboris: THREE.Group[];
}

export function buildStore(scene: THREE.Scene, textures: Textures): Store {
  const st = new THREE.Group();
  st.name = 'store';
  st.position.set(0, 0, -2);
  scene.add(st);

  const extWall = toon('#dde2ea', { frontLitOnly: true });
  const inWall = toon('#fff3de', { glow: 0.32 });
  const metal = toon('#4b5263');
  const steel = toon('#b9c1cc');
  const floorMat = toon('#f1ece1', { map: textures.floor, glow: 0.3 });

  box(st, 9.5, 0.1, 6, floorMat, -1.25, 0.15, -4);
  box(st, 9.5, 3.65, 0.2, extWall, -1.25, 0.15, -6.9);
  box(st, 0.2, 3.65, 6, extWall, -5.9, 0.15, -4);
  box(st, 0.2, 3.65, 1.8, extWall, 3.4, 0.15, -6.1);
  box(st, 0.2, 3.65, 0.6, extWall, 3.4, 0.15, -1.3);
  box(st, 0.2, 0.7, 3.6, extWall, 3.4, 0.15, -3.4);
  box(st, 0.2, 1.4, 3.6, extWall, 3.4, 2.4, -3.4);
  glassPane(st, 3.6, 1.55, 3.51, 1.625, -3.4, Math.PI / 2);
  box(st, 9.5, 1.25, 0.2, extWall, -1.25, 2.55, -1.1);
  box(st, 5.4, 0.2, 0.2, metal, -3.3, 0.15, -1.1);
  box(st, 2.1, 0.2, 0.2, metal, 2.45, 0.15, -1.1);
  for (const x of [-4.2, -2.4, -0.6, 1.4, 2.45]) box(st, 0.09, 2.2, 0.14, metal, x, 0.35, -1.05);
  box(st, 9.5, 0.1, 0.14, metal, -1.25, 2.5, -1.05);
  const frontPanes: [number, number][] = [
    [-5.0, 1.6],
    [-3.3, 1.71],
    [-1.5, 1.71],
    [1.925, 0.96],
    [2.9, 0.81],
  ];
  for (const [x, w] of frontPanes) glassPane(st, w, 2.15, x, 1.425, -1.04);

  box(st, 9.1, 3.2, 0.02, inWall, -1.25, 0.25, -6.79);
  box(st, 0.02, 3.2, 5.6, inWall, -5.79, 0.25, -4);
  box(st, 0.02, 3.2, 1.5, inWall, 3.29, 0.25, -6.05);
  box(st, 9.1, 0.9, 0.02, inWall, -1.25, 2.55, -1.21);
  box(st, 9.1, 0.06, 5.6, toon('#f8f4ea', { glow: 0.45 }), -1.25, 3.42, -4);
  for (const z of [-2.2, -3.6, -5.0]) box(st, 7.6, 0.04, 0.22, glow('#fff3de', 1.4), -1.2, 3.37, z);

  box(st, 9.9, 1.0, 0.34, toon('#1e2438'), -1.25, 2.72, -0.83);
  const fasciaMaterial = new THREE.MeshBasicMaterial({ map: textures.fascia, color: new THREE.Color(0.95, 0.95, 0.95), toneMapped: false });
  plane(st, 9.8, 0.93, fasciaMaterial, -1.25, 3.22, -0.655);
  for (const y of [2.73, 3.69]) box(st, 9.9, 0.035, 0.03, glow('#fff1d8', 2.2, { noOutline: true }), -1.25, y, -0.66);
  box(st, 0.02, 0.8, 0.3, glow(TEAL, 1.2), 3.61, 2.82, -0.83);
  box(st, 9.9, 0.1, 1.62, toon('#2a3043'), -1.25, 2.6, -0.2);
  box(st, 9.9, 0.14, 0.06, toon(TEAL, { glow: 0.25 }), -1.25, 2.58, 0.6);
  for (const x of [-5, -3, -1, 1, 3]) cyl(st, 0.1, 0.1, 0.02, glow('#ffe9c4', 2.2, { noOutline: true }), x, 2.575, -0.2, 12);
  box(st, 9.9, 0.3, 6.4, toon('#3a4052', { frontLitOnly: true }), -1.25, 3.8, -4);
  box(st, 9.9, 0.28, 0.12, extWall, -1.25, 4.1, -0.86);
  box(st, 9.9, 0.28, 0.12, extWall, -1.25, 4.1, -7.14);
  box(st, 0.12, 0.28, 6.4, extWall, -6.14, 4.1, -4);
  box(st, 0.12, 0.28, 6.4, extWall, 3.64, 4.1, -4);
  acUnit(st, -4.2, 4.1, -5.6);
  acUnit(st, -3.1, 4.1, -5.6);
  acUnit(st, 1.8, 4.1, -6.3);
  box(st, 0.5, 0.5, 0.5, toon('#b5bcc6'), 0.4, 4.1, -3.2);
  cyl(st, 0.05, 0.05, 0.8, steel, 0.4, 4.6, -3.2, 8);

  const doorLeft = new THREE.Group();
  const doorRight = new THREE.Group();
  const doors: [THREE.Group, number][] = [
    [doorLeft, -0.1],
    [doorRight, 0.9],
  ];
  for (const [g, x] of doors) {
    g.position.set(x, 0, -1.26);
    st.add(g);
    plane(g, 0.96, 2.2, glassMat, 0, 1.35, 0).renderOrder = 1;
    box(g, 1.0, 0.06, 0.05, steel, 0, 0.25, 0);
    box(g, 1.0, 0.06, 0.05, steel, 0, 2.39, 0);
    box(g, 0.05, 2.2, 0.05, steel, -0.48, 0.25, 0);
    box(g, 0.05, 2.2, 0.05, steel, 0.48, 0.25, 0);
    plane(g, 0.5, 0.094, toon('#fff', { map: textures.door, glow: 0.4 }), 0, 1.2, 0.03);
  }
  box(st, 0.3, 0.08, 0.1, toon('#2c3140'), 0.4, 2.42, -0.99);
  cyl(st, 0.018, 0.018, 0.01, glow('#ff4040', 2, { noOutline: true }), 0.48, 2.44, -0.935, 8).rotation.x = Math.PI / 2;

  box(st, 1.9, 0.02, 1.0, toon('#2c3140'), 0.4, 0.156, -0.45);
  flat(st, 1.8, 0.9, toon('#fff', { map: textures.mat }), 0.4, 0.178, -0.45);

  plane(st, 0.62, 0.87, toon('#fff', { map: textures.posterOden, glow: 0.35 }), -3.3, 1.0, -0.975);
  plane(st, 0.55, 0.77, toon('#fff', { map: textures.posterNiku, glow: 0.35 }), 2.9, 0.95, -0.975);
  plane(st, 0.55, 0.77, toon('#fff', { map: textures.posterIchigo, glow: 0.35 }), -5.0, 1.95, -0.975);

  const interior = new THREE.Group();
  st.add(interior);

  const instLists: Record<string, InstEntry[]> = {};
  function inst(kind: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, rx = 0, ry = 0, rz = 0): void {
    (instLists[kind] ||= []).push({ x, y, z, sx, sy, sz, color, rx, ry, rz });
  }
  const PRODUCT_COLS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f45', '#f7f7f7', '#c77dff', '#ff5d8f', '#2ec4b6', '#e63946', '#ffbe0b', '#8ecae6', '#fefae0'];
  const DRINK_COLS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ecae6', '#fefae0', '#6a994e', '#ff8fab', '#3a86ff', '#ffbe0b'];

  {
    const x0 = -5.75;
    const x1 = -0.8;
    const zb = -6.78;
    const dep = 0.62;
    const w = x1 - x0;
    const xc = (x0 + x1) / 2;
    const zf = zb + dep;
    box(interior, w, 0.34, dep, toon('#1f6f8b'), xc, 2.2, zb + dep / 2);
    plane(interior, w - 0.1, 0.24, glow('#ffffff', 1.1, { map: textures.cooler }), xc, 2.37, zf + 0.005);
    box(interior, w, 0.25, dep, metal, xc, 0.25, zb + dep / 2);
    box(interior, w, 1.95, 0.02, glow('#e6f4ff', 1.15, { noOutline: true }), xc, 0.5, zb + 0.03);
    for (const x of [x0, x1]) box(interior, 0.06, 1.95, dep, metal, x, 0.5, zb + dep / 2);
    const shelves = [0.5, 0.85, 1.2, 1.55, 1.9];
    for (const y of shelves) {
      if (y > 0.5) box(interior, w, 0.02, dep - 0.08, toon('#e8eef5', { glow: 0.5 }), xc, y - 0.02, zb + dep / 2);
      for (let x = x0 + 0.08; x < x1 - 0.06; x += 0.1) {
        const c = pick(DRINK_COLS);
        const hh = rand(0.18, 0.26);
        inst('bottle', x, y, zf - 0.14, 0.037, hh, 0.037, c);
        inst('bottle', x + 0.02, y, zf - 0.34, 0.037, hh, 0.037, c);
      }
    }
    for (let i = 0; i <= 6; i++) box(interior, 0.04, 1.95, 0.04, steel, x0 + i * (w / 6), 0.5, zf);
    for (let i = 0; i < 6; i++) box(interior, 0.02, 0.5, 0.03, toon('#e3e8ee'), x0 + i * (w / 6) + 0.12, 1.1, zf + 0.04);
    plane(interior, w, 1.95, glassMat, xc, 1.475, zf + 0.02).renderOrder = 1;
  }
  box(interior, 0.7, 2.1, 0.05, toon('#9aa3b2', { glow: 0.15 }), -0.3, 0.25, -6.76);
  plane(interior, 0.5, 0.125, toon('#fff', { map: textures.staffOnly, glow: 0.3 }), -0.3, 1.9, -6.73);
  cyl(interior, 0.02, 0.02, 0.14, steel, -0.05, 1.2, -6.72, 8);
  box(interior, 2.9, 1.0, 0.35, toon('#e9e2d4', { glow: 0.2 }), 1.75, 0.25, -6.6);
  plane(interior, 2.8, 0.95, new THREE.MeshBasicMaterial({ map: textures.cigarette, color: new THREE.Color(1.05, 1.05, 1.05) }), 1.75, 1.85, -6.765);
  box(interior, 2.85, 0.42, 0.1, toon('#1d2340'), 1.75, 2.42, -6.72);
  plane(interior, 2.8, 0.4, glow('#ffffff', 1.25, { map: textures.menu }), 1.75, 2.63, -6.665);
  box(interior, 3.0, 1.0, 0.56, toon('#f3efe6', { glow: 0.25 }), 1.75, 0.25, -5.6);
  box(interior, 3.1, 0.05, 0.66, toon('#8a6b4e', { glow: 0.2 }), 1.75, 1.25, -5.6);
  box(interior, 3.0, 0.08, 0.01, toon(TEAL, { glow: 0.35 }), 1.75, 0.82, -5.315);
  box(interior, 3.0, 0.05, 0.01, toon(ORANGE, { glow: 0.35 }), 1.75, 0.72, -5.315);
  box(interior, 0.42, 0.18, 0.36, toon('#2b2f3a'), 2.4, 1.3, -5.65);
  {
    const s = box(interior, 0.34, 0.24, 0.03, glow('#7fd4ff', 1.1), 2.4, 1.46, -5.78);
    s.rotation.x = -0.3;
  }
  box(interior, 0.12, 0.1, 0.16, toon('#2b2f3a'), 2.85, 1.3, -5.45);
  {
    const x = 1.3;
    const z = -5.55;
    box(interior, 0.72, 0.05, 0.42, steel, x, 1.3, z);
    box(interior, 0.72, 0.4, 0.02, glow('#ffd28a', 1.15, { noOutline: true }), x, 1.35, z - 0.2);
    box(interior, 0.72, 0.04, 0.42, steel, x, 1.73, z);
    for (let i = 0; i < 7; i++) inst('prod', x - 0.28 + i * 0.09, 1.35, z + rand(-0.08, 0.06), 0.07, 0.06, 0.08, pick(['#e0973a', '#c9772b', '#f0b35a']));
    for (let i = 0; i < 6; i++) inst('prod', x - 0.25 + i * 0.1, 1.55, z + rand(-0.08, 0.06), 0.08, 0.05, 0.08, pick(['#d9892e', '#f7d488', '#b8652a']));
    box(interior, 0.03, 0.4, 0.42, steel, x - 0.36, 1.35, z);
    box(interior, 0.03, 0.4, 0.42, steel, x + 0.36, 1.35, z);
    plane(interior, 0.72, 0.4, glassMat, x, 1.55, z + 0.21).renderOrder = 1;
  }
  {
    const x = 0.55;
    const z = -5.55;
    box(interior, 0.62, 0.12, 0.42, steel, x, 1.3, z);
    flat(interior, 0.56, 0.36, glow('#d9a55c', 0.9, { noOutline: true }), x, 1.425, z);
    box(interior, 0.02, 0.04, 0.36, steel, x - 0.1, 1.41, z);
    box(interior, 0.02, 0.04, 0.36, steel, x + 0.1, 1.41, z);
    const odenMat = [toon('#f4f0e6', { glow: 0.3 }), toon('#e8c992', { glow: 0.3 }), toon('#8a7f76', { glow: 0.2 }), toon('#d49a5b', { glow: 0.3 })];
    for (let i = 0; i < 10; i++) {
      const m = pick(odenMat);
      const px = x - 0.24 + (i % 5) * 0.12;
      const pz = z - 0.1 + ((i / 5) | 0) * 0.2;
      const geo = i % 3 === 0 ? new THREE.SphereGeometry(0.045, 10, 8) : i % 3 === 1 ? new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10) : new THREE.CylinderGeometry(0.06, 0.06, 0.03, 3);
      add(interior, geo, m, px, 1.44, pz);
    }
  }
  function gondola(x0: number, x1: number, zc: number): void {
    const w = x1 - x0;
    const xc = (x0 + x1) / 2;
    box(interior, w, 0.1, 0.62, toon('#d8d2c4', { glow: 0.2 }), xc, 0.25, zc);
    box(interior, w, 1.45, 0.05, toon('#f0ece3', { glow: 0.25 }), xc, 0.25, zc);
    const levels = [0.35, 0.7, 1.05, 1.4];
    for (const y of levels) {
      if (y > 0.35) box(interior, w, 0.025, 0.6, toon('#cfd6de', { glow: 0.2 }), xc, y - 0.025, zc);
      for (const s of [-1, 1]) {
        box(interior, w, 0.035, 0.012, toon('#ffd23f', { glow: 0.4 }), xc, y - 0.04, zc + s * 0.305);
        let x = x0 + 0.04;
        while (x < x1 - 0.1) {
          const pw = rand(0.07, 0.16);
          const ph = rand(0.08, 0.27);
          const pd = rand(0.12, 0.22);
          const c = pick(PRODUCT_COLS);
          const n = 1 + ((Math.random() * 3) | 0);
          for (let k = 0; k < n && x + pw < x1 - 0.03; k++) {
            inst('prod', x + pw / 2, y, zc + s * (0.05 + pd / 2), pw * 0.95, ph, pd, c);
            x += pw;
          }
          x += 0.01;
        }
      }
    }
    const ends: [number, number][] = [
      [x0, -Math.PI / 2],
      [x1, Math.PI / 2],
    ];
    for (const [x, ry] of ends) {
      box(interior, 0.05, 1.5, 0.62, toon(TEAL, { glow: 0.25 }), x, 0.25, zc);
      plane(interior, 0.4, 0.56, toon('#fff', { map: pick([textures.posterIchigo, textures.posterNiku, textures.posterOden]), glow: 0.35 }), x + Math.sin(ry) * 0.03, 1.1, zc, ry);
    }
  }
  gondola(-4.4, 1.2, -4.25);
  gondola(-4.4, 1.2, -2.85);
  {
    const x = -5.5;
    const z0 = -5.7;
    const z1 = -2.6;
    const d = z1 - z0;
    const zc = (z0 + z1) / 2;
    box(interior, 0.58, 0.4, d, metal, x, 0.25, zc);
    box(interior, 0.02, 1.6, d, glow('#fff4e0', 1.15, { noOutline: true }), -5.77, 0.4, zc);
    for (const z of [z0, z1]) box(interior, 0.58, 1.95, 0.05, toon('#d8dde4', { glow: 0.2 }), x, 0.25, z);
    box(interior, 0.62, 0.3, d, toon(ORANGE, { glow: 0.3 }), x, 2.0, zc);
    plane(interior, 1.8, 0.28, glow('#ffffff', 1.15, { map: textures.bento }), -5.185, 2.15, zc, Math.PI / 2);
    const shelfY = [0.65, 1.0, 1.35, 1.7];
    shelfY.forEach((y, li) => {
      if (li) box(interior, 0.5, 0.02, d, toon('#e6ebf0', { glow: 0.4 }), x, y - 0.02, zc);
      for (let z = z0 + 0.1; z < z1 - 0.1; z += li % 2 ? 0.2 : 0.13) {
        if (li % 2) inst('prod', x + 0.05, y, z, 0.18, 0.06, 0.17, pick(['#fefae0', '#e9c46a', '#f4a261', '#e76f51', '#90be6d']));
        else inst('onigiri', x + 0.08, y + 0.05, z, 0.06, 0.03, 0.06, pick(['#f8f8f2', '#f1f1e6']), 0, 0, Math.PI / 2);
      }
    });
  }
  box(interior, 0.8, 0.75, 1.2, toon('#f2f5f8', { glow: 0.25 }), -5.3, 0.25, -1.95);
  flat(interior, 0.7, 1.1, glow('#dff4ff', 1.1, { noOutline: true }), -5.3, 0.985, -1.95);
  for (let i = 0; i < 16; i++) inst('prod', -5.3 + rand(-0.28, 0.28), 0.99, -1.95 + rand(-0.48, 0.48), 0.1, 0.05, 0.14, pick(PRODUCT_COLS));
  box(interior, 0.8, 1.0, 0.6, toon('#dfe3e8', { glow: 0.2 }), -4.0, 0.25, -1.62);
  box(interior, 0.8, 0.12, 0.6, toon('#5a6070'), -4.0, 1.25, -1.62);
  {
    const s = box(interior, 0.3, 0.02, 0.18, glow('#8fd8ff', 1.1), -3.8, 1.37, -1.45);
    s.rotation.x = 0.4;
  }
  box(interior, 0.34, 0.8, 3.0, toon('#d7cfc0', { glow: 0.2 }), 3.1, 0.25, -3.5);
  for (let z = -4.85; z < -2.15; z += 0.24) {
    inst('prod', 2.99, 1.05, z, 0.02, 0.3, 0.21, pick(PRODUCT_COLS), 0, 0, 0.28);
    inst('prod', 2.91, 0.55, z, 0.02, 0.28, 0.21, pick(PRODUCT_COLS), 0, 0, 0.2);
  }
  box(interior, 0.9, 0.9, 0.55, toon('#4a3a32', { glow: 0.15 }), 2.55, 0.25, -1.62);
  box(interior, 0.5, 0.62, 0.42, toon('#1d1f26'), 2.4, 1.15, -1.62);
  plane(interior, 0.36, 0.2, glow('#ffb86b', 1.3), 2.4, 1.6, -1.405, Math.PI);
  for (let i = 0; i < 4; i++) cyl(interior, 0.045, 0.035, 0.1, toon('#ffffff', { glow: 0.4 }), 2.85, 1.15 + i * 0.07, -1.6, 10);
  flat(interior, 3.0, 0.08, toon(ORANGE, { glow: 0.4 }), 1.4, 0.256, -4.95);
  flat(interior, 0.08, 2.2, toon('#6bcb77', { glow: 0.4 }), 1.75, 0.256, -2.4);
  for (const dx of [-0.1, 0.1]) flat(interior, 0.09, 0.2, toon(ORANGE, { glow: 0.4 }), 1.75 + dx, 0.257, -4.7);
  plane(interior, 0.8, 1.1, toon('#fff', { map: textures.posterIchigo, glow: 0.35 }), -5.77, 2.85, -4.8, Math.PI / 2);
  plane(interior, 0.8, 1.1, toon('#fff', { map: textures.posterOden, glow: 0.35 }), -5.77, 2.85, -3.6, Math.PI / 2);
  plane(interior, 0.7, 0.9, toon('#fff', { map: textures.posterNiku, glow: 0.35 }), -2.2, 2.95, -6.77);

  for (const [x, z] of [
    [-3.5, -3.3],
    [0.8, -3.3],
    [-1.3, -5.6],
    [2.2, -5.2],
  ]) {
    const l = new THREE.PointLight('#ffe8c6', 4.5, 7, 1.4);
    l.position.set(x, 3.05, z);
    st.add(l);
  }
  {
    const l = new THREE.PointLight('#ffd8a4', 6, 10, 1.5);
    l.position.set(-1.2, 2.3, 0.3);
    st.add(l);
  }

  function vending(parent: THREE.Object3D, x: number, z: number, ry: number, tex: THREE.Texture, body: string): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, 0.156, z);
    g.rotation.y = ry;
    parent.add(g);
    contactShadow(g, 1.3, 1.1, 0, 0.019, 0);
    box(g, 0.92, 1.83, 0.72, toon(body), 0, 0, 0);
    plane(g, 0.86, 1.72, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.95, 0.95, 0.95), toneMapped: false }), 0, 0.92, 0.365);
    box(g, 0.96, 0.08, 0.76, toon('#2b2f3a'), 0, 1.83, 0);
    return g;
  }
  vending(st, 3.96, -6.42, Math.PI / 2, textures.vend1, '#f2f4f7');
  vending(st, 3.96, -5.48, Math.PI / 2, textures.vend2, '#d7263d');
  box(st, 0.35, 0.8, 0.3, toon('#e8e8e8'), 3.75, 0.156, -4.75);
  {
    const l = new THREE.PointLight('#d4e8ff', 3.5, 5, 1.4);
    l.position.set(4.8, 1.3, -5.95);
    st.add(l);
  }
  box(st, 0.3, 0.4, 0.12, toon('#c9ced6'), 3.56, 1.4, -2.0);
  rod(st, new THREE.Vector3(3.56, 1.8, -2.0), new THREE.Vector3(3.56, 3.8, -2.0), 0.03, toon('#8f97a3'));

  contactShadow(st, 2.1, 0.9, 1.75 + 1.5 * 0.42, 0.175, -0.72);
  const binColors = ['#3a86ff', '#6bcb77', '#ff8a2b', '#8d99ae'];
  binColors.forEach((c, i) => {
    const x = 1.75 + i * 0.42;
    box(st, 0.38, 0.85, 0.42, toon('#e8ecf0'), x, 0.156, -0.72);
    box(st, 0.39, 0.12, 0.43, toon(c, { glow: 0.2 }), x, 0.9, -0.72);
    box(st, 0.18, 0.05, 0.02, toon('#1a1d27'), x, 0.8, -0.5);
  });

  {
    const x = -1.1;
    const z = -0.72;
    box(st, 0.5, 0.06, 0.3, steel, x, 0.156, z);
    box(st, 0.5, 0.04, 0.3, steel, x, 0.62, z);
    for (const dx of [-0.24, 0.24]) box(st, 0.03, 0.5, 0.03, steel, x + dx, 0.156, z);
    const umbrellas: [string, number][] = [
      ['#e5edf5', 0.75],
      ['#233a6b', 1],
      ['#e5edf5', 0.75],
      ['#c1272d', 1],
    ];
    umbrellas.forEach(([c, o], i) => {
      const px = x - 0.18 + i * 0.12;
      const u = add(st, new THREE.ConeGeometry(0.045, 0.72, 8), toon(c, o < 1 ? { opacity: o } : {}), px, 0.58, z);
      u.rotation.x = Math.PI;
      rod(st, new THREE.Vector3(px, 0.94, z), new THREE.Vector3(px, 1.02, z), 0.012, toon('#2a2a2a'));
    });
  }

  const noboris: THREE.Group[] = [];
  for (const x of [-5.7, 3.3]) {
    cyl(st, 0.025, 0.025, 2.4, steel, x, 0.156, 0.35, 8);
    const flag = new THREE.Group();
    flag.position.set(x, 0, 0.35);
    st.add(flag);
    plane(flag, 0.4, 1.9, toon('#fff', { map: textures.nobori, glow: 0.2, side: THREE.DoubleSide }), 0.21, 1.4, 0, 0);
    noboris.push(flag);
  }

  const instGeo: Record<string, THREE.BufferGeometry> = {
    prod: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    bottle: new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0),
    onigiri: new THREE.CylinderGeometry(1, 1, 1, 3),
  };
  const instMat = noOutline(new THREE.MeshToonMaterial({ color: '#ffffff', emissive: new THREE.Color('#ffffff').multiplyScalar(0.12), gradientMap: toonGradientMap() }));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  for (const [kind, list] of Object.entries(instLists)) {
    const im = new THREE.InstancedMesh(instGeo[kind], instMat, list.length);
    list.forEach((it, i) => {
      q.setFromEuler(e.set(it.rx, it.ry, it.rz));
      m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.sx, it.sy, it.sz));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, c.set(it.color));
    });
    interior.add(im);
  }

  return { doorLeft, doorRight, fasciaMaterial, noboris };
}
