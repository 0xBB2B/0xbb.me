import * as THREE from 'three';
import { createWorld } from '../portfolio/world';
import { box, contactShadow, disposeScene } from '../portfolio/geometry';
import { BOARDS } from '../portfolio/journey';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';

export const TRANSITIONS = [
  { id: '1', title: '错层衔接', subtitle: 'STAGGERED EDGES',
    town: '小镇砖墙先延续，工厂体量分三层后退；石板与金属铺装交错接入，避免墙和路同时切断。',
    coast: '工厂先退成低设备台，再露出管线和岩岸；海水提前进入远景，木板从道路边缘逐排接入。',
    note: '推荐：最贴合现有 B＋2，不新增强烈的场景门槛。' },
  { id: '2', title: '门廊衔接', subtitle: 'PASS THROUGH A THRESHOLD',
    town: '用砖石门墩和钢架门廊连接两种建筑语言；暖色入口灯、冷色内侧灯，让进入工厂有明确空间感。',
    coast: '从工厂出口穿过逐渐降低的开放钢架，头顶构件越来越少，木栈道与海面一起展开。',
    note: '进出感最清楚：适合喜欢“穿过入口，进入下一个世界”的体验。' },
  { id: '3', title: '自然缓冲', subtitle: 'A BREATH BETWEEN WORLDS',
    town: '工厂入口后退，前方留一小段有矮墙、树丛与路灯的院落；植被和低设备让建筑逐步出现。',
    coast: '工厂在岩坡后退场，礁石、海草和潮池穿插铺装边缘；用一段安静的自然岸边过渡到荧光海。',
    note: '最柔和：留白更多，节奏从工业空间慢慢放松下来。' },
] as const;
export type TransitionId = typeof TRANSITIONS[number]['id'];
export type Edge = 'town' | 'coast';

function luminous(parent: THREE.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d = .08) {
  const mesh = box(parent, color, x, y, z, w, h, d);
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.emissive.set(color); material.emissiveIntensity = 1.2;
  mesh.castShadow = false;
  return mesh;
}
function removeObject(object?: THREE.Object3D) {
  if (!object) return;
  object.removeFromParent(); disposeScene(object);
}
function masonry(parent: THREE.Object3D, x: number, width: number, height: number, z: number, color = 0x967b66) {
  const wall = new THREE.Group(); wall.name = 'Transition_masonry'; parent.add(wall);
  const rows = Math.ceil(height / .35), cols = Math.ceil(width / .65);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const offset = row % 2 * .22;
    box(wall, (row + col) % 3 ? color : 0xa28c76, x - width / 2 + .3 + col * .65 + offset,
      .17 + row * .35, z, .61, .31, .45);
  }
  box(wall, 0xb2a38e, x + .1, rows * .35, z, width + .35, .13, .64);
  return wall;
}
function plant(parent: THREE.Object3D, x: number, z: number, size: number, tall = false) {
  const group = new THREE.Group(); group.name = 'Transition_planting'; group.position.set(x, 0, z); parent.add(group);
  if (tall) box(group, 0x655145, 0, size * .9, 0, .22, size * 1.8, .22);
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (.6 + i * .1), 0),
      new THREE.MeshStandardMaterial({ color: [0x617461, 0x7b8d71, 0x8e986c][i], roughness: 1, flatShading: true }));
    mesh.position.set((i - 1) * size * .4, (tall ? size * 2 : size * .5) + (i % 2) * size * .4, -.1 + i * .08);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  contactShadow(parent, x, z, size, size * .5);
}
function boulder(parent: THREE.Object3D, x: number, z: number, size: number) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color: 0x526574, roughness: 1, flatShading: true }));
  mesh.position.set(x, size * .18, z); mesh.scale.set(1.25, .55, 1); mesh.rotation.y = x * .6;
  mesh.name = 'Transition_rocks'; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
}
function lamp(parent: THREE.Object3D, x: number, z: number, color: number, height = 2.5) {
  box(parent, 0x46505c, x, height / 2, z, .1, height, .1);
  luminous(parent, color, x, height, z, .25, .3, .25);
  const light = new THREE.PointLight(color, 3, 5, 2); light.position.set(x, height, z); parent.add(light);
}

