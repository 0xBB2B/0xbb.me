import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createNpcLineupModel, NPC_LINEUP } from './npc-lineup-models';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';
import { disposeScene } from '../portfolio/geometry';

test('the comparison shows the initial player and selected untextured A/B designs', () => {
  const current = createNpcLineupModel('current'), resident = createBlackOutfitPlayerVoxel();
  try {
    const names = (root: THREE.Object3D) => { const result: string[] = []; root.traverse(o => result.push(o.name)); return result; };
    expect(names(current)).toEqual(names(resident));
    expect(new THREE.Box3().setFromObject(current).equals(new THREE.Box3().setFromObject(resident))).toBe(true);
  } finally { disposeScene(current); disposeScene(resident); }
  const identifying = { dress: ['Long_split_gown', 'Silver_high_ponytail', 'Black_hair_bow'], blonde: ['Blonde_hair', 'Halter_top', 'Dropped_light_jacket'] };
  for (const item of NPC_LINEUP.slice(1)) {
    const model = createNpcLineupModel(item.id);
    try {
      for (const name of identifying[item.id as keyof typeof identifying]) expect(model.getObjectByName(name)).toBeDefined();
      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.min.y).toBeCloseTo(0, 5);
      expect(bounds.max.y).toBeGreaterThan(2.1);
      expect(bounds.max.y).toBeLessThan(3.0);
      expect(model.getObjectByName('Mechanical_tail')).toBeUndefined();
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        expect(object.geometry).toBeInstanceOf(THREE.BoxGeometry);
        expect(Object.values(object.material).some(value => value instanceof THREE.Texture)).toBe(false);
      });
    } finally { disposeScene(model); }
  }
});
