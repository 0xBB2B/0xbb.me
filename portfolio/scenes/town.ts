import * as THREE from 'three';
import { box, contactShadow } from '../geometry';

const timber = 0x594239, trim = 0x97694e;

function roof(parent: THREE.Object3D, width: number, height: number, depth: number, y: number, color: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  mesh.position.set(0, y, -depth / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const slope = Math.atan2(height, width / 2);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 6; row++) {
      const t = (row + 0.5) / 6;
      const tile = box(parent, row % 2 ? color : 0xa05f50,
        side * width / 2 * t, y + height * (1 - t) + 0.035, 0,
        Math.hypot(width / 2, height) / 6 + 0.025, 0.07, depth + 0.06);
      tile.rotation.z = -side * slope;
    }
  }
  box(parent, 0x613e3a, 0, y + height + 0.06, 0, 0.17, 0.15, depth + 0.14);
}

function windowFrame(parent: THREE.Object3D, x: number, y: number, z: number, w = 0.8, h = 1.05) {
  box(parent, timber, x, y, z, w + 0.2, h + 0.18, 0.13);
  const glass = box(parent, 0xffd78c, x, y, z + 0.08, w, h, 0.025);
  (glass.material as THREE.MeshStandardMaterial).emissive.set(0xffa954);
  (glass.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
  box(parent, timber, x, y, z + 0.13, 0.065, h, 0.07);
  box(parent, timber, x, y + 0.03, z + 0.13, w, 0.065, 0.07);
  box(parent, trim, x, y - h / 2 - 0.1, z + 0.13, w + 0.32, 0.13, 0.3);
  for (const side of [-1, 1]) {
    box(parent, 0x526c67, x + side * (w / 2 + 0.22), y, z, 0.23, h, 0.09);
    for (let slat = 0; slat < 4; slat++) {
      box(parent, 0x385750, x + side * (w / 2 + 0.22), y - h / 2 + slat * h / 4 + 0.1, z + 0.06, 0.2, 0.035, 0.02);
    }
  }
}

function house(parent: THREE.Object3D, x: number, z: number, w: number, h: number, color: number, shop = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = -0.17;
  parent.add(group);
  const d = 3;
  box(group, 0x75675a, 0, 0.18, 0, w + 0.3, 0.36, d + 0.25);
  box(group, color, 0, h / 2 + 0.25, 0, w, h, d);
  for (const column of [-w / 2 + 0.06, 0, w / 2 - 0.06]) {
    box(group, timber, column, h / 2 + 0.25, d / 2 + 0.05, 0.13, h, 0.14);
  }
  for (const y of [0.5, h / 2 + 0.3, h + 0.2]) {
    box(group, trim, 0, y, d / 2 + 0.06, w + 0.12, 0.13, 0.16);
    box(group, timber, w / 2 + 0.035, y, 0, 0.12, 0.13, d);
  }
  // Side windows and a rotated footprint make the building volume readable.
  const side = new THREE.Group();
  side.position.set(w / 2 + 0.05, 0, 0);
  side.rotation.y = Math.PI / 2;
  group.add(side);
  windowFrame(side, 0, h * 0.66, 0, 0.6, 0.9);
  roof(group, w + 0.65, 1.5, d + 0.65, h + 0.28, 0x995c50);
  box(group, 0xa77b61, -w * 0.26, h + 1.3, -0.5, 0.52, 1.55, 0.56);
  box(group, 0x72564c, -w * 0.26, h + 2.1, -0.5, 0.68, 0.17, 0.71);
  for (const xx of [-w * 0.27, w * 0.27]) windowFrame(group, xx, h * 0.76, d / 2 + 0.08);
  const doorX = shop ? w * 0.24 : 0;
  box(group, timber, doorX, 1.03, d / 2 + 0.1, 0.9, 1.8, 0.16);
  box(group, 0x405c5a, doorX, 1.02, d / 2 + 0.2, 0.72, 1.58, 0.08);
  for (let i = 0; i < 4; i++) box(group, 0x354b4c, doorX - 0.27 + i * 0.18, 0.8, d / 2 + 0.25, 0.02, 1.1, 0.02);
  box(group, 0xe4b56a, doorX + 0.23, 1.01, d / 2 + 0.28, 0.055, 0.14, 0.04);
  box(group, 0xb0a08a, doorX, 0.12, d / 2 + 0.42, 1.25, 0.24, 0.78);
  if (shop) {
    windowFrame(group, -w * 0.22, 1.32, d / 2 + 0.12, 1.1, 1.2);
    for (let i = 0; i < 9; i++) {
      const awning = box(group, i % 2 ? 0xe6c991 : 0x6c8174, -w / 2 + (i + 0.5) * w / 9,
        2.25, d / 2 + 0.65, w / 9, 0.09, 1.2);
      awning.rotation.x = 0.22;
      box(group, i % 2 ? 0xe6c991 : 0x6c8174, -w / 2 + (i + 0.5) * w / 9, 2.02, d / 2 + 1.2, w / 9, 0.24, 0.08);
    }
    for (const xx of [-w / 2, w / 2]) box(group, timber, xx, 1.05, d / 2 + 1.16, 0.07, 2.1, 0.07);
    box(group, trim, -w * 0.22, 0.55, d / 2 + 0.85, 1.8, 0.65, 0.55);
    for (let i = 0; i < 7; i++) box(group, i % 2 ? 0xd4a858 : 0xb8694f, -w * 0.22 - 0.7 + i * 0.22, 0.95, d / 2 + 0.85, 0.19, 0.2, 0.3);
  }
  contactShadow(parent, x, z, w * 0.75, 2.5);
}

function tree(parent: THREE.Object3D, x: number, z: number, size: number) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(size);
  parent.add(group);
  box(group, timber, 0, 1.25, 0, 0.28, 2.5, 0.28);
  const branch = box(group, timber, 0.35, 1.7, 0, 0.17, 1.2, 0.17);
  branch.rotation.z = -0.6;
  const crowns: [number, number, number, number, number][] = [
    [-0.65, 2.75, 0, 1.15, 0x687c60], [0.65, 3.1, 0.1, 1.25, 0x879060],
    [0, 3.7, -0.1, 1.4, 0x9b9e68], [0.2, 3.1, 0.65, 1, 0x758758],
  ];
  for (const [xx, yy, zz, radius, color] of crowns) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    crown.position.set(xx, yy, zz);
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  }
  contactShadow(parent, x, z, size * 1.3, size * 0.65);
}

