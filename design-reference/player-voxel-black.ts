import * as THREE from 'three';
import { createPlayerVoxel } from './player-voxel';

// Reuse a fresh base skeleton without mutating the shared constructor.
export function createBlackOutfitPlayerVoxel() {
  const model = createPlayerVoxel();
  model.name = 'FUBUKI_Minecraft_Black_Outfit';
  model.userData.variant = 'Black outfit · geometry-only appearance preview';
  const remove = new Set(['White_high_neck_top', 'Top_shadow', 'Top_rib_1', 'Top_rib_2',
    'Cuff_seam', 'Boot_reflection', 'Boot_front_shadow', 'Ankle_crease', 'Sole']);
  const removed: THREE.Mesh[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (remove.has(object.name)) removed.push(object);
    if (object.name === 'Cropped_black_jacket') {
      object.scale.y = 8 / 12;
      object.position.y = 20;
    }
    if (object.name === 'White_cuff') {
      object.name = 'Black_cuff';
      const color = new THREE.Color(0x1b222c);
      const colors = object.geometry.getAttribute('color');
      for (let i = 0; i < colors.count; i++) colors.setXYZ(i, color.r, color.g, color.b);
    }
  });
  for (const mesh of removed) { mesh.removeFromParent(); mesh.geometry.dispose(); }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
  function block(parent: THREE.Object3D, name: string, hex: number,
    x: number, y: number, z: number, w: number, h: number, d: number) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const color = new THREE.Color(hex);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const torso = model.getObjectByName('Torso')!;
  block(torso, 'Bare_waist', 0xe8b9a8, 0, 14.45, 0, 7.8, 3.1, 3.95);
  block(torso, 'Waist_shade', 0xc88f88, 2.9, 14.45, 2, 1.3, 3, 0.08);
  block(torso, 'Black_crop_top', 0x151a23, 0, 19.1, 2.065, 4.9, 6.1, 0.1);
  block(torso, 'Top_fold', 0x41434b, 0, 20.3, 2.13, 4.5, 0.6, 0.05);
  block(torso, 'Top_hem', 0x090f18, 0, 16.25, 2.14, 4.95, 0.4, 0.06);
  block(torso, 'Exposed_neckline', 0xe8b9a8, 0, 23.4, 2.08, 3.4, 1.2, 0.12);
  const head = model.getObjectByName('Head')!;
  block(head, 'Left_blue_earring', 0x4cc9df, -4.55, 25.8, 3.2, 0.65, 1, 0.55);
  for (const side of [-1, 1]) {
    const leg = model.getObjectByName(side < 0 ? 'Left_leg' : 'Right_leg')!;
    block(leg, 'Platform_sole', 0x0b1420, 0, 0.32, 0.5, 4.3, 0.64, 5.25);
    for (const y of [1.6, 4.5]) {
      block(leg, 'Boot_strap', 0x46515e, 0, y, 2.16, 4.1, 0.38, 0.16);
      block(leg, 'Strap_buckle', 0xaab9c2, side * 1.3, y, 2.27, 0.48, 0.5, 0.1);
    }
    for (const y of [2.2, 2.95, 3.7]) {
      for (const direction of [-1, 1]) {
        const lace = block(leg, 'Crossed_boot_lace', 0x7a8794, 0, y, 2.24, 1.65, 0.16, 0.12);
        lace.rotation.z = direction * 0.42;
      }
    }
    block(leg, 'Charm_chain', 0xaab9c2, side * 2.35, 4.0, 1.9, 0.15, 1.2, 0.15);
    const charm = block(leg, 'Blue_boot_charm', 0x2286a9, side * 2.35, 3.05, 1.9, 0.65, 1.05, 0.5);
    charm.rotation.z = side * 0.18;
    block(leg, 'Charm_glint', 0x63dced, side * 2.35, 3.2, 2.17, 0.3, 0.55, 0.05);
  }
  // Scale once at construction, around the unchanged sole origin.
  model.scale.multiplyScalar(0.8);
  model.position.multiplyScalar(0.8);
  return model;
}
