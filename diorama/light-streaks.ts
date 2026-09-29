import * as THREE from 'three';
import { noOutline } from './materials';
import { BASE_HALF } from './layout';
import type { Lamp, Street } from './street';
import { FRESNEL_F0, GLSL_HASH, LOT_REGION, PUDDLE_GLSL, glsl } from './wet-ground';

export interface StreakSource {
  name: string;
  position: [number, number, number];
  width: number;
  along?: [number, number];
  color: THREE.ColorRepresentation;
  colorOf?(): THREE.Color;
}

export const STORE_STREAK_SOURCES: StreakSource[] = [
  { name: 'fascia', position: [-1.25, 3.22, -2.66], width: 9.9, along: [1, 0], color: '#fff6e8' },
  { name: 'store-front-glass', position: [-1.25, 1.43, -3.04], width: 9.3, along: [1, 0], color: '#fff1d8' },
  { name: 'store-side-glass', position: [3.51, 1.63, -5.4], width: 3.6, along: [0, 1], color: '#fff1d8' },
  { name: 'kissa-front', position: [-10.6, 1.35, -3.49], width: 3.2, along: [1, 0], color: '#ffe0a0' },
  { name: 'kissa-lightbox', position: [-10.85, 0.65, -3.1], width: 0.45, color: '#fff4dc' },
  { name: 'vending-1', position: [4.33, 1.1, -8.42], width: 0.9, color: '#f2f4f7' },
  { name: 'vending-2', position: [4.33, 1.1, -7.48], width: 0.9, color: '#ffd6dc' },
  { name: 'street-lamp-1', position: [-8.8, 5.12, 4.95], width: 0.5, color: '#d6e6ff' },
  { name: 'street-lamp-2', position: [11.15, 5.12, -5.5], width: 0.5, color: '#d6e6ff' },
  { name: 'street-lamp-3', position: [-2.5, 5.12, 10.95], width: 0.5, color: '#d6e6ff' },
  { name: 'pylon', position: [-6.4, 5.2, 2.9], width: 1.5, color: '#e8fff9' },
];

const ROAD_Y = 0.012;
const LOT_Y = 0.166;
const SIGNAL_WIDTH = 0.25;
const STREAK_GAIN = 3;
const PUDDLE_BOOST = 2;
const SIDE_FALLOFF = 4;
const LENGTH_PER_HEIGHT = 1.5;
const MIN_LENGTH = 0.5;
const MAX_LENGTH = 8;
const MIN_COS = 0.2;
const MAX_SEGMENT_WIDTH = 1;
const PEAK_CAP = 0.9;
const FADE_IN = 0.1;

export function streakAnchor(camera: THREE.Vector3, light: THREE.Vector3, groundY: number): THREE.Vector3 {
  const mirrored = new THREE.Vector3(light.x, 2 * groundY - light.y, light.z);
  const t = (groundY - camera.y) / (mirrored.y - camera.y);
  const anchor = camera.clone().add(mirrored.sub(camera).multiplyScalar(t));
  anchor.y = groundY;
  return anchor;
}

const luminance = (c: THREE.Color): number => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

export function signalStreakSources(street: Street): StreakSource[] {
  return [...street.vehicleSignals.flat(), ...street.pedestrianSignals.flat()].map((lamp, i) => ({
    name: `signal-${i}`,
    position: lamp.mesh.getWorldPosition(new THREE.Vector3()).toArray() as [number, number, number],
    width: SIGNAL_WIDTH,
    color: lamp.base,
    colorOf: () => (luminance(lamp.m.color) > luminance(lamp.base) ? lamp.base.clone() : new THREE.Color(0, 0, 0)),
  }));
}

const VERTEX = `uniform float uGround; attribute vec3 aLight; attribute float aWidth; attribute vec2 aCorner; attribute vec3 color;
  varying vec3 vW; varying vec3 vColor; varying vec2 vCorner;
  void main(){
    vec3 C=cameraPosition;
    if(C.y<=uGround){ gl_Position=vec4(2.,2.,2.,1.); return; }
    vec3 mirrored=vec3(aLight.x,2.*uGround-aLight.y,aLight.z);
    vec3 P=C+(uGround-C.y)/(mirrored.y-C.y)*(mirrored-C);
    vec3 toCam=C-P;
    vec2 dir=normalize(toCam.xz);
    float cosT=normalize(toCam).y;
    float len=clamp((aLight.y-uGround)*${glsl(LENGTH_PER_HEIGHT)}/max(cosT,${glsl(MIN_COS)}),${glsl(MIN_LENGTH)},${glsl(MAX_LENGTH)});
    vec2 xz=P.xz+dir*len*aCorner.y+vec2(-dir.y,dir.x)*aWidth*.5*aCorner.x;
    vW=vec3(xz.x,uGround,xz.y); vColor=color; vCorner=aCorner;
    gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`;

