import { expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runBrowser } from './browser';
import { startHeadlessBrowser } from './headless-browser';

const profiles = () => readdirSync(tmpdir()).filter(name => name.startsWith('mc2d-headless-chrome-')).sort();

test('the test driver uses headless Chrome, trusted input, real network events and a fresh disposable profile', async () => {
  const before = profiles();
  const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response(`<!doctype html><title>Silent check</title>
    <button id="target" onclick="document.body.dataset.trusted=String(event.isTrusted)">Test</button>
    <input aria-label="Text" onkeydown="document.body.dataset.keyTrusted=String(event.isTrusted)">
    <script>window.addEventListener('blur',()=>document.body.dataset.blurred='true')</script>`, { headers: { 'Content-Type': 'text/html' } }) });
  const url = `http://127.0.0.1:${server.port}/`;
  try {
    const result = await runBrowser<{ headless: boolean; trusted: string; keyTrusted: string; value: string; traffic: boolean; focus: boolean }>(`
      await cdp('Network.enable')
      await navigate(${JSON.stringify(url)})
      await click('#target');await click('input')
      await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',text:'a',windowsVirtualKeyCode:65})
      await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65})
      await js('localStorage.setItem("isolation-test","first")')
      const data=await js('({headless:navigator.userAgent.includes("HeadlessChrome"),trusted:document.body.dataset.trusted,keyTrusted:document.body.dataset.keyTrusted,value:document.querySelector("input").value,focus:document.hasFocus()})')
      const traffic=(await drainEvents()).some(event=>event.method==='Network.responseReceived')
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify({...data,traffic}))
    `);
    expect(result).toEqual({ headless: true, trusted: 'true', keyTrusted: 'true', value: 'a', traffic: true, focus: true });
    const isolated = await runBrowser<string | null>(`
      await navigate(${JSON.stringify(url)})
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify(await js('localStorage.getItem("isolation-test")')))
    `);
    expect(isolated).toBeNull();
    await expect(runBrowser(`await navigate(${JSON.stringify(url)});throw Error('intentional harness failure')`)).rejects.toThrow('intentional harness failure');
    expect(profiles()).toEqual(before);
  } finally { server.stop(true); }
}, 30_000);

test('a blank page keeps a full-speed refresh cadence', async () => {
  const browser = await startHeadlessBrowser();
  try {
    await browser.cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    const { frames, ticks } = await browser.evaluate<{ frames: number; ticks: number }>(`new Promise(resolve => {
      let frames = 0, ticks = 0;
      const timer = setInterval(() => ticks++, 4);
      const count = () => { frames++; requestAnimationFrame(count); };
      requestAnimationFrame(count);
      setTimeout(() => { clearInterval(timer); resolve({ frames, ticks }); }, 3000);
    })`);
    expect(frames / 3).toBeGreaterThanOrEqual(55);
    expect(ticks / 3).toBeGreaterThanOrEqual(200);
  } finally { await browser.close(); }
}, 30_000);

const chromeAlive = (profile: string) => Bun.spawnSync(['pgrep', '-f', profile]).exitCode === 0;

test('starting a browser removes leftovers whose launching process is gone', async () => {
  const scriptDir = mkdtempSync(path.join(tmpdir(), 'harness-orphan-'));
  const script = path.join(scriptDir, 'launch.ts');
  writeFileSync(script, `import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { startHeadlessBrowser } from ${JSON.stringify(path.resolve(import.meta.dir, 'headless-browser.ts'))};
const list = () => readdirSync(tmpdir()).filter(name => name.startsWith('mc2d-headless-chrome-'));
const before = new Set(list());
await startHeadlessBrowser();
console.log('PROFILE:' + list().filter(name => !before.has(name)).join(','));
await new Promise(() => {});
`);
  const child = Bun.spawn(['bun', script], { stdout: 'pipe', stderr: 'ignore' });
  let leftover: string | undefined;
  try {
    const reader = child.stdout.getReader();
    let output = '';
    while (!output.includes('\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      output += new TextDecoder().decode(value);
    }
    const names = output.trim().replace('PROFILE:', '').split(',').filter(Boolean);
    if (names[0]) leftover = path.join(tmpdir(), names[0]);
    expect(names).toHaveLength(1);
    child.kill('SIGKILL');
    await child.exited;
    expect(existsSync(leftover)).toBe(true);
    expect(chromeAlive(leftover)).toBe(true);

    const fresh = await startHeadlessBrowser();
    try {
      expect(existsSync(leftover)).toBe(false);
      expect(chromeAlive(leftover)).toBe(false);
    } finally { await fresh.close(); }
  } finally {
    child.kill('SIGKILL');
    if (leftover) { Bun.spawnSync(['pkill', '-f', leftover]); rmSync(leftover, { recursive: true, force: true }); }
    rmSync(scriptDir, { recursive: true, force: true });
  }
}, 60_000);

test('starting a second browser leaves a live one untouched', async () => {
  const a = await startHeadlessBrowser();
  let b: Awaited<ReturnType<typeof startHeadlessBrowser>> | undefined;
  try {
    b = await startHeadlessBrowser();
    expect(await a.evaluate<number>('1+1')).toBe(2);
  } finally { await b?.close(); await a.close(); }
}, 60_000);

test('a leftover directory name is not used as a pattern that kills unrelated processes', async () => {
  const decoyDir = path.join(tmpdir(), 'mc2d-headless-chrome-zz|harness-decoy');
  const decoy = Bun.spawn(['perl', '-e', 'sleep 30', 'harness-decoy'], { stdout: 'ignore', stderr: 'ignore' });
  try {
    mkdirSync(decoyDir);
    const past = new Date(Date.now() - 5 * 60_000);
    utimesSync(decoyDir, past, past);
    const browser = await startHeadlessBrowser();
    await browser.close();
    expect(() => process.kill(decoy.pid, 0)).not.toThrow();
  } finally {
    decoy.kill('SIGKILL');
    rmSync(decoyDir, { recursive: true, force: true });
  }
}, 60_000);