function lamp(parent: THREE.Object3D, x: number, z: number) {
  box(parent, 0x494542, x, 0.15, z, 0.45, 0.3, 0.45);
  box(parent, 0x3b3d3e, x, 1.6, z, 0.11, 3, 0.11);
  box(parent, 0x3b3d3e, x + 0.3, 3.05, z, 0.7, 0.09, 0.12);
  box(parent, 0x3b3d3e, x + 0.55, 2.95, z, 0.07, 0.3, 0.07);
  const glass = box(parent, 0xffde9b, x + 0.55, 2.67, z, 0.3, 0.45, 0.3);
  (glass.material as THREE.MeshStandardMaterial).emissive.set(0xffb84e);
  (glass.material as THREE.MeshStandardMaterial).emissiveIntensity = 2;
  box(parent, 0x454044, x + 0.55, 2.93, z, 0.45, 0.12, 0.43);
  box(parent, 0x454044, x + 0.55, 2.41, z, 0.4, 0.1, 0.38);
  const light = new THREE.PointLight(0xffbd76, 7, 6, 2);
  light.position.set(x + 0.55, 2.6, z + 0.3);
  parent.add(light);
}

function planter(parent: THREE.Object3D, x: number, z: number) {
  box(parent, 0x8c6252, x, 0.22, z, 1.15, 0.44, 0.7);
  box(parent, 0xb08867, x, 0.46, z, 1.25, 0.12, 0.8);
  box(parent, 0x494b3a, x, 0.52, z, 1.06, 0.03, 0.62);
  for (let i = 0; i < 5; i++) {
    const xx = x - 0.42 + i * 0.21;
    box(parent, 0x647a50, xx, 0.68, z, 0.07, 0.3, 0.07);
    box(parent, i % 2 ? 0xe3b775 : 0xb85f69, xx, 0.84 + i % 2 * 0.07, z, 0.18, 0.15, 0.16);
  }
}