// These are fresh design-only instances of the real B+2 world, never changes to the live journey.
function rebuildFactoryEdge(scene: THREE.Scene, edge: Edge, id: TransitionId) {
  const workshop = scene.getObjectByName('Scene_workshop')!;
  for (const name of ['Workshop_hall', 'Workshop_maintenance_walkway', 'Workshop_cable_trays', 'Transition_town_workshop']) {
    removeObject(workshop.getObjectByName(name));
  }
  const edgeX = edge === 'town' ? 20 : 44;
  const direction = edge === 'town' ? 1 : -1;
  const setback = id === '3' ? 5.5 : id === '2' ? 3.7 : 4.8;
  const fullStart = edge === 'town' ? edgeX + setback : 20;
  const fullEnd = edge === 'coast' ? edgeX - setback : 44;
  const hall = new THREE.Group(); hall.name = 'Preview_setback_hall'; workshop.add(hall);
  box(hall, 0x182d3c, (fullStart + fullEnd) / 2, 4.55, -10, fullEnd - fullStart, 9.1, 1.5);
  for (let x = fullStart + .2; x < fullEnd; x += 4) {
    box(hall, 0x4c6270, x, 4.4, -6.6, .3, 8.8, .4);
    box(hall, 0x71838e, x, 8.6, -6.6, .7, .3, 3);
  }
  box(hall, 0x586a77, (fullStart + fullEnd) / 2, 4.7, -6.6, fullEnd - fullStart, .22, 1.5);
  luminous(hall, 0xffc46d, (fullStart + fullEnd) / 2, 4.85, -5.82, fullEnd - fullStart, .04);
  for (let x = fullStart; x < fullEnd; x += .75) box(hall, 0x7c929b, x, 5.2, -5.8, .05, .7, .05);
  for (const y of [6.3, 7.6]) {
    box(hall, 0x708591, (fullStart + fullEnd) / 2, y, -7.4, fullEnd - fullStart, .12, .12);
    luminous(hall, 0xa6dce4, (fullStart + fullEnd) / 2, y, -7.3, fullEnd - fullStart, .025);
  }
  // The silhouette is stepped across several x positions rather than one full-height cut.
  const tiers = id === '1' ? [[-1, 2.1], [1.4, 4.3], [3.5, 6.3]] : id === '2' ? [[.1, 3.1], [2.2, 5.8]] : [[1.6, 1.5], [3.7, 3.8]];
  const volumes = new THREE.Group(); volumes.name = 'Transition_staggered_volumes'; workshop.add(volumes);
  for (const [offset, height] of tiers) {
    const x = edgeX + direction * offset;
    box(volumes, edge === 'town' && offset < 2 ? 0x74665f : 0x314956, x, height / 2, -9.6, 2.6, height, 2.3);
    box(volumes, 0x667986, x, height, -9.3, 2.85, .14, 2.9);
    if (height > 3) luminous(volumes, edge === 'town' ? 0xffce88 : 0x8abcc6, x, height - .7, -8.4, 1.5, .35);
  }
  return { edgeX, direction };
}

function paving(scene: THREE.Scene, parent: THREE.Group, edge: Edge, id: TransitionId, x: number) {
  // Remove only small road-edge stones in this preview buffer; buildings and the town beyond it stay intact.
  const town = scene.getObjectByName('Scene_town')!;
  const stones: THREE.Object3D[] = [];
  town.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.BoxGeometry)) return;
    const p = object.position, size = object.geometry.parameters;
    if (p.x > x - 5 && p.x < x + 5 && p.y < .2 && size.height < .4 && size.width < 1.2 && p.z > -2.3 && p.z < 3.2) stones.push(object);
  });
  stones.forEach(removeObject);
  const surface = new THREE.Group(); surface.name = 'Transition_interleaved_paving'; parent.add(surface);
  for (let col = 0; col < 24; col++) for (let row = 0; row < 6; row++) {
    const xx = x - 6 + (col + .5) * .5;
    const threshold = id === '1' ? 8 + (row * 3 % 9) : id === '2' ? 11 + row % 3 : 8 + (row * 5 % 9);
    const changed = col >= threshold;
    const base = edge === 'town' ? (changed ? 0x68747c : 0xb5a68a) : (changed ? 0x97816a : 0x68747c);
    const color = new THREE.Color(base).multiplyScalar(.93 + (row + col) % 3 * .045);
    box(surface, color.getHex(), xx, -.015, -1.6 + (row + .5) * .8, .5, .13, .8).castShadow = false;
  }
  // Offset the landscape's change from the pavement's change and let it occupy a full buffer.
  const first = new THREE.Color(edge === 'town' ? 0x969780 : 0x192a35);
  const last = new THREE.Color(edge === 'town' ? 0x192a35 : 0x4d5462);
  for (let col = 0; col < 48; col++) {
    const t = col / 47, color = first.clone().lerp(last, t * t * (3 - 2 * t));
    box(parent, color.getHex(), x - 10 + (col + .5) * 20 / 48, -.15, edge === 'town' ? 4 : 12, 20 / 48 + .001, .35, edge === 'town' ? 50 : 29).castShadow = false;
  }
}

