import * as THREE from 'three';
import { box } from '../geometry';
import { boxInstances } from '../instances';

// A converted brick works: the same authored roof/window language as the town, with industrial fittings.
export function createFactoryExterior(start: number, end: number, backZ: number, frontZ: number) {
  const center = (start + end) / 2, width = end - start;
  const facade = new THREE.Group(); facade.name = 'Room_exterior';
  const details = new THREE.Group(); details.name = 'Room_exterior_details'; facade.add(details);
  box(facade, 0x887c69, center, 3.22, frontZ, width, 6.44, .32).name = 'Exterior_wall';
  boxInstances(details, 'Exterior_masonry', 0x7f796c, [.66, .21, .12], Array.from({ length: 186 }, (_, i) => {
    const row = Math.floor(i / 31), col = i % 31;
    return { x: start + 1 + col * .71 + row % 2 * .16, y: .12 + row * .25, z: frontZ + .19,
      color: [0x7f796c, 0x9c917c, 0x8e806b][(row * 5 + col * 7) % 3] };
  }));
  for (const x of [start + .1, start + 8, start + 16, end - .1]) {
    box(details, 0xb0a28a, x, 3.25, frontZ + .21, .34, 6.5, .34);
    for (const y of [.24, 1.7, 5.98]) box(details, 0xc0b092, x, y, frontZ + .25, .48, .13, .46);
  }
  for (const y of [1.53, 3.25, 6.25]) box(details, 0x5e665f, center, y, frontZ + .2, width, .11, .22);
  for (const x of [24, 28, 32, 36, 40]) {
    const outer = new THREE.Shape();
    outer.moveTo(-1.25, -.8); outer.lineTo(1.25, -.8); outer.lineTo(1.25, .35);
    outer.quadraticCurveTo(0, 1.5, -1.25, .35); outer.closePath();
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: .16, bevelEnabled: false, curveSegments: 8 }),
      new THREE.MeshStandardMaterial({ color: 0x3b555f, roughness: .72 }));
    frame.position.set(x, 4.7, frontZ + .18); facade.add(frame);
    const inner = new THREE.Shape();
    inner.moveTo(-1.08, -.64); inner.lineTo(1.08, -.64); inner.lineTo(1.08, .29);
    inner.quadraticCurveTo(0, 1.28, -1.08, .29); inner.closePath();
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(inner, 8),
      new THREE.MeshStandardMaterial({ color: 0x9eb9b3, emissive: 0x344f4c, emissiveIntensity: .35, roughness: .3, metalness: .05 }));
    glass.position.set(x, 4.7, frontZ + .36); facade.add(glass);
    for (const offset of [-.55, 0, .55]) box(facade, 0x496167, x + offset, 4.79, frontZ + .39, .05, 1.4, .04);
    box(facade, 0x496167, x, 4.76, frontZ + .39, 2.17, .055, .04);
    box(facade, 0xb9ae96, x, 3.85, frontZ + .4, 2.7, .15, .65);
    box(facade, 0x596d6d, x, 3.73, frontZ + .24, 2.35, .07, .19);
  }
  for (const x of [26, 38]) {
    box(details, 0x3b5056, x, 2.32, frontZ + .28, 1.26, .95, .25);
    for (let slat = 0; slat < 7; slat++) box(details, 0x7f9394, x, 1.94 + slat * .12, frontZ + .44, 1.11, .045, .16);
  }
  for (const x of [22.15, 41.6]) {
    box(details, 0x606b69, x, 3.4, frontZ + .42, .12, 4.9, .14);
    for (const y of [1.08, 5.72]) box(details, 0x8c9690, x + .3, y, frontZ + .42, .72, .15, .19);
    for (const y of [1.45, 3.1, 4.8]) box(details, 0x384f56, x, y, frontZ + .47, .25, .14, .19);
  }
  const roof = new THREE.Group(); roof.name = 'Room_ceiling';
  const depth = frontZ - backZ + .8;
  for (let bay = 0; bay < 3; bay++) {
    const x = start + 4 + bay * 8;
    const peak = [1.45, 1.9, 1.55][bay];
    const shape = new THREE.Shape();
    shape.moveTo(-4.12, 0); shape.lineTo(-.6, peak); shape.lineTo(4.12, 0); shape.closePath();
    const mass = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: [0x526976, 0x60737c, 0x4b6270][bay], roughness: .7, metalness: .2, flatShading: true }));
    mass.position.set(x, 6.55, backZ - .4); roof.add(mass);
    box(roof, 0x88948d, x, 6.55, frontZ + .43, 8.45, .15, .42);
    for (const side of [-1, 1]) {
      const run = side < 0 ? 3.52 : 4.72;
      const slope = Math.atan2(peak, run);
      for (let seam = 1; seam < 6; seam++) {
        const t = seam / 6;
        const rib = box(roof, 0x7a8990, x - .6 + side * run * t, 6.58 + peak * (1 - t), (backZ + frontZ) / 2,
          .045, .04, depth);
        rib.rotation.z = -side * slope; rib.name = 'Roof_panel_seam';
      }
    }
    box(roof, 0x485c64, x - .6, 6.6 + peak, (backZ + frontZ) / 2, .14, .13, depth + .12);
    if (bay !== 1) {
      box(roof, 0x786f61, x + 1.3, 7.8, backZ + 2, .65, 1.7, .7);
      box(roof, 0xa79e87, x + 1.3, 8.67, backZ + 2, .87, .16, .92);
    }
  }
  return { facade, roof };
}
