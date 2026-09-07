import { beforeAll, describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { createGreeter } from '../portfolio/scenes/town';
import {
  GREETER_X, INTERACTION_DISTANCE, closeReader, createSession, openDialogue, openOverview, updateProximity,
} from '../portfolio/state';
import { runBrowser } from './browser';

const url = 'http://127.0.0.1:3000/';
const viewports = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true },
  { width: 844, height: 390, mobile: true },
];

type Control = { label: string; x: number; y: number; disabled: boolean };
type Link = { label: string; href: string };
type Frame = {
  text: string;
  scene: string | null;
  prompt: Control | null;
  dialogue: string | null;
  overview: string | null;
  page: string | null;
  controls: Control[];
  links: Link[];
  canvas: string;
};
type Journey = {
  initial: Frame;
  overviewEn: Frame;
  overviewZh: Frame;
  near: Frame;
  first: Frame;
  second: Frame;
  translatedSecond: Frame;
  third: Frame;
  paused: Frame;
  closedAfterHeldInput: Frame;
  freshMovement: Frame;
  rereadReady: Frame;
  rereadActivated: boolean;
  reread: Frame;
  escaped: Frame;
  far: Frame;
  ignored: Frame;
  refreshed: Frame;
};
let journeys: Journey[];
let modelPreviewText = '';

describe('public greeter interaction model', () => {
  test('npc-dialogue/AC-1, AC-5: the 1.8-unit boundary is inclusive and outside interaction is ignored', () => {
    const session = createSession();
    session.x = GREETER_X - INTERACTION_DISTANCE;
    updateProximity(session);
    expect(session.nearbyNpc).toBe(true);
    expect(openDialogue(session)).toBe(true);
    closeReader(session);
    session.x = GREETER_X + INTERACTION_DISTANCE + 0.0001;
    updateProximity(session);
    expect(session.nearbyNpc).toBe(false);
    expect(openDialogue(session)).toBe(false);
  });

  test('npc-dialogue/AC-4: overview and dialogue cannot replace one another', () => {
    const session = createSession();
    session.x = GREETER_X;
    updateProximity(session);
    expect(openOverview(session)).toBe(true);
    expect(openDialogue(session)).toBe(false);
    expect(session.reader).toBe('overview');
  });

  test('npc-dialogue/AC-6: the greeter is grounded Minecraft-style box geometry with all body parts', () => {
    const greeter = createGreeter();
    const bounds = new THREE.Box3().setFromObject(greeter);
    expect(bounds.min.y).toBeCloseTo(0.035, 6);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(2);
    expect(greeter.position.x).toBe(GREETER_X);
    for (const part of ['Head', 'Torso', 'Left_arm', 'Right_arm', 'Left_leg', 'Right_leg', 'Apron', 'Cap']) {
      expect(greeter.getObjectByName(part)).toBeDefined();
    }
    greeter.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      expect(object.geometry).toBeInstanceOf(THREE.BoxGeometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        expect(Object.values(material).some(value => value instanceof THREE.Texture)).toBe(false);
      }
    });
  });
});

const observe = String.raw`(async () => {
  const visible = element => {
    const style = getComputedStyle(element), r = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      && r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  };
  const label = element => element.getAttribute('aria-label') || element.textContent.trim();
  const controls = [...document.querySelectorAll('button, [role="button"]')].filter(visible).map(element => {
    const r = element.getBoundingClientRect();
    return { label: label(element), x: r.x + r.width / 2, y: r.y + r.height / 2,
      disabled: element.matches(':disabled, [aria-disabled="true"]') };
  });
  const dialogue = [...document.querySelectorAll('[role="dialog"], dialog[open]')]
    .find(element => visible(element) && /dialogue|对话|introduction|介绍/i.test(element.getAttribute('aria-label') || ''));
  const overview = [...document.querySelectorAll('[role="dialog"], dialog[open]')]
    .find(element => visible(element) && /overview|速览|profile/i.test(element.getAttribute('aria-label') || ''));
  return {
    text: document.body.innerText,
    scene: document.querySelector('[aria-label="Current scene"]')?.textContent.trim() || null,
    prompt: controls.find(control => /^(Talk|交谈)$/i.test(control.label)) || null,
    dialogue: dialogue?.innerText || null,
    overview: overview?.innerText || null,
    page: dialogue?.querySelector('[aria-current="page"]')?.textContent.trim() || null,
    controls,
    links: [...(overview?.querySelectorAll('a') || [])].map(a => ({ label: label(a), href: a.href })),
    canvas: '',
  };
})()`;

