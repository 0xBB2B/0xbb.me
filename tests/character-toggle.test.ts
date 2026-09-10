import { beforeAll, describe, expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = 'http://127.0.0.1:3000/';
const viewports = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true },
  { width: 844, height: 390, mobile: true },
];
type Control = { label: string; x: number; y: number; usable: boolean };
type Frame = {
  url: string; ready: string; width: number; height: number; overflow: number;
  text: string; toggles: Control[]; language?: Control; overview?: Control;
  left?: Control; right?: Control; close?: Control; profile: string | null;
  canvases: number[];
};
type Traffic = { requests: string[]; errors: string[] };
type Journey = {
  initial: Frame; moved: Frame; panel: Frame; closed: Frame;
  continued: Frame; repeated: Frame; refreshed: Frame; traffic: Traffic;
};
let result: { journeys: Journey[] };

// Only public DOM/AX labels, browser input and actual requests.
// No production imports, injected window state, data attributes or model mocks.
const observePage = String.raw`(() => {
  const visible = element => {
    const r = element.getBoundingClientRect();
    return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      && r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0
      && r.bottom <= innerHeight && r.right <= innerWidth;
  };
  const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible).map(element => {
    const r = element.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      label: element.getAttribute('aria-label') || element.textContent.trim(), x, y,
      usable: !element.matches(':disabled, [aria-disabled="true"]') && !!hit && element.contains(hit),
    };
  });
  const dialog = [...document.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"]')]
    .find(element => element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  return {
    url: location.href, ready: document.readyState, width: innerWidth, height: innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    text: document.body.innerText,
    toggles: buttons.filter(b => /SVG|Minecraft|人物造型|造型|character.*(style|appearance)/i.test(b.label)),
    language: buttons.find(b => b.usable && /^(Language|语言)$/i.test(b.label)),
    overview: buttons.find(b => b.usable && /资料速览|quick\s*overview/i.test(b.label)),
    left: buttons.find(b => b.usable && /^(Move left|向左)$/i.test(b.label)),
    right: buttons.find(b => b.usable && /^(Move right|向右)$/i.test(b.label)),
    close: buttons.find(b => b.usable && /返回城镇|back to town/i.test(b.label)),
    profile: dialog ? [...dialog.querySelectorAll('h1,h2,h3,p,li,a')].map(e => e.textContent.trim()).join('\n') : null,
  };
})()`;

beforeAll(async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.status, 'HTTP prerequisite, not the character behavior assertion').toBe(200);
  expect(response.headers.get('content-type')).toContain('text/html');
  result = await runBrowser(`
    await navigate(${JSON.stringify(url)}, { timeout: 20 })
    await cdp('Network.enable')
    await cdp('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp('Runtime.enable')
    await cdp('Log.enable')
    const frame = async () => {
      const observation = await js(${JSON.stringify(observePage)})
      const { root } = await cdp('DOM.getDocument')
      const { nodeIds } = await cdp('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'canvas' })
      observation.canvases = []
      for (const nodeId of nodeIds) {
        const { node } = await cdp('DOM.describeNode', { nodeId })
        observation.canvases.push(node.backendNodeId)
      }
      return observation
    }
    const activate = async control => {
      if (!control?.usable) return false
      await click([control.x, control.y])
      await wait(0.5)
      return true
    }
    const move = async (current, direction, mobile, seconds) => {
      const control = current[direction]
      if (!control?.usable) return
      const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft'
      const windowsVirtualKeyCode = direction === 'right' ? 39 : 37
      if (mobile) {
        await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: control.x, y: control.y }] })
        try { await wait(seconds) } finally { await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
      } else {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode })
        try { await wait(seconds) } finally { await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode }) }
      }
      await wait(1)
    }
    const traffic = async () => {
      const events = await drainEvents()
      const requests = events.filter(e => e.method === 'Network.requestWillBeSent')
      return {
        requests: requests.map(e => e.params.request.url),
        errors: events.flatMap(e => {
          if (e.method === 'Runtime.exceptionThrown') return [e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text]
          if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') return [e.params.entry.text]
          if (e.method === 'Network.loadingFailed') return [e.params.errorText]
          if (e.method === 'Network.responseReceived' && e.params.response.status >= 400)
            return [e.params.response.status + ' ' + e.params.response.url]
          return []
        }),
      }
    }
    const journeys = []
    try {
      for (const viewport of ${JSON.stringify(viewports)}) {
        await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 })
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
        await drainEvents()
        await navigate(${JSON.stringify(url)}, { timeout: 20, settle: 1 })
        const initial = await frame()
        await move(initial, 'right', viewport.mobile, 1.2)
        const moved = await frame()
        await activate(moved.language)
        const translated = await js(${JSON.stringify(observePage)})
        await activate(translated.overview)
        const panel = await frame()
        await activate(panel.close)
        const closed = await frame()
        await move(closed, 'left', viewport.mobile, 0.4)
        const continued = await frame()
        await wait(2)
        const repeated = await frame()
        const normalTraffic = await traffic()
        await navigate(${JSON.stringify(url)}, { timeout: 20, settle: 1 })
        const refreshed = await frame()
        normalTraffic.errors.push(...(await traffic()).errors)
        journeys.push({ initial, moved, panel, closed, continued, repeated, refreshed, traffic: normalTraffic })
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify({ journeys }))
    } finally {
      await cdp('Network.setCacheDisabled', { cacheDisabled: false })
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp('Emulation.clearDeviceMetricsOverride')
    }
  `);
  for (const journey of result.journeys) {
    expect(journey.initial.url, 'Browser actually loaded the homepage').toBe(url);
    expect(journey.initial.ready).toBe('complete');
  }
  console.info('Homepage observations:', JSON.stringify(result, (key, value) => {
    if (['text', 'profile', 'body'].includes(key) && typeof value === 'string') return `[${value.length} characters]`;
    if (key === 'requests') return `[${value.length} observed requests]`;
    return value;
  }));
}, 180_000);


