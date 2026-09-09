import * as THREE from 'three';
import { box, contactShadow } from '../geometry';
import { JOURNEY } from '../journey';
import { boxInstances } from '../instances';

const workshopScene = JOURNEY.find(scene => scene.id === 'workshop')!;
const CYAN = 0x00e5ff;
const AMBER = 0xffc46d;

function lightStrip(parent: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d = .06) {
  const mesh = box(parent, color, x, y, z, w, h, d);
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.emissive.set(color);
  material.emissiveIntensity = 1.6;
  mesh.castShadow = false;
  return mesh;
}

function cylinder(parent: THREE.Object3D, color: number, x: number, y: number, z: number, radius: number, height: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16),
    new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .25, flatShading: true }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function terminal(parent: THREE.Group, id: string, x: number, index: number) {
  const cabinet = new THREE.Group();
  cabinet.name = `Board_${id}`;
  cabinet.position.set(x, 0, -4.72);
  const color = index % 2 ? AMBER : CYAN;
  box(cabinet, 0x354959, 0, 1.84, 0, 3.2, 3.2, .7);
  const screen = box(cabinet, 0x081a23, 0, 2.08, .37, 2.7, 2.04, .06);
  screen.name = `Board_face_${id}`;
  const material = screen.material as THREE.MeshStandardMaterial;
  material.emissive.set(0x0d343e);
  material.emissiveIntensity = .32;
  // The projected copy lives inside this recessed glass surface, not on a separate card.
  for (const side of [-1, 1]) {
    box(cabinet, 0x162630, side * 1.4, 2.08, .41, .12, 2.28, .15);
    lightStrip(cabinet, color, side * 1.5, 2.07, .38, .035, 2.67);
    for (const y of [.48, 3.17]) cylinder(cabinet, 0x8a9ba2, side * 1.48, y, .4, .05, .06).rotation.x = Math.PI / 2;
  }
  for (const y of [.99, 3.17]) box(cabinet, 0x14222c, 0, y, .41, 2.8, .12, .15);
  box(cabinet, 0x243441, 0, .42, .1, 3.4, .84, 1.1);
  box(cabinet, 0x63747b, 0, .85, .68, 2.65, .1, .54);
  boxInstances(cabinet, 'Terminal_keycaps', 0x2a3c44, [.16, .018, .16], Array.from({ length: 11 }, (_, key) => ({ x: -1.1 + key * .22, y: .916, z: .78 })));
  boxInstances(cabinet, 'Terminal_vents', 0x0d1821, [.11, .26, .025], Array.from({ length: 7 }, (_, slot) => ({ x: -.65 + slot * .21, y: .46, z: .67 })));
  lightStrip(cabinet, color, 1.13, .55, .68, .09, .07);
  lightStrip(cabinet, 0x9ac8a7, 1.13, .38, .68, .09, .07);
  contactShadow(parent, x, -4.72, 1.6, .65);
  parent.add(cabinet);
}

function pipe(parent: THREE.Group, x: number, y: number, width: number, color: number) {
  const run = new THREE.Group();
  run.name = 'Workshop_connected_pipe';
  box(run, 0x596c79, x, y, -6.2, width, .21, .21);
  lightStrip(run, color, x, y, -6.06, width, .04);
  for (const side of [-1, 1]) {
    box(run, 0x596c79, x + side * width / 2, y - .75, -6.2, .2, 1.65, .2);
    box(run, 0x8a9ba4, x + side * width / 2, y, -6.2, .34, .34, .34);
  }
  parent.add(run);
}

