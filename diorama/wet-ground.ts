import * as THREE from 'three';
import { noOutline } from './materials';
import { BASE_HALF, ROOF_ZONES, type RoofZone } from './layout';

export const GLSL_HASH = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }`;

export const FRESNEL_F0 = 0.04;
const PUDDLE_FLOOR = 0.25;

export const glsl = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export function fresnel(cosTheta: number): number {
  return FRESNEL_F0 + (1 - FRESNEL_F0) * (1 - cosTheta) ** 5;
}

const WORLD_POS_VERTEX = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RIPPLES_GLSL = `
  vec3 ripples(vec2 p){ vec3 acc=vec3(0.);
    for(int k=0;k<2;k++){ vec2 q=p*1.5+vec2(float(k)*3.1,float(k)*1.7); vec2 id=floor(q); vec2 f=fract(q);
      float h=hash(id+float(k)*17.); vec2 c=vec2(hash(id+3.1),hash(id+5.7))*.6+.2;
      float t=fract(uTime*(.55+.45*h)+h*10.); vec2 dv=f-c; float d=length(dv);
      float ring=(1.-smoothstep(0.,.02,abs(d-t*.45)))+.55*(1.-smoothstep(0.,.015,abs(d-t*.28)));
      ring*=(1.-t)*(1.-t)*step(.2,h);
      acc.x+=ring; acc.yz+=dv/(d+1e-3)*ring; }
    return acc; }`;

export const PUDDLE_GLSL = `
float puddle(vec2 p){
  float n=vnoise(p*.28)*.6+vnoise(p*.9)*.3+vnoise(p*3.1)*.1;
  return smoothstep(.645,.665,n); }`;

export const LOT_REGION = '((p.x<5.&&p.y<5.)||p.y>11.||(p.x>11.&&p.y<5.))';

const WET_GROUND_FRAGMENT = `uniform samplerCube envMap; uniform float uTime; uniform float uMask; varying vec3 vW; ${GLSL_HASH} ${RIPPLES_GLSL} ${PUDDLE_GLSL}
    void main(){ vec2 p=vW.xz;
      if(uMask>.5 && !${LOT_REGION}) discard;
      float pud=puddle(p);
      vec3 rp=ripples(p);
      float cosT=normalize(cameraPosition-vW).y;
      float F=${glsl(FRESNEL_F0)}+${glsl(1 - FRESNEL_F0)}*pow(1.-cosT,5.);
      vec3 n=normalize(vec3(rp.y*.05*pud,1.,rp.z*.05*pud));
      vec3 refl=textureCube(envMap,reflect(normalize(vW-cameraPosition),n)).rgb;
      vec3 mirror=refl*max(F,${glsl(PUDDLE_FLOOR)})+vec3(.012,.018,.04)+vec3(.6,.72,1.)*rp.x*.3;
      vec3 col=mix(vec3(.012,.016,.03),mirror,pud);
      gl_FragColor=vec4(col,pud*.72); }`;

const ROOF_PUDDLE_FRAGMENT = `uniform float uTime; uniform vec4 uPuddles[4]; uniform int uCount; uniform vec3 uSheen; varying vec3 vW; ${GLSL_HASH} ${RIPPLES_GLSL}
  void main(){ vec2 p=vW.xz;
    float m=0.;
    for(int i=0;i<4;i++){ if(i>=uCount) break; vec4 e=uPuddles[i];
      m=max(m,smoothstep(0.,.03,(1.-length((p-e.xy)/e.zw))*min(e.z,e.w))); }
    vec3 col=(uSheen+vec3(.6,.72,1.)*ripples(p).x*.3)*m;
    gl_FragColor=vec4(col,m); }`;

function roofPuddleLayer(zone: RoofZone, name: string): THREE.Mesh {
  const puddles = Array.from({ length: 4 }, (_, i) => {
    const e = zone.puddles[i];
    return e ? new THREE.Vector4(e.x, e.z, e.rx, e.rz) : new THREE.Vector4();
  });
  const material = noOutline(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPuddles: { value: puddles },
        uCount: { value: zone.puddles.length },
        uSheen: { value: new THREE.Color(0.06, 0.08, 0.12) },
      },
      vertexShader: WORLD_POS_VERTEX,
      fragmentShader: ROOF_PUDDLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(zone.x1 - zone.x0, zone.z1 - zone.z0, 1);
  mesh.position.set((zone.x0 + zone.x1) / 2, zone.y + 0.01, (zone.z0 + zone.z1) / 2);
  mesh.renderOrder = 2;
  mesh.name = name;
  return mesh;
}

function groundWetLayer(size: number, y: number, mask: number, envMap: THREE.Texture, name: string): THREE.Mesh {
  const material = noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMask: { value: mask }, envMap: { value: envMap } },
      vertexShader: WORLD_POS_VERTEX,
      fragmentShader: WET_GROUND_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    }),
  );
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, 0);
  mesh.renderOrder = 2;
  mesh.name = name;
  return mesh;
}

export interface EnvironmentCapture {
  texture: THREE.Texture;
  dispose(): void;
}

export function captureEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, hidden: THREE.Object3D[]): EnvironmentCapture {
  const target = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const camera = new THREE.CubeCamera(0.1, 200, target);
  camera.position.set(0, 3, 2);
  const visibility = hidden.map((o) => o.visible);
  hidden.forEach((o) => (o.visible = false));
  const background = scene.background;
  scene.background = scene.fog ? new THREE.Color(scene.fog.color) : null;
  camera.update(renderer, scene);
  scene.background = background;
  hidden.forEach((o, i) => (o.visible = visibility[i]));
  return { texture: target.texture, dispose: () => target.dispose() };
}

export interface WetGroundHandle {
  update(time: number): void;
  dispose(): void;
}

export function createWetGround(scene: THREE.Scene, envMap: THREE.Texture): WetGroundHandle {
  const size = BASE_HALF * 2;
  const layers = [
    groundWetLayer(size, 0.012, 0, envMap, 'wet-ground-road'),
    groundWetLayer(size, 0.166, 1, envMap, 'wet-ground-lot'),
    ...ROOF_ZONES.filter((zone) => zone.puddles.length > 0).map((zone) =>
      roofPuddleLayer(zone, zone.x0 < -10 ? 'roof-puddles-neighbor' : 'roof-puddles-konbini'),
    ),
  ];
  scene.add(...layers);

  function update(time: number): void {
    for (const mesh of layers) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }

  function dispose(): void {
    for (const mesh of layers) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  return { update, dispose };
}

const smooth = (d: number): number => {
  const t = Math.min(1, Math.max(0, (d - 0.5) / 0.5));
  return 1 - t * t * (3 - 2 * t);
};

const shadowFalloff = (() => {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2;
      const a = Math.round(255 * smooth(d));
      data.set([a, a, a, 255], (y * n + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
})();

export function contactShadow(parent: THREE.Object3D, width: number, depth: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const material = noOutline(
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, alphaMap: shadowFalloff, depthWrite: false }),
  );
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = 'contact-shadow';
  mesh.rotation.set(-Math.PI / 2, 0, ry, 'YXZ');
  mesh.position.set(x, y, z);
  mesh.renderOrder = 3;
  parent.add(mesh);
  return mesh;
}
