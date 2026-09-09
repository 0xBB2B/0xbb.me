import * as THREE from 'three';
import { box, contactShadow } from '../geometry';
import { createFactoryExterior } from './exterior';
import { boxInstances } from '../instances';
import { BOARDWALK, JOURNEY, ROOM_DOORS } from '../journey';
import type { Session } from '../state';

const roomScene = JOURNEY[1];
const floorY = .035;
const laneZ = .4;
const laneWidth = BOARDWALK.width;
const backZ = -10.25;
const frontZ = 3.3;
const ceilingY = 6.55;
const doorWidth = 2.6;
const doorHeight = 3.4;

function passageWidthAt(x: number) {
  const distance = Math.min(x - roomScene.start, roomScene.end - x);
  return THREE.MathUtils.lerp(doorWidth, laneWidth, THREE.MathUtils.smoothstep(distance, 0, 2));
}

export function createRoom() {
  const root = new THREE.Group();
  root.name = 'Factory_room';
  const width = roomScene.end - roomScene.start;
  const center = (roomScene.start + roomScene.end) / 2;
  const laneBack = laneZ - doorWidth / 2;
  const laneFront = laneZ + doorWidth / 2;

  const { facade, roof } = createFactoryExterior(roomScene.start, roomScene.end, backZ, frontZ);
  root.add(roof);
  box(root, 0x6d8086, center, ceilingY, frontZ, width, .18, .2).name = 'Room_cutaway_lintel';
  const exteriorGround = box(root, 0x4d5462, center, -.2, (backZ + 29) / 2, width, .42, 29 - backZ);
  exteriorGround.name = 'Room_exterior_ground';
  exteriorGround.visible = false;
  exteriorGround.castShadow = false;
  const buildingContact = contactShadow(root, center, frontZ, width / 2, .55);
  buildingContact.visible = false;
  const foregroundMaterials: { x: number; material: THREE.Material }[] = [];
  const foreground = (mesh: THREE.Mesh, x: number) => {
    const material = mesh.material as THREE.Material;
    material.transparent = true; material.depthWrite = false;
    foregroundMaterials.push({ x, material });
  };
  // The continuous route narrows at each side-wall opening, then widens inside.
  for (const { x } of ROOM_DOORS) {
    const rearEnd = laneBack - .16;
    const frontStart = laneFront + .16;
    box(root, 0x3d5665, x, ceilingY / 2, (backZ + rearEnd) / 2, .3, ceilingY, rearEnd - backZ).name = 'Room_side_wall';
    const frontPier = box(root, 0x3d5665, x, ceilingY / 2, (frontStart + frontZ) / 2, .3, ceilingY, frontZ - frontStart);
    frontPier.name = 'Room_side_wall'; foreground(frontPier, x);
    box(root, 0x3d5665, x, (4.2 + ceilingY) / 2, laneZ, .3, ceilingY - 4.2, doorWidth + .35).name = 'Room_side_lintel';
  }

  const interior = new THREE.Group();
  interior.name = 'Room_interior';
  interior.visible = false;
  root.add(interior);
  box(interior, 0x2c4351, center, -.1, (backZ + frontZ) / 2, width, .25, frontZ - backZ).name = 'Room_floor';
  const passageGeometry = new THREE.BoxGeometry(width, .1, 1, 48, 1, 1);
  const positions = passageGeometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) * passageWidthAt(center + positions.getX(i)));
  passageGeometry.computeVertexNormals();
  const passage = new THREE.Mesh(passageGeometry, new THREE.MeshStandardMaterial({ color: 0x455d6d, roughness: 1 }));
  passage.name = 'Room_passage';
  passage.position.set(center, -.015, laneZ);
  passage.receiveShadow = true;
  interior.add(passage);
  boxInstances(interior, 'Room_lane_edges', 0x84949a, [width / 48, .01, .05], Array.from({ length: 48 }, (_, i) => {
    const x = roomScene.start + (i + .5) * width / 48;
    return [-1, 1].map(side => ({ x, y: .03, z: laneZ + side * (passageWidthAt(x) / 2 - .025) }));
  }).flat());
  boxInstances(interior, 'Room_floor_seams', 0x3d5462, [.028, .014, 1], Array.from({ length: 12 }, (_, i) => {
    const x = roomScene.start + 1 + i * 2;
    return { x, y: .028, z: laneZ, scale: [1, 1, passageWidthAt(x) - .12] as const };
  }));
  // A neutral interior backdrop fills the view beyond the side door, never an outdoor scene.
  const backdrop = new THREE.Group();
  backdrop.name = 'Room_interior_backdrop';
  interior.add(backdrop);
  box(backdrop, 0x142a3b, center, 5, -12, 100, 22, .4).castShadow = false;
  box(backdrop, 0x203747, center, -.4, 4, 100, .68, 55).castShadow = false;

  root.add(facade);
  const facadeMaterials: THREE.Material[] = [];
  facade.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0;
    object.castShadow = false;
    facadeMaterials.push(material);
  });
  facade.visible = false;

  const shutters = ROOM_DOORS.map((door, index) => {
    const entry = new THREE.Group();
    entry.name = `Room_door_${door.id}`;
    entry.position.set(door.x, floorY, laneZ);
    // Local door width becomes world depth: the closed leaf lies in the side wall's YZ plane.
    entry.rotation.y = -Math.PI / 2;
    root.add(entry);
    for (const side of [-1, 1]) {
      const jamb = box(entry, 0x8b928c, side * (doorWidth / 2 + .12), 1.78, 0, .2, 3.56, .38);
      if (side === 1) foreground(jamb, door.x);
    }
    box(entry, 0xa0a8a1, 0, 3.63, 0, doorWidth + .45, .36, .5).name = `Door_lintel_${door.id}`;
    const threshold = box(entry, 0x979485, 0, -.05, 0, doorWidth + .4, .1, .5);
    threshold.name = 'Door_threshold';
    threshold.castShadow = false;
    const leaf = new THREE.Group();
    leaf.name = 'Door_leaf';
    entry.add(leaf);
    const slatHeight = doorHeight / 12;
    const slats = Array.from({ length: 12 }, (_, i) => box(leaf,
      i % 2 ? 0x788991 : index === 0 ? 0x637c79 : 0x54788b,
      0, (i + .5) * slatHeight, 0, doorWidth - .04, slatHeight - .005, .12));
    box(entry, 0x273f4e, 0, 3.94, 0, doorWidth + .55, .4, .58).name = 'Door_shutter_housing';
    const lamp = box(entry, 0xf3d998, 0, 4.27, 0, .58, .13, .23);
    const lampMaterial = lamp.material as THREE.MeshStandardMaterial;
    lampMaterial.emissive.set(0xffca79);
    lampMaterial.emissiveIntensity = 1.6;
    const spill = new THREE.PointLight(index === 0 ? 0xffd5a2 : 0x9ee4e5, 6, 6, 2);
    spill.position.set(0, 2.9, index === 0 ? 1 : -1);
    entry.add(spill);
    return { id: door.id, slats, slatHeight };
  });
  const structuralCasters: THREE.Mesh[] = [];
  root.traverse(object => {
    if (object instanceof THREE.Mesh && ['Room_side_wall', 'Room_side_lintel', 'Room_cutaway_lintel'].includes(object.name)) structuralCasters.push(object);
  });
  return {
    root,
    update(session: Session) {
      for (const { id, slats, slatHeight } of shutters) {
        const progress = session.doors[id];
        const travel = progress * progress * (3 - 2 * progress) * doorHeight;
        slats.forEach((slat, index) => {
          const bottom = Math.min(doorHeight, index * slatHeight + travel);
          const visibleHeight = Math.min(slatHeight - .005, doorHeight - bottom);
          slat.visible = visibleHeight > .001;
          slat.scale.y = visibleHeight / (slatHeight - .005);
          slat.position.y = bottom + visibleHeight / 2;
        });
      }
      const inside = session.x >= roomScene.start && session.x < roomScene.end;
      for (const { x, material } of foregroundMaterials) {
        material.opacity = inside && Math.abs(session.x - x) < .8 ? .18 : 1;
      }
      interior.visible = inside;
      facade.visible = !inside;
      roof.visible = !inside;
      exteriorGround.visible = !inside;
      buildingContact.visible = !inside;
      exteriorGround.position.y = session.x < roomScene.start ? -.26 : -.2;
      (exteriorGround.material as THREE.MeshStandardMaterial).color.set(session.x < roomScene.start ? 0x969780 : 0x4d5462);
      for (const mesh of structuralCasters) {
        mesh.castShadow = inside;
        if (mesh.name === 'Room_side_wall') (mesh.material as THREE.MeshStandardMaterial).color.set(inside ? 0x3d5665 : 0x887c69);
      }
      for (const material of facadeMaterials) material.opacity = inside ? 0 : 1;
      return inside;
    },
  };
}