const FRAGMENT = `uniform float uLot; varying vec3 vW; varying vec3 vColor; varying vec2 vCorner; ${GLSL_HASH} ${PUDDLE_GLSL}
  void main(){ vec2 p=vW.xz;
    if(abs(p.x)>${glsl(BASE_HALF)}||abs(p.y)>${glsl(BASE_HALF)}) discard;
    bool lot=${LOT_REGION};
    if(lot!=(uLot>.5)) discard;
    float cosT=normalize(cameraPosition-vW).y;
    float F=${glsl(FRESNEL_F0)}+${glsl(1 - FRESNEL_F0)}*pow(1.-cosT,5.);
    vec3 col=min(vColor*F*${glsl(STREAK_GAIN)},${glsl(PEAK_CAP)})*exp(-vCorner.x*vCorner.x*${glsl(SIDE_FALLOFF)})*smoothstep(0.,${glsl(FADE_IN)},vCorner.y)*(1.-smoothstep(${glsl(FADE_IN)},1.,vCorner.y))*(1.+(${glsl(PUDDLE_BOOST)}-1.)*puddle(p));
    gl_FragColor=vec4(col,1.); }`;

const CORNERS = [[-1, 0], [1, 0], [1, 1], [-1, 1]];

function layer(geometry: THREE.BufferGeometry, name: string, groundY: number, lot: number): THREE.Mesh {
  const material = noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uGround: { value: groundY }, uLot: { value: lot } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      depthWrite: false,
      depthTest: true,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 2.5;
  mesh.frustumCulled = false;
  return mesh;
}

export interface LightStreaks {
  update(): void;
  dispose(): void;
}

export function createLightStreaks(scene: THREE.Scene, sources: StreakSource[]): LightStreaks {
  const segments = sources.flatMap((source) => {
    if (!source.along) return [{ source, position: source.position, width: source.width }];
    const n = Math.ceil(source.width / MAX_SEGMENT_WIDTH);
    const width = source.width / n;
    const [ax, az] = source.along;
    return Array.from({ length: n }, (_, k) => {
      const offset = -source.width / 2 + (k + 0.5) * width;
      return { source, position: [source.position[0] + ax * offset, source.position[1], source.position[2] + az * offset] as [number, number, number], width };
    });
  });
  const count = segments.length;
  const lights = new Float32Array(count * 12);
  const widths = new Float32Array(count * 4);
  const corners = new Float32Array(count * 8);
  const colors = new Float32Array(count * 12);
  const index: number[] = [];
  segments.forEach((segment, i) => {
    for (let k = 0; k < 4; k++) {
      const v = 4 * i + k;
      lights.set(segment.position, v * 3);
      widths[v] = segment.width;
      corners.set(CORNERS[k], v * 2);
    }
    index.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('aLight', new THREE.BufferAttribute(lights, 3));
  geometry.setAttribute('aWidth', new THREE.BufferAttribute(widths, 1));
  geometry.setAttribute('aCorner', new THREE.BufferAttribute(corners, 2));
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(index);

  function writeColors(): void {
    segments.forEach(({ source }, i) => {
      const c = new THREE.Color(source.colorOf ? source.colorOf() : source.color);
      for (let k = 0; k < 4; k++) colorAttribute.setXYZ(4 * i + k, c.r, c.g, c.b);
    });
    colorAttribute.needsUpdate = true;
  }
  writeColors();

  const meshes = [layer(geometry, 'light-streaks-road', ROAD_Y, 0), layer(geometry, 'light-streaks-lot', LOT_Y, 1)];
  scene.add(...meshes);

  return {
    update: writeColors,
    dispose(): void {
      for (const mesh of meshes) {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      }
      geometry.dispose();
    },
  };
}