export function createWorkshop() {
  const workshop = new THREE.Group();
  workshop.name = 'Scene_workshop';
  const groundStart = workshopScene.start - 2;
  box(workshop, 0x192a35, (groundStart + workshopScene.end) / 2, -.2, 4,
    workshopScene.end - groundStart, .42, 50).name = 'Workshop_ground';

  const hall = new THREE.Group();
  hall.name = 'Workshop_hall';
  box(hall, 0x182d3c, 32, 3.275, -9.9, 24, 6.55, 1.5);
  for (const x of [21.2, 26.6, 32, 37.4, 42.8]) {
    box(hall, 0x4c6270, x, 3.2, -6.4, .34, 6.4, .5);
    box(hall, 0x70828b, x, 6.4, -5.5, .85, .22, 4.4);
  }
  for (const y of [5.9, 6.25]) lightStrip(hall, 0xa4dbe4, 32, y, -8.99, 21, .025);
  workshop.add(hall);

  const walkway = new THREE.Group();
  walkway.name = 'Workshop_maintenance_walkway';
  box(walkway, 0x586a77, 32, 4.7, -6.5, 23.5, .22, 1.9);
  lightStrip(walkway, AMBER, 32, 4.85, -5.53, 23.5, .035);
  boxInstances(walkway, 'Walkway_rail_posts', 0x7c929b, [.05, .72, .05], Array.from({ length: 35 }, (_, i) => ({ x: 20.6 + i * .67, y: 5.2, z: -5.51 })));
  box(walkway, 0x7c929b, 32, 5.56, -5.51, 23.5, .055, .055);
  workshop.add(walkway);

  const core = new THREE.Group();
  core.name = 'Workshop_data_core';
  cylinder(core, 0x405565, 31, .52, -7.3, 2, 1.04);
  const energy = cylinder(core, 0x8aeafa, 31, 2.92, -7.3, 1.08, 4.05);
  const energyMaterial = energy.material as THREE.MeshStandardMaterial;
  energyMaterial.emissive.set(CYAN);
  energyMaterial.emissiveIntensity = 1.25;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    box(core, 0x253746, 31 + Math.cos(angle) * 1.35, 2.98, -7.3 + Math.sin(angle) * 1.35, .14, 4.6, .14);
  }
  for (const y of [.95, 4.95]) cylinder(core, 0x718d9c, 31, y, -7.3, 1.65, .24);
  workshop.add(core);

  const tanks = new THREE.Group();
  tanks.name = 'Workshop_cooling_tanks';
  for (const x of [23.5, 40.5]) {
    cylinder(tanks, 0x273e50, x, 2.4, -8, 1.12, 4.8);
    for (const y of [.7, 2.4, 4.2]) cylinder(tanks, 0x8aa5b3, x, y, -8, 1.15, .14);
    lightStrip(tanks, CYAN, x, 2.5, -6.86, .045, 2.4);
  }
  workshop.add(tanks);

  const cables = new THREE.Group();
  cables.name = 'Workshop_cable_trays';
  pipe(cables, 25.4, 5.95, 9.3, AMBER);
  pipe(cables, 37.5, 6.25, 9.6, CYAN);
  for (const y of [6.1, 6.3]) box(cables, 0x718491, 32, y, -7.1, 23, .06, .08);
  for (let i = 0; i < 28; i++) box(cables, 0x465d6a, 20.8 + i * .83, 6.2, -7.1, .06, .33, .12);
  workshop.add(cables);

  const racks = new THREE.Group();
  racks.name = 'Workshop_server_racks';
  const bench = new THREE.Group();
  bench.name = 'Workshop_workbench';
  box(bench, 0x536777, 32, .93, -5.7, 21, .16, 1.1);
  for (const x of [25, 29, 33, 37, 41]) {
    box(racks, 0x10202e, x, 1.7, -5.7, .96, 3.4, .64);
  }
  const slots = [25, 29, 33, 37, 41].flatMap(x => Array.from({ length: 9 }, (_, slot) => ({ x, y: .25 + slot * .35, z: -5.34, amber: slot % 3 === 0 })));
  boxInstances(racks, 'Server_slots', 0x354c5b, [.85, .23, .08], slots);
  for (const amber of [false, true]) {
    const status = boxInstances(racks, 'Server_status_lights', amber ? AMBER : CYAN, [.075, .045, .06],
      slots.filter(slot => slot.amber === amber).map(slot => ({ x: slot.x + .27, y: slot.y, z: -5.28 })));
    const material = status.material as THREE.MeshStandardMaterial;
    material.emissive.set(amber ? AMBER : CYAN); material.emissiveIntensity = 1.6;
  }
  workshop.add(racks, bench);
  for (const [index, board] of workshopScene.boards.entries()) terminal(workshop, board.id, board.x, index);
  for (let i = 0; i < 26; i++) {
    const stripe = box(workshop, 0xbba576, 20.7 + i * .85, .022, 3.1, .35, .016, .12);
    stripe.rotation.y = -.5;
  }
  for (const x of [23, 31, 40]) {
    const light = new THREE.PointLight(x === 31 ? CYAN : 0xb0d8e2, x === 31 ? 11 : 6, 10, 2);
    light.position.set(x, 3.6, -2.5);
    workshop.add(light);
  }
  return workshop;
}