for (const [index, viewport] of viewports.entries()) {
  describe(`${viewport.width}×${viewport.height} single black player`, () => {
    test('player/AC-11: no appearance or white outfit entry on homepage, profile or refresh', () => {
      const j = result.journeys[index];
      for (const frame of [j.initial, j.moved, j.panel, j.closed, j.continued, j.repeated, j.refreshed]) {
        expect(frame.toggles).toHaveLength(0);
        expect(frame.text).not.toMatch(/White outfit|白装|SVG/);
        expect(frame.canvases).toHaveLength(1);
      }
    });
    test('player/AC-11: language, profile and continued movement retain canvas and session', () => {
      const j = result.journeys[index];
      expect(j.panel.language).toBeUndefined();
      expect(j.panel.profile).toMatch(/全栈工程师/);
      expect(j.panel.profile).toMatch(/FUBUKI_BB/);
      expect(j.closed.profile).toBeNull();
      expect(j.closed.language?.label).toBe('语言');
      for (const frame of [j.moved, j.panel, j.closed, j.continued, j.repeated]) {
        expect(frame.canvases).toEqual(j.initial.canvases);
        expect(frame.url).toBe(url);
      }
      expect(j.traffic.errors).toEqual([]);
    });
    test('responsive-layout/AC-1: usable language, overview, left/right and no overflow', () => {
      const j = result.journeys[index];
      for (const frame of [j.initial, j.moved, j.closed, j.continued, j.repeated, j.refreshed]) {
        expect(frame.width).toBe(viewport.width);
        expect(frame.height).toBe(viewport.height);
        expect(frame.overflow).toBeLessThanOrEqual(0);
        expect(frame.language?.usable).toBe(true);
        expect(frame.overview?.usable).toBe(true);
        expect(frame.left?.usable).toBe(true);
        expect(frame.right?.usable).toBe(true);
      }
      expect(j.panel.overflow).toBeLessThanOrEqual(0);
      expect(j.panel.language).toBeUndefined();
      expect(j.panel.close?.usable).toBe(true);
    });
    test('player/AC-1, AC-11: geometry characters with only the confirmed persona image in overview reading', () => {
      const { initial, traffic } = result.journeys[index];
      expect(initial.text).not.toMatch(/造型预览|appearance preview|character preview/i);
      expect(initial.text).not.toMatch(/walking animation not yet complete|行走动画尚未完成/i);
      expect(traffic.requests.filter(r => /player-redraw/i.test(r))).toEqual([]);
      for (const image of traffic.requests.filter(r => /\.(?:png|jpe?g)(?:[?#]|$)/i.test(r))) {
        expect(new URL(image).pathname).toBe('/profile-full.png');
      }
    });
  });
}
