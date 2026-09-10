import { beforeAll, describe, expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = 'http://127.0.0.1:3000/';
const viewports = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true },
  { width: 844, height: 390, mobile: true },
];

type Observation = {
  url: string;
  ready: string;
  width: number;
  height: number;
  scrollWidth: number;
  clientWidth: number;
  text: string;
  visibleCanvases: number;
  controls: string[];
  buttons: string[];
};
let pages: Observation[];

beforeAll(async () => {
  // Fail setup only for an unavailable server/browser, never for a missing world.
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  expect(response.status, 'Public homepage responds before behavior assertions').toBe(200);
  expect(response.headers.get('content-type')).toContain('text/html');
  pages = await runBrowser<Observation[]>(`
    await navigate(${JSON.stringify(url)}, { timeout: 20 })
    const pages = []
    try {
      for (const viewport of ${JSON.stringify(viewports)}) {
        await cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 })
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
        await navigate(${JSON.stringify(url)}, { timeout: 20, settle: 1 })
        pages.push(await js(${JSON.stringify(`(() => {
          const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
              && rect.top < innerHeight && rect.left < innerWidth
              && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
          };
          const controls = [...document.querySelectorAll('button, a, select, [role="button"]')]
            .filter(element => visible(element) && !element.matches(':disabled, [aria-disabled="true"]'));
          const label = element => element.getAttribute('aria-label') || element.textContent.trim();
          return {
            url: location.href, ready: document.readyState,
            width: innerWidth, height: innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            text: document.body.innerText,
            visibleCanvases: [...document.querySelectorAll('canvas')].filter(visible).length,
            controls: controls.map(label),
            buttons: controls.filter(element => element.matches('button, [role="button"]')).map(label),
          };
        })()`)}))
      }
      cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(pages))
    } finally {
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp('Emulation.clearDeviceMetricsOverride')
    }
  `);
  for (const page of pages) {
    expect(page.url, 'Browser opened the real public homepage').toBe(url);
    expect(page.ready, 'Real document finished loading').toBe('complete');
  }
  console.info('Real homepage observations:', JSON.stringify(pages.map(({ text, ...page }) => page)));
}, 90_000);

// These are entry prerequisites, NOT substitutes for visual/gameplay acceptance.
// Once they pass, Green still requires real browser screenshots/recording:
// player/AC-1: silver ponytail, blue eyes, black/white outfit, both legs/feet,
// transparent silhouette; compare the read-only profile reference.
// player/AC-2/3: at mid-road hold/release A,D,ArrowLeft,ArrowRight; observe
// left/right displacement, turn, alternating feet, stable ground contact,
// camera follow and idle without treating background pixel changes as walking.
// player/AC-4/5: in both mobile viewports hold each actual direction button,
// release and cancel; while holding a key switch away, release outside, return;
// no movement resumes until fresh input. Observe the character, not just events.
// player/AC-7: walk the whole road without jump/combat, hold outward at both
// ends, verify no exit/fall, then reverse and verify return to the road.
// world/AC-2 (town only): inspect warm light, shaded building faces, contact
// shadows and foreground/road/distant depth. T-30 owns the other two scenes.
// responsive-layout/AC-1: character visible and language/overview usable at
// all three viewports. DOM presence alone does not verify any of these visuals.

for (const [index, viewport] of viewports.entries()) {
  describe(`${viewport.width}×${viewport.height} public homepage`, () => {
    test('browser really uses the requested viewport', () => {
      expect(pages[index].width).toBe(viewport.width);
      expect(pages[index].height).toBe(viewport.height);
    });

    test('player/AC-1, AC-2; world/AC-2: visible world canvas exists before visual acceptance', () => {
      expect(pages[index].visibleCanvases, 'Homepage must expose the playable world, not only the old profile').toBeGreaterThan(0);
    });

    test('task verification: existing personal identity remains available', () => {
      expect(pages[index].text).toMatch(/FUBUKI[\s_]*BB/i);
    });

    test('responsive-layout/AC-1: visible language entry', () => {
      expect(pages[index].controls.some(label => /language|语言|切换语言|中文|english|^(EN|ZH|中\/EN)$/i.test(label)), 'No visible, enabled language control').toBe(true);
    });

    test('responsive-layout/AC-1: visible profile overview entry', () => {
      expect(pages[index].controls.some(label => /资料速览|速览|quick\s*(view|overview)|profile\s*overview/i.test(label)), 'No visible, enabled profile overview control').toBe(true);
    });

    test('responsive-layout/AC-1: no whole-page horizontal overflow', () => {
      expect(pages[index].scrollWidth).toBeLessThanOrEqual(pages[index].clientWidth);
    });

    if (viewport.mobile) {
      test.each([
        ['left', /向左|左行|左移|move\s*left|^left$|^[←◀]$/i],
        ['right', /向右|右行|右移|move\s*right|^right$|^[→▶]$/i],
      ] as const)('player/AC-4, AC-5: visible %s touch button before hold/release/cancel', (_direction, labelPattern) => {
        expect(pages[index].buttons.some(label => labelPattern.test(label)), 'No visible, enabled touch movement control').toBe(true);
      });
    }
  });
}
