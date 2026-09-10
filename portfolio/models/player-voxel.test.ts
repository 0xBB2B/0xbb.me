import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { modelFingerprint } from '../../tests/model-fingerprint';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';
import { disposeScene } from '../geometry';

test('black outfit is complete, grounded and uses geometry colors rather than image textures', () => {
  const model = createBlackOutfitPlayerVoxel();
  try {
    const bounds = new THREE.Box3().setFromObject(model);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(2.4, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.z - bounds.min.z).toBeGreaterThan(.5);
    for (const part of ['Head', 'Torso', 'Left_arm', 'Right_arm', 'Left_leg', 'Right_leg', 'High_ponytail']) expect(model.getObjectByName(part)).toBeDefined();
    let meshes = 0;
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      const positions = object.geometry.getAttribute('position'), colors = object.geometry.getAttribute('color');
      expect(positions.count).toBeGreaterThan(0);
      expect(colors.count).toBe(positions.count);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
    });
    expect(meshes).toBeGreaterThan(10);
  } finally { disposeScene(model); }
});

test('the black outfit matches the confirmed visible geometry and identity', () => {
  const model = createBlackOutfitPlayerVoxel();
  try {
    expect(modelFingerprint(model)).toBe('d33563e29c04ed6338dee1ef202df5847efd0f8bb81643d43c4e086550262793');
    expect(model.userData.variant).toBe('Black outfit');
  } finally { disposeScene(model); }
});

test('black outfit retains the confirmed dimensions and sole origin after repeated construction and updates', () => {
  for (let i = 0; i < 3; i++) {
    const model = createBlackOutfitPlayerVoxel();
    try {
      for (let tick = 0; tick < 100; tick++) model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      expect(size.x).toBeCloseTo(1.2030719151632912 * .8, 6);
      expect(size.y).toBeCloseTo(2.4, 6);
      expect(size.z).toBeCloseTo(1.0048746332120269 * .8, 6);
      expect(bounds.min.y).toBeCloseTo(0, 6);
    } finally { disposeScene(model); }
  }
});

test('black outfit keeps all boot, eye and face details without the removed tongue or boot charms', () => {
  const model = createBlackOutfitPlayerVoxel();
  const meshes: THREE.Mesh[] = [];
  model.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
  try {
    expect(meshes.filter(mesh => /tongue|Charm_chain|Blue_boot_charm|Charm_glint/i.test(mesh.name))).toHaveLength(0);
    for (const legName of ['Left_leg', 'Right_leg']) {
      const leg = model.getObjectByName(legName)!;
      expect(leg).toBeDefined();
      const names: string[] = [];
      leg.traverse(object => { if (object instanceof THREE.Mesh) names.push(object.name); });
      for (const [name, count] of [['Crossed_boot_lace', 6], ['Boot_strap', 2], ['Strap_buckle', 2], ['Platform_sole', 1]] as const) expect(names.filter(item => item === name)).toHaveLength(count);
    }
    const colors = {
      Crossed_boot_lace: [.19461784, .24228112, .29613826], Boot_strap: [.06124605, .08228271, .11193243],
      Strap_buckle: [.40197778, .48514995, .53947949], Platform_sole: [.00334654, .00699541, .01444384],
      Cyan_earring: [.06359923, .51398903, .64936113], Left_blue_earring: [.07227185, .58407843, .73791039],
      Mouth: [.32777810, .15292615, .18782078],
    };
    for (const [name, expected] of Object.entries(colors)) {
      const mesh = meshes.find(object => object.name === name);
      expect(mesh, name).toBeDefined();
      const actual = mesh!.geometry.getAttribute('color').array;
      expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 6));
    }
  } finally { disposeScene(model); }
});
