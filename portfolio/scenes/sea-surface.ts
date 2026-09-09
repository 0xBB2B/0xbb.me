import * as THREE from 'three';
import { JOURNEY } from '../journey';

const SHORE_Z = -3.7;
export const SEA_HORIZON_Z = -17;

export function createSeaSurface() {
  const sea = new THREE.Group(); sea.name = 'Sea';
  const material = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uHorizonDistance: { value: SHORE_Z - SEA_HORIZON_Z },
      uShorewardSpeed: { value: .2 },
      uSky: { value: new THREE.Color(0x101d34) },
      uDeep: { value: new THREE.Color(0x102b43) },
      uShallow: { value: new THREE.Color(0x205464) },
      uMoon: { value: new THREE.Color(0xb3d5df) },
      uMoonX: { value: JOURNEY[2].end + 4 },
      uBeacon: { value: new THREE.Vector2(JOURNEY[2].end + 1.8, -4.4) },
      uBeamDirection: { value: new THREE.Vector2(-1, -.6).normalize() },
    },
    vertexShader: `uniform float uTime; varying vec3 waterPosition;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        float depth=smoothstep(0.0,4.0,-world.z-3.7);
        world.y+=depth*(sin(world.z*1.5+world.x*0.27-uTime*0.65)*0.006+sin(world.z*2.7-world.x*0.35-uTime*0.5)*0.003);
        waterPosition=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: `uniform float uTime,uShorewardSpeed; uniform vec3 uSky,uDeep,uShallow,uMoon;
      uniform float uMoonX,uHorizonDistance; uniform vec2 uBeacon,uBeamDirection; varying vec3 waterPosition;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=waterPosition.xz; float distance=-p.y-3.7;
        float a=p.y*1.85+p.x*0.29-uTime*0.75;
        float b=p.y*3.65-p.x*0.43-uTime*0.51;
        a+=noise(p*vec2(0.19,0.3))*2.2;
        b+=noise(p*vec2(0.6,0.25)+uTime*0.035)*1.5;
        float wave=sin(a)+0.42*sin(b)+0.19*sin(p.x*1.6+p.y*2.3-uTime*0.44);
        float grain=noise(p*vec2(2.8,5.0)+vec2(uTime*0.07,0));
        vec3 color=mix(uShallow,uDeep,smoothstep(0.0,18.0,distance));
        float crest=pow(clamp(0.5+wave*0.29,0.0,1.0),7.0);
        color+=vec3(0.012,0.035,0.045)*crest*(0.2+0.8*grain);
        float fine=sin(p.y*8.0+sin(p.x*0.8+p.y*0.7-uTime*0.25)-uTime*0.9)*sin(p.x*1.7+p.y*0.4-uTime*0.32);
        color+=vec3(0.025,0.065,0.075)*pow(max(0.0,fine),10.0)*grain;
        float stripeWidth=0.48+max(distance,0.0)*0.038;
        float reflection=exp(-pow((p.x-uMoonX+wave*0.36)/stripeWidth,2.0));
        color+=uMoon*reflection*(0.07+crest*0.43)*(0.55+grain*0.45);
        float shore=-3.75+sin(p.x*0.63)*0.22+sin(p.x*0.21)*0.15;
        float shoreDistance=shore-p.y;
        float foam=pow(max(0.0,sin((shoreDistance+uTime*uShorewardSpeed)*4.7+wave*0.28)),10.0);
        float glow=(1.0-smoothstep(0.6,2.6,shoreDistance))*smoothstep(-0.1,0.2,shoreDistance);
        color+=vec3(0.035,0.52,0.43)*glow*(foam*0.65+pow(grain,5.0)*0.3);
        vec2 delta=p-uBeacon;float along=dot(delta,uBeamDirection);
        float lateral=abs(delta.x*uBeamDirection.y-delta.y*uBeamDirection.x);
        float beam=exp(-pow(lateral/(0.5+max(along,0.0)*0.085),2.0))*smoothstep(0.0,2.0,along)*(1.0-smoothstep(8.0,27.0,along));
        color+=vec3(0.3,0.22,0.1)*beam*(0.12+crest*0.28);
        color=mix(color,uSky,smoothstep(uHorizonDistance-4.0,uHorizonDistance,distance));
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const left = JOURNEY[2].start - 2, right = JOURNEY[2].end + 32;
  const geometry = new THREE.PlaneGeometry(right - left, SHORE_Z - SEA_HORIZON_Z, 128, 48);
  geometry.rotateX(-Math.PI / 2);
  const surface = new THREE.Mesh(geometry, material);
  surface.name = 'Sea_surface';
  surface.position.set((left + right) / 2, .022, (SHORE_Z + SEA_HORIZON_Z) / 2);
  // The water authors its moon and beacon reflections; large building shadow maps do not paint rectangles over it.
  surface.castShadow = false; surface.receiveShadow = false;
  sea.add(surface);
  return sea;
}

export function createStarHalo(color: number, phase: number) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uActive: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 starUv;void main(){starUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uTime,uPhase,uActive;uniform vec3 uColor;varying vec2 starUv;
      void main(){
        vec2 p=starUv*2.0-1.0;float r=length(p);
        float halo=exp(-r*6.5)*0.16;
        float core=exp(-dot(p,p)*135.0)*0.8;
        float rays=exp(-abs(p.x)*65.0)*exp(-abs(p.y)*7.0)+exp(-abs(p.y)*65.0)*exp(-abs(p.x)*9.0);
        float fade=1.0-smoothstep(0.55,0.98,r);
        float pulse=0.9+0.1*sin(uTime*1.3+uPhase);
        float alpha=(halo+core+rays*0.27)*fade*pulse*(1.0+uActive*0.6);
        gl_FragColor=vec4(uColor,alpha);
        #include <colorspace_fragment>
      }`,
  });
}
