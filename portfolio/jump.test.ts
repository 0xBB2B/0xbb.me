import { expect, test } from 'bun:test';
import * as THREE from 'three';
import * as state from './state';
import { createCharacter } from './character';

test('a jump rises and lands exactly, cannot double-jump and keeps the original horizontal speed', () => {
  const session = state.createSession();
  expect(session.jumpOffset).toBe(0);
  expect(state.jump(session)).toBe(true);
  expect(state.jump(session)).toBe(false);
  let peak = 0;
  for (let i = 0; i < 60; i++) { state.advance(session, 1, 1 / 60, true); peak = Math.max(peak, session.jumpOffset); }
  expect(peak).toBeGreaterThan(.8); expect(peak).toBeLessThan(1.1);
  expect(session.jumpOffset).toBe(0); expect(session.jumpVelocity).toBe(0);
  expect(session.x).toBeCloseTo(state.ROAD.start + 5.6, 6);
  expect(state.jump(session)).toBe(true);
});

test('jumping cannot bypass a closed door or the end of the road', () => {
  for (const x of [19.35, state.ROAD.end]) {
    const session = state.createSession(); session.x = x; state.updateProximity(session);
    state.jump(session);
    for (let i = 0; i < 60; i++) state.advance(session, 1, 1 / 60, true);
    expect(session.x).toBe(x); expect(session.jumpOffset).toBe(0);
  }
});

test('reading and scripted actions reject jumping; airborne reading pauses then resumes the fall', () => {
  const session = state.createSession();
  state.jump(session); state.advance(session, 0, .1);
  const height = session.jumpOffset;
  state.openOverview(session);
  expect(state.jump(session)).toBe(false);
  state.advance(session, 1, .5); expect(session.jumpOffset).toBe(height);
  state.closeReader(session);
  for (let i = 0; i < 60; i++) state.advance(session, 0, 1 / 60);
  expect(session.jumpOffset).toBe(0);
  session.openingDoor = 'town-door'; expect(state.jump(session)).toBe(false); session.openingDoor = null;
  session.appearanceTransition = { target: 'dress', elapsed: 0 }; expect(state.jump(session)).toBe(false); session.appearanceTransition = null;
  session.npcReaction = { elapsed: 0 }; expect(state.jump(session)).toBe(false);
});

test('takeoff preserves the current walking/running limb order and angles, with the reversed default when stationary', () => {
  const camera = new THREE.OrthographicCamera(); camera.position.set(0, 8.5, 20); camera.lookAt(0, 3.5, 0); camera.updateMatrixWorld(true);
  for (const appearance of ['black', 'dress'] as const) for (const sprintBlend of [0, .5, 1]) for (const phase of [Math.PI / 6, Math.PI / 2, Math.PI * 7 / 6, Math.PI * 1.5]) {
    const character = createCharacter(appearance), session = state.createSession();
    session.walking = true; session.stride = phase; session.sprintBlend = sprintBlend;
    try {
      character.update(session, camera);
      const leg = character.root.getObjectByName('Left_leg')!.parent!, arm = character.root.getObjectByName('Left_arm')!;
      const beforeLeg = leg.rotation.x, beforeArm = arm.rotation.x;
      state.jump(session); character.update(session, camera);
      expect(leg.rotation.x).toBeCloseTo(beforeLeg, 6); expect(arm.rotation.x).toBeCloseTo(beforeArm, 6);
      state.advance(session, 1, .25, sprintBlend === 1); character.update(session, camera);
      expect(Math.sign(leg.rotation.x)).toBe(Math.sign(beforeLeg));
      expect(Math.sign(arm.rotation.x)).toBe(Math.sign(beforeArm));
      expect(Math.abs(leg.rotation.x)).toBeCloseTo(.52, 6);
      expect(Math.abs(arm.rotation.x)).toBeCloseTo(.65, 6);
      const held = [leg.rotation.x, arm.rotation.x];
      state.advance(session, -1, .2, sprintBlend === 1); character.update(session, camera);
      expect([leg.rotation.x, arm.rotation.x]).toEqual(held);
    } finally { character.dispose(); }
  }
  const session = state.createSession(), character = createCharacter();
  try {
    state.jump(session); state.advance(session, 0, .25); character.update(session, camera);
    expect(character.root.getObjectByName('Left_leg')!.parent!.rotation.x).toBeLessThan(0);
    expect(character.root.getObjectByName('Left_arm')!.rotation.x).toBeGreaterThan(0);
  } finally { character.dispose(); }
});

