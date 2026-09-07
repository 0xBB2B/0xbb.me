import * as THREE from 'three';
import { createBlackOutfitPlayerVoxel } from '../design-reference/player-voxel-black';
import { disposeScene } from './geometry';
import type { Session } from './state';

export function createCharacter() {
  const root = new THREE.Group();
  const black = createBlackOutfitPlayerVoxel();
  root.add(black);
  return {
    root,
    update(session: Session, camera: THREE.Camera) {
      root.position.set(session.x, 0.07, 0.6);
      // Keep the sole origin and existing camera-facing orientation.
      root.quaternion.copy(camera.quaternion);
      black.rotation.y = session.facing * Math.PI / 8;
    },
    dispose() {
      root.removeFromParent();
      disposeScene(root);
    },
  };
}
