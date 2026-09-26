import * as THREE from 'three';

export function buildLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight('#5f73b8', '#141a30', 1.25));
  const moon = new THREE.DirectionalLight('#8ea4e8', 0.8);
  moon.position.set(-12, 22, 10);
  scene.add(moon);
}