beforeAll(async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.status, 'Public homepage prerequisite').toBe(200);
  const result = await runBrowser<{ journeys: Journey[]; modelPreviewText: string }>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)}, { wait: true, timeout: 20 })
    const observe = async () => {
      const frame = await js(${JSON.stringify(observe)})
      await js(String.raw\`(() => { for (const element of document.querySelectorAll('.town-header,.town-intro,.town-footer,.talk-prompt,dialog')) { element.dataset.captureVisibility = element.style.visibility; element.style.visibility = 'hidden'; } })()\`)
      const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
      await js(String.raw\`(() => { for (const element of document.querySelectorAll('[data-capture-visibility]')) { element.style.visibility = element.dataset.captureVisibility; delete element.dataset.captureVisibility; } })()\`)
      let hash = 2166136261
      for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619)
      frame.canvas = String(hash >>> 0)
      return frame
    }
    const control = (frame, pattern) => frame.controls.find(item => pattern.test(item.label))
    const activate = async item => {
      if (!item || item.disabled) return false
      await click([item.x, item.y])
      await wait(0.25)
      return true
    }
    const key = async (type, value, code, vk) =>
      await cdp('Input.dispatchKeyEvent', { type, key: value, code, windowsVirtualKeyCode: vk })
    const directionInput = {
      left: { pattern: /^(Move left|向左)$/i, key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
      right: { pattern: /^(Move right|向右)$/i, key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
    }
    const startDirection = async (frame, mobile, direction) => {
      const input = directionInput[direction]
      if (mobile) {
        const item = control(frame, input.pattern)
        if (!item) throw new Error('Missing ' + direction + ' touch control')
        await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: item.x, y: item.y }] })
      } else await key('keyDown', input.key, input.code, input.vk)
    }
    const endDirection = async (mobile, direction) => {
      const input = directionInput[direction]
      if (mobile) await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      else await key('keyUp', input.key, input.code, input.vk)
    }
    const startRight = async (frame, mobile) => await startDirection(frame, mobile, 'right')
    const endRight = async mobile => await endDirection(mobile, 'right')
    const promptSummary = frame => JSON.stringify({
      prompt: frame.prompt?.label || null, page: frame.page, dialogueOpen: !!frame.dialogue, scene: frame.scene,
    })
    const walkToPrompt = async (frame, mobile, direction = 'right') => {
      let current = frame
      await startDirection(frame, mobile, direction)
      try {
        for (let i = 0; i < 48; i++) {
          await wait(0.2)
          current = await observe()
          if (current.prompt) break
        }
      } finally {
        await endDirection(mobile, direction)
      }
      await wait(0.2)
      const released = await observe()
      if (!released.prompt) {
        throw new Error('Talk prompt absent after bounded ' + direction + ' approach and input release; last moving observation=' +
          promptSummary(current) + '; released observation=' + promptSummary(released))
      }
      return released
    }
    const journeys = []
    try {
      for (const viewport of ${JSON.stringify(viewports)}) {
        await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 })
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
        await gotoAndWait(${JSON.stringify(url)}, { timeout: 20, settle: 0.5 })
        const initial = await observe()

        await activate(control(initial, /^(Quick overview|资料速览)$/i))
        const overviewEn = await observe()
        await activate(control(overviewEn, /^(Language|语言)$/i))
        const overviewZh = await observe()
        await activate(control(overviewZh, /^(Back to town|返回城镇)$/i))
        let current = await observe()
        if (/Dusk town|黄昏小镇/.test(current.text) && /黄昏小镇/.test(current.text)) {
          await activate(control(current, /^(Language|语言)$/i))
          current = await observe()
        }

        await key('keyDown', 'e', 'KeyE', 69); await key('keyUp', 'e', 'KeyE', 69)
        const near = await walkToPrompt(current, viewport.mobile)
        if (viewport.mobile) await activate(near.prompt)
        else { await key('keyDown', 'e', 'KeyE', 69); await key('keyUp', 'e', 'KeyE', 69); await wait(0.25) }
        const first = await observe()
        await activate(control(first, /^(Next page|下一页)$/i))
        const second = await observe()
        await activate(control(second, /^(Language|语言)$/i))
        const translatedSecond = await observe()
        await activate(control(translatedSecond, /^(Next page|下一页)$/i))
        const third = await observe()

        const canvasBefore = third.canvas
        await startRight(third, viewport.mobile)
        await wait(1)
        const paused = await observe()
        await activate(control(paused, /^(Close introduction|关闭介绍)$/i))
        await wait(0.6)
        const closedAfterHeldInput = await observe()
        await endRight(viewport.mobile)

        current = closedAfterHeldInput
        await startRight(current, viewport.mobile); await wait(1.2); await endRight(viewport.mobile); await wait(0.2)
        const freshMovement = await observe()

        // Return to a real, post-release prompt before rereading; a fixed walk duration is not a proximity guarantee.
        const rereadReady = freshMovement.prompt ? freshMovement : await walkToPrompt(freshMovement, viewport.mobile, 'left')
        current = await observe()
        if (!current.prompt) {
          throw new Error('Talk prompt disappeared before reread activation; ready=' + promptSummary(rereadReady) +
            '; activation observation=' + promptSummary(current))
        }
        let rereadActivated
        if (viewport.mobile) rereadActivated = await activate(current.prompt)
        else {
          await key('keyDown', 'e', 'KeyE', 69); await key('keyUp', 'e', 'KeyE', 69); await wait(0.25)
          rereadActivated = true
        }
        const reread = await observe()
        await key('keyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27); await wait(0.25)
        const escaped = await observe()

        // Leave interaction range, then E must remain a no-op.
        current = escaped
        const left = control(current, /^(Move left|向左)$/i)
        if (viewport.mobile) {
          await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: left.x, y: left.y }] })
          await wait(2); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        } else {
          await key('keyDown', 'ArrowLeft', 'ArrowLeft', 37); await wait(2); await key('keyUp', 'ArrowLeft', 'ArrowLeft', 37)
        }
        await wait(0.2)
        const far = await observe()
        await key('keyDown', 'e', 'KeyE', 69); await key('keyUp', 'e', 'KeyE', 69); await wait(0.25)
        const ignored = await observe()
        await gotoAndWait(${JSON.stringify(url)}, { timeout: 20, settle: 0.5 })
        const refreshed = await observe()
        // Preserve a direct canvas comparison made before and after held input.
        paused.canvasBefore = canvasBefore
        journeys.push({ initial, overviewEn, overviewZh, near, first, second, translatedSecond, third,
          paused, closedAfterHeldInput, freshMovement, rereadReady, rereadActivated, reread, escaped, far, ignored, refreshed })
      }
      await gotoAndWait('http://127.0.0.1:3000/design-reference/character-comparison.html', { timeout: 20, settle: 1 })
      const modelPreviewText = await js('document.body.innerText')
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ journeys, modelPreviewText }))
    } finally {
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp('Emulation.clearDeviceMetricsOverride')
    }
  `);
  modelPreviewText = result.modelPreviewText;
  journeys = result.journeys;
}, 240_000);

