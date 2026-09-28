import * as THREE from 'three';
import { DEFAULT_CAMERA, viewFov } from '../diorama/layout';
import { PLAQUE_PANEL } from '../diorama/plaque';

function screenPoint(world: [number, number, number], width: number, height: number): { x: number; y: number } {
  const camera = new THREE.PerspectiveCamera(viewFov(width, height), width / height, 0.5, 400);
  camera.position.set(...DEFAULT_CAMERA.position);
  camera.lookAt(new THREE.Vector3(...DEFAULT_CAMERA.target));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const ndc = new THREE.Vector3(...world).project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

export function plaquePoint(width: number, height: number): { x: number; y: number } {
  return screenPoint(PLAQUE_PANEL.center, width, height);
}

export function roadPoint(width: number, height: number): { x: number; y: number } {
  return screenPoint([8, 0, 8], width, height);
}
