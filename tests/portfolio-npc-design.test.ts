import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createGreeter } from '../portfolio/scenes/town';
import { GREETER_X } from '../portfolio/journey';
import { disposeScene } from '../portfolio/geometry';

test('the selected B resident has the previewed blonde face and layered blue eyes', () => {
  const npc = createGreeter();
  try {
    for (const [name, width, height] of [
      ['Eyelash', 1.9, .98], ['Eye_white', 1.65, .7], ['Blue_iris', .77, .7], ['Pupil', .28, .61], ['Eye_glint', .16, .17],
    ] as const) {
      const eyes: THREE.Mesh[] = [];
      npc.traverse(object => { if (object instanceof THREE.Mesh && object.name === name) eyes.push(object); });
      expect(eyes).toHaveLength(2);
      for (const eye of eyes) {
        expect((eye.geometry as THREE.BoxGeometry).parameters.width).toBe(width);
        expect((eye.geometry as THREE.BoxGeometry).parameters.height).toBe(height);
      }
    }
    const crown = npc.getObjectByName('Hair_crown') as THREE.Mesh;
    expect((crown.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xf2dfb6);
    expect(npc.getObjectByName('Blonde_hair')).toBeDefined();
    expect(npc.getObjectByName('Halter_top')).toBeDefined();
    expect(npc.getObjectByName('Dropped_light_jacket')).toBeDefined();
  } finally { disposeScene(npc); }
});

test('B replaces the NPC geometry at the same greeter location without the removed resident or player model', () => {
  const npc = createGreeter();
  try {
    expect(npc.name).toBe('NPC_greeter');
    expect(npc.position.x).toBe(GREETER_X);
    expect(npc.getObjectByName('Avatar_blonde')).toBeDefined();
    for (const removed of ['Type_BB_Mark_VII_resident', 'Mechanical_tail', 'Hologram_wings', 'Blue_jacket', 'Left_horn', 'FUBUKI_Minecraft_Black_Outfit']) {
      expect(npc.getObjectByName(removed)).toBeUndefined();
    }
    for (const part of ['Head', 'Torso', 'Left_arm', 'Right_arm', 'Left_leg', 'Right_leg', 'Pleated_skirt']) expect(npc.getObjectByName(part)).toBeDefined();
    const bounds = new THREE.Box3().setFromObject(npc);
    expect(bounds.min.y).toBeCloseTo(.035, 6);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(2.1);
    expect(bounds.max.y - bounds.min.y).toBeLessThan(2.7);
    expect(bounds.max.x - bounds.min.x).toBeLessThan(2.5);
    npc.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      expect(object.geometry).toBeInstanceOf(THREE.BoxGeometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
    });
  } finally { disposeScene(npc); }
});
