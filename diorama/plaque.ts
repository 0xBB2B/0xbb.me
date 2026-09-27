import * as THREE from 'three';
import type { Language } from '../data';
import { ctex, type CanvasLike } from './materials';
import { box, plane } from './primitives';
import { drawPlaque, PLAQUE_LAYOUT } from './textures';

export const PLAQUE_PANEL = {
  width: (PLAQUE_LAYOUT.width / PLAQUE_LAYOUT.height) * 1.6,
  height: 1.6,
  center: [0, -2.87, 14.245] as [number, number, number],
};

export const PLAQUE_GLOW = {
  min: 0.15,
  max: 0.6,
  hover: 1,
} as const;

export interface Plaque {
  group: THREE.Group;
  texture: THREE.CanvasTexture;
  borderMaterial: THREE.MeshStandardMaterial;
}

export function createPlaque(scene: THREE.Scene, language: Language, envMap: THREE.Texture | null): Plaque {
  const group = new THREE.Group();
  group.name = 'plaque';
  group.position.set(0, 0, 14.21);
  scene.add(group);

  const [, panelY, panelZ] = PLAQUE_PANEL.center;
  const localZ = panelZ - group.position.z;

  const borderHeight = PLAQUE_PANEL.height + 0.3;
  const borderMaterial = new THREE.MeshStandardMaterial({
    color: '#c49a42',
    metalness: 0.9,
    roughness: 0.38,
    envMapIntensity: 0.45,
    emissive: '#e8a83c',
    emissiveIntensity: PLAQUE_GLOW.min,
  });
  if (envMap) borderMaterial.envMap = envMap;
  const border = box(group, PLAQUE_PANEL.width + 0.3, borderHeight, 0.06, borderMaterial, 0, panelY - borderHeight / 2, localZ - 0.035);
  border.name = 'plaque-border';

  const texture = ctex(PLAQUE_LAYOUT.width, PLAQUE_LAYOUT.height, (ctx) => drawPlaque(ctx, language));
  const plaqueMaterial = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.6, roughness: 0.45, envMapIntensity: 0.4 });
  if (envMap) plaqueMaterial.envMap = envMap;
  const face = plane(group, PLAQUE_PANEL.width, PLAQUE_PANEL.height, plaqueMaterial, 0, panelY, localZ);
  face.name = 'plaque-face';

  return { group, texture, borderMaterial };
}

export function setPlaqueGlow(plaque: Plaque, x: number, hovered: boolean): void {
  plaque.borderMaterial.emissiveIntensity = hovered ? PLAQUE_GLOW.hover : PLAQUE_GLOW.min + (PLAQUE_GLOW.max - PLAQUE_GLOW.min) * x;
}

export function setPlaqueLanguage(plaque: Plaque, language: Language): void {
  const canvas = plaque.texture.image as unknown as CanvasLike;
  const ctx = canvas.getContext('2d');
  if (ctx) drawPlaque(ctx, language);
  plaque.texture.needsUpdate = true;
}
