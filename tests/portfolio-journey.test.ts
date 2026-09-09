import { beforeAll, describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { createCharacter } from '../portfolio/character';
import { BOARDS, JOURNEY, ROAD } from '../portfolio/journey';
import { advance, closeReader, createSession, openDialogue, openNearbyDoor, setDialoguePage, type Session } from '../portfolio/state';
import { createWorld } from '../portfolio/world';
import { runBrowser } from './browser';

const sceneIds = ['town', 'workshop', 'gallery'] as const;
const boardNames = ['AI Agent', 'Golang', 'Docker/k8s', 'Game Publishing SDK', 'Payment Platforms', '0xbb.me', 'bb-spec', 'pi-subagent-cluster'];
const move = (session: Session, direction: -1 | 0 | 1, seconds: number) => {
  if (direction && session.nearbyDoor) openNearbyDoor(session);
  advance(session, direction, seconds);
};
const boundsOf = (object: THREE.Object3D) => new THREE.Box3().setFromObject(object);
const overlapsHorizontally = (a: THREE.Box3, b: THREE.Box3) =>
  a.max.x > b.min.x && a.min.x < b.max.x && a.max.z > b.min.z && a.min.z < b.max.z;

describe('public one-NPC three-scene journey model', () => {
  test('world/AC-1 and npc-dialogue/AC-3: walking left-to-right exposes three scenes, one greeter, and eight ordered boards', () => {
    const session = createSession();
    const seenScenes: string[] = [];
    const seenNpcs: string[] = [];
    const seenBoards: string[] = [];
    for (let step = 0; step < 800 && session.x < ROAD.end; step++) {
      if (seenScenes.at(-1) !== session.scene) seenScenes.push(session.scene);
      if (session.nearbyNpc && !seenNpcs.includes(session.nearbyNpc)) seenNpcs.push(session.nearbyNpc);
      if (session.nearbyBoard && !seenBoards.includes(session.nearbyBoard)) seenBoards.push(session.nearbyBoard);
      move(session, 1, 0.05);
    }
    expect(seenScenes).toEqual([...sceneIds]);
    expect(seenNpcs).toEqual(['greeter']);
    expect(seenBoards).toEqual(BOARDS.map(board => board.id));
    expect(session.x).toBe(ROAD.end);
    for (let step = 0; step < 800 && session.x > ROAD.start; step++) move(session, -1, 0.05);
    expect(session.x).toBe(ROAD.start);
    expect(session.scene).toBe('town');
  });

  test('world/AC-3 and AC-4: both boundaries are reversible without reset, gaps, or discontinuous coordinates', () => {
    const session = createSession();
    const transitions: string[] = [];
    let previousScene = session.scene;
    let previousX = session.x;
    for (let step = 0; step < 800 && transitions.length < 2; step++) {
      move(session, 1, 0.05);
      if (session.x !== previousX) expect(session.x - previousX).toBeCloseTo(0.16, 5);
      if (session.scene !== previousScene) {
        const nextScene = session.scene;
        transitions.push(`${previousScene}->${nextScene}`);
        for (let round = 0; round < 3; round++) {
          const boundaryX = session.x;
          move(session, 0, 0.5);
          expect(session.x).toBe(boundaryX);
          move(session, -1, 0.1);
          expect(session.scene).toBe(previousScene);
          move(session, 1, 0.1);
          expect(session.scene).toBe(nextScene);
          expect(session.x).toBeCloseTo(boundaryX, 5);
        }
        previousScene = nextScene;
      }
      previousScene = session.scene;
      previousX = session.x;
    }
    expect(transitions).toEqual(['town->workshop', 'workshop->gallery']);
  });

  test('npc-dialogue/AC-3 and bilingual/AC-3: only the greeter owns a three-page dialogue and translation preserves its page', () => {
    const session = createSession();
    session.x = 2;
    move(session, 0, 0);
    expect(openDialogue(session)).toBe(true);
    expect(session.dialogueNpc).toBe('greeter');
    setDialoguePage(session, 99);
    expect(session.dialoguePage).toBe(2);
    const openedAt = session.x;
    session.language = 'zh';
    expect(session.dialoguePage).toBe(2);
    expect(session.x).toBe(openedAt);
    closeReader(session);
    session.x = JOURNEY[1].start + 2;
    move(session, 0, 0);
    expect(session.nearbyNpc).toBeNull();
    expect(openDialogue(session)).toBe(false);
  });

  test('world/AC-2, AC-3 and AC-5: world geometry forms the data factory, embedded terminals, project stars, and a seaside lighthouse without extra NPCs', () => {
    const world = createWorld();
    for (const scene of sceneIds) {
      const group = world.scene.getObjectByName(`Scene_${scene}`);
      expect(group, `${scene} scene group`).toBeDefined();
      const meshes: THREE.Mesh[] = [];
      group!.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
      expect(meshes.length, `${scene} is geometry rather than a color filter`).toBeGreaterThan(30);
      expect(new Set(meshes.map(mesh => Math.round(mesh.position.z))).size, `${scene} has depth`).toBeGreaterThanOrEqual(3);
      expect(meshes.some(mesh => mesh.castShadow)).toBe(true);
      expect(meshes.some(mesh => mesh.receiveShadow)).toBe(true);
    }
    expect(world.scene.getObjectByName('NPC_greeter')).toBeDefined();
    expect(world.scene.getObjectByName('NPC_mentor')).toBeUndefined();
    expect(world.scene.getObjectByName('NPC_curator')).toBeUndefined();
    for (const board of BOARDS) expect(world.scene.getObjectByName(`${board.kind === 'skill' ? 'Board' : 'Project_star'}_${board.id}`), board.id).toBeDefined();
    for (const landmark of [
      'Factory_room', 'Room_door_town-door', 'Room_door_sea-door', 'Workshop_hall', 'Workshop_data_core',
      'Workshop_maintenance_walkway', 'Workshop_workbench', 'Workshop_connected_pipe',
      'Workshop_server_racks', 'Workshop_cooling_tanks', 'Workshop_cable_trays',
      'Coastal_starfield', 'Sea', 'Coastal_path', 'Coastal_lighthouse', 'Lighthouse_lantern', 'Shore_rocks',
    ]) expect(world.scene.getObjectByName(landmark), landmark).toBeDefined();
  });

  test('world/AC-2, AC-3 and AC-5: the connected walking surface supports frozen soles throughout the expanded journey', () => {
    const world = createWorld();
    world.scene.updateMatrixWorld(true);
    const road = world.scene.getObjectByName('Journey_road') as THREE.Mesh;
    const roadBounds = boundsOf(road);
    expect(roadBounds.max.x).toBeCloseTo(boundsOf(world.scene.getObjectByName('Coastal_path')!).min.x, 5);
    expect(roadBounds.max.y).toBeCloseTo(0.035, 6);

    const town = world.scene.getObjectByName('Scene_town')!;
    const paving: THREE.Box3[] = [];
    town.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.BoxGeometry)) return;
      const bounds = boundsOf(object);
      const size = bounds.getSize(new THREE.Vector3());
      if (Math.abs(size.x - 0.77) < 1e-5 && Math.abs(size.y - 0.1) < 1e-5 && Math.abs(size.z - 0.7) < 1e-5) paving.push(bounds);
    });
    expect(paving).toHaveLength(6 * 39);
    expect(paving.every(stone => !overlapsHorizontally(stone, roadBounds))).toBe(true);

    const camera = new THREE.OrthographicCamera();
    camera.position.set(0, 8.5, 20);
    camera.lookAt(0, 3.5, 0);
    camera.updateMatrixWorld(true);
    const character = createCharacter();
    const supportMeshes = [roadBounds, ...paving, boundsOf(world.scene.getObjectByName('Coastal_path')!)];
    try {
      const samples = [ROAD.start, 2, 19.9, 20.1, ...BOARDS.map(board => board.x), 43.9, 44.1, 70, ROAD.end];
      const session = createSession();
      for (const x of samples) {
        session.x = x;
        session.walking = false;
        character.update(session, camera);
        for (const leg of ['Left_leg', 'Right_leg']) {
          const sole = boundsOf(character.root.getObjectByName(leg)!.getObjectByName('Platform_sole')!);
          const supportTop = Math.max(...supportMeshes.filter(surface => overlapsHorizontally(surface, sole)).map(surface => surface.max.y));
          expect(supportTop, `support at ${x}`).toBeCloseTo(0.035, 6);
          expect(sole.min.y - supportTop, `sole at ${x}`).toBeCloseTo(0, 6);
        }
      }
    } finally { character.dispose(); }
  });

  test('world/AC-2, AC-3 and AC-5: visible foreground and background ground continue past the seaside endpoint viewport', () => {
    const world = createWorld();
    world.scene.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    for (const x of [ROAD.start, 19.8, 20.2, 43.8, 44.2, 61, 70, ROAD.end, 92]) {
      for (const z of [-10, 0.4, 10]) {
        raycaster.set(new THREE.Vector3(x, 0.2, z), new THREE.Vector3(0, -1, 0));
        raycaster.near = 0;
        raycaster.far = 0.5;
        const hit = raycaster.intersectObject(world.scene, true)[0];
        expect(hit, `ground at ${x}/${z}`).toBeDefined();
        expect(hit.point.y).toBeLessThanOrEqual(0.035001);
      }
    }
  });

  test('world/AC-5: the lighthouse and shore remain in-frame without a bare endpoint in desktop or portrait', () => {
    const world = createWorld();
    world.scene.updateMatrixWorld(true);
    const desktopHalfVisibleWorld = 15 * (1440 / 900) / 2;
    const viewportEdge = ROAD.end + desktopHalfVisibleWorld;
    const pathEnd = boundsOf(world.scene.getObjectByName('Coastal_path')!).max.x;
    expect(pathEnd).toBeGreaterThan(ROAD.end + .5);
    expect(pathEnd).toBeLessThan(ROAD.end + 2);
    expect(boundsOf(world.scene.getObjectByName('Gallery_ground')!).max.x).toBeGreaterThan(viewportEdge);
    const lighthouseBounds = boundsOf(world.scene.getObjectByName('Coastal_lighthouse')!);
    const portraitHalfVisibleWorld = 15 * (390 / 844) / 2;
    expect(lighthouseBounds.min.x).toBeGreaterThan(ROAD.end - portraitHalfVisibleWorld);
    expect(lighthouseBounds.max.x).toBeLessThan(ROAD.end + portraitHalfVisibleWorld);
    expect(boundsOf(world.scene.getObjectByName('Sea')!).max.x).toBeGreaterThan(viewportEdge);
  });

  test('world/AC-3: environment changes continuously from warm town through cyan workshop to night gallery', () => {
    const world = createWorld();
    const colors: number[] = [];
    for (let x = ROAD.start; x <= ROAD.end; x += 1) {
      world.updateEnvironment(x);
      colors.push((world.scene.background as THREE.Color).getHex());
    }
    expect(new Set(colors).size).toBeGreaterThan(20);
    expect(colors[0]).not.toBe(colors.at(-1));
    for (let index = 1; index < colors.length; index++) {
      const before = new THREE.Color(colors[index - 1]);
      const after = new THREE.Color(colors[index]);
      expect(Math.hypot(before.r - after.r, before.g - after.g, before.b - after.b)).toBeLessThan(0.18);
    }
  });
});

