import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';
import { ROOM_DOORS, DOOR_OPEN_SECONDS, JOURNEY } from '../portfolio/journey';
import { advance, createSession, openNearbyDoor, updateProximity } from '../portfolio/state';

const bounds = (object: THREE.Object3D) => new THREE.Box3().setFromObject(object);

test('compact doors close perpendicular to the screen and roll up inside their frames without sweeping through the scene', () => {
  const world = createWorld();
  const session = createSession();
  try {
    world.scene.updateMatrixWorld(true);
    for (const door of ROOM_DOORS) {
      const entry = world.scene.getObjectByName(`Room_door_${door.id}`)!;
      const leaf = entry.getObjectByName('Door_leaf')!;
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(leaf.getWorldQuaternion(new THREE.Quaternion()));
      expect(Math.abs(normal.x), `${door.id} faces along the route, not toward the screen`).toBeGreaterThan(.99);
      const closed = bounds(leaf);
      expect(closed.max.x - closed.min.x).toBeLessThan(.3);
      expect(closed.max.z - closed.min.z).toBeGreaterThan(2.5);
      expect(closed.max.z - closed.min.z).toBeLessThan(2.7);
      expect(closed.min.z).toBeLessThan(-.8);
      expect(closed.max.z).toBeGreaterThan(1.6);
      for (const progress of [.2, .5, .8]) {
        session.doors[door.id] = progress; world.updateRoom(session); world.scene.updateMatrixWorld(true);
        const moving = bounds(leaf);
        expect(moving.max.x - moving.min.x).toBeLessThan(.2);
        expect(moving.min.z).toBeGreaterThanOrEqual(closed.min.z - .001);
        expect(moving.max.z).toBeLessThanOrEqual(closed.max.z + .001);
        expect(moving.min.y).toBeGreaterThan(closed.min.y);
      }
      session.doors[door.id] = 1;
      world.updateRoom(session);
      world.scene.updateMatrixWorld(true);
      const opened = bounds(leaf);
      expect(opened.min.y, 'open shutter is stored above the visitor').toBeGreaterThan(3.4);
      const ray = new THREE.Raycaster(new THREE.Vector3(door.x - 1, 1.2, .6), new THREE.Vector3(1, 0, 0), 0, 2);
      expect(ray.intersectObject(entry, true).filter(hit => hit.object.visible)).toHaveLength(0);
    }
  } finally { disposeScene(world.scene); }
});

test('the same supported road runs inside the room footprint and through both side-wall openings', () => {
  const world = createWorld();
  try {
    world.scene.updateMatrixWorld(true);
    const floor = world.scene.getObjectByName('Room_floor');
    expect(floor).toBeDefined();
    const floorBounds = bounds(floor!);
    expect(floorBounds.min.x).toBeLessThanOrEqual(JOURNEY[1].start);
    expect(floorBounds.max.x).toBeGreaterThanOrEqual(JOURNEY[1].end);
    expect(floorBounds.min.z).toBeLessThan(-2);
    expect(floorBounds.max.z).toBeGreaterThan(2.8);
    expect(bounds(world.scene.getObjectByName('Room_exterior')!).min.z).toBeGreaterThan(2.8);
    const session = createSession(); session.doors['town-door'] = 1; session.doors['sea-door'] = 1;
    session.x = 31; updateProximity(session); world.updateRoom(session);
    world.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (let x = 20; x <= 44; x += .25) {
      ray.set(new THREE.Vector3(x, .2, .6), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(world.scene, true).find(hit => {
        let visible = true;
        hit.object.traverseAncestors(parent => { if (!parent.visible) visible = false; });
        return visible && hit.object.visible;
      });
      expect(hit?.point.y, `continuous sole support at ${x}`).toBeCloseTo(.035, 5);
    }
  } finally { disposeScene(world.scene); }
});

test('opening a door alone reveals neither the room before entering nor outside scenery before exiting', () => {
  const world = createWorld();
  const session = createSession();
  const town = world.scene.getObjectByName('Scene_town')!;
  const workshop = world.scene.getObjectByName('Scene_workshop')!;
  const sea = world.scene.getObjectByName('Scene_gallery')!;
  try {
    session.x = 19.35; updateProximity(session); world.updateRoom(session);
    expect(workshop.visible, 'outside cannot see terminals').toBe(false);
    expect(town.visible).toBe(true);
    openNearbyDoor(session); advance(session, 0, DOOR_OPEN_SECONDS); world.updateRoom(session);
    expect(workshop.visible, 'open entrance is not yet entry').toBe(false);
    advance(session, 1, .5); world.updateRoom(session);
    expect(workshop.visible).toBe(true);
    expect(town.visible, 'inside cannot see town').toBe(false);
    expect(sea.visible, 'inside cannot see sea').toBe(false);
    session.x = 43.35; updateProximity(session); openNearbyDoor(session);
    advance(session, 0, DOOR_OPEN_SECONDS); world.updateRoom(session);
    expect(sea.visible, 'open exit is not yet exit').toBe(false);
    advance(session, 1, .5); world.updateRoom(session);
    expect(sea.visible).toBe(true);
    expect(workshop.visible).toBe(false);
    advance(session, -1, .5); world.updateRoom(session);
    expect(workshop.visible).toBe(true);
    expect(town.visible).toBe(false);
    expect(sea.visible).toBe(false);
  } finally { disposeScene(world.scene); }
});
