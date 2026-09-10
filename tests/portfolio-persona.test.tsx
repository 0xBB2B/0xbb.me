import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Overview } from '../components/portfolio/Overview';
import { runBrowser } from './browser';

const noop = () => {};
const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('the confirmed persona artwork is part of the open overview only, with intrinsic uncropped proportions', () => {
  const closed = renderToStaticMarkup(<Overview open={false} language="en" onClose={noop} />);
  expect(closed).not.toContain('<img');
  for (const language of ['en', 'zh'] as const) {
    const open = renderToStaticMarkup(<Overview open language={language} onClose={noop} />);
    expect(open).toContain('src="./profile-full.png"');
    expect(open).toContain('width="1696"');
    expect(open).toContain('height="2528"');
    expect(open).toContain(language === 'en' ? 'Character portrait' : '个人人设');
    expect(open).not.toContain('aria-label="Language"');
  }
});

test('persona loading, desktop/mobile placement and image-failure fallback keep all profile reading usable', async () => {
  const result = await runBrowser<{ beforePortraitRequests: number; layouts: Array<{ width: number; imageWidth: number; imageHeight: number; naturalWidth: number; naturalHeight: number; placement: boolean; overflow: number; controls: boolean }>; fallback: boolean; text: string; links: string[] }>(`
    await navigate(${JSON.stringify(url)},{timeout:20})
    await navigate(${JSON.stringify(url)},{timeout:20,settle:1})
    const beforePortraitRequests=await js('performance.getEntriesByType("resource").filter(e=>e.name.includes("profile-full.png")).length')
    const layouts=[]
    try {
      for(const [width,height,mobile] of [[1440,900,false],[390,844,true],[844,390,true]]){
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1})
        await cdp('Page.captureScreenshot',{format:'png'})
        await click('button[aria-label="Quick overview"]')
        let loaded=false
        for(let i=0;i<100;i++){if(await js('document.querySelector(".profile-portrait img")?.naturalWidth>0')){loaded=true;break}await wait(.1)}
        if(!loaded)throw Error('Persona image did not load')
        await cdp('Page.captureScreenshot',{format:'png'})
        layouts.push(await js(${JSON.stringify(`(() => {
          const image=document.querySelector('.profile-portrait img'),info=document.querySelector('.profile-identity');
          const r=image.getBoundingClientRect(),s=info.getBoundingClientRect(),close=document.querySelector('dialog[open] button');
          const c=close.getBoundingClientRect();
          return {width:innerWidth,imageWidth:r.width,imageHeight:r.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
            placement:innerWidth<=600?r.bottom<=s.top:r.right<=s.left,
            overflow:document.documentElement.scrollWidth-innerWidth,
            controls:c.top>=0&&c.bottom<=innerHeight&&!document.querySelector('button[aria-label="Language"]')};
        })()`)} ))
        await click('button[aria-label="Back to town"]')
      }
      await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true})
      await cdp('Network.setBlockedURLs',{urls:['*profile-full.png*']})
      await navigate(${JSON.stringify(url)},{timeout:20,settle:1})
      await click('button[aria-label="Quick overview"]')
      let fallback=false
      for(let i=0;i<60;i++){fallback=await js('!!document.querySelector(".portrait-unavailable")');if(fallback)break;await wait(.1)}
      const reading=await js('({text:document.querySelector("dialog[open]").innerText,links:[...document.querySelectorAll("dialog[open] a")].map(a=>a.href)})')
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify({beforePortraitRequests,layouts,fallback,...reading}))
    }finally{await cdp('Network.setBlockedURLs',{urls:[]});await cdp('Network.setCacheDisabled',{cacheDisabled:false});await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(result.beforePortraitRequests).toBe(0);
  expect(result.layouts).toHaveLength(3);
  for (const layout of result.layouts) {
    expect(layout.naturalWidth).toBe(1696);
    expect(layout.naturalHeight).toBe(2528);
    expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(1696 / 2528, 3);
    expect(layout.placement, `layout at ${layout.width}`).toBe(true);
    expect(layout.overflow).toBe(0);
    expect(layout.controls).toBe(true);
  }
  expect(result.fallback).toBe(true);
  expect(result.text).toContain('FUBUKI_BB');
  expect(result.text).toContain('AI Agent Developer');
  expect(result.text).toContain('pi-subagent-cluster');
  expect(result.links).toContain('https://github.com/0xBB2B/bb-spec');
  expect(result.links).toContain('mailto:bb@yorha.xyz');
}, 120_000);
