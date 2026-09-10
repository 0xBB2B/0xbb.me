import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { startHeadlessBrowser } from './headless-browser';

const url = 'http://127.0.0.1:4191/';
let preview: ReturnType<typeof Bun.spawn>;
beforeAll(async () => {
  preview = Bun.spawn(['bun', 'run', 'preview', '--host', '127.0.0.1', '--port', '4191', '--strictPort'], { stdout: 'pipe', stderr: 'pipe' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return; } catch {} await Bun.sleep(100); }
  throw Error('Production preview did not start');
});
afterAll(async () => { if (preview) { preview.kill(); await preview.exited; } });

test('production desktop keeps 95% of frame gaps within 33.4 ms over a complete 30-second cross-scene walk', async () => {
  const chrome = await startHeadlessBrowser();
  const { cdp, evaluate } = chrome;
  const key = (type: string, code: string) => cdp('Input.dispatchKeyEvent', {
    type, key: code === 'KeyE' ? 'e' : code, code, windowsVirtualKeyCode: code === 'KeyE' ? 69 : code === 'ArrowRight' ? 39 : 37,
  });
  type Frames = { times: number[]; scenes: string[]; visibility: string[]; focusChanges: Array<{ t: number; focused: boolean }>; viewport: number[]; done: boolean };
  try {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });
    await cdp('Page.navigate', { url });
    let ready = false;
    for (let i = 0; i < 150; i++) {
      if (await evaluate<boolean>('document.querySelector(".direction-button")?.disabled === false')) { ready = true; break; }
      await Bun.sleep(100);
    }
    if (!ready) throw Error('Graphics never became ready for the production benchmark');
    await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    const browser = await cdp('Browser.getVersion');
    const gpu = await evaluate(`(() => {const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};})()`);
    await evaluate(`(() => {
      const data={times:[],scenes:[],visibility:[],focusChanges:[],viewport:[innerWidth,innerHeight],done:false,frame:0};window.__mc2dFrames=data;let first=null;
      const sample=t=>{if(first===null)first=t;data.times.push(t);const scene=document.querySelector('[aria-label="Current scene"]').textContent;
        if(data.scenes.at(-1)!==scene)data.scenes.push(scene);const focused=document.hasFocus();if(data.focusChanges.at(-1)?.focused!==focused)data.focusChanges.push({t,focused});
        const visibility=document.visibilityState;if(data.visibility.at(-1)!==visibility)data.visibility.push(visibility);
        if(t-first>=30000){data.done=true;return;}data.frame=requestAnimationFrame(sample);};data.frame=requestAnimationFrame(sample);
    })()`);
    let direction = 'ArrowRight', done = false;
    await key('keyDown', direction);
    for (let i = 0; i < 180 && !done; i++) {
      const state = await evaluate<{ done: boolean; door: boolean; lighthouse: boolean }>('({done:window.__mc2dFrames.done,door:!!document.querySelector("[data-door-id]:not(:disabled)"),lighthouse:!!document.querySelector(".lighthouse-note")})');
      done = state.done;
      if (done) break;
      if (state.door) {
        await key('keyUp', direction); await key('keyDown', 'KeyE'); await key('keyUp', 'KeyE');
        // Let React render the opening state before testing the enabled control.
        await Bun.sleep(80);
        for (let j = 0; j < 100; j++) { if (await evaluate('!document.querySelector("[data-door-id]:disabled")')) break; await Bun.sleep(30); }
        await key('keyDown', direction);
      }
      if (direction === 'ArrowRight' && state.lighthouse) { await key('keyUp', direction); direction = 'ArrowLeft'; await key('keyDown', direction); }
      await Bun.sleep(250);
    }
    if (!done) throw Error('30-second frame sample did not finish');
    await key('keyUp', direction);
    const result = await evaluate<Frames>('window.__mc2dFrames');
    const command = (args: string[]) => Bun.spawnSync(args).stdout.toString().trim();
    const gaps = result.times.slice(1).map((t, i) => t - result.times[i]);
    const sorted = [...gaps].sort((a, b) => a - b);
    const p95 = Number(sorted[Math.ceil(sorted.length * .95) - 1].toFixed(3));
    const validJourney = result.visibility.every(state => state === 'visible') && result.scenes.includes('Tech workshop') && result.scenes.includes('Starlit shore');
    const record = { capturedAt: new Date().toISOString(), source: 'production dist, independent headless Chrome profile, real keyboard input, no discarded frames',
      browserMode: 'headless',
      runLabel: process.env.PERF_RUN_LABEL ?? 'release', entrySha256: createHash('sha256').update(readFileSync(new URL('../dist/index.html', import.meta.url))).digest('hex'),
      device: { model: command(['sysctl', '-n', 'hw.model']), chip: command(['sysctl', '-n', 'machdep.cpu.brand_string']), os: command(['sw_vers', '-productVersion']) },
      ...result, browser, gpu, samplingPollMs: 250, focusEmulated: true, doorInput: 'keyboard E', durationMs: result.times.at(-1)! - result.times[0],
      p95, maximum: Math.max(...gaps), threshold: 33.4, passed: validJourney && p95 <= 33.4 };
    const evidence = new URL('../artifacts/release-performance.json', import.meta.url);
    const previous = existsSync(evidence) ? JSON.parse(readFileSync(evidence, 'utf8')) : [];
    writeFileSync(evidence, JSON.stringify([...(Array.isArray(previous) ? previous : [previous]), record], null, 2) + '\n');
    console.info('Production frame timing', { p95, maximum: record.maximum, durationMs: record.durationMs, frames: result.times.length, scenes: result.scenes });
    expect(result.viewport).toEqual([1440, 900]); expect(result.visibility).toEqual(['visible']);
    expect(record.durationMs).toBeGreaterThanOrEqual(30_000);
    expect(result.scenes).toContain('Dusk town'); expect(result.scenes).toContain('Tech workshop'); expect(result.scenes).toContain('Starlit shore');
    expect(p95).toBeLessThanOrEqual(33.4);
  } finally {
    try { await key('keyUp', 'ArrowRight'); await key('keyUp', 'ArrowLeft'); } finally { await chrome.close(); }
  }
}, 90_000);