test('both outfits hold a fore-aft counter-swing in the air without sideways splay, then close at landing', () => {
  const camera = new THREE.OrthographicCamera(); camera.position.set(0, 8.5, 20); camera.lookAt(0, 3.5, 0); camera.updateMatrixWorld(true);
  for (const appearance of ['black', 'dress'] as const) for (const moving of [false, true]) {
    const character = createCharacter(appearance), session = state.createSession();
    session.walking = moving; session.sprintBlend = moving ? 1 : 0;
    const leftArm = character.root.getObjectByName('Left_arm')!, rightArm = character.root.getObjectByName('Right_arm')!;
    const leftHip = character.root.getObjectByName('Left_leg')!.parent!, rightHip = character.root.getObjectByName('Right_leg')!.parent!;
    const restLeft = leftArm.rotation.z, restRight = rightArm.rotation.z;
    try {
      session.jumpOffset = .8; session.jumpVelocity = 1;
      let pose: number[] | undefined;
      for (const phase of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        session.stride = phase; character.update(session, camera);
        const angles = [leftArm.rotation.x, leftArm.rotation.z, rightArm.rotation.x, rightArm.rotation.z, leftHip.rotation.x, leftHip.rotation.z, rightHip.rotation.x, rightHip.rotation.z];
        expect(leftArm.rotation.x).toBeCloseTo(.65, 6); expect(rightArm.rotation.x).toBeCloseTo(-.65, 6);
        expect(leftHip.rotation.x).toBeCloseTo(-.52, 6); expect(rightHip.rotation.x).toBeCloseTo(.52, 6);
        expect(leftArm.rotation.z).toBe(restLeft); expect(rightArm.rotation.z).toBe(restRight);
        expect(leftHip.rotation.z).toBeCloseTo(0, 6); expect(rightHip.rotation.z).toBeCloseTo(0, 6);
        if (pose) expect(angles).toEqual(pose); else pose = angles;
      }
      session.jumpOffset = .03; session.jumpVelocity = -5; character.update(session, camera);
      expect(Math.abs(leftHip.rotation.x)).toBeLessThan(.02);
      expect(Math.abs(leftArm.rotation.x)).toBeLessThan(.04);
      session.jumpOffset = 0; session.jumpVelocity = 0; session.stride = 0; character.update(session, camera);
      expect(leftHip.rotation.x).toBeCloseTo(0, 6); expect(rightHip.rotation.x).toBeCloseTo(0, 6);
      expect(leftArm.rotation.x).toBeCloseTo(0, 6); expect(rightArm.rotation.x).toBeCloseTo(0, 6);
      expect(leftArm.rotation.z).toBe(restLeft); expect(rightArm.rotation.z).toBe(restRight);
    } finally { character.dispose(); }
  }
});

test('moving jumps stop the walking cycle and restart it from closed legs after landing', () => {
  const session = state.createSession(); state.advance(session, 1, .1, true);
  state.jump(session);
  let landed = false;
  for (let i = 0; i < 100; i++) {
    state.advance(session, 1, 1 / 60, true);
    expect(session.stride).toBe(0);
    if (session.jumpOffset === 0) { landed = true; break; }
  }
  expect(landed).toBe(true);
  state.advance(session, 1, 1 / 60, true);
  expect(session.stride).toBeGreaterThan(0);
});

test('both outfits visibly lift off the floor instead of having the grounding correction cancel jumping', () => {
  const camera = new THREE.OrthographicCamera(); camera.position.set(0, 8.5, 20); camera.lookAt(0, 3.5, 0); camera.updateMatrixWorld(true);
  for (const appearance of ['black', 'dress'] as const) {
    const character = createCharacter(appearance), session = state.createSession();
    try {
      state.jump(session); state.advance(session, 0, .25);
      character.update(session, camera); character.root.updateMatrixWorld(true);
      const floors = ['Left_leg', 'Right_leg'].map(name => new THREE.Box3().setFromObject(character.root.getObjectByName(name)!).min.y);
      expect(Math.min(...floors)).toBeCloseTo(.035 + session.jumpOffset, 6);
      expect(character.root.position.y).toBeGreaterThan(.5);
      for (let i = 0; i < 60; i++) state.advance(session, 0, 1 / 60);
      character.update(session, camera); expect(character.root.position.y).toBeCloseTo(.035);
    } finally { character.dispose(); }
  }
});
