import * as THREE from 'three';
import { box, contactShadow } from '../geometry';
import { BOARDWALK, JOURNEY, type JourneyBoard } from '../journey';
import { createSeaSurface, createStarHalo, SEA_HORIZON_Z } from './sea-surface';

const galleryScene = JOURNEY.find(scene => scene.id === 'gallery')!;

function glow(color: number, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .5 });
}

function projectStar(board: JourneyBoard, index: number) {
  const star = new THREE.Group();
  star.name = `Project_star_${board.id}`;
  star.position.set(board.x, [5.3, 5.65, 5.15][index], -4.8);
  const color = [0xffdc91, 0xbfb2ff, 0x91e8ff][index];
  const core = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8),
    new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: .25, metalness: .1, clearcoat: .5 }));
  core.name = 'Star_core';
  star.add(core);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), createStarHalo(color, index * 2.1));
  halo.name = 'Star_halo';
  halo.position.z = .18;
  star.add(halo);
  const constellation = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.2, .18, -.12), new THREE.Vector3(-.7, -.25, -.12),
    new THREE.Vector3(0, 0, -.12), new THREE.Vector3(1.2, .7, -.12),
  ]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .14 }));
  star.add(constellation);
  for (const side of [-1, 1]) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(.035), glow(color));
    spark.position.set(side * .95, side * .22, 0);
    star.add(spark);
  }
  return star;
}

function lighthouse() {
  const tower = new THREE.Group();
  tower.name = 'Coastal_lighthouse';
  tower.position.set(galleryScene.end + 1.8, .035, -4.6);
  const stone = new THREE.MeshStandardMaterial({ color: 0xd4d0c9, roughness: .8, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30374d, roughness: .7, flatShading: true });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.65, .32, 12), stone);
  base.position.y = .16;
  base.receiveShadow = true;
  tower.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.65, 1, 4.1, 12), stone);
  body.position.y = 2.37;
  body.castShadow = true;
  body.receiveShadow = true;
  tower.add(body);
  for (const [y, radius] of [[1.15, .94], [3.2, .76]]) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + .03, .34, 12),
      new THREE.MeshStandardMaterial({ color: 0x8c4e5d, roughness: .8, flatShading: true }));
    stripe.position.y = y;
    tower.add(stripe);
  }
  box(tower, 0x273349, 0, .81, .95, .43, 1.02, .08);
  const window = box(tower, 0xffd797, 0, 2.8, .81, .21, .42, .06);
  const windowMaterial = window.material as THREE.MeshStandardMaterial;
  windowMaterial.emissive.set(0xffcf88);
  windowMaterial.emissiveIntensity = 1.5;
  for (const y of [4.35, 5.45]) {
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, .14, 12), dark);
    balcony.position.y = y;
    tower.add(balcony);
  }
  const lantern = new THREE.Group();
  lantern.name = 'Lighthouse_lantern';
  const light = new THREE.Mesh(new THREE.CylinderGeometry(.53, .53, .85, 12), glow(0xffdc96, 3));
  light.position.y = 4.92;
  lantern.add(light);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    box(lantern, 0x30374d, Math.sin(angle) * .7, 4.92, Math.cos(angle) * .7, .075, 1.02, .075);
    box(tower, 0x59617a, Math.sin(angle) * .98, 4.62, Math.cos(angle) * .98, .05, .55, .05);
  }
  tower.add(lantern);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.12, .53, 12), dark);
  roof.position.y = 5.78;
  tower.add(roof);
  const lamp = new THREE.PointLight(0xffd797, 16, 14, 2);
  lamp.position.set(0, 4.92, .8);
  tower.add(lamp);
  return tower;
}

function boardwalk() {
  const path = new THREE.Group();
  path.name = 'Coastal_path';
  const count = Math.ceil((BOARDWALK.end - BOARDWALK.start) / .25);
  const width = (BOARDWALK.end - BOARDWALK.start) / count;
  for (let index = 0; index < count; index++) {
    const plank = box(path, [0x95806b, 0x827461, 0xa08a73, 0x8b7a66][index % 4],
      BOARDWALK.start + (index + .5) * width, -.045, .4, width, .16, BOARDWALK.width);
    plank.name = 'Boardwalk_plank';
    plank.castShadow = false;
  }
  return path;
}

