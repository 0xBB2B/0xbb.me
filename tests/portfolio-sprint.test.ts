import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('real Shift input runs faster, crosses explicitly opened doors and leaves both lighthouse texts readable', async () => {
  const result = await runBrowser<{ times: number[]; changes: Array<{ label: string; locked: boolean; canvases: number }>; layouts: Array<{ width: number; intro: boolean; note: boolean; overlap: boolean; inFrame: boolean; clearTower: boolean }>; returnIntro: boolean; returnNote: boolean; returnSwitch: boolean }>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)},{wait:true,timeout:20})
    const key=(type,code,modifiers=0)=>cdp('Input.dispatchKeyEvent',{type,code,key:code==='ShiftLeft'?'Shift':code,modifiers,windowsVirtualKeyCode:code==='ShiftLeft'?16:code==='ArrowLeft'?37:39})
    const release=async()=>{await key('keyUp','ArrowRight');await key('keyUp','ArrowLeft');await key('keyUp','ShiftLeft')}
    const times=[],layouts=[],changes=[]
    try {
      await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
      for(const sprint of [false,true]) {
        await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
        for(let i=0;i<100;i++){if(await js('document.querySelector(".direction-button")?.disabled===false'))break;await wait(.1)}
        if(await js('!!document.querySelector(".avatar-switch")'))throw Error('Appearance switch leaked before the endpoint')
        if(sprint)await key('keyDown','ShiftLeft',8)
        const started=Date.now();await key('keyDown','ArrowRight',sprint?8:0)
        let found=false
        for(let i=0;i<120;i++){if(await js(${JSON.stringify('!!document.querySelector(\'.talk-prompt[aria-label="Talk"]\')')})){found=true;break};await wait(.05)}
        times.push(Date.now()-started);await release();if(!found)throw Error('NPC was not reached')
      }
      await key('keyDown','ShiftLeft',8);await key('keyDown','ArrowRight',8)
      let ended=false
      for(let i=0;i<400;i++) {
        if(await js('!!document.querySelector(".lighthouse-note")')){
          if(!(await js('!!document.querySelector(".avatar-switch")')))throw Error('Appearance switch and note did not appear together')
          ended=true;await wait(.4);break
        }
        if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){
          await key('keyUp','ArrowRight');await click('[data-door-id]')
          let opened=false
          for(let j=0;j<100;j++){if(await js('!document.querySelector("[data-door-id]:disabled")')){opened=true;break};await wait(.05)}
          if(!opened)throw Error('Door animation did not finish')
          await key('keyDown','ArrowRight',8)
        }
        await wait(.1)
      }
      await release();if(!ended)throw Error('Lighthouse was not reached: '+await js('document.querySelector(".town-footer").innerText'))
      for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile:width<900,deviceScaleFactor:1})
        for(const language of ['en','zh']) {
          if(language==='zh')await click('button[aria-label="Language"]')
          await cdp('Page.captureScreenshot',{format:'png'})
          layouts.push({width,...await js(${JSON.stringify(`(() => {
            const intro=document.querySelector('.town-intro'),note=document.querySelector('.lighthouse-note');
            if(!intro || !note)return {intro:!!intro,note:!!note,overlap:true,inFrame:false};
            const a=intro.getBoundingClientRect(),b=note.getBoundingClientRect();
            return {intro:!!intro.querySelector('h1')&&a.height>0,note:getComputedStyle(note).visibility==='visible',clearTower:innerHeight>innerWidth ? b.left<innerWidth*.1 : b.left>innerWidth*.6,
              overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,
              inFrame:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=document.querySelector('.town-footer').getBoundingClientRect().top};
          })()`)} )})
        }
        await click('button[aria-label="语言"]')
        for(const expected of ['A · Black gown','Black outfit']) {
          await click('.avatar-switch')
          const locked=await js('document.querySelector(".avatar-switch").disabled')
          for(let i=0;i<100;i++){if(await js('document.querySelector(".avatar-switch")?.disabled===false'))break;await wait(.03)}
          const label=await js('document.querySelector(".avatar-switch").getAttribute("aria-description")')
          if(label!==expected)throw Error('Wrong protagonist after switch: '+label)
          changes.push({label,locked,canvases:await js('document.querySelectorAll("canvas").length')})
          await cdp('Page.captureScreenshot',{format:'png'})
        }
      }
      await key('keyDown','ArrowLeft');await wait(1);await release()
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify({times,layouts,changes,...await js('({returnIntro:!!document.querySelector(".town-intro"),returnNote:!!document.querySelector(".lighthouse-note"),returnSwitch:!!document.querySelector(".avatar-switch")})')}))
    } finally { await release();await cdp('Emulation.clearDeviceMetricsOverride') }
  `);
  expect(result.times).toHaveLength(2);
  expect(result.times[1]).toBeLessThan(result.times[0] * .82);
  expect(result.layouts).toHaveLength(6);
  expect(result.changes).toHaveLength(6);
  for (const change of result.changes) { expect(change.locked).toBe(true); expect(change.canvases).toBe(1); }
  for (const layout of result.layouts) {
    expect(layout.intro, `${layout.width}px`).toBe(true);
    expect(layout.note).toBe(true);
    expect(layout.overlap).toBe(false);
    expect(layout.inFrame).toBe(true);
    expect(layout.clearTower).toBe(true);
  }
  expect(result.returnIntro).toBe(true);
  expect(result.returnNote).toBe(false);
  expect(result.returnSwitch).toBe(false);
}, 120_000);
