import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createWorld } from '../portfolio/world';
import { batchStaticScenery } from '../portfolio/static-batches';
import { disposeScene } from '../portfolio/geometry';
import { createSession } from '../portfolio/state';

test('static scenery batches reduce draw objects without absorbing actors, changing bounds or breaking animated targets', () => {
  const world = createWorld();
  try {
    const count = () => { let count = 0; world.scene.traverse(o => { if (o instanceof THREE.Mesh) count++; }); return count; };
    const roots = ['Scene_town', 'Scene_workshop', 'Scene_gallery'].map(name => world.scene.getObjectByName(name)!);
    const bounds = roots.map(root => new THREE.Box3().setFromObject(root));
    const npc = world.scene.getObjectByName('NPC_greeter')!;
    const payload = world.scene.getObjectByName('Conveyor_payload')!;
    const head = world.scene.getObjectByName('Coastal_meteor')!;
    const door = world.scene.getObjectByName('Room_door_town-door')!;
    const before = count();
    const result = batchStaticScenery(world.scene);
    expect(result.boxes).toBeGreaterThan(900);
    expect(result.batches).toBeLessThan(result.boxes / 4);
    expect(count()).toBeLessThan(before - 700);
    roots.forEach((root, index) => {
      const actual = new THREE.Box3().setFromObject(root);
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(actual.min[axis]).toBeCloseTo(bounds[index].min[axis], 4);
        expect(actual.max[axis]).toBeCloseTo(bounds[index].max[axis], 4);
      }
    });
    for (const object of [npc, payload, head, door]) expect(world.scene.getObjectByName(object.name)).toBe(object);
    world.updateAmbient(.2); const start = payload.position.x; world.updateAmbient(.2);
    expect(payload.position.x).not.toBe(start);
    const session = createSession(); session.x = 30; world.updateRoom(session);
    expect(world.scene.getObjectByName('Scene_workshop')!.visible).toBe(true);
    session.x = 45; world.updateRoom(session);
    expect(world.scene.getObjectByName('Scene_gallery')!.visible).toBe(true);
  } finally { disposeScene(world.scene); }
});

test('instanced boxes preserve source transforms, per-box colors, shadow flags and live shared resources', () => {
  const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'Scene_town'; scene.add(root);
  root.rotation.y = .2;
  const material = new THREE.MeshStandardMaterial({ color: 0xffab63 });
  const geometry = new THREE.BoxGeometry(2, 3, 4);
  const sources = Array.from({ length: 3 }, (_, index) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(index, index * .1, 0); mesh.rotation.z = index * .12;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
  });
  const npc = new THREE.Mesh(geometry, material); npc.name = 'NPC_greeter'; root.add(npc);
  let disposed = 0; geometry.addEventListener('dispose', () => disposed++); material.addEventListener('dispose', () => disposed++);
  scene.updateMatrixWorld(true);
  const expected = sources.map(mesh => mesh.matrix.clone().scale(new THREE.Vector3(2, 3, 4)));
  batchStaticScenery(scene);
  const batch = root.children.find(o => o instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  expect(batch.count).toBe(3); expect(batch.castShadow).toBe(true); expect(batch.receiveShadow).toBe(true);
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  expected.forEach((transform, index) => {
    batch.getMatrixAt(index, matrix); batch.getColorAt(index, color);
    transform.elements.forEach((v, i) => expect(matrix.elements[i]).toBeCloseTo(v, 5));
    expect(color.r).toBeCloseTo(material.color.r, 5); expect(color.g).toBeCloseTo(material.color.g, 5);
  });
  expect(disposed).toBe(0); expect(npc.parent).toBe(root); expect(batch.boundingSphere).not.toBeNull();
  disposeScene(scene);
});
