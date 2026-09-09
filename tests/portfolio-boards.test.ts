import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { APP_DATA } from '../data';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';
import { runBrowser } from './browser';
import * as journeyModule from '../portfolio/journey';
import * as stateModule from '../portfolio/state';

const expectedSkills = ['AI Agent', 'Golang', 'Docker/k8s', 'Game Publishing SDK', 'Payment Platforms'];
const expectedProjects = ['0xbb.me', 'bb-spec', 'pi-subagent-cluster'];
const expectedProjectLinks = {
  '0xbb.me': ['https://0xbb.me', 'https://github.com/0xBB2B/0xbb.me'],
  'bb-spec': ['https://github.com/0xBB2B/bb-spec', 'https://github.com/0xBB2B/bb-spec'],
  'pi-subagent-cluster': ['https://pi.dev/packages/@0xbb2b/pi-subagent-cluster', 'https://github.com/0xBB2B/pi-subagent-cluster'],
} as const;

type Board = {
  id: (typeof journeyModule.BOARD_IDS)[number];
  kind: 'skill' | 'project';
  x: number;
  title: { en: string; zh: string };
  summary: { en: string; zh: string };
  detail: { en: string; zh: string };
  link?: string;
  repo?: string;
};
type PublicJourney = {
  id: 'town' | 'workshop' | 'gallery';
  start: number;
  end: number;
  npc: { id: 'greeter'; x: number } | null;
  boards: readonly Board[];
};
type BoardSession = ReturnType<typeof stateModule.createSession> & {
  nearbyBoard: string | null;
  boardId: string | null;
  reader: 'dialogue' | 'board' | 'overview' | null;
};

const journey = journeyModule.JOURNEY as unknown as readonly PublicJourney[];
const state = stateModule as typeof stateModule & {
  openBoard: (session: BoardSession) => boolean;
};

function allBoards() {
  return journey.flatMap(scene => scene.boards ?? []);
}

test('npc-dialogue/AC-7: board text follows the rendered camera, stays on its face, and adapts to both phone orientations', async () => {
  const observations = await runBrowser<Array<{ width: number; height: number; x: number; y: number; boardWidth: number; settledX: number; visible: boolean }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab('http://127.0.0.1:3000/', { wait: true, timeout: 20 })
    const key = type => cdp('Input.dispatchKeyEvent', { type, key:'ArrowRight', code:'ArrowRight', windowsVirtualKeyCode:39 })
    const sample = () => js(${JSON.stringify(`(() => { const r=document.querySelector('.world-board[data-board-id="ai-agent"]').getBoundingClientRect(); return {width:innerWidth,height:innerHeight,x:r.x+r.width/2,y:r.y+r.height/2,boardWidth:r.width,visible:getComputedStyle(document.querySelector('.world-board[data-board-id="ai-agent"]')).visibility==='visible'}; })()`)} )
    const results=[]
    try {
      await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
      await gotoAndWait('http://127.0.0.1:3000/',{timeout:20,settle:.5})
      let ready=false
      for(let step=0;step<100;step++){
        if(await js(${JSON.stringify('!!document.querySelector("canvas") && document.querySelector(\'button[aria-label="Move right"]\')?.disabled === false')})){ready=true;break}
        await wait(.1)
      }
      if(!ready)throw Error('Graphics and movement controls did not become ready')
      await key('keyDown')
      let reached=false
      try { for(let step=0;step<350;step++){await wait(.1);
        if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){await key('keyUp');await click('[data-door-id]');await wait(1);await key('keyDown');continue}
        if(await js(${JSON.stringify('!!document.querySelector(\'button[aria-label="View"]\')')})){reached=true;break}
      } }
      finally { await key('keyUp') }
      if(!reached)throw Error('First board was not reachable through normal walking: '+JSON.stringify(await js('({text:document.body.innerText,visibility:document.visibilityState})')))
      const moving=await sample();await wait(.8);results.push({...moving,settledX:(await sample()).x})
      for(const [width,height] of [[390,844],[844,390]]){
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await wait(.3)
        await cdp('Page.captureScreenshot',{format:'png'})
        const frame=await sample();results.push({...frame,settledX:frame.x})
      }
      await click('button[aria-label="View"]');await wait(.2)
      await click('button[aria-label="Close details"]');await click('button[aria-label="Language"]');await click('button[aria-label="查看"]');await wait(.2)
      await click('button[aria-label="关闭详情"]');await click('button[aria-label="语言"]')
      await cdp('Page.captureScreenshot',{format:'png'})
      const reopened=await sample();results.push({...reopened,settledX:reopened.x})
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(results))
    } finally {await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(observations[0].x - observations[0].settledX, 'labels must continue following camera easing after movement stops').toBeGreaterThan(4);
  const { scene } = createWorld();
  scene.updateMatrixWorld(true);
  const face = scene.getObjectByName('Board_ai-agent')!.children[1];
  const bounds = new THREE.Box3().setFromObject(face);
  try {
    for (const observation of observations) {
      const { width, height } = observation;
      expect(observation.visible, 'board labels must remain visible after closing a translated reading').toBe(true);
      const viewHeight = height < 500 ? 10 : 15;
      const target = width < 600 ? 3.8 : 3.5;
      const camera = new THREE.OrthographicCamera(-viewHeight * width / height / 2, viewHeight * width / height / 2, viewHeight / 2, -viewHeight / 2, .1, 120);
      camera.position.set(0, target + 5, 20);
      camera.lookAt(0, target, 0);
      camera.updateMatrixWorld(true);
      const point = bounds.getCenter(new THREE.Vector3());
      point.z = bounds.max.z;
      point.project(camera);
      expect(Math.abs(observation.y - (1 - point.y) * height / 2), `face alignment at ${width}×${height}`).toBeLessThan(1);
      expect(observation.boardWidth, `text cannot spill outside its carrier at ${width}×${height}`).toBeLessThanOrEqual((bounds.max.x - bounds.min.x) * height / viewHeight + 1);
    }
  } finally { disposeScene(scene); }
}, 75_000);

