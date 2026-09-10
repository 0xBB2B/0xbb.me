import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('keyboard and touch open both room doors, reveal terminals, read bilingually and return on the same canvas', async () => {
  const results = await runBrowser<Array<{ viewport: string; opened: string[]; blocked: boolean; beforeHidden: boolean; openEntranceHidden: boolean; revealed: boolean; clearedInput: boolean; read: boolean; returned: boolean; sameCanvas: boolean }>>(`
    await navigate(${JSON.stringify(url)},{timeout:20})
    const results=[]
    const sample=()=>js(${JSON.stringify(`(() => {
      const panel=document.querySelector('.world-board[data-board-id="ai-agent"]');
      const prompt=document.querySelector('[data-door-id]');
      const r=prompt?.getBoundingClientRect();
      return {x:panel?.getBoundingClientRect().x,visible:panel&&getComputedStyle(panel).visibility==='visible',door:prompt?.dataset.doorId,
        doorVisible:!!r&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,disabled:prompt?.disabled,
        scene:document.querySelector('[aria-label="Current scene"]')?.textContent,reader:document.querySelector('dialog[open] [data-board-id]')?.dataset.boardId,
        view:!!document.querySelector('button[aria-label="View"]')};
    })()`)} )
    const canvas=async()=>{const d=await cdp('DOM.getDocument',{depth:0}),q=await cdp('DOM.querySelector',{nodeId:d.root.nodeId,selector:'canvas'});return(await cdp('DOM.describeNode',{nodeId:q.nodeId})).node.backendNodeId}
    for(const [width,height,mobile] of [[1440,900,false],[390,844,true],[844,390,true]]){
      await cdp('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});await cdp('Emulation.setTouchEmulationEnabled',{enabled:mobile})
      await navigate(${JSON.stringify(url)},{timeout:20,settle:1})
      const firstCanvas=await canvas();let held=false
      const key=(type,side)=>cdp('Input.dispatchKeyEvent',{type,key:side==='right'?'ArrowRight':'ArrowLeft',code:side==='right'?'ArrowRight':'ArrowLeft',windowsVirtualKeyCode:side==='right'?39:37})
      const release=async side=>{if(!held)return;if(mobile)await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await key('keyUp',side);held=false}
      const pointFor=selector=>js('('+${JSON.stringify('(selector)=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}')}+')('+JSON.stringify(selector)+')')
      const hold=async side=>{if(mobile){const point=await pointFor('button[aria-label="Move '+side+'"]');await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]})}else await key('keyDown',side);held=true}
      const interact=async()=>{if(mobile){const p=await js('(()=>{const r=document.querySelector("[data-door-id]").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE',windowsVirtualKeyCode:69});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE',windowsVirtualKeyCode:69})}}
      const walkUntil=async(side,condition,max=400)=>{await hold(side);let reached=false;try{for(let i=0;i<max;i++){await wait(.1);if(condition(await sample())){reached=true;break}}}finally{await release(side)};if(!reached)throw Error('Failed to reach room checkpoint '+width)}
      try{
        await walkUntil('right',f=>f.door==='town-door');await hold('right');await wait(1.4);await release('right');await wait(.6)
        const stopped=await sample();await wait(.3);const still=await sample()
        if(!stopped.doorVisible)throw Error('Entry prompt clipped')
        const opened=[stopped.door]
        await interact();await wait(.12);const opening=await sample();if(!opening.disabled)throw Error('Door animation did not start')
        await hold('right');await wait(1);const openedFrame=await sample();await release('right')
        const clearedInput=Math.abs(openedFrame.x-stopped.x)<1
        await walkUntil('right',f=>f.view);await wait(.5);const inside=await sample()
        await click('button[aria-label="View"]');await wait(.2);const english=await sample()
        await click('button[aria-label="Close details"]');await click('button[aria-label="Language"]');await click('button[aria-label="查看"]');await wait(.2);const chinese=await sample()
        await click('button[aria-label="关闭详情"]');await click('button[aria-label="语言"]')
        await walkUntil('right',f=>f.door==='sea-door');await hold('right');await wait(1.4);await release('right')
        const exit=await sample();if(!exit.doorVisible)throw Error('Exit prompt clipped');opened.push(exit.door)
        await interact();await wait(1);await walkUntil('right',f=>f.scene==='Starlit shore')
        await walkUntil('left',f=>f.scene==='Dusk town')
        results.push({viewport:width+'x'+height,opened,blocked:Math.abs(stopped.x-still.x)<1,beforeHidden:!stopped.visible,openEntranceHidden:!openedFrame.visible,revealed:inside.visible,clearedInput,read:english.reader==='ai-agent'&&chinese.reader===english.reader,returned:(await sample()).scene==='Dusk town',sameCanvas:await canvas()===firstCanvas})
      }finally{await release('right');await release('left')}
    }
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp('Emulation.clearDeviceMetricsOverride')
    cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(results))
  `);
  expect(results).toHaveLength(3);
  for (const result of results) {
    expect(result.opened).toEqual(['town-door', 'sea-door']);
    for (const key of ['blocked', 'beforeHidden', 'openEntranceHidden', 'revealed', 'clearedInput', 'read', 'returned', 'sameCanvas'] as const) {
      expect(result[key], `${result.viewport} ${key}`).toBe(true);
    }
  }
}, 240_000);
