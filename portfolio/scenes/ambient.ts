import * as THREE from 'three';
import { box } from '../geometry';
import { JOURNEY, type BoardId } from '../journey';
import { boxInstances } from '../instances';

function factoryConveyor(workshop: THREE.Group) {
  const root = new THREE.Group();
  root.name = 'Factory_conveyor';
  workshop.add(root);
  const start = JOURNEY[1].start + 2.5;
  const end = JOURNEY[1].end - 2.5;
  const length = end - start;
  const center = (start + end) / 2;
  const z = 3.05;
  box(root, 0x263a48, center, .16, z, length, .22, .8);
  for (const side of [-1, 1]) box(root, 0x80939b, center, .32, z + side * .42, length, .1, .08);
  for (let x = start; x <= end; x += 2.4) box(root, 0x485d67, x, .1, z, .13, .2, .92);
  const rollers: THREE.Mesh[] = [];
  for (let x = start + .2; x < end; x += .65) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .72, 8),
      new THREE.MeshStandardMaterial({ color: 0x71868f, metalness: .55, roughness: .5, flatShading: true }));
    roller.position.set(x, .3, z);
    roller.rotation.x = Math.PI / 2;
    roller.name = 'Conveyor_roller';
    root.add(roller);
    rollers.push(roller);
  }
  const slats = boxInstances(root, 'Conveyor_belt_slats', 0x394f59, [.12, .035, .66], Array.from({ length: 36 }, (_, i) => ({
    x: start + i * length / 36, y: .355, z, color: i % 3 ? 0x394f59 : 0x718079,
  })));
  slats.boundingBox = new THREE.Box3(new THREE.Vector3(start - .06, .3375, z - .33), new THREE.Vector3(end + .06, .3725, z + .33));
  slats.boundingSphere = slats.boundingBox.getBoundingSphere(new THREE.Sphere());
  const beltMatrix = new THREE.Matrix4();
  const payloads: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const payload = new THREE.Group(); payload.name = 'Conveyor_payload'; root.add(payload);
    box(payload, i % 2 ? 0xad9268 : 0x719aa3, 0, .08, 0, .42, .16, .4);
    box(payload, 0x263e4b, 0, .17, 0, .28, .025, .23);
    const indicator = box(payload, 0x98e2da, .1, .18, 0, .05, .016, .05);
    (indicator.material as THREE.MeshStandardMaterial).emissive.set(0x59bfc9);
    payload.position.set(start + .6 + i * (length - 1.2) / 7, .36, z);
    payloads.push(payload);
  }
  const arms: THREE.Group[] = [];
  for (const x of [start + 2.5, end - 2.5]) {
    box(root, 0x566f7a, x, .16, z - .45, .32, .3, .34);
    const arm = new THREE.Group(); arm.name = 'Conveyor_inspection_arm'; arm.position.set(x, .26, z - .45); root.add(arm);
    box(arm, 0xc5a875, .13, .055, .14, .31, .09, .08);
    box(arm, 0x83bcc2, .25, .06, .29, .1, .1, .31);
    arms.push(arm);
  }
  return (time: number) => {
    rollers.forEach(roller => { roller.rotation.y = time * 2.8; });
    for (let index = 0; index < slats.count; index++) {
      beltMatrix.makeTranslation(start + (index * length / slats.count + time * .55) % length, .355, z);
      slats.setMatrixAt(index, beltMatrix);
    }
    slats.instanceMatrix.needsUpdate = true;
    payloads.forEach((payload, index) => { payload.position.x = start + .6 + (index * (length - 1.2) / payloads.length + time * .55) % (length - 1.2); });
    arms.forEach((arm, index) => { arm.rotation.y = Math.sin(time * .75 + index * Math.PI) * .38; });
  };
}

