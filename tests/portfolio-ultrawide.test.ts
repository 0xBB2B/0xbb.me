import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('ultrawide screens keep a centered bounded world and reachable door prompts without exposing unlimited scenery', async () => {
  const frames = await runBrowser<Array<{ width: number; height: number; worldWidth: number; left: number; overflow: number; usable: boolean; door: boolean }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)},{wait:true,timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
    await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
    let ready=false
    for(let i=0;i<100;i++){if(await js(${JSON.stringify('document.querySelector(\'button[aria-label="Move right"]\')?.disabled === false')})){ready=true;break}await wait(.1)}
    if(!ready)throw Error('Graphics preparation did not finish')
    const key=type=>cdp('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const frames=[]
    try{
      await key('keyDown');let reached=false
      try{for(let i=0;i<200;i++){await wait(.1);if(await js('!!document.querySelector("[data-door-id]")')){reached=true;break}}}finally{await key('keyUp')}
      if(!reached)throw Error('Door not reached for ultrawide check')
      for(const [width,height] of [[3440,1440],[5120,1440]]){
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false})
        await cdp('Page.captureScreenshot',{format:'png'})
        frames.push(await js(${JSON.stringify(`(() => {
          const r=document.querySelector('.town-page').getBoundingClientRect();
          const controls=[...document.querySelectorAll('.town-header button,.town-footer button,[data-door-id]')];
          return {width:innerWidth,height:innerHeight,worldWidth:r.width,left:r.left,overflow:document.documentElement.scrollWidth-innerWidth,
            usable:controls.every(e=>{const q=e.getBoundingClientRect();return q.left>=r.left&&q.right<=r.right&&q.top>=0&&q.bottom<=innerHeight}),
            door:!!document.querySelector('[data-door-id="town-door"]')};
        })()`)} ))
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(frames))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(frames).toHaveLength(2);
  for (const frame of frames) {
    expect(frame.worldWidth).toBeLessThanOrEqual(frame.height * 2.4 + 1);
    expect(frame.left).toBeCloseTo((frame.width - frame.worldWidth) / 2, 0);
    expect(frame.overflow).toBe(0);
    expect(frame.usable).toBe(true);
    expect(frame.door).toBe(true);
  }
}, 60_000);