export function createGreeter() {
  const greeter = new THREE.Group();
  greeter.name = 'Town_Greeter_Minecraft';
  greeter.position.set(2, 0.035, -0.72);
  const add = (name: string, color: number, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const part = box(greeter, color, x, y, z, w, h, d);
    part.name = name;
    return part;
  };
  add('Left_leg', 0x493f32, -0.18, 0.42, 0, 0.28, 0.84, 0.32);
  add('Right_leg', 0x493f32, 0.18, 0.42, 0, 0.28, 0.84, 0.32);
  add('Torso', 0x66704d, 0, 1.19, 0, 0.76, 0.75, 0.38);
  add('Apron', 0x8b6847, 0, 1.13, 0.205, 0.52, 0.58, 0.045);
  add('Left_arm', 0x596142, -0.49, 1.2, 0, 0.22, 0.7, 0.27);
  add('Right_arm', 0x596142, 0.49, 1.2, 0, 0.22, 0.7, 0.27);
  add('Head', 0xc3916d, 0, 1.86, 0, 0.62, 0.62, 0.58);
  add('Hair', 0x5a3d2c, 0, 2.14, -0.02, 0.67, 0.16, 0.62);
  add('Cap', 0x526044, 0, 2.25, -0.01, 0.73, 0.12, 0.67);
  add('Cap_brim', 0x46533b, 0, 2.2, 0.35, 0.5, 0.08, 0.18);
  add('Left_eye', 0x25343a, -0.14, 1.91, 0.298, 0.07, 0.07, 0.025);
  add('Right_eye', 0x25343a, 0.14, 1.91, 0.298, 0.07, 0.07, 0.025);
  return greeter;
}