const url = 'http://127.0.0.1:3000/';
const viewports = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true },
  { width: 844, height: 390, mobile: true },
];
type BrowserJourney = {
  urlStable: boolean;
  canvasStable: boolean;
  scenes: string[];
  boardIds: string[];
  doorIds: string[];
  boardCopy: Record<string, { en: string; zh: string; links: string[] }>;
  speakers: string[];
  boundaryFrames: Array<{ labels: string[]; hashes: string[] }>;
  returnedScenes: string[];
  endHashes: string[];
};
let browserJourneys: BrowserJourney[];

beforeAll(async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.status, 'Public homepage prerequisite').toBe(200);
  browserJourneys = await runBrowser<BrowserJourney[]>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)}, { wait: true, timeout: 20 })
    const journeys = []
    const key = async (type, key, code, vk) => cdp('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk })
    const snapshot = async () => {
      const frame = await js(${JSON.stringify(`(() => {
        const visible = element => { const s=getComputedStyle(element),r=element.getBoundingClientRect(); return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth };
        const controls=[...document.querySelectorAll('button')].filter(visible).map(button=>{const r=button.getBoundingClientRect();return {label:button.getAttribute('aria-label')||button.textContent.trim(),x:r.x+r.width/2,y:r.y+r.height/2,disabled:button.disabled}});
        const dialog=[...document.querySelectorAll('dialog[open]')].find(visible);
        return {url:location.href,canvasCount:[...document.querySelectorAll('canvas')].filter(visible).length,scene:document.querySelector('[aria-label="Current scene"]')?.textContent.trim()||'',controls,
          doorId:document.querySelector('[data-door-id]')?.getAttribute('data-door-id')||null,
          dialogue:dialog?.innerText||'',boardId:dialog?.querySelector('[data-board-id]')?.getAttribute('data-board-id')||null,
          links:[...(dialog?.querySelectorAll('a')||[])].map(a=>a.href),visibleBoards:[...document.querySelectorAll('.world-board')].filter(visible).map(e=>({id:e.getAttribute('data-board-id'),text:e.innerText}))};
      })()`)} )
      const {data}=await cdp('Page.captureScreenshot',{format:'png'});let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data.charCodeAt(i),16777619);frame.hash=String(hash>>>0);return frame
    }
    const control=(frame,pattern)=>frame.controls.find(item=>pattern.test(item.label))
    const activate=async item=>{if(!item||item.disabled)return false;await click([item.x,item.y]);await wait(.2);return true}
    const direction={right:['ArrowRight','ArrowRight',39,/^(Move right|向右)$/i],left:['ArrowLeft','ArrowLeft',37,/^(Move left|向左)$/i]}
    const hold=async(frame,mobile,side)=>{const i=direction[side];if(mobile){const b=control(frame,i[3]);await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x,y:b.y}]})}else await key('keyDown',i[0],i[1],i[2])}
    const release=async(mobile,side)=>{const i=direction[side];if(mobile)await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await key('keyUp',i[0],i[1],i[2])}
    try {
      for(const viewport of ${JSON.stringify(viewports)}){
        await cdp('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1});await cdp('Emulation.setTouchEmulationEnabled',{enabled:viewport.mobile});await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:.5})
        const firstDocument=await cdp('DOM.getDocument',{depth:0});const firstQuery=await cdp('DOM.querySelector',{nodeId:firstDocument.root.nodeId,selector:'canvas'});const firstCanvas=await cdp('DOM.describeNode',{nodeId:firstQuery.nodeId})
        let frame=await snapshot(),previousScene=frame.scene;const scenes=[frame.scene],boardIds=[],doorIds=[],boardCopy={},speakers=[],boundaryFrames=[]
        await hold(frame,viewport.mobile,'right')
        try {
          for(let step=0;step<260&&boardIds.length<8;step++){
            await wait(.2);frame=await snapshot()
            const door=control(frame,/^(Open & (enter|exit)|开门进入|开门离开)$/i)
            if(door){
              await release(viewport.mobile,'right');doorIds.push(frame.doorId)
              if(viewport.mobile)await activate(door);else{await key('keyDown','e','KeyE',69);await key('keyUp','e','KeyE',69)}
              await wait(1);frame=await snapshot();await hold(frame,viewport.mobile,'right');continue
            }
            if(frame.scene&&frame.scene!==scenes.at(-1)){
              scenes.push(frame.scene);await release(viewport.mobile,'right');const labels=[previousScene,frame.scene],hashes=[frame.hash]
              for(let round=0;round<3;round++){await hold(frame,viewport.mobile,'left');await wait(.3);await release(viewport.mobile,'left');frame=await snapshot();labels.push(frame.scene);hashes.push(frame.hash);await hold(frame,viewport.mobile,'right');await wait(.3);await release(viewport.mobile,'right');frame=await snapshot();labels.push(frame.scene);hashes.push(frame.hash)}
              boundaryFrames.push({labels,hashes});previousScene=frame.scene;await hold(frame,viewport.mobile,'right')
            }
            const talk=control(frame,/^(Talk|交谈)$/i),view=control(frame,/^(View|查看)$/i)
            if(talk&&speakers.length===0){await release(viewport.mobile,'right');if(viewport.mobile)await activate(talk);else{await key('keyDown','e','KeyE',69);await key('keyUp','e','KeyE',69);await wait(.2)}frame=await snapshot();speakers.push(frame.dialogue);await activate(control(frame,/Close introduction|关闭介绍/i));frame=await snapshot();await hold(frame,viewport.mobile,'right');continue}
            if(view){await release(viewport.mobile,'right');if(viewport.mobile)await activate(view);else{await key('keyDown','e','KeyE',69);await key('keyUp','e','KeyE',69);await wait(.2)}frame=await snapshot();const id=frame.boardId
              if(id&&!boardIds.includes(id)){
                boardIds.push(id);boardCopy[id]={en:frame.dialogue,zh:'',links:[...frame.links]}
                await activate(control(frame,/Close details|关闭详情/i));frame=await snapshot()
                await activate(control(frame,/^(Language|语言)$/i));frame=await snapshot()
                await activate(control(frame,/^(View|查看)$/i));frame=await snapshot();boardCopy[id].zh=frame.dialogue;boardCopy[id].links.push(...frame.links)
                await activate(control(frame,/Close details|关闭详情/i));frame=await snapshot()
                await activate(control(frame,/^(Language|语言)$/i));frame=await snapshot()
                await activate(control(frame,/^(View|查看)$/i));frame=await snapshot()
              }
              await activate(control(frame,/Close details|关闭详情/i));frame=await snapshot();await hold(frame,viewport.mobile,'right')
            }
          }
          await wait(7)
        } finally {await release(viewport.mobile,'right')}
        const endHashes=[];frame=await snapshot();endHashes.push(frame.hash);await wait(.5);frame=await snapshot();endHashes.push(frame.hash)
        const returnedScenes=[frame.scene];await hold(frame,viewport.mobile,'left');try{for(let step=0;step<320&&!/Dusk town|黄昏小镇/.test(returnedScenes.at(-1));step++){await wait(.2);frame=await snapshot();if(frame.scene!==returnedScenes.at(-1))returnedScenes.push(frame.scene)}}finally{await release(viewport.mobile,'left')}
        const lastDocument=await cdp('DOM.getDocument',{depth:0});const lastQuery=await cdp('DOM.querySelector',{nodeId:lastDocument.root.nodeId,selector:'canvas'});const lastCanvas=await cdp('DOM.describeNode',{nodeId:lastQuery.nodeId})
        journeys.push({urlStable:frame.url===${JSON.stringify(url)},canvasStable:firstCanvas.node.backendNodeId===lastCanvas.node.backendNodeId&&frame.canvasCount===1,scenes,boardIds,doorIds,boardCopy,speakers,boundaryFrames,returnedScenes,endHashes})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(journeys))
    } finally {await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
}, 420_000);

