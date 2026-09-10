import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createAvatarModel } from '../portfolio/avatar-models';
import { disposeScene } from '../portfolio/geometry';

test('the selected A outfit and B resident remain complete untextured box geometry', () => {
  const identifying = { dress: ['Long_split_gown', 'Silver_high_ponytail', 'Black_hair_bow'], blonde: ['Blonde_hair', 'Halter_top', 'Dropped_light_jacket'] };
  for (const id of ['dress', 'blonde'] as const) {
    const model = createAvatarModel(id);
    try {
      for (const name of identifying[id]) expect(model.getObjectByName(name)).toBeDefined();
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
