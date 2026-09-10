import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// A dedicated headless Chrome profile keeps automated rendering checks off the user's desktop.
// No browser downloads, third-party automation dependencies, GPU overrides or virtual time.
export async function startHeadlessBrowser() {
  const executable = process.env.PORTFOLIO_CHROME_PATH ?? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(candidate => existsSync(candidate));
  if (!executable) throw Error('Install Chrome separately or set PORTFOLIO_CHROME_PATH for the headless browser checks');
  const directory = mkdtempSync(path.join(tmpdir(), 'mc2d-headless-chrome-'));
  const browser = Bun.spawn([executable, '--headless=new', `--user-data-dir=${directory}`, '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'about:blank'],
  { stdout: 'ignore', stderr: 'ignore' });
  let socket: WebSocket | undefined;
  let nextId = 0;
  const events: Array<{ method: string; params: any }> = [];
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const close = async () => {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(Error('Headless browser closed')); }
    pending.clear(); socket?.close(); browser.kill(); await browser.exited;
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  try {
    const endpoint = path.join(directory, 'DevToolsActivePort');
    for (let i = 0; i < 150 && !existsSync(endpoint); i++) await Bun.sleep(100);
    if (!existsSync(endpoint)) throw Error('The isolated Chrome did not expose its local debugging endpoint');
    const port = readFileSync(endpoint, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
    const page = targets.find(target => target.type === 'page');
    if (!page) throw Error('Isolated Chrome has no page target');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket!.addEventListener('open', () => resolve(), { once: true }); socket!.addEventListener('error', () => reject(Error('Chrome connection failed')), { once: true }); });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method) { events.push(message); return; }
      const item = pending.get(message.id); if (!item) return;
      clearTimeout(item.timer); pending.delete(message.id);
      if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
    });
    const cdp = (method: string, params: Record<string, unknown> = {}): Promise<any> => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`Chrome protocol timeout: ${method}`)); }, 45_000);
      pending.set(id, { resolve, reject, timer }); socket!.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async <T>(expression: string): Promise<T> => {
      const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value as T;
    };
    return { cdp, evaluate, drainEvents: () => events.splice(0), close };
  } catch (error) { await close(); throw error; }
}
