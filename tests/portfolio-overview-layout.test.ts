import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('overview skills use at most three columns, with two on tablets and one on narrow phones', async () => {
  const results = await runBrowser<Array<{ width: number; expected: number; columns: number; count: number; overflow: boolean; brand: string; canvas: string }>>(`
    await navigate(${JSON.stringify(url)}, {timeout:20})
    await navigate(${JSON.stringify(url)}, {timeout:20,settle:1})
    for(let i=0;i<100;i++){if(await js('!!document.querySelector("canvas")'))break;await wait(.1)}
    const results=[]
    try {
      for(const [width,height,expected] of [[1440,900,3],[2560,1080,3],[640,900,2],[390,844,1],[844,390,3]]) {
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile:width<900,deviceScaleFactor:1})
        for(const language of ['en','zh']) {
          if(language==='zh') await click('button[aria-label="Language"]')
          await click('.overview-button')
          await cdp('Page.captureScreenshot',{format:'png'})
          results.push({width,expected,...await js(${JSON.stringify(`(() => {
            const grid=document.querySelector('.skill-list'), dialog=document.querySelector('.profile-overview');
            return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,count:grid.children.length,
              overflow:dialog.scrollWidth>dialog.clientWidth+1 || [...grid.children].some(card=>card.scrollWidth>card.clientWidth+1),
              brand:document.querySelector('.place-label').textContent,canvas:document.querySelector('canvas').getAttribute('aria-label')};
          })()`)} )})
          await click('.overview-toolbar button')
        }
        await click('button[aria-label="语言"]')
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(results))
    } finally { await cdp('Emulation.clearDeviceMetricsOverride') }
  `);
  expect(results).toHaveLength(10);
  for (const result of results) {
    expect(result.columns, `${result.width}px`).toBe(result.expected);
    expect(result.columns).toBeLessThanOrEqual(3);
    expect(result.count).toBe(5);
    expect(result.overflow).toBe(false);
    expect(result.brand).toContain('MC-2D · 01');
    expect(result.canvas).toBe('Playable three-scene MC-2D journey');
  }
}, 90_000);
