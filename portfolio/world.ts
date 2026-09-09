import * as THREE from 'three';
import { box, contactShadow } from './geometry';
import { createGallery } from './scenes/gallery';
import { createTown } from './scenes/town';
import { createWorkshop } from './scenes/workshop';
import { BOARDWALK, JOURNEY } from './journey';
import { createRoom } from './scenes/room';
import { createAmbientEffects } from './scenes/ambient';
import type { Session } from './state';

const TOWN_SKY = new THREE.Color(0xd9af91);
const WORKSHOP_SKY = new THREE.Color(0x142b3b);
const GALLERY_SKY = new THREE.Color(0x101d34);
const TOWN_FOG = new THREE.Color(0xd9af91);
const WORKSHOP_FOG = new THREE.Color(0x1c3446);
const GALLERY_FOG = new THREE.Color(0x16273c);

const smooth = (from: number, to: number, value: number) => {
  const amount = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

function blendSurface(mesh: THREE.Mesh, colorAt: (x: number) => THREE.Color) {
  const original = mesh.geometry as THREE.BoxGeometry;
  const { width, height, depth } = original.parameters;
  const geometry = new THREE.BoxGeometry(width, height, depth, Math.ceil(width * 2), 1, 1);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    colorAt(mesh.position.x + positions.getX(index)).toArray(colors, index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.geometry = geometry;
  original.dispose();
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.color.set(0xffffff);
  material.vertexColors = true;
}

export function createWorld() {
  const scene = new THREE.Scene();
  const background = TOWN_SKY.clone();
  const fogColor = TOWN_FOG.clone();
  scene.background = background;
  scene.fog = new THREE.Fog(fogColor, 27, 85);

  const hemisphere = new THREE.HemisphereLight(0xffe5ba, 0x746f86, 2);
  hemisphere.name = 'Journey_hemisphere';
  const sunlight = new THREE.DirectionalLight(0xffd29a, 3.1);
  sunlight.name = 'Journey_key_light';
  sunlight.position.set(-12, 18, 9);
  sunlight.target.position.set(4, 0, -3);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -33, right: 33, top: 20, bottom: -20, near: 0.5, far: 70 });
  sunlight.shadow.normalBias = 0.04;
  sunlight.shadow.bias = -0.0003;

  // Continue after the town's original stone promenade: the top stays at the
  // character's 0.035 sole height without covering or z-fighting the pavers.
  const roadStart = 21.15;
  const roadEnd = BOARDWALK.start;
  const road = box(scene, 0x8c8790, (roadStart + roadEnd) / 2, -0.015, 0.4, roadEnd - roadStart, 0.1, 4.8);
  road.name = 'Journey_road';
  road.castShadow = false;
  road.receiveShadow = true;
  const room = createRoom();
  const town = createTown();
  const workshop = createWorkshop();
  const gallery = createGallery();
  scene.add(hemisphere, sunlight, sunlight.target, town, workshop, gallery, room.root);
  const ambient = createAmbientEffects(workshop, gallery);
  let ambientTime = 0;
  let activeBoard: Session['nearbyBoard'] = null;
  blendSurface(scene.getObjectByName('Workshop_ground') as THREE.Mesh,
    x => new THREE.Color(0x969780).lerp(new THREE.Color(0x192a35), smooth(18, 28, x)));
  blendSurface(scene.getObjectByName('Gallery_ground') as THREE.Mesh,
    x => new THREE.Color(0x4d5462).lerp(new THREE.Color(0x555f69), smooth(44, 80, x)));
  blendSurface(road, x => new THREE.Color(0xbbaa8d)
    .lerp(new THREE.Color(0x485766), smooth(roadStart, 28, x))
    .lerp(new THREE.Color(0x827461), smooth(38, roadEnd, x)));
  const shadow = contactShadow(scene, 0, 0.6, 0.63, 0.26);

  const updateEnvironment = (x: number) => {
    let sky: THREE.Color;
    let fog: THREE.Color;
    let upper: THREE.Color;
    let lower: THREE.Color;
    let key: THREE.Color;
    if (x < 28) {
      const amount = smooth(12, 28, x);
      sky = TOWN_SKY.clone().lerp(WORKSHOP_SKY, amount);
      fog = TOWN_FOG.clone().lerp(WORKSHOP_FOG, amount);
      upper = new THREE.Color(0xffe5ba).lerp(new THREE.Color(0xadc5e6), amount);
      lower = new THREE.Color(0x746f86).lerp(new THREE.Color(0x29425c), amount);
      key = new THREE.Color(0xffd29a).lerp(new THREE.Color(0xa6b7d4), amount);
    } else {
      const amount = smooth(38, 54, x);
      sky = WORKSHOP_SKY.clone().lerp(GALLERY_SKY, amount);
      fog = WORKSHOP_FOG.clone().lerp(GALLERY_FOG, amount);
      upper = new THREE.Color(0xadc5e6).lerp(new THREE.Color(0xa7bbd9), amount);
      lower = new THREE.Color(0x29425c).lerp(new THREE.Color(0x17142e), amount);
      key = new THREE.Color(0xa6b7d4).lerp(new THREE.Color(0xb4c7e2), amount);
    }
    background.copy(sky);
    (scene.fog as THREE.Fog).color.copy(fog);
    hemisphere.color.copy(upper);
    hemisphere.groundColor.copy(lower);
    sunlight.color.copy(key);
    sunlight.intensity = x < 38 ? THREE.MathUtils.lerp(3.1, 2.5, smooth(12, 28, x)) : THREE.MathUtils.lerp(2.5, 1.5, smooth(38, 54, x));
    sunlight.position.x = x - 12;
    sunlight.target.position.x = x + 4;
  };

  updateEnvironment(-8);
  const updateRoom = (session: Session) => {
    activeBoard = session.nearbyBoard;
    const inside = room.update(session);
    town.visible = !inside && session.x < JOURNEY[1].start;
    gallery.visible = !inside && session.x >= JOURNEY[1].end;
    workshop.visible = inside;
    workshop.getObjectByName('Workshop_ground')!.visible = !inside;
    road.visible = !inside;
    scene.environmentIntensity = inside ? .22 : gallery.visible ? .12 : 0;
    hemisphere.intensity = inside ? 1.55 : gallery.visible ? 1.5 : 2;
    if (inside) {
      updateEnvironment((JOURNEY[1].start + JOURNEY[1].end) / 2);
      sunlight.position.x = session.x - 12;
      sunlight.target.position.x = session.x + 4;
    }
    return inside;
  };
  const updateAmbient = (seconds: number, moving = true) => {
    if (moving) ambientTime += seconds;
    ambient.update(ambientTime, moving, activeBoard, background);
  };
  return { scene, shadow, updateEnvironment, updateRoom, updateAmbient };
}
