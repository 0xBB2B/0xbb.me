import { expect, test } from 'bun:test';
import { runBrowser } from './browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('first entry and first exit have no quarter-second first-draw stall after graphics are ready', async () => {
  const recordings = await runBrowser<Array<{ door: string; times: number[]; scenes: string[]; visible: string }>>(`
    await useOrCreateTaskSpace('hd2d-portfolio')
    await openOrReuseTab(${JSON.stringify(url)},{wait:true,timeout:20})
    await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
    await gotoAndWait(${JSON.stringify(url)},{timeout:20,settle:1})
    let ready=false
    for(let i=0;i<100;i++){
      if(await js(${JSON.stringify('document.querySelector(\'button[aria-label="Move right"]\')?.disabled === false')})){ready=true;break}
      await wait(.1)
    }
    if(!ready)throw Error('Graphics never became ready for first-door timing')
    const key=type=>cdp('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const recordings=[]
    try{
      for(const door of ['town-door','sea-door']){
        await key('keyDown');let found=false
        try{for(let i=0;i<320;i++){await wait(.1);if(await js('document.querySelector("[data-door-id]")?.dataset.doorId')===door){found=true;break}}await wait(.8)}finally{await key('keyUp')}
        if(!found)throw Error('Door timing checkpoint not reached: '+door)
        await click('[data-door-id]');await wait(1)
        const recording=js(${JSON.stringify(`new Promise(resolve=>{
          const times=[],scenes=[],label=document.querySelector('[aria-label="Current scene"]');let first=0,last='';
          const sample=t=>{if(!first)first=t;times.push(t);const scene=label.textContent;if(scene!==last){scenes.push(scene);last=scene}
            if(t-first<3000)requestAnimationFrame(sample);else resolve({times,scenes,visible:document.visibilityState})};
          requestAnimationFrame(sample);
        })`)} )
        await key('keyDown');let data;try{data=await recording}finally{await key('keyUp')}
        recordings.push({door,...data})
      }
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(recordings))
    }finally{await key('keyUp');await cdp('Emulation.clearDeviceMetricsOverride')}
  `);
  expect(recordings).toHaveLength(2);
  for (const [index, recording] of recordings.entries()) {
    expect(recording.visible).toBe('visible');
    expect(recording.scenes).toEqual(index === 0 ? ['Dusk town', 'Tech workshop'] : ['Tech workshop', 'Starlit shore']);
    expect(recording.times.at(-1)! - recording.times[0]).toBeGreaterThanOrEqual(3000);
    const gaps = recording.times.slice(1).map((time, i) => time - recording.times[i]);
    expect(gaps.length).toBeGreaterThan(30);
    const sorted = [...gaps].sort((a, b) => a - b);
    console.info('First-door frame timing', { door: recording.door, max: Math.max(...gaps), p95: sorted[Math.ceil(sorted.length * .95) - 1], samples: gaps.length });
    expect(Math.max(...gaps), recording.door).toBeLessThan(250);
  }
}, 90_000);
