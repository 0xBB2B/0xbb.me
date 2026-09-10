import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('real outfit return visits play the surprise once per refresh, with timed typing and locked NPC interaction', async () => {
  const episodes = await runBrowser<Array<{ language: string; samples: Array<{ t: number; stage: string; text: string; locked: boolean; inFrame: boolean }>; finished: number; repeatedDialogue: boolean }>>(`
    await navigate(${JSON.stringify(url)},{timeout:20})
    const key=(type,code,modifiers=0)=>cdp('Input.dispatchKeyEvent',{type,code,key:code==='ShiftLeft'?'Shift':code==='KeyE'?'e':code,modifiers,windowsVirtualKeyCode:code==='ShiftLeft'?16:code==='ArrowLeft'?37:code==='KeyE'?69:39})
    const release=async()=>{await key('keyUp','ArrowRight');await key('keyUp','ArrowLeft');await key('keyUp','ShiftLeft')}
    const episodes=[]
    try {
      for(const [language,width,height,mobile] of [['zh',1440,900,false],['en',390,844,true]]) {
        await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1})
        await cdp('Emulation.setTouchEmulationEnabled',{enabled:mobile})
        await navigate(${JSON.stringify(url)},{timeout:20,settle:.5})
        for(let i=0;i<100;i++){if(await js('document.querySelector(".direction-button")?.disabled===false'))break;await wait(.1)}
        const activate=async selector=>{
          if(!mobile)return click(selector)
          const p=await js('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
          await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        }
        if(language==='zh')await activate('.language-button')
        await key('keyDown','ShiftLeft',8);await key('keyDown','ArrowRight',8)
        let end=false
        for(let i=0;i<450;i++){
          if(await js('!!document.querySelector(".avatar-switch")')){end=true;break}
          if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){
            await key('keyUp','ArrowRight');await activate('[data-door-id]')
            for(let j=0;j<120;j++){if(await js('!document.querySelector("[data-door-id]:disabled")'))break;await wait(.05)}
            await key('keyDown','ArrowRight',8)
          }
          await wait(.06)
        }
        await release();if(!end)throw Error('Outfit station not reached')
        await activate('.avatar-switch');for(let i=0;i<100;i++){if(await js('document.querySelector(".avatar-switch")?.disabled===false'))break;await wait(.03)}
        await key('keyDown','ShiftLeft',8);await key('keyDown','ArrowLeft',8)
        let npc=false
        for(let i=0;i<450;i++){if(await js(${JSON.stringify('!!document.querySelector(\'button[data-interaction-id="greeter"]\')')})){npc=true;break};await wait(.06)}
        await release();if(!npc)throw Error('Dressed visitor did not return to NPC')
        const recording=js(${JSON.stringify(`(() => new Promise((resolve,reject)=>{
          const samples=[];let first=null,last='';const started=performance.now();
          const sample=t=>{const node=document.querySelector('.npc-reaction');
            if(node&&getComputedStyle(node).visibility==='visible'){if(first===null)first=t;const stage=node.dataset.reactionStage,text=node.querySelector('.reaction-visible').textContent.replace('▏',''),signature=stage+text;
              if(signature!==last){const r=node.getBoundingClientRect();samples.push({t:t-first,stage,text,locked:!document.querySelector('button[data-interaction-id="greeter"]')&&!document.querySelector('dialog[open]'),inFrame:r.width>0&&r.left>=-1&&r.right<=innerWidth+1});last=signature;}}
            else if(first!==null&&!node){resolve({samples,finished:t-first});return;}
            if(t-started>8000){reject(Error('Reaction did not finish'));return;}requestAnimationFrame(sample);};requestAnimationFrame(sample);
        }))()`)} )
        await activate('button[data-interaction-id="greeter"]');await wait(.2);await key('keyDown','KeyE');await key('keyUp','KeyE')
        const result=await recording
        for(let i=0;i<100;i++){if(await js(${JSON.stringify('!!document.querySelector(\'button[data-interaction-id="greeter"]\')')}))break;await wait(.02)}
        await activate('button[data-interaction-id="greeter"]');await wait(.1)
        const repeatedDialogue=await js('!!document.querySelector(".npc-dialogue[open]")&&!document.querySelector(".npc-reaction")')
        await activate('.dialogue-toolbar button')
        episodes.push({language,...result,repeatedDialogue})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(episodes))
    } finally {await release();await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(episodes).toHaveLength(2);
  for (const episode of episodes) {
    expect(episode.samples[0].stage).toBe('surprise');
    expect(episode.samples[0].text).toBe('!');
    const typing = episode.samples.filter(sample => sample.stage === 'typing');
    expect(typing.length).toBeGreaterThan(2);
    expect(typing[0].t).toBeGreaterThan(800);
    expect(typing[0].t).toBeLessThan(1400);
    expect(episode.samples.at(-1)!.text).toBe(episode.language === 'zh' ? '新服装真好看' : 'Your new outfit looks great!');
    expect(episode.samples.every(sample => sample.locked && sample.inFrame)).toBe(true);
    expect(episode.finished).toBeGreaterThan(3200);
    expect(episode.finished).toBeLessThan(4000);
    expect(episode.repeatedDialogue).toBe(true);
  }
}, 180_000);
