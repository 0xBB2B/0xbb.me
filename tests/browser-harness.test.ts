import { expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runBrowser } from './browser';

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

test('real page deactivation still clears the application input when test focus emulation is disabled', async () => {
  const url = 'http://127.0.0.1:3000/';
  const result = await runBrowser<{ before: number; after: number; trustedDeactivation: boolean }>(`
    await navigate(${JSON.stringify(url)}, {settle:.5})
    await js('(async()=>{const {createInput}=await import("/portfolio/input.ts");window.__focusTestInput=createInput();window.__focusTestDetach=window.__focusTestInput.attach();window.addEventListener("blur",e=>window.__trustedDeactivation=e.isTrusted);document.addEventListener("visibilitychange",e=>{if(document.hidden)window.__trustedDeactivation=e.isTrusted})})()')
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
    const before=await js('window.__focusTestInput.direction()')
    if(!(await js('navigator.userAgent.includes("HeadlessChrome")')))throw Error('Focus test requires a windowless browser')
    // Switch only between virtual tabs in the windowless instance to deactivate the original page.
    const other=await cdp('Target.createTarget',{url:'about:blank',background:false})
    try {
      await wait(.1)
      const after=await js('window.__focusTestInput.direction()'),trustedDeactivation=await js('window.__trustedDeactivation')
      cliLog('PLAYABLE_TOWN_RESULT:'+JSON.stringify({before,after,trustedDeactivation}))
    } finally {
      await cdp('Target.closeTarget',{targetId:other.targetId})
      await js('window.__focusTestDetach();delete window.__focusTestInput;delete window.__focusTestDetach;delete window.__trustedDeactivation')
    }
  `, {emulateFocus:false});
  expect(result).toEqual({before:1,after:0,trustedDeactivation:true});
}, 30_000);
