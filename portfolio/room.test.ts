import { expect, test } from 'bun:test';
import { createSession, advance, openNearbyDoor, openOverview, closeReader, setLanguage, updateProximity, cancelDoorOpening } from './state';
import { DOOR_OPEN_SECONDS, JOURNEY } from './journey';
import { createInput } from './input';
import { createWorld } from './world';
import { disposeScene } from './geometry';

test('a closed factory entrance blocks walking instead of letting the visitor pass through the building', () => {
  const session = createSession();
  for (let step = 0; step < 500; step++) advance(session, 1, .05);
  expect(session.x).toBeLessThan(JOURNEY[1].start);
  expect(session.x).toBeGreaterThan(JOURNEY[1].start - 1);
  expect(session.scene).toBe('town');
  expect(session.nearbyBoard).toBeNull();
});

test('opening is explicit, animated, range-bound and does not move the visitor or replace a reader', () => {
  const session = createSession();
  expect(openNearbyDoor(session)).toBe(false);
  for (let i = 0; i < 300; i++) advance(session, 1, .05);
  expect(session.nearbyDoor).toBe('town-door');
  expect(session.doors['town-door']).toBe(0);
  const x = session.x;
  openOverview(session);
  expect(openNearbyDoor(session)).toBe(false);
  closeReader(session);
  expect(openNearbyDoor(session)).toBe(true);
  expect(openNearbyDoor(session)).toBe(false);
  expect(openOverview(session)).toBe(false);
  advance(session, 1, DOOR_OPEN_SECONDS / 2);
  expect(session.doors['town-door']).toBeCloseTo(.5);
  expect(session.x).toBe(x);
  setLanguage(session, 'zh');
  expect(session.openingDoor).toBe('town-door');
  advance(session, 1, DOOR_OPEN_SECONDS / 2);
  expect(session.openingDoor).toBeNull();
  expect(session.doors['town-door']).toBe(1);
  expect(session.x).toBe(x);
  advance(session, 1, .4);
  expect(session.scene).toBe('workshop');
});

test('a graphics interruption can cancel an opening door and expose the complete overview', () => {
  const session = createSession(); session.x = 19.35; updateProximity(session);
  openNearbyDoor(session); advance(session, 0, .2);
  cancelDoorOpening(session);
  expect(session.openingDoor).toBeNull();
  expect(session.doors['town-door']).toBe(0);
  expect(openOverview(session)).toBe(true);
  expect(session.reader).toBe('overview');
});

test('the far door blocks exit until opened, then both sides allow a continuous return trip', () => {
  const session = createSession();
  for (let i = 0; i < 700; i++) {
    if (session.nearbyDoor) { openNearbyDoor(session); advance(session, 0, DOOR_OPEN_SECONDS); }
    advance(session, 1, .05);
    if (session.x > 45) break;
  }
  expect(session.scene).toBe('gallery');
  expect(session.doors).toEqual({ 'town-door': 1, 'sea-door': 1 });
  for (let i = 0; i < 400; i++) advance(session, -1, .05);
  expect(session.scene).toBe('town');
  expect(session.x).toBe(-8);
  const inside = createSession(); inside.x = 40; updateProximity(inside);
  advance(inside, 1, 20);
  expect(inside.x).toBe(43.35);
  expect(inside.nearbyDoor).toBe('sea-door');
});

test('door interaction clears held directions and raises the shutter without revealing the room before entry', () => {
  const session = createSession(); session.x = 19.35; updateProximity(session);
  const input = createInput(); input.press('test', 1);
  openNearbyDoor(session); input.pause(true);
  expect(input.direction()).toBe(0);
  const world = createWorld();
  try {
    world.updateRoom(session);
    const exterior = world.scene.getObjectByName('Room_exterior')!;
    expect(exterior.visible).toBe(true);
    const shutter = world.scene.getObjectByName('Room_door_town-door')!.getObjectByName('Door_leaf')!;
    const bottom = shutter.children[0].position.y;
    advance(session, 0, DOOR_OPEN_SECONDS / 2); world.updateRoom(session);
    expect(shutter.children[0].position.y).toBeGreaterThan(bottom + 1);
    expect(shutter.rotation.y).toBe(0);
    advance(session, 0, DOOR_OPEN_SECONDS / 2);
    world.updateRoom(session);
    expect(exterior.visible, 'opening alone does not show the room').toBe(true);
    advance(session, 1, .5); world.updateRoom(session);
    expect(exterior.visible).toBe(false);
    input.pause(false);
    expect(input.direction()).toBe(0);
    expect(world.scene.getObjectByName('Room_ceiling')).toBeDefined();
    expect(world.scene.getObjectByName('Room_side_wall')).toBeDefined();
  } finally { disposeScene(world.scene); }
});
