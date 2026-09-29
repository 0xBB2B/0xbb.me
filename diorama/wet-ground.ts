import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { noOutline } from './materials';
import { BASE_HALF, ROOF_ZONES, type RoofZone } from './layout';
import { TIER_SETTINGS } from './quality';

const GLSL_HASH = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }`;

const FRESNEL_F0 = 0.04;
const STREAK_LOW = 0.35;
const STREAK_HIGH = 1;
const STREAK_GAIN = 3;
const PUDDLE_FLOOR = 0.25;

const glsl = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export function fresnel(cosTheta: number): number {
  return FRESNEL_F0 + (1 - FRESNEL_F0) * (1 - cosTheta) ** 5;
}

export function streakGain(luminance: number): number {
  const t = Math.min(1, Math.max(0, (luminance - STREAK_LOW) / (STREAK_HIGH - STREAK_LOW)));
  return STREAK_GAIN * t * t * (3 - 2 * t);
}

export const WET_SHADER = {
  name: 'WetGround',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uMask: { value: 0 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uMask; varying vec4 vUv; varying vec3 vW; ${GLSL_HASH}
    vec3 ripples(vec2 p){ vec3 acc=vec3(0.);
      for(int k=0;k<2;k++){ vec2 q=p*1.5+vec2(float(k)*3.1,float(k)*1.7); vec2 id=floor(q); vec2 f=fract(q);
        float h=hash(id+float(k)*17.); vec2 c=vec2(hash(id+3.1),hash(id+5.7))*.6+.2;
        float t=fract(uTime*(.55+.45*h)+h*10.); vec2 dv=f-c; float d=length(dv);
        float ring=(1.-smoothstep(0.,.02,abs(d-t*.45)))+.55*(1.-smoothstep(0.,.015,abs(d-t*.28)));
        ring*=(1.-t)*(1.-t)*step(.2,h);
        acc.x+=ring; acc.yz+=dv/(d+1e-3)*ring; }
      return acc; }
    void main(){ vec2 p=vW.xz;
      if(uMask>.5 && !((p.x<5.&&p.y<5.)||p.y>11.||(p.x>11.&&p.y<5.))) discard;
      float n=vnoise(p*.28)*.6+vnoise(p*.9)*.3+vnoise(p*3.1)*.1;
      float pud=smoothstep(.645,.665,n);
      vec3 rp=ripples(p);
      vec2 dist=rp.yz*.014*pud;
      vec4 uv=vUv; uv.xy+=dist*uv.w;
      float smear=mix(.09,.005,pud);
      vec3 refl=vec3(0.); vec3 streak=vec3(0.); float ws=0.;
      float j=hash(mod(gl_FragCoord.xy, 1024.));
      for(int i=-4;i<=4;i++){ float o=float(i)/4.; float w=1.-abs(o)*.8; vec4 u=uv; u.y+=smear*(o+(j-.5)/4.)*uv.w; vec3 c=texture2DProj(tDiffuse,u).rgb; refl+=c*w; streak+=c*(${glsl(STREAK_GAIN)}*smoothstep(${glsl(STREAK_LOW)},${glsl(STREAK_HIGH)},dot(c,vec3(.299,.587,.114))))*w; ws+=w; }
      refl/=ws; streak/=ws;
      float cosT=normalize(cameraPosition-vW).y;
      float F=${glsl(FRESNEL_F0)}+${glsl(1 - FRESNEL_F0)}*pow(1.-cosT,5.);
      vec3 wet=streak*F;
      vec3 mirror=refl*max(F,${glsl(PUDDLE_FLOOR)})+vec3(.012,.018,.04);
      vec3 col=mix(wet,mirror,pud)+vec3(.6,.72,1.)*rp.x*.3*pud;
      gl_FragColor=vec4(col,pud*.72); }`,
};

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

function wetMirror(scene: THREE.Scene, reflectors: Reflector[], size: number, y: number, mask: number): Reflector {
  const reflector = new Reflector(new THREE.PlaneGeometry(size, size), {
    textureWidth: 1,
    textureHeight: 1,
    clipBias: 0.003,
    multisample: 0,
    shader: WET_SHADER,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, y, 0);
  reflector.renderOrder = 2;
  const material = noOutline(reflector.material as THREE.ShaderMaterial);
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.uniforms.uMask.value = mask;
  const render = reflector.onBeforeRender;
  reflector.onBeforeRender = (...args: Parameters<typeof render>) => {
    const others = reflectors.filter((o) => o !== reflector);
    others.forEach((o) => (o.visible = false));
    render.apply(reflector, args);
    others.forEach((o) => (o.visible = true));
  };
  scene.add(reflector);
  reflectors.push(reflector);
  return reflector;
}

export interface ReflectionSetting {
  scale: number;
  shared: boolean;
}

export interface WetGroundHandle {
  setReflection(setting: ReflectionSetting): void;
  update(time: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function createWetGround(scene: THREE.Scene, width: number, height: number, pixelRatio: number): WetGroundHandle {
  const size = BASE_HALF * 2;
  const reflectors: Reflector[] = [];
  const road = wetMirror(scene, reflectors, size, 0.012, 0);
  const lot = wetMirror(scene, reflectors, size, 0.166, 1);
  const lotRender = lot.onBeforeRender;
  const roadUniforms = (road.material as THREE.ShaderMaterial).uniforms;
  const lotUniforms = (lot.material as THREE.ShaderMaterial).uniforms;
  const lotOwn = { tDiffuse: lotUniforms.tDiffuse, textureMatrix: lotUniforms.textureMatrix };
  let scale = 0;
  let w = width;
  let h = height;
  let pr = pixelRatio;

  const roofPuddles = ROOF_ZONES.filter((zone) => zone.puddles.length > 0).map((zone) =>
    roofPuddleLayer(zone, zone.x0 < -10 ? 'roof-puddles-neighbor' : 'roof-puddles-konbini'),
  );
  scene.add(...roofPuddles);

  function resizeTargets(): void {
    const tw = Math.max(1, Math.round(w * pr * scale));
    const th = Math.max(1, Math.round(h * pr * scale));
    for (const reflector of reflectors) reflector.getRenderTarget().setSize(tw, th);
  }

  function setReflection(setting: ReflectionSetting): void {
    scale = setting.scale;
    lot.onBeforeRender = setting.shared ? () => {} : lotRender;
    lotUniforms.tDiffuse = setting.shared ? roadUniforms.tDiffuse : lotOwn.tDiffuse;
    lotUniforms.textureMatrix = setting.shared ? roadUniforms.textureMatrix : lotOwn.textureMatrix;
    resizeTargets();
  }

  function update(time: number): void {
    for (const reflector of reflectors) {
      (reflector.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
    for (const mesh of roofPuddles) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }

  function resize(nextWidth: number, nextHeight: number, nextPixelRatio: number): void {
    w = nextWidth;
    h = nextHeight;
    pr = nextPixelRatio;
    resizeTargets();
  }

  function dispose(): void {
    for (const reflector of reflectors) {
      scene.remove(reflector);
      reflector.geometry.dispose();
      reflector.dispose();
    }
    for (const mesh of roofPuddles) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  setReflection(TIER_SETTINGS.high.reflection);

  return { setReflection, update, resize, dispose };
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
