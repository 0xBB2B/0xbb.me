import * as THREE from 'three';
import { toon, noOutline, toonGradientMap } from './materials';
import { box, flat } from './primitives';
import type { Textures } from './textures';

export function buildPedestal(scene: THREE.Scene, envMap: THREE.Texture | null): void {
  const group = new THREE.Group();
  group.name = 'pedestal';
  scene.add(group);

  const brass = new THREE.MeshStandardMaterial({ color: '#c49a42', metalness: 0.9, roughness: 0.38, envMapIntensity: 0.45 });
  const lacquer = new THREE.MeshStandardMaterial({ color: '#0a0c13', metalness: 0.2, roughness: 0.28, envMapIntensity: 0.35 });
  if (envMap) {
    brass.envMap = envMap;
    lacquer.envMap = envMap;
  }

  box(group, 26, 1.0, 26, toon('#1b1f2c'), 0, -1.02, 0);
  box(group, 26.12, 0.12, 26.12, brass, 0, -1.14, 0);
  box(group, 26, 0.5, 26, toon('#0f121a'), 0, -1.64, 0);
  box(group, 28.4, 2.2, 28.4, lacquer, 0, -3.84, 0);
  box(group, 28.5, 0.06, 28.5, brass, 0, -1.9, 0);
  box(group, 29.4, 0.45, 29.4, lacquer, 0, -4.29, 0);
}

export function buildGround(scene: THREE.Scene, textures: Textures): void {
  const roadMat = new THREE.MeshStandardMaterial({ color: '#1a1f2e', roughness: 0.34, metalness: 0.12 });
  flat(scene, 26, 26, roadMat, 0, 0, 0);

  const lotMat = new THREE.MeshStandardMaterial({ color: '#2a2f3f', roughness: 0.42, metalness: 0.1 });
  const walkMat = new THREE.MeshStandardMaterial({ color: '#4b5164', roughness: 0.5, metalness: 0.05 });
  const curbMat = toon('#9aa0ad');
  box(scene, 18, 0.15, 18, lotMat, -4, 0, -4);
  box(scene, 26, 0.15, 2, walkMat, 0, 0, 12);
  box(scene, 2, 0.15, 18, walkMat, 12, 0, -4);
  box(scene, 18, 0.18, 0.22, curbMat, -4, 0, 4.89);
  box(scene, 0.22, 0.18, 17.78, curbMat, 4.89, 0, -4.11);
  box(scene, 26, 0.18, 0.22, curbMat, 0, 0, 11.11);
  box(scene, 0.22, 0.18, 17.78, curbMat, 11.11, 0, -4.11);
  box(scene, 2, 0.18, 0.22, curbMat, 12, 0, 4.89);

  function tileBand(w: number, d: number, x: number, z: number, y = 0.156): void {
    const t = textures.tile.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 0.9, d / 0.9);
    flat(scene, w, d, new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, metalness: 0.05 }), x, y, z);
  }
  tileBand(17.78, 1.08, -4.11, 4.24);
  tileBand(1.08, 16.7, 4.24, -4.65);
  tileBand(9.9, 1.6, -1.25, -2.2);
}

export function buildRoadMarkings(scene: THREE.Scene, textures: Textures): void {
  const lineMat = toon('#dfe3ea', { glow: 0.12 });
  const yellowMat = toon('#f0c02c', { glow: 0.12 });

  const crosswalkMain = new THREE.Group();
  crosswalkMain.name = 'crosswalk-main';
  scene.add(crosswalkMain);
  for (let i = 0; i < 7; i++) flat(crosswalkMain, 3.2, 0.45, lineMat, 2.8, 0.006, 5.45 + i * 0.85);

  const crosswalkSide = new THREE.Group();
  crosswalkSide.name = 'crosswalk-side';
  scene.add(crosswalkSide);
  for (let i = 0; i < 7; i++) flat(crosswalkSide, 0.45, 3.2, lineMat, 5.45 + i * 0.85, 0.006, 2.8);

  flat(scene, 0.3, 3, lineMat, 0.75, 0.006, 6.5);
  flat(scene, 3, 0.3, lineMat, 9.5, 0.006, 0.75);
  flat(scene, 0.3, 3, lineMat, 11.5, 0.006, 9.5);

  flat(scene, 13.4, 0.14, yellowMat, -6.3, 0.006, 8);
  flat(scene, 1.4, 0.14, yellowMat, 12.3, 0.006, 8);

  function roadMark(tex: THREE.Texture, w: number, len: number, x: number, z: number, ry: number): THREE.Mesh {
    const material = noOutline(new THREE.MeshToonMaterial({ map: tex, alphaTest: 0.5, emissive: '#2a2a2a', gradientMap: toonGradientMap() }));
    const mesh = flat(scene, w, len, material, x, 0.007, z);
    mesh.rotation.set(-Math.PI / 2, 0, ry);
    return mesh;
  }
  roadMark(textures.diamond, 1.4, 3.2, -4.5, 6.5, Math.PI / 2);
  roadMark(textures.diamond, 1.4, 3.2, 9.5, -5.5, 0);
  const stopMarkingSide = roadMark(textures.roadStop, 2.4, 4.6, 9.5, -2.2, Math.PI);
  stopMarkingSide.name = 'stop-marking-side';

  flat(scene, 14, 0.1, lineMat, -6, 0.006, 5.3);
  flat(scene, 0.1, 13.8, lineMat, 5.3, 0.006, -6.1);
  flat(scene, 0.1, 13.8, lineMat, 10.7, 0.006, -6.1);
  flat(scene, 14.2, 0.1, lineMat, -5.9, 0.006, 10.7);
  flat(scene, 8.6, 0.1, lineMat, 8.7, 0.006, 10.7);

  function grate(tex: THREE.Texture, w: number, d: number, x: number, z: number): void {
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, w / 0.5), Math.max(1, d / 0.5));
    if (d > w) t.rotation = Math.PI / 2;
    flat(scene, w, d, toon('#2a2d38', { map: t }), x, 0.007, z);
  }
  grate(textures.grate, 14, 0.3, -6, 5.16);
  grate(textures.grate, 0.3, 13.8, 5.16, -6.1);

  const stopMarkingAlley = roadMark(textures.roadStop, 1.1, 2.2, -6.8, -4.4, Math.PI);
  stopMarkingAlley.position.y = 0.162;
  stopMarkingAlley.name = 'stop-marking-alley';

  for (const x of [-4.6, -2.1, 0.4, 2.9]) flat(scene, 0.1, 4.8, lineMat, x, 0.161, 1.05);
  flat(scene, 7.6, 0.1, lineMat, -0.85, 0.161, 3.45);
  for (const x of [-3.35, -0.85, 1.65]) box(scene, 1.5, 0.12, 0.16, toon('#a9aeb6'), x, 0.15, -1.05);
}
