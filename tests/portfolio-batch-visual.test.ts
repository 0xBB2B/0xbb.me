import { expect, test } from 'bun:test';
import { startHeadlessBrowser } from './headless-browser';

const url = process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3000/';

test('batched scenery keeps original pixels across all three scenes and desktop/mobile camera sizes', async () => {
  const chrome = await startHeadlessBrowser();
  try {
    await chrome.cdp('Page.navigate', { url });
    for (let i = 0; i < 120; i++) { if (await chrome.evaluate('document.querySelector(".direction-button")?.disabled===false')) break; await Bun.sleep(100); }
    const result = await chrome.evaluate<Array<{ width: number; height: number; x: number; changedFraction: number; callsBefore: number; callsAfter: number }>>(`(async()=>{
      const moduleUrl=performance.getEntriesByType('resource').find(e=>/\\/three\\.js(?:\\?|$)/.test(e.name)).name;
      const T=await import(moduleUrl),{createWorld}=await import('/portfolio/world.ts'),{createSession}=await import('/portfolio/state.ts'),
        {batchStaticScenery}=await import('/portfolio/static-batches.ts'),{disposeScene}=await import('/portfolio/geometry.ts');
      const results=[];
      for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
        const world=createWorld(),session=createSession(),renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
        renderer.setPixelRatio(1);renderer.setSize(width,height);renderer.outputColorSpace=T.SRGBColorSpace;
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
        const viewHeight=height<500?10:15,targetHeight=width<600?3.8:3.5,halfWidth=viewHeight*width/height/2;
        const camera=new T.OrthographicCamera(-halfWidth,halfWidth,viewHeight/2,-viewHeight/2,.1,120),before=[];
        const render=x=>{session.x=x;world.updateEnvironment(x);world.updateRoom(session);world.updateAmbient(0,false);
          camera.position.set(x,targetHeight+5,20);camera.lookAt(x,targetHeight,0);renderer.render(world.scene,camera);
          const gl=renderer.getContext(),pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          return {pixels,calls:renderer.info.render.calls};};
        try {
          for(const x of [-8,30,65])before.push(render(x));batchStaticScenery(world.scene);
          for(const [index,x] of [-8,30,65].entries()){
            const after=render(x);let changed=0;
            for(let p=0;p<after.pixels.length;p+=4){let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(after.pixels[p+c]-before[index].pixels[p+c]));if(delta>3)changed++;}
            results.push({width,height,x,changedFraction:changed/(width*height),callsBefore:before[index].calls,callsAfter:after.calls});
          }
        } finally {disposeScene(world.scene);renderer.dispose();renderer.forceContextLoss();}
      }
      return results;
    })()`);
    console.info('Scenery batch comparison', JSON.stringify({ capturedAt: new Date().toISOString(), mode: 'same renderer, same geometry/colors/lights/camera, only static batching differs', results: result }));
    expect(result).toHaveLength(9);
    for (const frame of result) {
      expect(frame.changedFraction, `${frame.width}x${frame.height} scene x=${frame.x}`).toBeLessThan(.0002);
      expect(frame.callsAfter).toBeLessThan(frame.callsBefore);
    }
  } finally { await chrome.close(); }
}, 90_000);