function tidePools() {
  const pools = new THREE.Group();
  pools.name = 'Coastal_tide_pools';
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 poolUv;varying vec3 poolPosition;void main(){poolUv=uv;vec4 p=modelMatrix*vec4(position,1.0);poolPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: `uniform float uTime;varying vec2 poolUv;varying vec3 poolPosition;
      void main(){vec2 p=poolUv*2.0-1.0;float a=atan(p.y,p.x+0.00001);float r=0.67+0.07*sin(a*3.0+poolPosition.x)+0.04*sin(a*7.0);
        float d=length(p)-r;float alpha=1.0-smoothstep(-0.02,0.015,d);
        float rim=exp(-pow((d+0.035)*38.0,2.0));
        float ripple=pow(max(0.0,sin(poolPosition.x*8.0-poolPosition.z*12.0+uTime*0.4)),10.0);
        gl_FragColor=vec4(vec3(0.01,0.046,0.059)+vec3(0.018,0.13,0.12)*rim+vec3(0.006,0.018,0.019)*ripple,alpha*0.85);
        #include <colorspace_fragment>
      }`,
  });
  for (let i = 0; i < 18; i++) {
    const water = new THREE.Mesh(geometry, material);
    water.name = 'Tide_pool_surface';
    water.position.set(47 + i * 2.7 + Math.sin(i * 2.3) * .5, .022, 4.6 + i % 3 * .65);
    water.rotation.x = -Math.PI / 2;
    water.rotation.z = i * .7;
    water.scale.set(1.2 + i % 3 * .4, .65 + i % 2 * .2, 1);
    pools.add(water);
  }
  return pools;
}

export function createGallery() {
  const shore = new THREE.Group();
  shore.name = 'Scene_gallery';
  const groundEnd = galleryScene.end + 30;
  const groundBack = SEA_HORIZON_Z + .5;
  box(shore, 0x4d5462, (galleryScene.start + groundEnd) / 2, -.2, (groundBack + 29) / 2,
    groundEnd - galleryScene.start, .42, 29 - groundBack).name = 'Gallery_ground';
  shore.add(boardwalk());
  box(shore, 0xb79b76, BOARDWALK.end - .06, -.025, .4, .12, .12, BOARDWALK.width).name = 'Coastal_path_end';
  for (let x = BOARDWALK.start + 1; x <= BOARDWALK.end - 2; x += 5) {
    box(shore, 0x756451, x, .4, 2.95, .12, .78, .12);
  }
  for (const z of [-2.14, 2.94]) box(shore, 0xbaa281, BOARDWALK.end - .08, .45, z, .15, .88, .15);

  shore.add(createSeaSurface(), tidePools());

  const rocks = new THREE.Group();
  rocks.name = 'Shore_rocks';
  for (let i = 0; i < 32; i++) {
    const x = 44 + i * 1.65;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(i % 5 === 0 ? .55 : .21 + (i * 7 % 4) * .075, 0),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x51636f : 0x65767e, roughness: 1, flatShading: true }));
    rock.position.set(x + Math.sin(i * 2.7) * .35, .08, i % 3 ? -3.65 + Math.sin(i * .45) * .28 : 4.5 + Math.sin(i) * .4);
    rock.scale.set(1.2 + i % 3 * .25, .55, .85);
    rock.rotation.y = i * .73;
    rock.castShadow = true;
    rock.receiveShadow = true;
    rocks.add(rock);
  }
  shore.add(rocks);
  for (let i = 0; i < 22; i++) {
    const x = 44.8 + i * 2.25;
    for (let blade = 0; blade < 3; blade++) {
      const grass = box(shore, 0x657078, x + blade * .12, .18, 4.8 + i % 3 * .4, .04, .4 + blade * .08, .05);
      grass.rotation.z = (blade - 1) * .3;
    }
  }

  for (const [index, project] of galleryScene.boards.entries()) shore.add(projectStar(project, index));
  const sky = new THREE.Group();
  sky.name = 'Coastal_starfield';
  for (let i = 0; i < 85; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(i % 7 ? .025 : .055),
      new THREE.MeshBasicMaterial({ color: i % 3 ? 0xc8ddf1 : 0xe7d4ae, fog: false }));
    star.position.set(44 + (i * 17 % 103) * .51, 1.5 + (i * 13 % 29) * .2, -16 - i % 4);
    sky.add(star);
  }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(.8, 48),
    new THREE.MeshBasicMaterial({ color: 0xe8e1cf, fog: false }));
  moon.position.set(galleryScene.end + 4, 4.7, -15);
  sky.add(moon);
  shore.add(sky, lighthouse());
  contactShadow(shore, galleryScene.end + 1.8, -4.6, 1.6, .7);

  return shore;
}
