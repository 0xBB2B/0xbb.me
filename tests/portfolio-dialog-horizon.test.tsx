import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { BoardDetails } from '../components/portfolio/BoardDetails';
import { Dialogue } from '../components/portfolio/Dialogue';
import { Overview } from '../components/portfolio/Overview';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';
import { BOARDS } from '../portfolio/journey';
import { runBrowser } from './browser';

const noop = () => {};
const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('language controls exist only on the homepage, never while a reading panel is open, in three viewports', async () => {
  const frames = await runBrowser<Array<{ kind: string; languageButtons: number; text: string; overflow: number }>>(`
    await navigate(${JSON.stringify(url)},{timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
    await navigate(${JSON.stringify(url)},{timeout:20,settle:1})
    const key=type=>cdp('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const frames=[]
    const inspect=async kind=>{
      for(const [width,height] of [[1440,900],[390,844],[844,390]]){
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile:width!==1440,deviceScaleFactor:1})
        await cdp('Page.captureScreenshot',{format:'png'})
        const frame=await js(${JSON.stringify(`(() => {
          const dialog=document.querySelector('dialog[open]');
          return {languageButtons:[...document.querySelectorAll('button')].filter(b=>/^(Language|语言)$/.test(b.getAttribute('aria-label')||'')).length,
            text:dialog.innerText,overflow:document.documentElement.scrollWidth-innerWidth};
        })()`)} )
        frames.push({kind,...frame})
      }
    }
    const reach=async selector=>{
      await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1});await cdp('Page.captureScreenshot',{format:'png'})
      await key('keyDown');let found=false
      try{for(let i=0;i<300;i++){await wait(.1);
        if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){await key('keyUp');await click('[data-door-id]');await wait(1);await key('keyDown');continue}
        if(await js('!!document.querySelector('+JSON.stringify(selector)+')')){found=true;break}
      }}finally{await key('keyUp')};if(!found)throw Error('Reading checkpoint not reached: '+selector)
      await wait(.6)
    }
    try{
      await click('button[aria-label="Quick overview"]');await wait(.3);await inspect('overview');await click('button[aria-label="Back to town"]')
      await reach('button[aria-label="Talk"]');await click('button[aria-label="Talk"]');await wait(.3);await inspect('npc');await click('button[aria-label="Close introduction"]')
      await reach('button[aria-label="View"]');await click('button[aria-label="View"]');await wait(.3);await inspect('details');await click('button[aria-label="Close details"]')
      await click('button[aria-label="Language"]');await click('button[aria-label="查看"]');await wait(.3);await inspect('details-zh');await click('button[aria-label="关闭详情"]')
      if(await js(${JSON.stringify('document.querySelectorAll(\'button[aria-label="语言"]\').length')})!==1)throw Error('Homepage language control not restored')
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(frames))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(frames).toHaveLength(12);
  for (const frame of frames) {
    expect(frame.languageButtons, frame.kind).toBe(0);
    expect(frame.text).not.toMatch(/EN \/ 中|中 \/ EN/);
    if (frame.kind === 'details-zh') expect(frame.text).toContain('AI 智能体');
    expect(frame.overflow, frame.kind).toBe(0);
  }
}, 100_000);

test('reading panels have no local language control', () => {
  const panels = [
    renderToStaticMarkup(<BoardDetails open boardId="bb-spec" language="en" onClose={noop} />),
    renderToStaticMarkup(<Dialogue open npc="greeter" language="en" page={0} onPage={noop} onClose={noop} />),
    renderToStaticMarkup(<Overview open language="en" onClose={noop} />),
  ];
  for (const html of panels) {
    expect(html).not.toContain('aria-label="Language"');
    expect(html).not.toContain('EN / 中');
  }
});

test('the complete project halos stay above the actual water horizon in every supported viewport', () => {
  const { scene } = createWorld(); scene.updateMatrixWorld(true);
  try {
    const water = scene.getObjectByName('Sea_surface') as THREE.Mesh;
    const waterBounds = new THREE.Box3().setFromObject(water);
    for (const groundName of ['Gallery_ground', 'Room_exterior_ground']) {
      expect(new THREE.Box3().setFromObject(scene.getObjectByName(groundName)!).min.z,
        `${groundName} must not appear as a strip beyond the horizon`).toBeGreaterThan(waterBounds.min.z);
    }
    for (const [width, height] of [[1440,900], [390,844], [844,390], [3456,1440]]) {
      const viewHeight = height < 500 ? 10 : 15, targetHeight = width < 600 ? 3.8 : 3.5;
      const camera = new THREE.OrthographicCamera(-viewHeight * width / height / 2, viewHeight * width / height / 2, viewHeight / 2, -viewHeight / 2, .1, 120);
      camera.position.set(55, targetHeight + 5, 20); camera.lookAt(55, targetHeight, 0); camera.updateMatrixWorld(true);
      const horizon = new THREE.Vector3(55, waterBounds.max.y + .01, waterBounds.min.z).project(camera);
      const horizonY = (1 - horizon.y) * height / 2;
      for (const board of BOARDS.filter(board => board.kind === 'project')) {
        const halo = scene.getObjectByName(`Project_star_${board.id}`)!.getObjectByName('Star_halo')!;
        const bounds = new THREE.Box3().setFromObject(halo);
        const bottom = new THREE.Vector3(board.x, bounds.min.y, bounds.max.z).project(camera);
        expect((1 - bottom.y) * height / 2 + 12, `${board.id} at ${width}x${height}`).toBeLessThan(horizonY);
      }
    }
  } finally { disposeScene(scene); }
});

test('the exterior wall joins both side walls without a daylight slit next to the corner column', () => {
  const { scene } = createWorld(); scene.updateMatrixWorld(true);
  try {
    const exterior = scene.getObjectByName('Room_exterior')!;
    const ray = new THREE.Raycaster();
    for (const x of [20.16,20.3,20.5,43.5,43.7,43.84]) for (const y of [.5,2,4,6]) {
      ray.set(new THREE.Vector3(x,y,6),new THREE.Vector3(0,0,-1));
      expect(ray.intersectObject(exterior,true).length, `continuous facade at ${x}/${y}`).toBeGreaterThan(0);
    }
  } finally { disposeScene(scene); }
});
