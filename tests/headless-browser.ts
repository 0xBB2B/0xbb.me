import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const profilePrefix = 'mc2d-headless-chrome-';
const profileName = /^mc2d-headless-chrome-[A-Za-z0-9]{6}$/;

// Literal matching: a profile path must never be interpreted as a pattern that reaches unrelated processes.
const processesFor = (directory: string) => Bun.spawnSync(['ps', '-axo', 'pid=,command=']).stdout.toString().split('\n')
  .filter(line => line.includes(`--user-data-dir=${directory}`)).map(line => Number(line.trim().split(/\s+/)[0]))
  .filter(pid => pid !== process.pid);

const signalAll = (pids: number[], signal: NodeJS.Signals) => {
  for (const pid of pids) {
    try { process.kill(pid, signal); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
  }
};

async function killProcessesFor(directory: string) {
  signalAll(processesFor(directory), 'SIGTERM');
  for (let i = 0; i < 50 && processesFor(directory).length; i++) await Bun.sleep(100);
  signalAll(processesFor(directory), 'SIGKILL');
  for (let i = 0; i < 20 && processesFor(directory).length; i++) await Bun.sleep(100);
}

const isAlive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
};

async function removeLeftovers() {
  for (const name of readdirSync(tmpdir()).filter(entry => profileName.test(entry))) {
    const directory = path.join(tmpdir(), name);
    const marker = path.join(directory, 'owner.pid');
    let orphaned: boolean;
    try {
      // A directory without a marker may belong to a concurrent starter that has not written it yet.
      orphaned = existsSync(marker)
        ? !isAlive(Number(readFileSync(marker, 'utf8')))
        : Date.now() - statSync(directory).mtimeMs > 60_000;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!orphaned) continue;
    await killProcessesFor(directory);
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

async function launchBrowser(executable: string, directory: string, args: string[]) {
  const app = process.platform === 'darwin' ? executable.match(/^(.*?\.app)\//)?.[1] : undefined;
  if (!app) {
    const browser = Bun.spawn([executable, ...args], { stdout: 'ignore', stderr: 'ignore' });
    return async () => { browser.kill(); await browser.exited; };
  }
  // Spawning Chrome directly inherits the caller's low scheduling priority, which throttles its timers and frame cadence.
  await Bun.spawn(['/usr/bin/open', '-n', '-g', '-j', '-a', app, '--args', ...args], { stdout: 'ignore', stderr: 'ignore' }).exited;
  return () => killProcessesFor(directory);
}

// A dedicated headless Chrome profile keeps automated rendering checks off the user's desktop.
// No browser downloads, third-party automation dependencies, GPU overrides or virtual time.
export async function startHeadlessBrowser() {
  await removeLeftovers();
  const executable = process.env.PORTFOLIO_CHROME_PATH ?? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(candidate => existsSync(candidate));
  if (!executable) throw Error('Install Chrome separately or set PORTFOLIO_CHROME_PATH for the headless browser checks');
  const directory = mkdtempSync(path.join(tmpdir(), profilePrefix));
  writeFileSync(path.join(directory, 'owner.pid'), String(process.pid));
  const stopBrowser = await launchBrowser(executable, directory, ['--headless=new', `--user-data-dir=${directory}`, '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'about:blank']);
  let socket: WebSocket | undefined;
  let nextId = 0;
  const events: Array<{ method: string; params: any }> = [];
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const close = async () => {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(Error('Headless browser closed')); }
    pending.clear(); socket?.close(); await stopBrowser();
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
