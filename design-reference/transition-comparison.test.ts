import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createTransitionScene, TRANSITIONS, type Edge } from './transition-comparison-scenes';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';

test('three transition proposals each implement both junctions with setback silhouettes and interleaved paving', () => {
  expect(TRANSITIONS).toHaveLength(3);
  const counts: number[] = [];
  for (const version of TRANSITIONS) for (const edge of ['town', 'coast'] as Edge[]) {
    const { scene, edgeX, screens } = createTransitionScene(version.id, edge);
    try {
      expect(edgeX).toBe(edge === 'town' ? 20 : 44);
      expect(screens).toHaveLength(5);
      expect(scene.getObjectByName('Workshop_data_core')).toBeDefined();
      expect(scene.getObjectByName('FUBUKI_Minecraft_Black_Outfit')).toBeDefined();
      expect(scene.getObjectByName('Transition_staggered_volumes')!.children.length).toBeGreaterThan(3);
      const paving = scene.getObjectByName('Transition_interleaved_paving')!;
      expect(paving.children).toHaveLength(144);
      const colors = new Set(paving.children.map(object => ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex()));
      expect(colors.size).toBeGreaterThan(4);
      if (version.id === '2') expect(scene.getObjectByName('Transition_open_portals')).toBeDefined();
      if (version.id === '3') expect(scene.getObjectByName('Transition_natural_buffer')).toBeDefined();
      scene.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      for (let x = edgeX - 5; x <= edgeX + 5; x += .5) {
        ray.set(new THREE.Vector3(x, .2, .6), new THREE.Vector3(0, -1, 0));
        expect(ray.intersectObject(paving, true)[0]?.point.y).toBeCloseTo(.05, 4);
      }
      let count = 0; scene.traverse(() => count++); counts.push(count);
    } finally { disposeScene(scene); }
  }
  expect(new Set(counts).size).toBe(6);
});

test('comparison construction does not replace or mutate the production B+2 factory', () => {
  const preview = createTransitionScene('3', 'town'); disposeScene(preview.scene);
  const world = createWorld();
  try {
    expect(world.scene.getObjectByName('Workshop_hall')).toBeDefined();
    expect(world.scene.getObjectByName('Transition_proposal_3_town')).toBeUndefined();
    expect(world.scene.getObjectByName('Sea_surface')).toBeDefined();
  } finally { disposeScene(world.scene); }
});