test('player/AC-11: standalone model preview does not report completed gait as unfinished', () => {
  expect(modelPreviewText).toMatch(/造型预览/);
  expect(modelPreviewText).not.toMatch(/walking animation not yet complete|行走动画尚未完成/i);
});

const expectedLinks = [
  'https://0xbb.me/',
  'https://github.com/0xBB2B/0xbb.me',
  'https://github.com/0xBB2B/bb-spec',
  'https://pi.dev/packages/@0xbb2b/pi-subagent-cluster',
  'https://github.com/0xBB2B/pi-subagent-cluster',
  'https://github.com/0xBB2b',
  'https://www.linkedin.com/in/0xbb2b',
  'https://juejin.cn/user/1037558235795032',
  'mailto:bb@yorha.xyz',
];

for (const [index, viewport] of viewports.entries()) {
  describe(`${viewport.width}×${viewport.height} NPC reading`, () => {
    test('npc-dialogue/AC-1, AC-2, AC-5: prompt is proximity-only and E/touch opens only the nearby greeter', () => {
      const j = journeys[index];
      expect(j.initial.prompt).toBeNull();
      expect(j.near.prompt?.label).toMatch(/Talk|交谈/);
      expect(j.near.dialogue).toBeNull();
      expect(j.first.dialogue).toMatch(/FUBUKI_BB/);
      expect(j.far.prompt).toBeNull();
      expect(j.ignored.dialogue).toBeNull();
    });

    test('npc-dialogue/AC-4 and bilingual/AC-3: three ordered pages, stable translated page, close and reread', () => {
      const j = journeys[index];
      expect(j.first.dialogue).toMatch(/FUBUKI_BB.*(?:Tokyo.*Shanghai|Shanghai.*Tokyo)/s);
      expect(j.first.page).toBe('1 / 3');
      expect(j.first.controls.find(c => /Previous page/.test(c.label))?.disabled).toBe(true);
      expect(j.second.dialogue).toMatch(/Full Stack|全栈|scalable backend|可扩展后端/i);
      expect(j.second.page).toBe('2 / 3');
      expect(j.translatedSecond.dialogue).toMatch(/全栈工程|可扩展后端/);
      expect(j.translatedSecond.page).toBe('2 / 3');
      expect(j.third.dialogue).toMatch(/AI.*工作流|AI workflow/i);
      expect(j.third.page).toBe('3 / 3');
      expect(j.third.controls.find(c => /Next page|下一页/.test(c.label))?.disabled).toBe(true);
      expect(j.rereadReady.prompt?.label, 'bounded return must end on a released, visible Talk prompt').toMatch(/Talk|交谈/);
      expect(j.rereadActivated, 'reread activation must be dispatched from that prompt').toBe(true);
      expect(j.reread.page).toBe('1 / 3');
      expect(j.escaped.dialogue).toBeNull();
    });

    test('player/AC-6: reading ignores held direction and releases it before exploration resumes', () => {
      const j = journeys[index] as Journey & { paused: Frame & { canvasBefore?: string } };
      expect(j.paused.dialogue).not.toBeNull();
      expect(j.paused.canvas).toBe(j.paused.canvasBefore);
      expect(j.closedAfterHeldInput.prompt).not.toBeNull();
      expect(j.freshMovement.canvas).not.toBe(j.closedAfterHeldInput.canvas);
    });

    test('profile-overview/AC-1..5: overview is immediately available with complete facts, levels, projects and contacts', () => {
      const j = journeys[index];
      const english = j.overviewEn.overview || '';
      expect(english).toMatch(/FUBUKI_BB/);
      expect(english).toMatch(/Full Stack Engineer/);
      expect(english).toMatch(/System Architect/);
      expect(english).toMatch(/AI Explorer/);
      expect(english).toMatch(/Tokyo.*Shanghai/s);
      for (const fact of ['AI Workflows', 'Scalable Backends', 'Game SDK Ecosystems', 'Trading Platforms']) expect(english).toContain(fact);
      for (const [skill, level] of [['AI', '999'], ['Harness Engineering', '99'], ['Context Engineering', '99'],
        ['Prompt Engineering', '99'], ['Go (Golang)', '90'], ['Docker / K8s', '85']]) {
        expect(english).toMatch(new RegExp(skill.replace(/[()]/g, '\\$&') + '\\s+' + level));
      }
      for (const project of ['0xbb.me', 'bb-spec', 'pi-subagent-cluster']) {
        expect(english).toContain(project);
      }
      expect(english.match(/ONLINE/g)).toHaveLength(3);
      expect(english).toMatch(/HD-2D.*(?:exploration|portfolio)/i);
      for (const contact of ['GitHub', 'LinkedIn', 'Juejin', 'Email']) expect(english).toContain(contact);
      expect(new Set(j.overviewEn.links.map(link => link.href))).toEqual(new Set(expectedLinks));
    });

    test('bilingual/AC-1..3: English reset, complete Chinese reading, and stable links', () => {
      const j = journeys[index];
      expect(j.initial.text).toMatch(/Dusk town|A little town/);
      expect(j.initial.text).not.toMatch(/黄昏小镇/);
      const chinese = j.overviewZh.overview || '';
      expect(chinese).toMatch(/全栈工程师/);
      expect(chinese).toMatch(/系统架构师/);
      expect(chinese).toMatch(/AI 探索者/);
      expect(chinese).toMatch(/可扩展后端/);
      expect(chinese).toMatch(/游戏 SDK 生态/);
      expect(chinese).toMatch(/交易平台/);
      expect(chinese).not.toMatch(/Full Stack Engineer|System Architect|Scalable Backends|Trading Platforms/);
      expect(j.overviewZh.links.map(link => link.href)).toEqual(j.overviewEn.links.map(link => link.href));
      expect(j.refreshed.text).toMatch(/Dusk town|A little town/);
      expect(j.refreshed.text).not.toMatch(/黄昏小镇/);
      expect(j.refreshed.prompt).toBeNull();
    });

    test('npc-dialogue/AC-4: language and close remain reachable while overview requests cannot replace dialogue', () => {
      const j = journeys[index];
      expect(j.second.controls.some(c => /^(Language|语言)$/.test(c.label) && !c.disabled)).toBe(true);
      expect(j.second.controls.some(c => /Close introduction|关闭介绍/.test(c.label) && !c.disabled)).toBe(true);
      const overview = j.second.controls.find(c => /Quick overview|资料速览/.test(c.label));
      expect(!overview || overview.disabled).toBe(true);
    });
  });
}
