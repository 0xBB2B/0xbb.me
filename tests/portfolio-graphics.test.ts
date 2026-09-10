import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createWorld } from '../portfolio/world';
import { createSession, updateProximity } from '../portfolio/state';
import { disposeScene } from '../portfolio/geometry';

test('the ocean is a continuous animated reflective surface with a soft horizon, not repeated straight line props', () => {
  const world = createWorld();
  try {
    const sea = world.scene.getObjectByName('Sea')!;
    expect(sea.children).toHaveLength(1);
    const surface = sea.getObjectByName('Sea_surface') as THREE.Mesh;
    expect(surface.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(surface.receiveShadow).toBe(false);
    const material = surface.material as THREE.ShaderMaterial;
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.uniforms.uMoonX).toBeDefined();
    expect(material.uniforms.uBeamDirection).toBeDefined();
    expect(material.uniforms.uSky).toBeDefined();
    world.updateAmbient(.5);
    expect(material.uniforms.uTime.value).toBe(.5);
    const direction = material.uniforms.uBeamDirection.value.clone();
    world.updateAmbient(.5);
    expect(material.uniforms.uBeamDirection.value.equals(direction)).toBe(false);
  } finally { disposeScene(world.scene); }
});

test('outside ground continues under the factory so exiting does not reveal a missing terrain rectangle', () => {
  const world = createWorld();
  const session = createSession();
  try {
    session.x = 45; updateProximity(session); world.updateRoom(session);
    const floor = world.scene.getObjectByName('Room_exterior_ground') as THREE.Mesh;
    expect(floor.visible).toBe(true);
    expect((floor.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x4d5462);
    world.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(floor);
    expect(bounds.min.x).toBeLessThanOrEqual(20);
    expect(bounds.max.x).toBeGreaterThanOrEqual(44);
    expect(bounds.max.y).toBeCloseTo(.01, 5);
    world.scene.traverse(object => {
      if (object.name === 'Room_side_wall') expect(object.castShadow).toBe(false);
    });
    session.x = 32; updateProximity(session); world.updateRoom(session);
    expect(floor.visible).toBe(false);
    expect(world.scene.getObjectByName('Room_ceiling')!.visible).toBe(false);
  } finally { disposeScene(world.scene); }
});
