import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { noOutline } from './materials';
import { BASE_HALF, ROOF_ZONES, type RoofZone } from './layout';

const GLSL_HASH = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }`;

export const WET_SHADER = {
  name: 'WetGround',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uK: { value: 1 }, uMask: { value: 0 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uK; uniform float uMask; varying vec4 vUv; varying vec3 vW; ${GLSL_HASH}
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
      vec2 dist=rp.yz*.014*pud+(vec2(vnoise(p*4.+uTime*.3),vnoise(p*4.-uTime*.25))-.5)*.006*(1.-pud);
      vec4 uv=vUv; uv.xy+=dist*uv.w;
      float smear=mix(.09,.005,pud);
      vec3 refl=vec3(0.); float ws=0.;
      float lod=max(log2(smear*.25*float(textureSize(tDiffuse,0).y))+.5,0.);
      for(int i=-4;i<=4;i++){ float o=float(i)/4.; float w=1.-abs(o)*.8; vec4 u=uv; u.y+=smear*o*uv.w; refl+=texture2DProj(tDiffuse,u,lod).rgb*w; ws+=w; }
      refl/=ws;
      vec3 wet=refl*.38*uK;
      vec3 mirror=refl*.95+vec3(.012,.018,.04);
      vec3 col=mix(wet,mirror,pud)+vec3(.6,.72,1.)*rp.x*.3*pud;
      gl_FragColor=vec4(col,pud*.72); }`,
};

const RIPPLE_LAYER_VERTEX = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RIPPLES_GLSL = `
  vec3 ripples(vec2 p){ vec3 acc=vec3(0.);
    for(int k=0;k<2;k++){ vec2 q=p*1.5+vec2(float(k)*3.1,float(k)*1.7); vec2 id=floor(q); vec2 f=fract(q);
      float h=hash(id+float(k)*17.); vec2 c=vec2(hash(id+3.1),hash(id+5.7))*.6+.2;
      float t=fract(uTime*(.55+.45*h)+h*10.); vec2 dv=f-c; float d=length(dv);
      float ring=(1.-smoothstep(0.,.02,abs(d-t*.45)))+.55*(1.-smoothstep(0.,.015,abs(d-t*.28)));
      ring*=(1.-t)*(1.-t)*step(.2,h);
      acc.x+=ring; acc.yz+=dv/(d+1e-3)*ring; }
    return acc; }`;
const RIPPLE_LAYER_FRAGMENT = `uniform float uTime; uniform float uMask; varying vec3 vW; ${GLSL_HASH} ${RIPPLES_GLSL}
  void main(){ vec2 p=vW.xz;
    if(uMask>.5 && !((p.x<5.&&p.y<5.)||p.y>11.||(p.x>11.&&p.y<5.))) discard;
    float n=vnoise(p*.28)*.6+vnoise(p*.9)*.3+vnoise(p*3.1)*.1;
    float pud=smoothstep(.645,.665,n);
    vec3 rp=ripples(p);
    vec3 col=vec3(.6,.72,1.)*rp.x*.3*pud;
    gl_FragColor=vec4(col, pud*rp.x*.6); }`;

const ROOF_PUDDLE_FRAGMENT = `uniform float uTime; uniform vec4 uPuddles[4]; uniform int uCount; uniform vec3 uSheen; varying vec3 vW; ${GLSL_HASH} ${RIPPLES_GLSL}
  void main(){ vec2 p=vW.xz;
    float m=0.;
    for(int i=0;i<4;i++){ if(i>=uCount) break; vec4 e=uPuddles[i];
      m=max(m,smoothstep(0.,.03,(1.-length((p-e.xy)/e.zw))*min(e.z,e.w))); }
    vec3 col=(uSheen+vec3(.6,.72,1.)*ripples(p).x*.3)*m;
    gl_FragColor=vec4(col,m); }`;

function rippleLayer(size: number, y: number, mask: number): THREE.Mesh {
  const material = noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMask: { value: mask } },
      vertexShader: RIPPLE_LAYER_VERTEX,
      fragmentShader: RIPPLE_LAYER_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, 0);
  mesh.renderOrder = 2;
  mesh.visible = false;
  return mesh;
}

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
      vertexShader: RIPPLE_LAYER_VERTEX,
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

function wetMirror(scene: THREE.Scene, reflectors: Reflector[], size: number, y: number, mask: number, k: number, width: number, height: number, pixelRatio: number): Reflector {
  const reflector = new Reflector(new THREE.PlaneGeometry(size, size), {
    textureWidth: Math.max(1, Math.round(width * pixelRatio * 0.5)),
    textureHeight: Math.max(1, Math.round(height * pixelRatio * 0.5)),
    clipBias: 0.003,
    multisample: 0,
    shader: WET_SHADER,
  });
  const target = reflector.getRenderTarget().texture;
  target.generateMipmaps = true;
  target.minFilter = THREE.LinearMipmapLinearFilter;
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
  material.uniforms.uK.value = k;
  const render = reflector.onBeforeRender;
  reflector.onBeforeRender = (...args) => {
    const others = reflectors.filter((o) => o !== reflector);
    others.forEach((o) => (o.visible = false));
    render.apply(reflector, args);
    others.forEach((o) => (o.visible = true));
  };
  scene.add(reflector);
  reflectors.push(reflector);
  return reflector;
}

export interface WetGroundHandle {
  setReflections(enabled: boolean): void;
  update(time: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function createWetGround(scene: THREE.Scene, width: number, height: number, pixelRatio: number): WetGroundHandle {
  const size = BASE_HALF * 2;
  const reflectors: Reflector[] = [];
  const road = wetMirror(scene, reflectors, size, 0.012, 0, 0.9, width, height, pixelRatio);
  const lot = wetMirror(scene, reflectors, size, 0.166, 1, 0.7, width, height, pixelRatio);

  const rippleRoad = rippleLayer(size, 0.012, 0);
  const rippleLot = rippleLayer(size, 0.166, 1);
  const roofPuddles = ROOF_ZONES.filter((zone) => zone.puddles.length > 0).map((zone) =>
    roofPuddleLayer(zone, zone.x0 < -10 ? 'roof-puddles-neighbor' : 'roof-puddles-konbini'),
  );
  scene.add(rippleRoad, rippleLot, ...roofPuddles);

  function setReflections(enabled: boolean): void {
    road.visible = enabled;
    lot.visible = enabled;
    rippleRoad.visible = !enabled;
    rippleLot.visible = !enabled;
  }

  function update(time: number): void {
    for (const reflector of reflectors) {
      (reflector.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
    (rippleRoad.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    (rippleLot.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    for (const mesh of roofPuddles) (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }

  function resize(w: number, h: number, pr: number): void {
    for (const reflector of reflectors) {
      reflector.getRenderTarget().setSize(Math.max(1, Math.round(w * pr * 0.5)), Math.max(1, Math.round(h * pr * 0.5)));
    }
  }

  function dispose(): void {
    for (const reflector of reflectors) {
      scene.remove(reflector);
      reflector.geometry.dispose();
      reflector.dispose();
    }
    for (const mesh of [rippleRoad, rippleLot, ...roofPuddles]) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  return { setReflections, update, resize, dispose };
}