function staggered(parent: THREE.Group, edge: Edge, x: number) {
  if (edge === 'town') {
    masonry(parent, x - 2.5, 4, 1.5, -5.1);
    masonry(parent, x + .1, 2, 2.2, -6.8, 0x7f756a);
    for (const [xx, h] of [[x - .8, 2.8], [x + 1, 3.7], [x + 2.8, 4.5]]) {
      box(parent, 0x4c626c, xx, h / 2, -7, .16, h, .16);
      box(parent, 0x5b7280, xx + .8, h, -7, 1.8, .13, .25);
    }
    plant(parent, x - 3.7, -3.7, .6);
    lamp(parent, x - 2, -1.8, 0xffca88);
    lamp(parent, x + 2.2, 3.6, 0xa5dce7, 1.2);
  } else {
    box(parent, 0x506775, x - 2, .42, -4.9, 3.3, .8, 1.1);
    for (let i = 0; i < 4; i++) box(parent, 0x78919a, x - 3.2 + i * .7, .9, -4.9, .2, .2, .6);
    for (let i = 0; i < 3; i++) {
      const xx = x - 1 + i * 1.3;
      box(parent, 0x506572, xx, .7, -3.8, .12, 1.4, .12);
      box(parent, 0x6c8590, xx + .6, 1.4, -3.8, 1.3, .09, .09);
    }
    for (let i = 0; i < 9; i++) boulder(parent, x - 2 + i * .9, -3.5 - Math.sin(i) * .2, .4 + i % 3 * .1);
    lamp(parent, x + 1.5, 3.6, 0xb9b18f, 1.1);
  }
}
function portal(parent: THREE.Group, edge: Edge, x: number) {
  const portals = new THREE.Group(); portals.name = 'Transition_open_portals'; parent.add(portals);
  for (let i = 0; i < 3; i++) {
    const xx = x - 1.8 + i * 1.8;
    const height = edge === 'town' ? 3.9 + i * .55 : 5.3 - i * .6;
    for (const z of [-3.2, 3.7]) {
      box(portals, 0x607988, xx, height / 2, z, .16, height, .16);
      if (edge === 'town' && i === 0) masonry(portals, xx, .65, 1.4, z);
    }
    box(portals, 0x8299a4, xx, height, .25, .22, .2, 7.1);
    luminous(portals, i === 0 ? 0xffca88 : 0xade3eb, xx, height - .13, .25, .055, .05, 6.7);
    if (i < 2) box(portals, 0x58707f, xx + .9, height, -3.2, 1.9, .12, .12);
  }
  if (edge === 'town') {
    masonry(parent, x - 3.1, 2.2, 1.3, -4.9);
    plant(parent, x - 3.8, -3.5, .6);
  } else {
    for (let i = 0; i < 7; i++) boulder(parent, x - 2 + i, -3.9, .45);
    for (const xx of [x + 2.5, x + 4]) box(parent, 0x947f67, xx, .4, 3.4, .13, .8, .13);
  }
}
function garden(parent: THREE.Group, edge: Edge, x: number) {
  const garden = new THREE.Group(); garden.name = 'Transition_natural_buffer'; parent.add(garden);
  if (edge === 'town') {
    masonry(garden, x - 1.5, 5, .7, -5.2);
    plant(garden, x - 3, -6.2, 1.3, true);
    plant(garden, x + .1, -6.2, 1, true);
    plant(garden, x + 2, -7.5, .7);
    for (const xx of [x - 3.5, x + .7]) lamp(garden, xx, -2.1, 0xffd297, 2);
    for (let i = 0; i < 4; i++) plant(garden, x - 4 + i * 2, 4.3, .32);
  } else {
    for (let i = 0; i < 15; i++) {
      const xx = x - 5 + i * .72;
      boulder(garden, xx, -4.1 - i % 2 * .6, .35 + Math.sin(i * .6) ** 2 * .8);
    }
    for (let i = 0; i < 20; i++) {
      const xx = x - 4 + i * .5;
      for (let blade = 0; blade < 3; blade++) {
        const stem = box(garden, 0x7b9a8d, xx + blade * .07, .2, i % 2 ? -3 : 4, .035, .35 + blade * .14, .035);
        stem.rotation.z = (blade - 1) * .3;
      }
    }
    lamp(garden, x + 2, 3.5, 0xf5d5a1, 1.1);
  }
}

export function createTransitionScene(id: TransitionId, edge: Edge) {
  const world = createWorld();
  const { scene } = world;
  const { edgeX } = rebuildFactoryEdge(scene, edge, id);
  if (edge === 'coast') {
    const ridges: THREE.Object3D[] = [];
    scene.getObjectByName('Scene_town')!.traverse(object => {
      if (object instanceof THREE.Mesh && object.geometry instanceof THREE.ShapeGeometry) ridges.push(object);
    });
    ridges.forEach(removeObject);
    const water = scene.getObjectByName('Sea')!.children[0] as THREE.Mesh;
    water.geometry.dispose(); water.geometry = new THREE.BoxGeometry(76, .06, 19); water.position.x = 62;
  }
  const transition = new THREE.Group(); transition.name = `Transition_proposal_${id}_${edge}`; scene.add(transition);
  paving(scene, transition, edge, id, edgeX);
  if (id === '1') staggered(transition, edge, edgeX);
  else if (id === '2') portal(transition, edge, edgeX);
  else garden(transition, edge, edgeX);
  const player = createBlackOutfitPlayerVoxel(); player.position.set(edgeX, .055, .6); player.rotation.y = Math.PI / 8; scene.add(player);
  world.shadow.position.x = edgeX;
  scene.updateMatrixWorld(true);
  const screens = BOARDS.filter(board => board.kind === 'skill').map(board => ({
    board, bounds: new THREE.Box3().setFromObject(scene.getObjectByName(`Board_face_${board.id}`)!),
  }));
  return { scene, player, screens, edgeX, shadow: world.shadow, updateEnvironment: world.updateEnvironment };
}
