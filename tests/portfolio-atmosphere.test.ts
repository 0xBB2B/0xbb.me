import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BOARDS, ROAD } from '../portfolio/journey';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';
import { runBrowser } from './browser';

const bounds = (object: THREE.Object3D) => new THREE.Box3().setFromObject(object);

describe('cyberpunk workshop and starlit coast', () => {
  test('selected B is an industrial data hall with an illuminated core, tanks, a maintenance walkway and cyan/amber terminals', () => {
    const { scene } = createWorld();
    try {
      const workshop = scene.getObjectByName('Scene_workshop')!;
      const neonColors = new Set<number>();
      workshop.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material as THREE.MeshStandardMaterial;
        if (material.emissiveIntensity > 1) neonColors.add(material.emissive.getHex());
      });
      expect(neonColors.has(0x00e5ff)).toBe(true);
      expect(neonColors.has(0xffc46d)).toBe(true);
      expect(neonColors.has(0xff2a9d)).toBe(false);
      expect(!!workshop.getObjectByName('Workshop_neon_signs')).toBe(false);
      for (const name of ['Workshop_server_racks', 'Workshop_data_core', 'Workshop_cooling_tanks', 'Workshop_maintenance_walkway', 'Workshop_cable_trays']) {
        const object = workshop.getObjectByName(name);
        expect(object, name).toBeDefined();
        expect(bounds(object!).getSize(new THREE.Vector3()).length()).toBeGreaterThan(2);
      }
    } finally { disposeScene(scene); }
  });

  test('three projects are elevated stellar cores with soft halos, not flat badges or buildings', () => {
    const { scene } = createWorld();
    scene.updateMatrixWorld(true);
    try {
      const shore = scene.getObjectByName('Scene_gallery')!;
      for (const name of ['Gallery_facade', 'Gallery_pergola', 'Gallery_distant_city_lights', 'Transition_workshop_gallery_glass_corridor']) {
        expect(!!shore.getObjectByName(name), name).toBe(false);
      }
      for (const project of BOARDS.filter(board => board.kind === 'project')) {
        expect(!!shore.getObjectByName(`Board_${project.id}`)).toBe(false);
        const star = shore.getObjectByName(`Project_star_${project.id}`);
        expect(star, project.id).toBeDefined();
        expect(star!.getWorldPosition(new THREE.Vector3()).x).toBe(project.x);
        const core = star!.getObjectByName('Star_core') as THREE.Mesh;
        expect(core.geometry).toBeInstanceOf(THREE.SphereGeometry);
        const halo = star!.getObjectByName('Star_halo') as THREE.Mesh;
        expect(halo.material).toBeInstanceOf(THREE.ShaderMaterial);
        expect(star!.children.some(object => object instanceof THREE.Mesh && object.geometry instanceof THREE.CircleGeometry)).toBe(false);
        expect(bounds(core).min.y).toBeGreaterThan(4);
        expect(bounds(core).getSize(new THREE.Vector3()).x).toBeGreaterThan(.1);
        expect((core.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(1);
      }
    } finally { disposeScene(scene); }
  });

  test('the last project-to-lighthouse stretch is halved, with the boardwalk ending on supported ground', () => {
    const { scene } = createWorld();
    scene.updateMatrixWorld(true);
    try {
      const lastProject = BOARDS.filter(board => board.kind === 'project').at(-1)!;
      expect(ROAD.end - lastProject.x).toBe(9.5);
      const lighthouse = scene.getObjectByName('Coastal_lighthouse');
      expect(lighthouse).toBeDefined();
      const lighthouseBounds = bounds(lighthouse!);
      expect(lighthouseBounds.max.y).toBeGreaterThan(5);
      expect(Math.abs(lighthouseBounds.getCenter(new THREE.Vector3()).x - ROAD.end)).toBeLessThan(3);
      for (const name of ['Lighthouse_lantern', 'Lighthouse_beam', 'Sea', 'Coastal_path', 'Shore_rocks']) {
        expect(scene.getObjectByName(name), name).toBeDefined();
      }
      const path = scene.getObjectByName('Coastal_path')!;
      const pathBounds = bounds(path);
      expect(pathBounds.max.x).toBeGreaterThan(ROAD.end + .5);
      expect(pathBounds.max.x).toBeLessThan(ROAD.end + 2);
      expect(scene.getObjectByName('Coastal_path_end')).toBeDefined();
      expect(scene.getObjectByName('Sea_surface')).toBeDefined();
      expect(scene.getObjectByName('Coastal_tide_pools')).toBeDefined();
      let plankCount = 0;
      path.traverse(object => { if (object.name === 'Boardwalk_plank') plankCount++; });
      expect(plankCount).toBeGreaterThan(70);
      const ray = new THREE.Raycaster();
      for (const x of [44, 49, 55, 61, 70, ROAD.end]) {
        ray.set(new THREE.Vector3(x, .2, .6), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(scene, true)[0];
        expect(hit.point.y).toBeCloseTo(.035, 5);
      }
      for (const x of [ROAD.end + 2, ROAD.end + 5, 92]) {
        ray.set(new THREE.Vector3(x, .2, .6), new THREE.Vector3(0, -1, 0));
        expect(ray.intersectObject(path, true)).toHaveLength(0);
        const sand = ray.intersectObject(scene, true)[0];
        expect(sand.object.name).toBe('Gallery_ground');
        expect(sand.point.y).toBeLessThan(.035);
      }
    } finally { disposeScene(scene); }
  });
});

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('all five skill descriptions are readable on the cabinet glass, not separate floating cards, in three viewports', async () => {
  const screens = await runBrowser<Array<{ id: string; viewport: string; title: string; copy: string; readable: boolean; transparent: boolean; noCard: boolean }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)}, {wait:true,timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
    await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
    const key=type=>cdp('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const screens=[]
    try {
      for(const id of ['ai-agent','golang','docker-k8s','game-publishing-sdk','payment-platforms']) {
        let reached=false;await key('keyDown')
        try{for(let step=0;step<300;step++){await wait(.1);
          if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){await key('keyUp');await click('[data-door-id]');await wait(1);await key('keyDown');continue}
          if(await js('document.querySelector("[data-interaction-id]")?.dataset.interactionId')===id){reached=true;break}
        }}finally{await key('keyUp')}
        if(!reached)throw Error('Could not reach terminal '+id)
        await wait(.6)
        for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
          await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile:width!==1440,deviceScaleFactor:1})
          await cdp('Page.captureScreenshot',{format:'png'})
          const screen=await js('('+${JSON.stringify(`(id) => {
            const panel=[...document.querySelectorAll('.world-board')].find(e=>e.dataset.boardId===id);
            const title=panel.querySelector('h2'),p=panel.querySelector('p'),r=panel.getBoundingClientRect(),pr=p.getBoundingClientRect(),style=getComputedStyle(panel);
            return {id,viewport:innerWidth+'x'+innerHeight,title:title.innerText,copy:p.innerText,
              readable:getComputedStyle(panel).visibility==='visible'&&p.scrollHeight<=p.clientHeight+1&&pr.bottom<=r.bottom+1&&title.scrollHeight<=title.clientHeight+1,
              transparent:style.backgroundColor==='rgba(0, 0, 0, 0)',noCard:style.boxShadow==='none'&&style.borderTopWidth==='0px'};
          }`)}+')('+JSON.stringify(id)+')')
          screens.push(screen)
        }
        await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
        await cdp('Page.captureScreenshot',{format:'png'})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(screens))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(screens).toHaveLength(15);
  for (const screen of screens) {
    const board = BOARDS.find(board => board.id === screen.id)!;
    expect(screen.title).toBe(board.title.en);
    expect(screen.copy).toBe(board.summary.en);
    expect(screen.readable, `${screen.id} at ${screen.viewport}`).toBe(true);
    expect(screen.transparent).toBe(true);
    expect(screen.noCard).toBe(true);
  }
}, 120_000);

