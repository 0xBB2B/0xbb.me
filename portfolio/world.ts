import * as THREE from 'three';
import { contactShadow } from './geometry';
import { createTown } from './scenes/town';

export function createWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9af91);
  scene.fog = new THREE.Fog(0xd9af91, 27, 85);
  scene.add(new THREE.HemisphereLight(0xffe5ba, 0x746f86, 2));
  const sunlight = new THREE.DirectionalLight(0xffd29a, 3.1);
  sunlight.position.set(-12, 18, 9);
  sunlight.target.position.set(4, 0, -3);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -33, right: 33, top: 20, bottom: -20, near: 0.5, far: 70 });
  sunlight.shadow.normalBias = 0.04;
  sunlight.shadow.bias = -0.0003;
  scene.add(sunlight, sunlight.target, createTown());
  const shadow = contactShadow(scene, 0, 0.6, 0.63, 0.26);
  return { scene, shadow };
}