for (const [index, viewport] of viewports.entries()) {
  test(`world/AC-1..5: ${viewport.width}×${viewport.height} crosses, reads, reaches the lighthouse, and returns on one page/canvas`, () => {
    const journey = browserJourneys[index];
    expect(journey.urlStable).toBe(true);
    expect(journey.canvasStable).toBe(true);
    expect(journey.scenes).toEqual(['Dusk town', 'Tech workshop', 'Starlit shore']);
    expect(journey.boundaryFrames).toHaveLength(2);
    for (const boundary of journey.boundaryFrames) {
      expect(new Set(boundary.labels).size).toBe(2);
      expect(new Set(boundary.hashes).size).toBeGreaterThan(2);
    }
    expect(journey.boardIds).toEqual(BOARDS.map(board => board.id));
    expect(journey.doorIds).toEqual(['town-door', 'sea-door']);
    expect(journey.returnedScenes).toEqual(['Starlit shore', 'Tech workshop', 'Dusk town']);
    expect(journey.endHashes).toHaveLength(2);
  });

  test(`npc-dialogue/AC-3 and AC-7: ${viewport.width}×${viewport.height} has one greeter and eight bilingual board-owned readings`, () => {
    const journey = browserJourneys[index];
    expect(journey.speakers).toHaveLength(1);
    expect(journey.speakers[0]).toMatch(/NPC.*(?:GREETER|迎宾者)/s);
    expect(journey.speakers[0]).not.toMatch(/FUBUKI_BB|Tokyo|Shanghai/);
    const readings = Object.values(journey.boardCopy);
    expect(readings).toHaveLength(8);
    const english = readings.map(reading => reading.en).join('\n');
    const chinese = readings.map(reading => reading.zh).join('\n');
    for (const name of boardNames) expect(english).toContain(name);
    expect(chinese).toMatch(/AI 智能体/);
    expect(chinese).toMatch(/游戏发行 SDK/);
    expect(`${english}\n${chinese}`).not.toMatch(/mentor|curator|导师|策展人|\b(?:level|rating|score)\b|等级|评级|评分|\d+\s*%/i);
    expect(new Set(readings.flatMap(reading => reading.links))).toEqual(new Set([
      'https://0xbb.me/', 'https://github.com/0xBB2B/0xbb.me', 'https://github.com/0xBB2B/bb-spec',
      'https://pi.dev/packages/@0xbb2b/pi-subagent-cluster', 'https://github.com/0xBB2B/pi-subagent-cluster',
    ]));
  });
}
