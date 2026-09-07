import * as THREE from 'three';
import { createBlackOutfitPlayerVoxel } from '../design-reference/player-voxel-black';
import { disposeScene } from './geometry';
import type { Session } from './state';

const HIP_HEIGHT = 12;
const LEG_SWING = 0.28;
const ARM_SWING = 0.22;
const ROAD_HEIGHT = 0.035;

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

export function createCharacter() {
  const root = new THREE.Group();
  const black = createBlackOutfitPlayerVoxel();
  root.add(black);

  const leftLeg = black.getObjectByName('Left_leg') as THREE.Group;
  const rightLeg = black.getObjectByName('Right_leg') as THREE.Group;
  const leftArm = black.getObjectByName('Left_arm') as THREE.Group;
  const rightArm = black.getObjectByName('Right_arm') as THREE.Group;
  const leftFootCorners = geometryCorners(leftLeg);
  const rightFootCorners = geometryCorners(rightLeg);

  function hipPivot(leg: THREE.Group) {
    const pivot = new THREE.Group();
    pivot.position.set(leg.position.x, HIP_HEIGHT, leg.position.z);
    black.add(pivot);
    leg.removeFromParent();
    leg.position.set(0, -HIP_HEIGHT, 0);
    pivot.add(leg);
    return pivot;
  }

  const leftHip = hipPivot(leftLeg);
  const rightHip = hipPivot(rightLeg);
  const floorPoint = new THREE.Vector3();

  function keepFeetOnRoad() {
    root.updateMatrixWorld(true);
    let floor = Infinity;
    for (const [leg, corners] of [[leftLeg, leftFootCorners], [rightLeg, rightFootCorners]] as const) {
      for (const corner of corners) {
        floorPoint.copy(corner).applyMatrix4(leg.matrixWorld);
        floor = Math.min(floor, floorPoint.y);
      }
    }
    const localUpWorldY = new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion).y;
    black.position.y += (ROAD_HEIGHT - floor) / localUpWorldY;
  }

  return {
    root,
    update(session: Session, camera: THREE.Camera) {
      root.position.set(session.x, ROAD_HEIGHT, 0.6);
      // Keep the sole origin and existing camera-facing orientation.
      root.quaternion.copy(camera.quaternion);
      // Keep the model upright while the billboard root follows the pitched camera.
      black.quaternion.copy(root.quaternion).invert();
      black.rotateY(session.facing * Math.PI / 8);
      black.position.y = 0;

      const stride = session.walking && !session.paused ? Math.sin(session.stride) : 0;
      leftHip.rotation.x = stride * LEG_SWING;
      rightHip.rotation.x = -stride * LEG_SWING;
      leftArm.rotation.x = -stride * ARM_SWING;
      rightArm.rotation.x = stride * ARM_SWING;
      keepFeetOnRoad();
    },
    dispose() {
      root.removeFromParent();
      disposeScene(root);
    },
  };
}
