import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = 'http://127.0.0.1:3000/';
type Frame = { x: number; y: number; outfit: string; armX: number; armZ: number; legX: number; legZ: number };

test('desktop Space jumps both outfits with real input, without auto-jump, page scrolling or mobile activation', async () => {
  const result = await runBrowser<{ held: Frame[]; running: Frame[]; takeoffRunning: Frame; dress: Frame[]; mobile: Frame[]; scrollY: number; coarse: boolean; jumpButtons: number }>(`
    await navigate(${JSON.stringify(url)}, {settle:.5})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,mobile:false,deviceScaleFactor:1})
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:false})
    for(let i=0;i<100;i++){if(await js('document.querySelector(".direction-button")?.disabled===false'))break;await wait(.05)}
    await js(${JSON.stringify(String.raw`(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>/\/three\.js(?:\?|$)/.test(e.name)).name;
      const T=await import(url),probe={prototype:T.Scene.prototype,original:T.Scene.prototype.onBeforeRender,frames:[]};
      window.__jumpProbe=probe;
      T.Scene.prototype.onBeforeRender=function(...args){const p=this.getObjectByName('Player_character');if(p&&probe.frames.length<300)probe.frames.push({x:p.position.x,y:p.position.y,outfit:p.userData.appearance,armX:p.getObjectByName('Left_arm').rotation.x,armZ:p.getObjectByName('Left_arm').rotation.z,legX:p.getObjectByName('Left_leg').parent.rotation.x,legZ:p.getObjectByName('Left_leg').parent.rotation.z});probe.original.apply(this,args)};
    })()`)} )
    const key=(type,code,modifiers=0,autoRepeat=false)=>cdp('Input.dispatchKeyEvent',{type,key:code==='Space'?' ':code==='ShiftLeft'?'Shift':code,code,modifiers,autoRepeat,windowsVirtualKeyCode:code==='Space'?32:code==='ShiftLeft'?16:39})
    const clear=()=>js('window.__jumpProbe.frames=[]')
    const read=()=>js('window.__jumpProbe.frames.splice(0)')
    try {
      await clear();await key('keyDown','Space');await wait(.2);await key('keyDown','Space',0,true);await wait(.9);await key('keyUp','Space');const held=await read()
      await clear();await key('keyDown','ShiftLeft',8);await key('keyDown','ArrowRight',8);await wait(.3)
      const takeoffRunning=(await read()).at(-1)
      await key('keyDown','Space',8);await wait(.75)
      await key('keyUp','Space');await key('keyUp','ArrowRight');await key('keyUp','ShiftLeft');const running=await read()
      await key('keyDown','ShiftLeft',8);await key('keyDown','ArrowRight',8)
      let reached=false
      for(let i=0;i<400;i++){
        if(await js('!!document.querySelector(".avatar-switch")')){reached=true;break}
        if(await js('!!document.querySelector("[data-door-id]:not(:disabled)")')){
          await key('keyUp','ArrowRight');await click('[data-door-id]')
          for(let j=0;j<100;j++){if(await js('!document.querySelector("[data-door-id]:disabled")'))break;await wait(.03)}
          await key('keyDown','ArrowRight',8)
        }
        await wait(.06)
      }
      await key('keyUp','ArrowRight');await key('keyUp','ShiftLeft');if(!reached)throw Error('Outfit switch not reached')
      await click('.avatar-switch');for(let i=0;i<100;i++){if(await js('document.querySelector(".avatar-switch")?.disabled===false'))break;await wait(.03)}
      await click('canvas');await clear();await key('keyDown','Space');await key('keyUp','Space');await wait(.85);const dress=await read()
      await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true})
      await clear();await key('keyDown','Space');await key('keyUp','Space');await wait(.8);const mobile=await read()
      const page=await js('({scrollY,coarse:matchMedia("(pointer: coarse)").matches,jumpButtons:[...document.querySelectorAll("button")].filter(b=>/jump|跳跃/i.test(b.getAttribute("aria-label")||b.textContent)).length})')
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify({held,running,takeoffRunning,dress,mobile,...page}))
    } finally {
      await key('keyUp','Space');await key('keyUp','ArrowRight');await key('keyUp','ShiftLeft')
      await js('window.__jumpProbe.prototype.onBeforeRender=window.__jumpProbe.original;delete window.__jumpProbe')
      await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp('Emulation.clearDeviceMetricsOverride')
    }
  `);
  for (const [frames, lead] of [[result.held, -1], [result.running, Math.sign(result.takeoffRunning.legX)], [result.dress, -1]] as const) {
    expect(frames.length).toBeGreaterThan(10);
    expect(Math.max(...frames.map(frame => frame.y))).toBeGreaterThan(.8);
    expect(frames.at(-1)!.y).toBeCloseTo(.035, 5);
    const heldPose = frames.filter(frame => frame.y > .64);
    expect(heldPose.length).toBeGreaterThan(5);
    for (const frame of heldPose) {
      expect(Math.abs(frame.armZ)).toBeLessThan(.1); expect(frame.legZ).toBeCloseTo(0, 5);
      expect(frame.armX).toBeCloseTo(-lead * .65, 5); expect(frame.legX).toBeCloseTo(lead * .52, 5);
    }
    expect(frames.at(-1)!.legZ).toBe(0);
  }
  const takeoffs = result.held.filter((frame, index) => frame.y > .04 && (index === 0 || result.held[index - 1].y <= .04));
  expect(takeoffs).toHaveLength(1);
  expect(result.running.at(-1)!.x - result.running[0].x).toBeGreaterThan(3);
  expect(result.dress.every(frame => frame.outfit === 'dress')).toBe(true);
  expect(result.coarse).toBe(true);
  expect(result.mobile.length).toBeGreaterThan(10);
  for (const frame of result.mobile) expect(frame.y).toBeCloseTo(.035, 5);
  expect(result.jumpButtons).toBe(0); expect(result.scrollY).toBe(0);
}, 90_000);