describe('one-NPC and eight-board public journey model', () => {
  test('world/AC-3: ground sections meet without overlapping faces and paving blends between scene materials', () => {
    const { scene } = createWorld();
    scene.updateMatrixWorld(true);
    try {
      const workshop = scene.getObjectByName('Workshop_ground') as THREE.Mesh;
      const gallery = scene.getObjectByName('Gallery_ground') as THREE.Mesh;
      expect(new THREE.Box3().setFromObject(workshop).max.x).toBe(journey[2].start);
      expect(new THREE.Box3().setFromObject(gallery).min.x).toBe(journey[2].start);
      for (const name of ['Workshop_ground', 'Gallery_ground', 'Journey_road']) {
        const mesh = scene.getObjectByName(name) as THREE.Mesh;
        const colors = mesh.geometry.getAttribute('color');
        expect(colors, `${name} has a real material transition rather than only a sky change`).toBeDefined();
        const distinct = new Set<string>();
        for (let i = 0; i < colors.count; i++) distinct.add([colors.getX(i), colors.getY(i), colors.getZ(i)].join(','));
        expect(distinct.size).toBeGreaterThan(5);
      }
    } finally { disposeScene(scene); }
  });

  test('world/AC-2 and npc-dialogue/AC-7: board faces are not hidden behind boundary houses, trees, or workshop equipment', () => {
    const { scene } = createWorld();
    scene.updateMatrixWorld(true);
    const towardCamera = new THREE.Vector3(0, 5, 20).normalize();
    const ray = new THREE.Raycaster();
    try {
      for (const board of allBoards().filter(board => board.kind === 'skill')) {
        const carrier = scene.getObjectByName(`Board_${board.id}`)!;
        const face = carrier.children[1] as THREE.Mesh;
        const bounds = new THREE.Box3().setFromObject(face);
        for (const u of [0.1, 0.5, 0.9]) for (const v of [0.1, 0.5, 0.9]) {
          const point = new THREE.Vector3(
            THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
            THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v), bounds.max.z,
          );
          ray.set(point.addScaledVector(towardCamera, 30), towardCamera.clone().negate());
          const hit = ray.intersectObject(scene, true).find(item => {
            const material = (item.object as THREE.Mesh).material as THREE.Material;
            return !material.transparent || material.opacity >= 1;
          });
          expect(hit?.object === face, `${board.id} visible face at ${u}/${v}; blocked by ${hit?.object.parent?.name}`).toBe(true);
        }
      }
    } finally { disposeScene(scene); }
  });
  test('world/AC-1 and npc-dialogue/AC-3: ordered scenes expose only the town greeter, then five skill and three project boards', () => {
    expect(journey.map(scene => scene.id)).toEqual(['town', 'workshop', 'gallery']);
    expect(journey.map(scene => scene.npc?.id ?? null)).toEqual(['greeter', null, null]);
    expect(journey.map(scene => scene.boards?.length ?? 0)).toEqual([0, 5, 3]);
    expect(allBoards().map(board => board.title.en)).toEqual([...expectedSkills, ...expectedProjects]);
    expect(allBoards().map(board => board.kind)).toEqual([
      'skill', 'skill', 'skill', 'skill', 'skill', 'project', 'project', 'project',
    ]);
  });

  test('npc-dialogue/AC-7: board positions are unique, belong to their scene, and interaction ranges never overlap', () => {
    for (const scene of journey) {
      for (const board of scene.boards ?? []) {
        expect(board.x).toBeGreaterThanOrEqual(scene.start);
        expect(board.x).toBeLessThanOrEqual(scene.end);
      }
    }
    const boards = [...allBoards()].sort((a, b) => a.x - b.x);
    expect(new Set(boards.map(board => board.id)).size).toBe(8);
    for (let index = 1; index < boards.length; index++) {
      expect(boards[index].x - boards[index - 1].x).toBeGreaterThan(2 * journeyModule.INTERACTION_DISTANCE);
    }
  });

  test('profile-overview/AC-2: five localized skills describe confirmed practice without rating fields or rating copy', () => {
    expect(APP_DATA.skills.map(skill => skill.name)).toEqual(expectedSkills);
    for (const skill of APP_DATA.skills as Array<Record<string, unknown>>) {
      expect(skill).not.toHaveProperty('level');
      expect(skill).toHaveProperty('summary');
      expect(skill).toHaveProperty('detail');
      const visibleCopy = JSON.stringify(skill);
      expect(visibleCopy).not.toMatch(/(?:\b(?:level|rating|score)\b|等级|评级|评分|\d+\s*%)/i);
      expect((skill.summary as Record<string, string>).en.length).toBeGreaterThan(12);
      expect((skill.summary as Record<string, string>).zh.length).toBeGreaterThan(6);
      expect((skill.detail as Record<string, string>).en.length).toBeGreaterThan((skill.summary as Record<string, string>).en.length);
      expect((skill.detail as Record<string, string>).zh.length).toBeGreaterThan((skill.summary as Record<string, string>).zh.length);
    }
    expect(journey[1].boards.map(board => board.summary)).toEqual(APP_DATA.skills.map(skill => skill.summary));
  });

  test('npc-dialogue/AC-3 and AC-7: each project board owns the frozen visit/source links and bilingual non-dialogue copy', () => {
    const projectBoards = journey[2].boards;
    expect(projectBoards.map(board => board.title.en)).toEqual(expectedProjects);
    for (const board of projectBoards) {
      expect([board.link, board.repo]).toEqual([...expectedProjectLinks[board.id as keyof typeof expectedProjectLinks]]);
      expect(board.summary.en.length).toBeGreaterThan(12);
      expect(board.summary.zh.length).toBeGreaterThan(6);
      expect(board.detail.en).toBe(APP_DATA.projects.find(project => project.id === board.id)?.description.en);
      expect(board.detail.zh).toBe(APP_DATA.projects.find(project => project.id === board.id)?.description.zh);
      expect(`${board.summary.en} ${board.detail.en} ${board.summary.zh} ${board.detail.zh}`).not.toMatch(/mentor|curator|导师|策展人/i);
    }
  });

  test('npc-dialogue/AC-7 and player/AC-6: nearby board opens explicitly, locks its identity, pauses, and closes without latent walking', () => {
    const first = journey[1].boards[0];
    const second = journey[1].boards[1];
    const session = stateModule.createSession() as BoardSession;

    session.x = first.x - journeyModule.INTERACTION_DISTANCE - 0.0001;
    stateModule.updateProximity(session);
    expect(session.nearbyBoard).toBeNull();
    expect(state.openBoard(session)).toBe(false);

    session.x = first.x - journeyModule.INTERACTION_DISTANCE;
    stateModule.updateProximity(session);
    expect(session.nearbyBoard).toBe(first.id);
    expect(session.reader).toBeNull();
    expect(state.openBoard(session)).toBe(true);
    expect(session.reader).toBe('board');
    expect(session.boardId).toBe(first.id);
    expect(session.paused).toBe(true);

    stateModule.advance(session, 1, 1);
    expect(session.x).toBe(first.x - journeyModule.INTERACTION_DISTANCE);
    session.x = second.x;
    stateModule.updateProximity(session);
    stateModule.setLanguage(session, 'zh');
    expect(session.boardId).toBe(first.id);
    expect(session.reader).toBe('board');

    stateModule.closeReader(session);
    expect(session.reader).toBeNull();
    expect(session.boardId).toBeNull();
    expect(session.walking).toBe(false);
  });

  test('npc-dialogue/AC-7: dialogue, board detail, and overview are mutually exclusive and board details can be reopened', () => {
    const board = journey[1].boards[0];
    const session = stateModule.createSession() as BoardSession;
    session.x = board.x;
    stateModule.updateProximity(session);
    expect(stateModule.openOverview(session)).toBe(true);
    expect(state.openBoard(session)).toBe(false);
    stateModule.closeReader(session);
    expect(state.openBoard(session)).toBe(true);
    expect(stateModule.openOverview(session)).toBe(false);
    expect(stateModule.openDialogue(session)).toBe(false);
    stateModule.closeReader(session);
    stateModule.updateProximity(session);
    expect(state.openBoard(session)).toBe(true);
    expect(session.boardId).toBe(board.id);
  });
});
