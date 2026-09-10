import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { createCharacter } from './character';
import { createTown } from './scenes/town';
import { createSession, ROAD } from './state';

const camera = new THREE.OrthographicCamera();
camera.position.set(0, 8.5, 20);
camera.lookAt(0, 3.5, 0);
camera.updateMatrixWorld(true);

function requirePart(root: THREE.Object3D, name: string) {
  const part = root.getObjectByName(name);
  expect(part, `${name} must remain part of the rendered character`).toBeDefined();
  return part!;
}

function worldPosition(root: THREE.Object3D, name: string) {
  root.updateMatrixWorld(true);
  return requirePart(root, name).getWorldPosition(new THREE.Vector3());
}

function limbSnapshot(root: THREE.Object3D) {
  return {
    leftFoot: worldPosition(requirePart(root, 'Left_leg'), 'Boot_toe'),
    rightFoot: worldPosition(requirePart(root, 'Right_leg'), 'Boot_toe'),
    leftHand: worldPosition(requirePart(root, 'Left_arm'), 'Hand'),
    rightHand: worldPosition(requirePart(root, 'Right_arm'), 'Hand'),
  };
}

function expectVectorClose(actual: THREE.Vector3, expected: THREE.Vector3) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.z).toBeCloseTo(expected.z, 6);
}

function roadSurfaceY() {
  const town = createTown();
  town.updateMatrixWorld(true);
  const pavingTops: number[] = [];
  town.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox;
    if (!bounds) return;
    const size = bounds.getSize(new THREE.Vector3());
    if (Math.abs(size.x - 0.77) > 1e-6 || Math.abs(size.y - 0.1) > 1e-6 || Math.abs(size.z - 0.7) > 1e-6) return;
    pavingTops.push(new THREE.Vector3(0, bounds.max.y, 0).applyMatrix4(object.matrixWorld).y);
  });
  expect(pavingTops.length).toBeGreaterThan(100);
  const surface = pavingTops[0];
  for (const top of pavingTops) expect(top).toBeCloseTo(surface, 8);
  return surface;
}

function soleBottomCorners(root: THREE.Object3D, legName: string) {
  root.updateMatrixWorld(true);
  const sole = requirePart(requirePart(root, legName), 'Platform_sole');
  expect(sole).toBeInstanceOf(THREE.Mesh);
  const mesh = sole as THREE.Mesh;
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  return [bounds.min.x, bounds.max.x].flatMap(x =>
    [bounds.min.z, bounds.max.z].map(z =>
      new THREE.Vector3(x, bounds.min.y, z).applyMatrix4(mesh.matrixWorld)));
}

describe('player/AC-1 static black-outfit geometry', () => {
  test('keeps the complete untextured model, recognizable details, scale and sole origin', () => {
    const character = createCharacter();
    const model = requirePart(character.root, 'FUBUKI_Minecraft_Black_Outfit');
    const bounds = new THREE.Box3().setFromObject(model);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(2.4, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);

    for (const part of ['Head', 'Torso', 'Left_arm', 'Right_arm', 'Left_leg', 'Right_leg',
      'High_ponytail', 'Cyan_earring', 'Left_blue_earring', 'Mouth', 'Bare_waist',
      'Black_crop_top', 'Belt', 'Crossed_boot_lace', 'Strap_buckle', 'Platform_sole']) {
      requirePart(model, part);
    }
    const names: string[] = [];
    model.traverse(object => {
      names.push(object.name);
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
      }
    });
    expect(names.filter(name => /Charm_chain|Blue_boot_charm|Charm_glint|tongue/i.test(name))).toEqual([]);
    character.dispose();
  });
});

