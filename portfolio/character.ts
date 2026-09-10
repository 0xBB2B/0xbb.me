import * as THREE from 'three';
import { createBlackOutfitPlayerVoxel } from './models/player-voxel-black';
import { disposeScene } from './geometry';
import type { PlayerAppearance, Session } from './state';
import { createAvatarModel } from './avatar-models';

const HIP_HEIGHT = 12;
const LEG_SWING = 0.28;
const ARM_SWING = 0.22;
const ROAD_HEIGHT = 0.035;
const RUN_BOB_HEIGHT = 0.025;

function geometryCorners(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const toRoot = root.matrixWorld.clone().invert();
  const corners: THREE.Vector3[] = [];
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox;
    if (!bounds) return;
    const toRootFromMesh = toRoot.clone().multiply(object.matrixWorld);
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corners.push(new THREE.Vector3(x, y, z).applyMatrix4(toRootFromMesh));
        }
      }
    }
  });
  return corners;
}

export function createCharacter(appearance: PlayerAppearance = 'black') {
  const root = new THREE.Group();
  root.name = 'Player_character'; root.userData.appearance = appearance;
  const model = appearance === 'black' ? createBlackOutfitPlayerVoxel() : createAvatarModel(appearance);
  root.add(model);

  const leftLeg = model.getObjectByName('Left_leg') as THREE.Group;
  const rightLeg = model.getObjectByName('Right_leg') as THREE.Group;
  const leftArm = model.getObjectByName('Left_arm') as THREE.Group;
  const rightArm = model.getObjectByName('Right_arm') as THREE.Group;
  const gown = model.getObjectByName('Long_split_gown');
  const leftFootCorners = geometryCorners(leftLeg);
  const rightFootCorners = geometryCorners(rightLeg);

  function hipPivot(leg: THREE.Group) {
    const support = new THREE.Group();
    support.name = `${leg.name}_support`;
    support.position.set(leg.position.x, HIP_HEIGHT, leg.position.z);
    const pivot = new THREE.Group();
    support.add(pivot);
    model.add(support);
    leg.removeFromParent();
    leg.position.set(0, -HIP_HEIGHT, 0);
    pivot.add(leg);
    return { pivot, support };
  }

  const { pivot: leftHip, support: leftSupport } = hipPivot(leftLeg);
  const { pivot: rightHip, support: rightSupport } = hipPivot(rightLeg);
  const floorPoint = new THREE.Vector3();

  function keepFeetOnRoad(sprintBlend: number, phase: number) {
    root.updateMatrixWorld(true);
    let floor = Infinity;
    for (const [leg, corners] of [[leftLeg, leftFootCorners], [rightLeg, rightFootCorners]] as const) {
      for (const corner of corners) {
        floorPoint.copy(corner).applyMatrix4(leg.matrixWorld);
        floor = Math.min(floor, floorPoint.y);
      }
    }
    const localUpWorldY = new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion).y;
    const correction = ROAD_HEIGHT - floor;
    const slowBob = RUN_BOB_HEIGHT * (1 - Math.cos(phase)) * .5;
    const bodyLift = THREE.MathUtils.lerp(correction, slowBob, sprintBlend);
    model.position.y += bodyLift / localUpWorldY;
    if (sprintBlend > 0) {
      // Keep the hips attached and the feet grounded without making the torso follow every footfall.
      const hipY = leftSupport.getWorldPosition(floorPoint).y;
      const reach = (hipY - ROAD_HEIGHT) / (hipY - floor - bodyLift);
      leftSupport.scale.y = reach;
      rightSupport.scale.y = reach;
    }
  }

  return {
    root,
    update(session: Session, camera: THREE.Camera) {
      root.position.set(session.x, ROAD_HEIGHT, 0.6);
      // Keep the sole origin and existing camera-facing orientation.
      root.quaternion.copy(camera.quaternion);
      // Keep the model upright while the billboard root follows the pitched camera.
      model.quaternion.copy(root.quaternion).invert();
      model.rotateY(session.facing * Math.PI / 8);
      model.position.y = 0;
      leftSupport.scale.y = rightSupport.scale.y = 1;

      const airborne = session.jumpOffset > 0 || session.jumpVelocity > 0;
      const spread = airborne ? THREE.MathUtils.smoothstep(session.jumpOffset, 0, .55) : 0;
      const stride = session.walking && !session.paused && !airborne ? Math.sin(session.stride) : 0;
      const legSwing = THREE.MathUtils.lerp(LEG_SWING, .72, session.sprintBlend);
      const armSwing = THREE.MathUtils.lerp(ARM_SWING, .78, session.sprintBlend);
      const takeoff = session.jumpPose;
      const heldLeg = takeoff.lead * .52, heldArm = -takeoff.lead * .65;
      const jumpLeg = !airborne ? 0 : session.jumpVelocity > 0
        ? THREE.MathUtils.lerp(takeoff.stride * THREE.MathUtils.lerp(LEG_SWING, .72, takeoff.sprintBlend), heldLeg, spread)
        : heldLeg * spread;
      const jumpArm = !airborne ? 0 : session.jumpVelocity > 0
        ? THREE.MathUtils.lerp(-takeoff.stride * THREE.MathUtils.lerp(ARM_SWING, .78, takeoff.sprintBlend), heldArm, spread)
        : heldArm * spread;
      leftHip.rotation.x = stride * legSwing + jumpLeg;
      rightHip.rotation.x = -stride * legSwing - jumpLeg;
      leftArm.rotation.x = -stride * armSwing + jumpArm;
      rightArm.rotation.x = stride * armSwing - jumpArm;
      if (gown) {
        gown.rotation.x = -stride * .025 - spread * .04;
        gown.rotation.z = stride * .025;
        gown.position.y = Math.abs(stride) * .3 + spread * .25;
      }
      keepFeetOnRoad(session.walking && !session.paused && !airborne ? session.sprintBlend : 0, session.stride);
      root.position.y += session.jumpOffset;
    },
    dispose() {
      root.removeFromParent();
      disposeScene(root);
    },
  };
}
