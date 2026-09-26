import * as THREE from 'three';
import { noOutline, sharedTime } from './materials';
import { rand } from './primitives';
import { ROOF_ZONES, isOnLot } from './layout';

function floorYAt(x: number, z: number): number {
  const roof = ROOF_ZONES.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  if (roof) return roof.y;
  return isOnLot(x, z) ? 0.16 : 0.01;
}

export interface RainSeed {
  x: number;
  z: number;
  phase: number;
  floorY: number;
}

export function rainSeeds(count: number, random: () => number): RainSeed[] {
  const seeds: RainSeed[] = [];
  for (let i = 0; i < count; i++) {
    const x = -12.9 + random() * 25.8;
    const z = -12.9 + random() * 25.8;
    const phase = random();
    seeds.push({ x, z, phase, floorY: floorYAt(x, z) });
  }
  return seeds;
}

const RAIN_HEIGHT = 18;

export interface RainHandle {
  mesh: THREE.LineSegments;
  setVisibleRatio(ratio: number): void;
}

export function createRain(count = 6500): RainHandle {
  const seeds = rainSeeds(count, Math.random);
  const seedAttr = new Float32Array(count * 2 * 4);
  const floorY = new Float32Array(count * 2);
  seeds.forEach((seed, i) => {
    for (let end = 0; end < 2; end++) {
      seedAttr.set([seed.x, seed.z, seed.phase, end], (i * 2 + end) * 4);
      floorY[i * 2 + end] = seed.floorY;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seedAttr, 4));
  geometry.setAttribute('floorY', new THREE.BufferAttribute(floorY, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uH: { value: RAIN_HEIGHT } },
    vertexShader: `attribute vec4 seed; attribute float floorY; uniform float uTime; uniform float uH; varying float vA;
      varying float vF;
      void main(){ float span = uH - floorY; float spd = 15. * (.85 + .3 * fract(seed.z * 7.13));
        float y = floorY + span - mod(uTime * spd + seed.z * span, span);
        float len = .22 + .38 * fract(seed.z * 13.7);
        vec3 p = vec3(seed.x + (y + seed.w*len) * .04, y + seed.w * len, seed.y + (y + seed.w*len) * .015);
        vA = seed.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float d = -mv.z;
        vF = exp(-d * .022) * smoothstep(3., 10., d);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vF; void main(){ gl_FragColor = vec4(vec3(.7,.8,1.) * (1. - vA) * .34 * vF, 1.); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;

  function setVisibleRatio(ratio: number): void {
    geometry.setDrawRange(0, Math.round(count * 2 * ratio));
  }
  setVisibleRatio(1);

  return { mesh, setVisibleRatio };
}

export interface SplashHandle {
  mesh: THREE.Points;
  setPixelRatio(pixelRatio: number): void;
}

export function createSplashes(pixelRatio: number, count = 1800): SplashHandle {
  const seed = new Float32Array(count * 3);
  const floorY = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = -12.6 + Math.random() * 25.2;
    const z = -12.6 + Math.random() * 25.2;
    seed.set([x, z, Math.random()], i * 3);
    floorY[i] = floorYAt(x, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
  geometry.setAttribute('floorY', new THREE.BufferAttribute(floorY, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime, uPR: { value: pixelRatio } },
    vertexShader: `attribute vec3 seed; attribute float floorY; uniform float uTime; uniform float uPR; varying float vA; varying float vT;
      void main(){ float k = uTime * .9 + seed.z; float t = fract(k); float cyc = floor(k);
        vec2 jit = (vec2(fract(sin(cyc * 12.9 + seed.x) * 437.5), fract(sin(cyc * 78.2 + seed.y) * 437.5)) - .5) * .6;
        vec3 p = vec3(seed.x + jit.x, floorY + .02 + t * .1, seed.y + jit.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vT = t; vA = 1. - smoothstep(0., .3, t);
        gl_PointSize = (1.5 + 7. * t) * uPR * 24. / -mv.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vT;
      void main(){ float r = length(gl_PointCoord - .5);
        float crown = (1. - smoothstep(0., .1, abs(r - .12 - vT * .3))) + (1. - smoothstep(.0, .15, r)) * (1. - vT);
        gl_FragColor = vec4(vec3(.75, .85, 1.) * crown * vA * .8, 1.); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    setPixelRatio(ratio: number): void {
      material.uniforms.uPR.value = ratio;
    },
  };
}

const DRIP_COUNT = 34;
const DRIP_EAVE_Z = -1.42;
const DRIP_TOP_Y = 2.58;

export interface DripsHandle {
  mesh: THREE.InstancedMesh;
  update(t: number): void;
}

export function createDrips(): DripsHandle {
  const material = noOutline(new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(1.3), toneMapped: false }));
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 6), material, DRIP_COUNT);
  mesh.frustumCulled = false;

  const drips = Array.from({ length: DRIP_COUNT }, (_, i) => ({
    x: -6.1 + (i + Math.random() * 0.7) * (9.8 / DRIP_COUNT),
    period: rand(0.9, 1.9),
    phase: rand(0, 2),
  }));
  const dummy = new THREE.Object3D();

  function update(t: number): void {
    drips.forEach((drip, i) => {
      const tt = (t + drip.phase) % drip.period;
      let y = DRIP_TOP_Y;
      let s = 0;
      if (tt < 0.3) {
        s = tt / 0.3;
      } else {
        const fallTime = tt - 0.3;
        y = DRIP_TOP_Y - 4.9 * fallTime * fallTime;
        s = y > 0.17 ? 1 : 0;
      }
      dummy.position.set(drip.x, y, DRIP_EAVE_Z);
      dummy.scale.set(s, s * (tt < 0.3 ? 1 : 2.4), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
