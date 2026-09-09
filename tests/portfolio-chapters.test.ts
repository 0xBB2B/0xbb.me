import { expect, test } from 'bun:test';
import { SCENE_COPY } from '../portfolio/copy';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('all three chapter labels and headings share the same vertical position and typography', async () => {
  const frames = await runBrowser<Array<{ scene: string; viewport: string; language: string; chapterY: number; headingY: number; fontSize: string; lineHeight: string }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)},{wait:true,timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
    await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
    for(let i=0;i<100;i++){if(await js(${JSON.stringify('document.querySelector(\'button[aria-label="Move right"]\')?.disabled === false')}))break;await wait(.1)}
    const key=type=>cdp('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const frames=[]
    try{
      for(const scene of ['Dusk town','Tech workshop','Starlit shore']){
        await key('keyDown');let reached=false
        try{for(let i=0;i<330;i++){
          if(await js(${JSON.stringify('document.querySelector(\'[aria-label="Current scene"]\')?.textContent')})===scene){reached=true;break}
          if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){await key('keyUp');await click('[data-door-id]');await wait(1);await key('keyDown')}
          await wait(.1)
        }}finally{await key('keyUp')};if(!reached)throw Error('Chapter not reached '+scene)
        for(const [width,height,mobile] of [[1440,900,false],[390,844,true],[844,390,true]]){
          await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1})
          for(const language of ['en','zh']){
            if(language==='zh')await click('button[aria-label="Language"]')
            await cdp('Page.captureScreenshot',{format:'png'})
            frames.push({scene,language,...await js(${JSON.stringify(`(() => { const intro=document.querySelector('.town-intro'),h=intro.querySelector('h1'),p=intro.querySelector('.eyebrow'),style=getComputedStyle(h);return {viewport:innerWidth+'x'+innerHeight,chapterY:p.getBoundingClientRect().y,headingY:h.getBoundingClientRect().y,fontSize:style.fontSize,lineHeight:style.lineHeight}; })()`)} )})
          }
          await click('button[aria-label="语言"]')
        }
        await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1});await cdp('Page.captureScreenshot',{format:'png'})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(frames))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(frames).toHaveLength(18);
  for (const frame of frames) {
    const first = frames.find(item => item.scene === 'Dusk town' && item.viewport === frame.viewport && item.language === frame.language)!;
    expect(frame.chapterY, `${frame.scene} ${frame.viewport}`).toBeCloseTo(first.chapterY, 0);
    expect(frame.headingY, `${frame.scene} ${frame.viewport}`).toBeCloseTo(first.headingY, 0);
    expect(frame.fontSize).toBe(first.fontSize);
    expect(frame.lineHeight).toBe(first.lineHeight);
  }
  expect(SCENE_COPY.gallery.zh.title).toContain('星辰大海');
  expect(SCENE_COPY.gallery.zh.title).not.toContain('一片发光的海');
}, 120_000);