test('real NPC, skill and project prompts stay beside their targets instead of a fixed screen region', async () => {
  const results = await runBrowser<Array<{ kind: string; anchor: string; targetOffset: number; movement: number; inViewport: boolean }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)}, {wait:true,timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
    await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
    const key=(type,side='right')=>cdp('Input.dispatchKeyEvent',{type,key:side==='right'?'ArrowRight':'ArrowLeft',code:side==='right'?'ArrowRight':'ArrowLeft',windowsVirtualKeyCode:side==='right'?39:37})
    const sample=()=>js(${JSON.stringify(`(() => {
      const button=document.querySelector('.talk-prompt');
      if(!button)return null;
      const r=button.getBoundingClientRect(),reference=document.querySelector('.world-board[data-board-id="ai-agent"]').getBoundingClientRect();
      return {anchor:button.dataset.interactionId||'',x:r.x+r.width/2,bottom:r.bottom,referenceX:reference.x+reference.width/2,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};
    })()`)} )
    const results=[]
    try {
      for(const [kind,id,x] of [['npc','greeter',2],['skill','ai-agent',23],['project','0xbb.me',49]]){
        await key('keyDown');let reached=false
        try {for(let step=0;step<240;step++){await wait(.1);
          if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){await key('keyUp');await click('[data-door-id]');await wait(1);await key('keyDown');continue}
          const frame=await sample();if(frame?.anchor===id){reached=true;break}
        }}finally{await key('keyUp')}
        if(!reached)throw Error('World-anchored prompt not reached: '+id)
        await wait(.6);await cdp('Page.captureScreenshot',{format:'png'});const before=await sample()
        await key('keyDown');try{await wait(.22)}finally{await key('keyUp')};await wait(.6)
        await cdp('Page.captureScreenshot',{format:'png'});const after=await sample()
        results.push({kind,anchor:before.anchor,targetOffset:Math.abs(before.x-(before.referenceX+(x-23)*60)),movement:Math.abs(before.x-after.x),inViewport:before.inViewport&&after.inViewport})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(results))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(results.map(result => result.anchor)).toEqual(['greeter', 'ai-agent', '0xbb.me']);
  for (const result of results) {
    expect(result.targetOffset, result.kind).toBeLessThan(2);
    expect(result.movement, result.kind).toBeGreaterThan(10);
    expect(result.inViewport, result.kind).toBe(true);
  }
}, 90_000);