describe('player/AC-2 runtime gait and facing', () => {
  test('two opposite stride phases alternate both legs, with arms counter-swinging and no root-motion substitute', () => {
    const character = createCharacter();
    const session = createSession();
    session.x = 4;
    session.walking = true;
    session.facing = 1;

    session.stride = Math.PI / 2;
    character.update(session, camera);
    const phaseA = limbSnapshot(character.root);
    const rootA = character.root.position.clone();
    const rootRotationA = character.root.quaternion.clone();

    session.stride = 3 * Math.PI / 2;
    character.update(session, camera);
    const phaseB = limbSnapshot(character.root);

    expect(Math.sign(phaseA.leftFoot.z - phaseA.rightFoot.z)).toBe(-Math.sign(phaseB.leftFoot.z - phaseB.rightFoot.z));
    expect(Math.abs(phaseA.leftFoot.z - phaseA.rightFoot.z)).toBeGreaterThan(0.1);
    expect(Math.abs(phaseB.leftFoot.z - phaseB.rightFoot.z)).toBeGreaterThan(0.1);
    expect(Math.sign(phaseA.leftHand.z - phaseA.rightHand.z)).toBe(-Math.sign(phaseA.leftFoot.z - phaseA.rightFoot.z));
    expect(Math.sign(phaseB.leftHand.z - phaseB.rightHand.z)).toBe(-Math.sign(phaseB.leftFoot.z - phaseB.rightFoot.z));
    expectVectorClose(character.root.position, rootA);
    expect(character.root.quaternion.angleTo(rootRotationA)).toBeCloseTo(0, 8);
    character.dispose();
  });

  test('idle, pause and boundary-stop restore the initial pose without accumulated deformation', () => {
    const character = createCharacter();
    const session = createSession();
    session.x = 2;
    character.update(session, camera);
    const idle = limbSnapshot(character.root);
    const initialScale = character.root.scale.clone();

    for (let index = 0; index < 40; index++) {
      session.walking = true;
      session.stride = index * 0.37;
      session.facing = index % 2 ? -1 : 1;
      character.update(session, camera);
    }

    session.walking = false;
    session.stride = 0;
    session.facing = 1;
    character.update(session, camera);
    const stopped = limbSnapshot(character.root);
    for (const part of Object.keys(idle) as Array<keyof typeof idle>) expectVectorClose(stopped[part], idle[part]);
    expectVectorClose(character.root.scale, initialScale);

    session.walking = true;
    session.stride = Math.PI / 2;
    session.paused = true;
    character.update(session, camera);
    const paused = limbSnapshot(character.root);
    for (const part of Object.keys(idle) as Array<keyof typeof idle>) expectVectorClose(paused[part], idle[part]);

    session.paused = false;
    session.walking = false;
    session.x = ROAD.end;
    character.update(session, camera);
    expectVectorClose(worldPosition(requirePart(character.root, 'Left_leg'), 'Boot_toe'), idle.leftFoot.clone().add(new THREE.Vector3(ROAD.end - 2, 0, 0)));
    character.dispose();
  });

  test('sprinting increases arm and leg swing while keeping the soles supported and restoring the walk pose', () => {
    const character = createCharacter();
    const session = createSession();
    session.walking = true; session.stride = Math.PI / 2;
    try {
      character.update(session, camera);
      const walkArm = Math.abs(requirePart(character.root, 'Left_arm').rotation.x);
      const walkLeg = Math.abs(requirePart(character.root, 'Left_leg').parent!.rotation.x);
      session.sprintBlend = 1;
      character.update(session, camera);
      expect(Math.abs(requirePart(character.root, 'Left_arm').rotation.x)).toBeGreaterThan(walkArm * 2);
      expect(Math.abs(requirePart(character.root, 'Left_leg').parent!.rotation.x)).toBeGreaterThan(walkLeg * 2);
      for (let phase = 0; phase <= Math.PI * 2; phase += Math.PI / 8) {
        session.stride = phase; character.update(session, camera);
        const floor = Math.min(...['Left_leg', 'Right_leg'].flatMap(leg => soleBottomCorners(character.root, leg).map(p => p.y)));
        expect(floor).toBeCloseTo(.035, 6);
      }
      session.sprintBlend = 0; session.stride = Math.PI / 2; character.update(session, camera);
      expect(Math.abs(requirePart(character.root, 'Left_arm').rotation.x)).toBeCloseTo(walkArm);
      expect(Math.abs(requirePart(character.root, 'Left_leg').parent!.rotation.x)).toBeCloseTo(walkLeg);
    } finally { character.dispose(); }
  });

  test('running body bob is small and has one smooth cycle without changing limb cadence or losing foot contact', () => {
    for (const appearance of ['black', 'dress'] as const) {
      const character = createCharacter(appearance), session = createSession();
      session.walking = true; session.sprintBlend = 1;
      const heights: number[] = [];
      try {
        for (let step = 0; step <= 128; step++) {
          session.stride = step * Math.PI / 64;
          character.update(session, camera); character.root.updateMatrixWorld(true);
          heights.push(character.root.children[0].getWorldPosition(new THREE.Vector3()).y);
          const left = requirePart(character.root, 'Left_leg'), right = requirePart(character.root, 'Right_leg');
          const floor = Math.min(new THREE.Box3().setFromObject(left).min.y, new THREE.Box3().setFromObject(right).min.y);
          expect(floor).toBeCloseTo(.035, 6);
          expect(left.parent!.parent!.scale.y).toBeGreaterThan(.9);
          expect(left.parent!.parent!.scale.y).toBeLessThan(1.2);
          expect(left.parent!.rotation.x).toBeCloseTo(Math.sin(session.stride) * .72, 6);
          expect(requirePart(character.root, 'Left_arm').rotation.x).toBeCloseTo(-Math.sin(session.stride) * .78, 6);
        }
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(.025001);
        expect(heights[64] - heights[0]).toBeCloseTo(.025, 6);
        expect(heights[128]).toBeCloseTo(heights[0], 6);
        for (let i = 1; i < heights.length; i++) {
          if (i <= 64) expect(heights[i] - heights[i - 1]).toBeGreaterThanOrEqual(-1e-6);
          else expect(heights[i] - heights[i - 1]).toBeLessThanOrEqual(1e-6);
        }
        session.walking = false; character.update(session, camera); character.root.updateMatrixWorld(true);
        expect(character.root.children[0].getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(.035, 6);
      } finally { character.dispose(); }
    }
  });

  test('normal walking retains its measured body-height profile for both outfits', () => {
    const expected = {
      black: [.0350000032, .0604207041, .0614920326, .0350000032, .0614920326],
      dress: [.0349999982, .0435520557, .0397915269, .0349999982, .0397915269],
    };
    for (const appearance of ['black', 'dress'] as const) {
      const character = createCharacter(appearance), session = createSession(); session.walking = true;
      try {
        for (const [index, phase] of [0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5].entries()) {
          session.stride = phase; character.update(session, camera); character.root.updateMatrixWorld(true);
          expect(character.root.children[0].getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(expected[appearance][index], 6);
        }
      } finally { character.dispose(); }
    }
  });

  test('left and right states visibly face opposite road directions while the camera-facing root is preserved', () => {
    const character = createCharacter();
    const session = createSession();
    session.x = 3;

    session.facing = 1;
    character.update(session, camera);
    const model = requirePart(character.root, 'FUBUKI_Minecraft_Black_Outfit');
    const right = model.getWorldDirection(new THREE.Vector3());

    session.facing = -1;
    character.update(session, camera);
    const left = model.getWorldDirection(new THREE.Vector3());

    expect(right.x).toBeGreaterThan(0.1);
    expect(left.x).toBeLessThan(-0.1);
    expect(character.root.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0, 8);
    character.dispose();
  });

  test('idle places the complete bottom face of both soles on the actual paving surface', () => {
    const character = createCharacter();
    const session = createSession();
    session.x = 5;
    character.update(session, camera);
    const surface = roadSurfaceY();

    for (const leg of ['Left_leg', 'Right_leg']) {
      for (const corner of soleBottomCorners(character.root, leg)) expect(corner.y).toBeCloseTo(surface, 6);
    }
    character.dispose();
  });

  test('walking feet use transformed sole geometry, do not penetrate paving and retain support contact', () => {
    const character = createCharacter();
    const session = createSession();
    session.x = 5;
    character.update(session, camera);
    const surface = roadSurfaceY();
    const idleRootY = character.root.position.y;
    session.walking = true;
    for (const stride of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
      session.stride = stride;
      character.update(session, camera);
      const floors = ['Left_leg', 'Right_leg'].map(leg =>
        Math.min(...soleBottomCorners(character.root, leg).map(corner => corner.y)));
      expect(Math.min(...floors)).toBeGreaterThanOrEqual(surface - 1e-6);
      expect(Math.min(...floors)).toBeLessThanOrEqual(surface + 1e-6);
      expect(character.root.position.y - idleRootY).toBeLessThan(0.2);
    }
    character.dispose();
  });
});