export function createTown() {
  const town = new THREE.Group();
  box(town, 0x969780, 4, -0.3, 4, 100, 0.5, 50);
  // The raised promenade has individual stone courses and a visible front face.
  box(town, 0x73675c, 5, -0.18, 0.4, 31, 0.32, 4.8);
  const paving = [0xbbaa8d, 0xc5b494, 0xb3a58d, 0xc6b89e];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 39; col++) {
      box(town, paving[(col * 7 + row * 3) % paving.length], -10 + col * 0.8 + row % 2 * 0.35,
        -0.015, -1.5 + row * 0.73, 0.77, 0.1, 0.7);
    }
  }
  for (let i = 0; i < 32; i++) {
    for (const z of [-2, 2.85]) box(town, i % 3 ? 0xa99b82 : 0xc5b596, -10.5 + i, 0.06, z, 0.95, 0.25, 0.23);
  }
  house(town, -11, -4.8, 4.5, 3.6, 0xe0bd8a, true);
  house(town, -3.9, -5.5, 3.8, 4.3, 0xd3bd98);
  house(town, 5.3, -4.7, 4.8, 3.3, 0xc2c5a5, true);
  house(town, 13, -5.3, 4, 4.4, 0xdcb294);
  house(town, 21, -6, 5, 3.8, 0xc7b697, true);

  const tower = new THREE.Group();
  tower.position.set(1.3, 0, -10);
  tower.rotation.y = -0.12;
  tower.scale.setScalar(0.8);
  town.add(tower);
  box(tower, 0xb5a58c, 0, 3.3, 0, 2.1, 6.6, 2.1);
  for (const yy of [0.3, 4.3, 6.5]) box(tower, 0x8d806f, 0, yy, 0, 2.35, 0.2, 2.35);
  roof(tower, 2.8, 1.8, 2.8, 6.6, 0x616a68);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.65, 24), new THREE.MeshStandardMaterial({ color: 0xf3dfaf, roughness: 1 }));
  clock.position.set(0, 5.4, 1.07);
  tower.add(clock);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const tick = box(tower, timber, Math.sin(angle) * 0.52, 5.4 + Math.cos(angle) * 0.52, 1.1, 0.055, 0.1, 0.025);
    tick.rotation.z = -angle;
  }
  box(tower, timber, 0, 5.6, 1.12, 0.05, 0.4, 0.03);
  const hand = box(tower, timber, 0.13, 5.32, 1.13, 0.32, 0.045, 0.03);
  hand.rotation.z = -0.5;

  for (const [x, z, size] of [[-16, -3, 1.4], [-7, -7, 1], [1, -5, 0.85], [10, -8, 1.3], [18, -4, 1], [26, -3, 1.5], [-15, 5.5, 1.25], [8.5, 7.7, 0.35], [25, 6, 1.4]]) tree(town, x, z, size);
  for (const x of [-7.3, 2, 11.5, 18.4]) lamp(town, x, -1.6);
  town.add(createGreeter());
  contactShadow(town, 2, -0.72, 0.58, 0.3);
  for (const x of [-9, -1.5, 7.9, 16]) planter(town, x, -2.4);
  for (const x of [-2, 14.5]) {
    for (const leg of [-0.7, 0.7]) box(town, timber, x + leg, 0.27, -1.7, 0.12, 0.55, 0.55);
    for (let slat = 0; slat < 3; slat++) box(town, trim, x, 0.58, -1.9 + slat * 0.2, 1.8, 0.1, 0.17);
    box(town, trim, x, 1.02, -2, 1.8, 0.3, 0.12);
  }
  for (const x of [-8.85, 18.85]) {
    box(town, 0x877966, x, 0.35, 1.75, 0.4, 0.7, 0.4);
    box(town, 0xd0b387, x, 0.74, 1.75, 0.51, 0.13, 0.5);
    box(town, timber, x, 0.42, 1.975, 0.18, 0.04, 0.02);
  }
  // Low foreground grasses frame the road without masking the player's feet.
  for (let i = 0; i < 42; i++) {
    const x = -19 + i * 1.25;
    for (let blade = 0; blade < 3; blade++) {
      const grass = box(town, blade % 2 ? 0x6f7755 : 0x93976a, x + blade * 0.1, 0.12, 3.8 + i % 3 * 0.35, 0.05, 0.25 + blade * 0.06, 0.05);
      grass.rotation.z = blade * 0.25 - 0.2;
    }
  }
  // Distant silhouettes are separate geometry in world space, not a scrolling image.
  for (let layer = 0; layer < 3; layer++) {
    const shape = new THREE.Shape();
    shape.moveTo(-80, -2);
    for (let i = 0; i <= 28; i++) shape.lineTo(-80 + i * 6, 1.5 + Math.sin(i * 1.7 + layer) * 1.7 + layer * 0.3);
    shape.lineTo(88, -2);
    shape.closePath();
    const ridge = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: [0xaaa096, 0xbaaaa0, 0xc7afa0][layer] }));
    ridge.position.set(0, -layer * 2.5, -22 - layer * 10);
    town.add(ridge);
  }
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), new THREE.MeshBasicMaterial({ color: 0xffdfa4, fog: false }));
  sun.position.set(-15, -0.8, -36);
  town.add(sun);
  for (let i = 0; i < 11; i++) {
    box(town, 0xb4a894, -25 + i * 5, 0.8 + i % 3 * 0.15, -17 - i % 2 * 2, 2.4, 1.6 + i % 3 * 0.3, 2.6);
  }
  return town;
}
