import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';

test('the low foreground conveyor advances payloads, rollers and inspection arms without changing the player route', () => {
  const world = createWorld();
  try {
    const conveyor = world.scene.getObjectByName('Factory_conveyor')!;
    expect(conveyor).toBeDefined();
    const payload = conveyor.getObjectByName('Conveyor_payload')!;
    const roller = conveyor.getObjectByName('Conveyor_roller')!;
    const arm = conveyor.getObjectByName('Conveyor_inspection_arm')!;
    world.updateAmbient(.2);
    const before = [payload.position.x, roller.rotation.y, arm.rotation.y];
    world.updateAmbient(.8);
    expect(payload.position.x).toBeGreaterThan(before[0]);
    expect(roller.rotation.y).not.toBe(before[1]);
    expect(arm.rotation.y).not.toBe(before[2]);
    const bounds = new THREE.Box3().setFromObject(conveyor);
    expect(bounds.min.z).toBeGreaterThan(2.3);
    expect(bounds.max.y).toBeLessThan(.65);
  } finally { disposeScene(world.scene); }
});

test('meteors are intermittent and the lighthouse rotates a real light with spatially fading beam edges', () => {
  const world = createWorld();
  try {
    const meteors = world.scene.getObjectByName('Coastal_meteors')!;
    expect(meteors.children).toHaveLength(3);
    const head = meteors.children[0].children[0] as THREE.Mesh;
    const streakMaterial = head.material as THREE.ShaderMaterial;
    expect(streakMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(head.geometry.getAttribute('position').count).toBe(4);
    expect(head.geometry.getIndex()!.count).toBe(6);
    expect(streakMaterial.fragmentShader).toContain('sideFade');
    expect(streakMaterial.fragmentShader).toContain('pow(1.0-age,1.8)');
    expect(new Set(meteors.children.map(meteor => (meteor.children[0] as THREE.Mesh).geometry)).size).toBe(1);
    const beam = world.scene.getObjectByName('Lighthouse_beam')!;
    const light = world.scene.getObjectByName('Lighthouse_rotating_light') as THREE.SpotLight;
    expect(light).toBeInstanceOf(THREE.SpotLight);
    const softMaterial = (beam.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(softMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(softMaterial.fragmentShader).toContain('sideFade*distanceFade');
    expect(softMaterial.depthWrite).toBe(false);
    world.updateAmbient(.5);
    const meteorPosition = meteors.children[0].position.clone();
    const angle = beam.rotation.y;
    const target = light.target.position.clone();
    expect((head.material as THREE.Material).opacity).toBeGreaterThan(0);
    world.updateAmbient(.3);
    expect(meteors.children[0].position.equals(meteorPosition)).toBe(false);
    const delta = meteors.children[0].position.clone().sub(meteorPosition).normalize();
    expect(delta.x).toBeCloseTo(Math.cos(meteors.children[0].rotation.z), 5);
    expect(delta.y).toBeCloseTo(Math.sin(meteors.children[0].rotation.z), 5);
    expect(streakMaterial.uniforms.uLength.value).toBeGreaterThan(0);
    expect(streakMaterial.uniforms.uLength.value).toBeLessThanOrEqual(3.2);
    expect(beam.rotation.y).not.toBe(angle);
    expect(light.target.position.equals(target)).toBe(false);
    world.updateAmbient(1.2);
    expect((head.material as THREE.Material).opacity).toBe(0);
    const paused = beam.rotation.y;
    world.updateAmbient(10, false);
    expect(beam.rotation.y).toBe(paused);
    for (const meteor of meteors.children) for (const mesh of meteor.children as THREE.Mesh[]) {
      expect((mesh.material as THREE.Material).opacity).toBe(0);
      expect((mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value).toBe(0);
    }
  } finally { disposeScene(world.scene); }
});

test('the exterior includes modeled panel joints, vents, masonry and roof seams rather than image textures', () => {
  const world = createWorld();
  try {
    const details = world.scene.getObjectByName('Room_exterior_details')!;
    expect(details).toBeDefined();
    const masonry = details.getObjectByName('Exterior_masonry') as THREE.InstancedMesh;
    expect(masonry).toBeInstanceOf(THREE.InstancedMesh);
    expect(masonry.count).toBe(186);
    expect(details.children.length).toBeGreaterThan(30);
    expect(world.scene.getObjectByName('Roof_panel_seam')).toBeDefined();
    details.traverse(object => {
      if (object instanceof THREE.Mesh) expect((object.material as THREE.MeshStandardMaterial).map).toBeNull();
    });
  } finally { disposeScene(world.scene); }
});
