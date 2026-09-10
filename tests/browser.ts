import { startHeadlessBrowser } from './headless-browser';

// These scripts drive an actual isolated Chrome page, not a simulated DOM or mocked application.
export async function runBrowser<T>(source: string, { emulateFocus = true } = {}): Promise<T> {
  const browser = await startHeadlessBrowser();
  const { cdp, evaluate: js } = browser;
  const wait = (seconds: number) => Bun.sleep(seconds * 1000);
  let result: T | undefined;
  const messages: unknown[] = [];
  const cliLog = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('PLAYABLE_TOWN_RESULT:')) result = JSON.parse(value.slice('PLAYABLE_TOWN_RESULT:'.length));
    else messages.push(value);
  };
  const navigate = async (url: string, { timeout = 20, settle = 0 } = {}) => {
    const response = await cdp('Page.navigate', { url });
    if (response.errorText) throw Error(`Navigation failed: ${response.errorText}`);
    const deadline = performance.now() + timeout * 1000;
    while (performance.now() < deadline) {
      let ready = false;
      try { ready = await js<boolean>(`document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`); }
      catch (error) { if (!/context.*(destroyed|found)|Cannot find context/i.test(String(error))) throw error; }
      if (ready) { if (settle) await wait(settle); return; }
      await wait(.025);
    }
    throw Error(`Navigation did not finish: ${url}`);
  };
  const click = async (target: string | [number, number]) => {
    let point: { x: number; y: number } | undefined;
    if (typeof target === 'string') {
      for (let i = 0; i < 100; i++) {
        point = await js(`(() => {
          const el=document.querySelector(${JSON.stringify(target)});
          if(!el || el.disabled)return null;
          el.scrollIntoView({block:'nearest',inline:'nearest'});
          const r=el.getBoundingClientRect(),style=getComputedStyle(el);
          if(!r.width||!r.height||style.visibility==='hidden'||style.display==='none')return null;
          const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
          return hit&&(hit===el||el.contains(hit))?{x,y}:null;
        })()`);
        if (point) break;
        await wait(.025);
      }
      if (!point) throw Error(`Clickable element not found: ${target}`);
    } else point = { x: target[0], y: target[1] };
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  };
  try {
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Emulation.setFocusEmulationEnabled', { enabled: emulateFocus });
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    await new AsyncFunction('cdp', 'js', 'navigate', 'wait', 'click', 'drainEvents', 'cliLog', source)(
      cdp, js, navigate, wait, click, browser.drainEvents, cliLog,
    );
    if (result === undefined) throw Error(`Browser script returned no observation: ${JSON.stringify(messages)}`);
    return result;
  } finally { await browser.close(); }
}