function meteors(gallery: THREE.Group) {
  const root = new THREE.Group(); root.name = 'Coastal_meteors'; gallery.add(root);
  const random = (seed: number) => { const value = Math.sin(seed * 127.1) * 43758.5453; return value - Math.floor(value); };
  const geometry = new THREE.PlaneGeometry(4, .3).translate(-1.85, 0, 0);
  const trails = Array.from({ length: 3 }, (_, index) => {
    const group = new THREE.Group(); group.name = 'Coastal_meteor'; root.add(group);
    const material = new THREE.ShaderMaterial({
      transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
      uniforms: { uOpacity: { value: 0 }, uHead: { value: 0 }, uLength: { value: 1 } },
      vertexShader: `varying vec2 trailPoint;
        void main(){ trailPoint=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec2 trailPoint;
        uniform float uOpacity, uHead, uLength;
        void main(){
          float age=clamp(-trailPoint.x/uLength,0.0,1.0);
          float width=mix(0.022,0.004,age);
          float sideFade=exp(-2.0*pow(trailPoint.y/width,2.0));
          float tail=step(trailPoint.x,0.0)*pow(1.0-age,1.8)*sideFade;
          vec2 corePoint=trailPoint/vec2(0.029,0.023);
          vec2 haloPoint=trailPoint/vec2(0.075,0.055);
          float core=exp(-dot(corePoint,corePoint)*2.0)*uHead;
          float halo=exp(-dot(haloPoint,haloPoint)*2.0)*0.2*uHead;
          float light=tail*0.7+core+halo;
          gl_FragColor=vec4(mix(vec3(0.56,0.76,1.0),vec3(1.0,0.98,0.9),core),uOpacity*light);
        }`,
    });
    const streak = new THREE.Mesh(geometry, material); streak.name = 'Meteor_streak'; group.add(streak);
    return { group, material, index };
  });
  return (time: number, moving: boolean) => {
    const cycle = Math.floor(time / 24);
    for (const { group, material, index } of trails) {
      const seed = cycle * 3 + index;
      const age = time % 24 - [0, 7.3, 16.7][index] - random(seed) * 1.4;
      const duration = .85 + random(seed + 11) * .35;
      const speed = 7 + random(seed + 23) * 3;
      const angle = -.24 - random(seed + 37) * .16;
      const fadeIn = THREE.MathUtils.smoothstep(age, 0, .08);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(age, duration - .1, duration + .25);
      material.opacity = moving && age >= 0 ? fadeIn * fadeOut * .9 : 0;
      material.uniforms.uOpacity.value = material.opacity;
      material.uniforms.uHead.value = 1 - THREE.MathUtils.smoothstep(age, duration - .15, duration);
      material.uniforms.uLength.value = Math.max(.04, Math.min(3.2, speed * Math.max(0, age) * .8));
      const distance = Math.max(0, Math.min(age, duration)) * speed;
      group.rotation.z = angle;
      group.position.set(JOURNEY[2].start + 2 + index * 7 + random(seed + 47) * 4 + Math.cos(angle) * distance,
        6.8 + random(seed + 59) * .8 + Math.sin(angle) * distance, -15);
    }
  };
}

function beacon(gallery: THREE.Group) {
  const water = (gallery.getObjectByName('Sea_surface') as THREE.Mesh).material as THREE.ShaderMaterial;
  const lighthouse = gallery.getObjectByName('Coastal_lighthouse')!;
  const root = new THREE.Group(); root.name = 'Lighthouse_beam';
  root.position.set(lighthouse.position.x, 4.96, -4.4);
  root.rotation.y = -.65;
  gallery.add(root);
  // The opacity reaches zero at both side edges and at the far end: no hard triangular cut.
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 beamUv; void main(){ beamUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 beamUv;
      void main(){
        float sideFade=pow(max(0.0,1.0-abs(beamUv.y*2.0-1.0)),2.5);
        float distanceFade=pow(1.0-beamUv.x,2.0);
        gl_FragColor=vec4(1.0,0.84,0.56,0.075*sideFade*distanceFade);
      }`,
  });
  const segments = 20;
  for (let sheet = 0; sheet < 5; sheet++) {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    const angle = sheet * Math.PI / 5;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      for (const side of [-1, 1]) {
        const radius = side * (.05 + t * 1.4);
        positions.push(-t * 20, -t * 2.6 + Math.cos(angle) * radius, Math.sin(angle) * radius);
        uv.push(t, side === -1 ? 0 : 1);
      }
      if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    root.add(new THREE.Mesh(geometry, material));
  }
  const spot = new THREE.SpotLight(0xffddb0, 16, 36, .15, .85, 2);
  spot.name = 'Lighthouse_rotating_light'; spot.position.copy(root.position);
  gallery.add(spot, spot.target);
  return (time: number) => {
    const angle = -.65 - time * .2;
    root.rotation.y = angle;
    spot.target.position.set(root.position.x - Math.cos(angle) * 22, .05, root.position.z + Math.sin(angle) * 22);
    water.uniforms.uBeamDirection.value.set(-Math.cos(angle), Math.sin(angle));
  };
}

export function createAmbientEffects(workshop: THREE.Group, gallery: THREE.Group) {
  const moveConveyor = factoryConveyor(workshop);
  const moveMeteors = meteors(gallery);
  const rotateBeacon = beacon(gallery);
  const water = (gallery.getObjectByName('Sea_surface') as THREE.Mesh).material as THREE.ShaderMaterial;
  const pools = (gallery.getObjectByName('Tide_pool_surface') as THREE.Mesh).material as THREE.ShaderMaterial;
  const stars = JOURNEY[2].boards.map(board => ({
    id: board.id,
    material: (gallery.getObjectByName(`Project_star_${board.id}`)!.getObjectByName('Star_halo') as THREE.Mesh).material as THREE.ShaderMaterial,
  }));
  return {
    update(time: number, moving = true, activeBoard: BoardId | null = null, sky?: THREE.Color) {
      moveConveyor(time);
      moveMeteors(time, moving);
      rotateBeacon(time);
      water.uniforms.uTime.value = time;
      pools.uniforms.uTime.value = time;
      if (sky) water.uniforms.uSky.value.copy(sky);
      for (const star of stars) {
        star.material.uniforms.uTime.value = time;
        star.material.uniforms.uActive.value = activeBoard === star.id ? 1 : 0;
      }
    },
  };
}
