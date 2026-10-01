// 依赖 dist/ 为最新构建产物：运行前先执行 `bun run build`，本文件不重复构建。
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import path from 'node:path';
import { preview, type PreviewServer } from 'vite';
import { runBrowser } from './browser';
import { APP_DATA } from '../data';

const ROOT = path.resolve(import.meta.dir, '..');
const PORT = 4210;
const PROFILE_URL = `http://127.0.0.1:${PORT}/profile/`;
const TIMEOUT = 120_000;

let server: PreviewServer;

beforeAll(async () => {
  server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: PORT, strictPort: true } });
});

afterAll(async () => {
  await server.close();
});

const HELPERS = `
  const log = [];
  const mode = { print: 'pass', avatar: 'pass', script: 'pass' };
  const held = [];
  let pumping = true;
  const requestsFor = (needle) => log.filter(e => e.method === 'Network.requestWillBeSent' && e.params.request.url.includes(needle)).length;
  const pump = (async () => {
    while (pumping) {
      for (const event of drainEvents()) {
        log.push(event);
        if (event.method !== 'Fetch.requestPaused') continue;
        const { requestId, request } = event.params;
        const key = request.url.includes('profile-full-print.jpg') ? 'print' : /\\/assets\\/profile-[^/]*\\.js/.test(request.url) ? 'script' : 'avatar';
        try {
          if (mode[key] === 'hold') { held.push({ key, requestId }); continue; }
          if (mode[key] === 'fail') await cdp('Fetch.failRequest', { requestId, errorReason: 'Failed' });
          else if (mode[key] === '404') await cdp('Fetch.fulfillRequest', { requestId, responseCode: 404, body: '' });
          else await cdp('Fetch.continueRequest', { requestId });
        } catch {}
      }
      await wait(0.02);
    }
  })();
  const release = async (key) => {
    mode[key] = 'pass';
    const targets = held.filter(item => item.key === key);
    for (const item of targets) held.splice(held.indexOf(item), 1);
    for (const item of targets) await cdp('Fetch.continueRequest', { requestId: item.requestId });
  };
  const done = (value) => cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(value));
  const until = async (expression, seconds = 20) => {
    const deadline = Date.now() + seconds * 1000;
    while (Date.now() < deadline) {
      if (await js(expression)) return true;
      await wait(0.05);
    }
    return false;
  };
  const AVATAR = 'button[aria-haspopup=dialog]';
  const DIALOG = '[role=dialog]';
  const activeLabel = () => js('document.activeElement?.getAttribute("aria-label") ?? null');
  const activeIsAvatar = () => js('document.activeElement === document.querySelector(' + JSON.stringify(AVATAR) + ')');
  async function open(locale, { hydrate = true, width = 1440, height = 900, holdScript = 0, mobile = false } = {}) {
    await cdp('Network.enable');
    await cdp('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*profile-full-print.jpg*' }, { urlPattern: '*profile.jpg*' }, { urlPattern: '*/assets/profile-*.js' }] });
    await cdp('Emulation.setUserAgentOverride', { userAgent: await js('navigator.userAgent'), acceptLanguage: locale });
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    if (holdScript) {
      mode.script = 'hold';
      await cdp('Page.navigate', { url: ${JSON.stringify(PROFILE_URL)} });
      await wait(holdScript);
      await release('script');
    } else await navigate(${JSON.stringify(PROFILE_URL)});
    if (hydrate) {
      await until('!!document.querySelector(".language-toggle")');
      await wait(0.8);
    }
  }
  async function pressEscape() {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  }
  async function openPhoto() {
    await click(AVATAR);
    await until('!!document.querySelector(' + JSON.stringify(DIALOG) + ')');
    await wait(0.8);
  }
  const bodyText = () => js('document.body.innerText');
`;

const session = <T>(body: string) =>
  runBrowser<T>(`${HELPERS}\ntry {\n${body}\n} finally { pumping = false; await pump; }`);

describe('独立资料页不带三维场景', () => {
  test('没有 world-*.js 请求，DOM 里没有 canvas', async () => {
    const result = await session<{ worldRequests: string[]; canvases: number; hasReceipt: boolean }>(`
      await open('en-US');
      await wait(1);
      done({
        worldRequests: log.filter(e => e.method === 'Network.requestWillBeSent' && /\\/world-[^/]*\\.js/.test(e.params.request.url)).map(e => e.params.request.url),
        canvases: await js('document.querySelectorAll("canvas").length'),
        hasReceipt: await js('!!document.querySelector(".receipt")'),
      });
    `);
    expect(result.hasReceipt).toBe(true);
    expect(result.worldRequests).toEqual([]);
    expect(result.canvases).toBe(0);
  }, TIMEOUT);

  test('小票水平居中', async () => {
    const result = await session<{ center: number; viewport: number }>(`
      await open('en-US');
      done(await js('(() => { const r = document.querySelector(".receipt").getBoundingClientRect(); return { center: r.x + r.width / 2, viewport: document.documentElement.clientWidth }; })()'));
    `);
    expect(Math.abs(result.center - result.viewport / 2)).toBeLessThanOrEqual(2);
  }, TIMEOUT);
});

describe('按浏览器语言选择显示语言', () => {
  test('en-US 显示英文', async () => {
    const result = await session<{ text: string; lang: string }>(`
      await open('en-US');
      done({ text: await bodyText(), lang: await js('document.documentElement.lang') });
    `);
    expect(result.text).toContain('FUBUKI_BB');
    expect(result.text).toContain('Full Stack Engineer');
    expect(result.text).toContain(APP_DATA.profile.bio.en);
    expect(result.text).not.toContain('雨夜里还亮着的店');
    expect(result.lang).toBe('en');
  }, TIMEOUT);

  test('zh-CN 显示中文，html lang 为 zh-CN', async () => {
    const result = await session<{ text: string; lang: string }>(`
      await open('zh-CN');
      done({ text: await bodyText(), lang: await js('document.documentElement.lang') });
    `);
    expect(result.text).toContain('雨夜里还亮着的店');
    expect(result.text).toContain('← 去看 3D 雨夜街角');
    expect(result.text).toContain(APP_DATA.profile.bio.zh);
    expect(result.lang).toBe('zh-CN');
  }, TIMEOUT);

  test('language 以 ZH 开头（不区分大小写）也显示中文', async () => {
    const result = await session<{ text: string }>(`
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator, 'language', { get: () => 'ZH-hk' })" });
      await open('en-US');
      done({ text: await bodyText() });
    `);
    expect(result.text).toContain('雨夜里还亮着的店');
  }, TIMEOUT);

  test('ja-JP 等非中文语言显示英文', async () => {
    const result = await session<{ text: string }>(`
      await open('ja-JP');
      done({ text: await bodyText() });
    `);
    expect(result.text).toContain('Still open on a rainy night');
    expect(result.text).not.toContain('雨夜里还亮着的店');
  }, TIMEOUT);
});

describe('EN / 中 语言开关', () => {
  test('当前语言按钮 aria-pressed 为 true，另一个为 false', async () => {
    const result = await session<{ pressed: Array<[string, string | null]> }>(`
      await open('zh-CN');
      done({ pressed: await js('[...document.querySelectorAll(".language-toggle button")].map(b => [b.textContent.trim(), b.getAttribute("aria-pressed")])') });
    `);
    expect(result.pressed).toEqual([['EN', 'false'], ['中', 'true']]);
  }, TIMEOUT);

  test('点「EN」「中」后小票文字、按钮状态与 html lang 同步更新', async () => {
    const result = await session<Array<{ text: string; lang: string; pressed: Array<string | null> }>>(`
      const snapshot = async () => ({
        text: await bodyText(),
        lang: await js('document.documentElement.lang'),
        pressed: await js('[...document.querySelectorAll(".language-toggle button")].map(b => b.getAttribute("aria-pressed"))'),
      });
      await open('zh-CN');
      const steps = [await snapshot()];
      await click('.language-toggle button:nth-child(1)');
      steps.push(await snapshot());
      await click('.language-toggle button:nth-child(2)');
      steps.push(await snapshot());
      done(steps);
    `);
    const [initial, english, chinese] = result;
    expect(initial.lang).toBe('zh-CN');
    expect(english.text).toContain('Still open on a rainy night');
    expect(english.text).toContain('← See the 3D rainy corner');
    expect(english.lang).toBe('en');
    expect(english.pressed).toEqual(['true', 'false']);
    expect(chinese.text).toContain('雨夜里还亮着的店');
    expect(chinese.lang).toBe('zh-CN');
    expect(chinese.pressed).toEqual(['false', 'true']);
  }, TIMEOUT);

  test('切换语言后，相片文字随之更新', async () => {
    const result = await session<{ before: string; after: string }>(`
      await open('en-US');
      await openPhoto();
      const before = await js('document.querySelector("[role=dialog]").getAttribute("aria-label")');
      await pressEscape();
      await until('!document.querySelector("[role=dialog]")');
      await click('.language-toggle button:nth-child(2)');
      await openPhoto();
      done({ before, after: await js('document.querySelector("[role=dialog]").getAttribute("aria-label")') });
    `);
    expect(result.before).toBe('Full-length portrait of FUBUKI_BB');
    expect(result.after).toBe('FUBUKI_BB 的全身像');
  }, TIMEOUT);

  test('语言不写入 localStorage、Cookie，地址栏不变', async () => {
    const result = await session<{ storage: number; cookie: string; href: string }>(`
      await open('en-US');
      await click('.language-toggle button:nth-child(2)');
      await click('.language-toggle button:nth-child(1)');
      done({
        storage: await js('localStorage.length'),
        cookie: await js('document.cookie'),
        href: await js('location.href'),
      });
    `);
    expect(result.storage).toBe(0);
    expect(result.cookie).toBe('');
    expect(result.href).toBe(PROFILE_URL);
  }, TIMEOUT);

  test('开关按钮有边框，当前语言按钮背景为 rgb(243, 217, 160)', async () => {
    const result = await session<{ borders: string[]; backgrounds: string[] }>(`
      await open('en-US');
      done(await js('(() => { const buttons = [...document.querySelectorAll(".language-toggle button")]; return { borders: buttons.map(b => getComputedStyle(b).borderTopWidth), backgrounds: buttons.map(b => getComputedStyle(b).backgroundColor) }; })()'));
    `);
    expect(result.borders.length).toBe(2);
    for (const width of result.borders) expect(width).not.toBe('0px');
    expect(result.backgrounds[0]).toBe('rgb(243, 217, 160)');
    expect(result.backgrounds[1]).not.toBe('rgb(243, 217, 160)');
  }, TIMEOUT);
});

describe('左上角返回三维场景的链接', () => {
  test.each([
    ['en-US', '← See the 3D rainy corner'],
    ['zh-CN', '← 去看 3D 雨夜街角'],
  ])('%s 下链接文字为「%s」，href 为 ../，固定在左上角', async (locale, label) => {
    const result = await session<{ text: string; href: string; position: string; x: number; y: number }>(`
      await open(${JSON.stringify(locale)});
      done(await js('(() => { const a = document.querySelector("a[href=\\'../\\']"); const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), href: a.getAttribute("href"), position: getComputedStyle(a).position, x: r.x, y: r.y }; })()'));
    `);
    expect(result.text).toBe(label);
    expect(result.href).toBe('../');
    expect(result.position).toBe('fixed');
    expect(result.x).toBeLessThan(200);
    expect(result.y).toBeLessThan(200);
  }, TIMEOUT);
});

describe('点头像弹出全身照相片', () => {
  test('点之前没有 profile-full-print.jpg 请求；点之后弹出对话框、只请求一次、焦点在 ✕', async () => {
    const result = await session<{ before: number; after: number; role: string | null; modal: string | null; active: string | null }>(`
      await open('en-US');
      await wait(1);
      const before = requestsFor('profile-full-print.jpg');
      await openPhoto();
      await until('!!document.querySelector(".photo-print-date")');
      done({
        before,
        after: requestsFor('profile-full-print.jpg'),
        role: await js('document.querySelector("[role=dialog]")?.getAttribute("role") ?? null'),
        modal: await js('document.querySelector("[role=dialog]")?.getAttribute("aria-modal") ?? null'),
        active: await activeLabel(),
      });
    `);
    expect(result.before).toBe(0);
    expect(result.after).toBe(1);
    expect(result.role).toBe('dialog');
    expect(result.modal).toBe('true');
    expect(result.active).toBe('Close');
  }, TIMEOUT);

  test('相片打开时 Tab 与 Shift+Tab 各 6 次，焦点始终留在相片内', async () => {
    const result = await session<{ initialInside: boolean; forward: boolean[]; backward: boolean[] }>(`
      await open('en-US');
      await wait(1);
      await openPhoto();
      const initialInside = await js('!!document.activeElement?.closest(".photo-print-overlay")');

      const tabInside = async (modifiers) => {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
        await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        return js("!!document.activeElement?.closest('.photo-print-overlay')");
      };
      const forward = [];
      const backward = [];
      for (let i = 0; i < 6; i++) forward.push(await tabInside(0));
      for (let i = 0; i < 6; i++) backward.push(await tabInside(8));
      done({ initialInside, forward, backward });
    `);
    expect(result.initialInside).toBe(true);
    expect(result.forward).toEqual(Array(6).fill(true));
    expect(result.backward).toEqual(Array(6).fill(true));
  }, TIMEOUT);

  test('中文界面下 ✕ 的 aria-label 为「关闭」', async () => {
    const result = await session<{ active: string | null }>(`
      await open('zh-CN');
      await openPhoto();
      done({ active: await activeLabel() });
    `);
    expect(result.active).toBe('关闭');
  }, TIMEOUT);

  test.each([
    ['按 Esc', `await pressEscape();`],
    ['点 ✕', `await click('.photo-print-close');`],
    ['点遮罩', `await click([20, 450]);`],
  ])('%s 关闭相片，焦点回到头像按钮', async (_label, closeAction) => {
    const result = await session<{ closed: boolean; avatarFocused: boolean }>(`
      await open('en-US');
      await openPhoto();
      await until('!!document.querySelector(".photo-print-date")');
      ${closeAction}
      const closed = await until('!document.querySelector("[role=dialog]")', 5);
      done({ closed, avatarFocused: await activeIsAvatar() });
    `);
    expect(result.closed).toBe(true);
    expect(result.avatarFocused).toBe(true);
  }, TIMEOUT);

  test('成功后右下角日期戳为当天 \'YY M D', async () => {
    const result = await session<{ stamp: string; expected: string }>(`
      await open('en-US');
      await openPhoto();
      await until('!!document.querySelector(".photo-print-date")');
      done(await js('(() => { const d = new Date(); return { stamp: document.querySelector(".photo-print-date").textContent, expected: "\\'" + String(d.getFullYear()).slice(-2) + " " + (d.getMonth() + 1) + " " + d.getDate() }; })()'));
    `);
    expect(result.stamp).toBe(result.expected);
  }, TIMEOUT);

  test.each([
    ['en-US', 'DEVELOPING…'],
    ['zh-CN', '显影中…'],
  ])('%s 下图片加载中显示「%s」，没有日期戳', async (locale, developing) => {
    const result = await session<{ text: string; stamps: number }>(`
      mode.print = 'hold';
      await open(${JSON.stringify(locale)});
      await openPhoto();
      await wait(1);
      done({ text: await js('document.querySelector("[role=dialog]").innerText'), stamps: await js('document.querySelectorAll(".photo-print-date").length') });
    `);
    expect(result.text).toContain(developing);
    expect(result.stamps).toBe(0);
  }, TIMEOUT);

  test.each([
    ['en-US', "The photo didn't print", 'Print again'],
    ['zh-CN', '照片没能打印出来', '再打印一次'],
  ])('%s 下图片失败显示「%s」与「%s」，点击后重新请求且焦点在 ✕', async (locale, failed, again) => {
    const result = await session<{ text: string; firstCount: number; secondCount: number; active: string | null; stamps: number }>(`
      mode.print = 'fail';
      await open(${JSON.stringify(locale)});
      await openPhoto();
      await until('!!document.querySelector(".photo-print-failed")');
      const text = await js('document.querySelector("[role=dialog]").innerText');
      const firstCount = requestsFor('profile-full-print.jpg');
      mode.print = 'hold';
      await click('.photo-print-failed button');
      await until('!!document.querySelector("[role=dialog]")');
      await wait(1);
      done({
        text,
        firstCount,
        secondCount: requestsFor('profile-full-print.jpg'),
        active: await activeLabel(),
        stamps: await js('document.querySelectorAll(".photo-print-date").length'),
      });
    `);
    expect(result.text).toContain(failed);
    expect(result.text).toContain(again);
    expect(result.firstCount).toBe(1);
    expect(result.secondCount).toBe(2);
    expect(result.active).toBe(locale === 'en-US' ? 'Close' : '关闭');
    expect(result.stamps).toBe(0);
  }, TIMEOUT);
});

describe('头像加载失败时显示字母 F', () => {
  test('profile.jpg 返回 404：头像处显示「F」，没有 naturalWidth 为 0 的 profile.jpg 破图', async () => {
    const result = await session<{ avatarText: string; avatarImages: number; broken: number }>(`
      mode.avatar = '404';
      await open('en-US');
      await until('document.querySelector("button[aria-haspopup=dialog]")?.textContent.includes("F")');
      done(await js('(() => { const button = document.querySelector("button[aria-haspopup=dialog]"); const avatars = [...document.images].filter(i => /profile\\\\.jpg/.test(i.src)); return { avatarText: button.textContent, avatarImages: button.querySelectorAll("img").length, broken: avatars.filter(i => i.complete && i.naturalWidth === 0).length }; })()'));
    `);
    expect(result.avatarText).toContain('F');
    expect(result.avatarImages).toBe(0);
    expect(result.broken).toBe(0);
  }, TIMEOUT);
});

describe('版面与视觉', () => {
  test('390×844 下页面不横向滚动，小票完整在视口内且左右留白相等', async () => {
    const result = await session<{ scrollWidth: number; clientWidth: number; left: number; right: number }>(`
      await open('en-US', { width: 390, height: 844 });
      done(await js('(() => { const r = document.querySelector(".receipt").getBoundingClientRect(); const d = document.documentElement; return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, left: r.left, right: r.right }; })()'));
    `);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
    expect(result.left).toBeGreaterThanOrEqual(0);
    expect(result.right).toBeLessThanOrEqual(result.clientWidth);
    expect(Math.abs(result.left - (result.clientWidth - result.right))).toBeLessThanOrEqual(2);
  }, TIMEOUT);

  test('手机模式 390×844：掉落动画期间与结束后，布局视口都不被撑大，开关不越界', async () => {
    const result = await session<Array<{ innerWidth: number; scrollWidth: number; toggleRight: number | null }>>(`
      await open('en-US', { width: 390, height: 844, mobile: true, hydrate: false });
      const measure = () => js('(() => { const toggle = document.querySelector(".language-toggle"); return { innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, toggleRight: toggle ? toggle.getBoundingClientRect().right : null }; })()');
      await wait(0.3);
      const during = await measure();
      await until('!!document.querySelector(".language-toggle")');
      await wait(1.6);
      done([during, await measure()]);
    `);
    for (const sample of result) {
      expect(sample.innerWidth).toBe(390);
      expect(sample.scrollWidth).toBeLessThanOrEqual(390);
      if (sample.toggleRight !== null) expect(sample.toggleRight).toBeLessThanOrEqual(390);
    }
    expect(result[1].toggleRight).not.toBeNull();
  }, TIMEOUT);

  test('1440×900 下小票宽度不超过 420px', async () => {
    const result = await session<{ width: number }>(`
      await open('en-US');
      done(await js('({ width: document.querySelector(".receipt").offsetWidth })'));
    `);
    expect(result.width).toBeGreaterThan(0);
    expect(result.width).toBeLessThanOrEqual(420);
  }, TIMEOUT);

  test('语言开关：未选中按钮背景 rgba(7, 10, 24, 0.45)，字号 13px', async () => {
    const result = await session<{ backgrounds: string[]; sizes: string[] }>(`
      await open('en-US');
      done(await js('(() => { const buttons = [...document.querySelectorAll(".language-toggle button")]; return { backgrounds: buttons.map(b => getComputedStyle(b).backgroundColor), sizes: buttons.map(b => getComputedStyle(b).fontSize) }; })()'));
    `);
    expect(result.backgrounds[1]).toBe('rgba(7, 10, 24, 0.45)');
    expect(result.sizes).toEqual(['13px', '13px']);
  }, TIMEOUT);

  test('背景：页面根容器为径向渐变，雨丝层为 repeating-linear-gradient', async () => {
    const result = await session<{ page: string; rain: string }>(`
      await open('en-US');
      done(await js('({ page: getComputedStyle(document.querySelector(".profile-page")).backgroundImage, rain: getComputedStyle(document.querySelector(".profile-page-rain")).backgroundImage })'));
    `);
    expect(result.page).toContain('radial-gradient');
    expect(result.rain).toContain('repeating-linear-gradient');
  }, TIMEOUT);
});

describe('脚本晚于页面到达时的接管', () => {
  test('脚本挂起 2 秒后放行：掉落动画只开始 1 次，小票没有被移除重建', async () => {
    const result = await session<{ starts: number; removed: number }>(`
      await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(`
        window.__dropStarts = 0;
        window.__receiptRemoved = 0;
        document.addEventListener('animationstart', (e) => { if (/receipt/.test(e.animationName)) window.__dropStarts++; }, true);
        new MutationObserver((records) => {
          for (const record of records) for (const node of record.removedNodes) {
            if (node.nodeType === 1 && (node.matches('.receipt') || node.querySelector('.receipt'))) window.__receiptRemoved++;
          }
        }).observe(document, { childList: true, subtree: true });
      `)} });
      await open('en-US', { holdScript: 2 });
      await wait(1);
      done({ starts: await js('window.__dropStarts'), removed: await js('window.__receiptRemoved') });
    `);
    expect(result.starts).toBe(1);
    expect(result.removed).toBe(0);
  }, TIMEOUT);

  test('接管前头像图片已经失败：接管后仍显示「F」，没有破图', async () => {
    const result = await session<{ avatarText: string; avatarImages: number; broken: number }>(`
      mode.avatar = '404';
      await cdp('Network.enable');
      await cdp('Fetch.enable', { patterns: [{ urlPattern: '*profile-full-print.jpg*' }, { urlPattern: '*profile.jpg*' }, { urlPattern: '*/assets/profile-*.js' }] });
      mode.script = 'hold';
      await cdp('Page.navigate', { url: ${JSON.stringify(PROFILE_URL)} });
      const failedBeforeTakeover = await until('(() => { const img = document.querySelector("button[aria-haspopup=dialog] img"); return !!img && img.complete && img.naturalWidth === 0; })()');
      if (!failedBeforeTakeover) throw Error('头像图片在脚本接管前没有失败');
      await release('script');
      await until('!!document.querySelector(".language-toggle")');
      await wait(0.8);
      done(await js('(() => { const button = document.querySelector("button[aria-haspopup=dialog]"); const avatars = [...document.images].filter(i => /profile\\.jpg/.test(i.src)); return { avatarText: button.textContent, avatarImages: button.querySelectorAll("img").length, broken: avatars.filter(i => i.complete && i.naturalWidth === 0).length }; })()'));
    `);
    expect(result.avatarText).toContain('F');
    expect(result.avatarImages).toBe(0);
    expect(result.broken).toBe(0);
  }, TIMEOUT);
});

describe('小票字体与宽屏倾斜', () => {
  test('1440×900：名字与简介标题用 Noto Serif SC Variable，小票逆时针歪约 0.6°', async () => {
    const result = await session<{ h1: string; h2: string; angle: number }>(`
      await open('en-US', { width: 1440, height: 900 });
      await wait(1.6);
      done(await js('(() => { const family = (s) => getComputedStyle(document.querySelector(s)).fontFamily; const angle = (() => { const m = getComputedStyle(document.querySelector(".receipt")).transform; const v = m === "none" ? [1, 0] : m.slice(7, -1).split(",").map(Number); return Math.atan2(v[1], v[0]) * 180 / Math.PI; })(); return { h1: family(".receipt h1"), h2: family(".receipt h2"), angle }; })()'));
    `);
    expect(result.h1.startsWith('"Noto Serif SC Variable"')).toBe(true);
    expect(result.h2.startsWith('"Noto Serif SC Variable"')).toBe(true);
    expect(result.angle).toBeGreaterThan(-0.7);
    expect(result.angle).toBeLessThan(-0.5);
  }, TIMEOUT);

  test('390×844：小票不歪', async () => {
    const result = await session<{ angle: number }>(`
      await open('en-US', { width: 390, height: 844 });
      await wait(1.6);
      done(await js('(() => { const m = getComputedStyle(document.querySelector(".receipt")).transform; const v = m === "none" ? [1, 0] : m.slice(7, -1).split(",").map(Number); return Math.atan2(v[1], v[0]) * 180 / Math.PI; })()').then((angle) => ({ angle })));
    `);
    expect(Math.abs(result.angle)).toBeLessThan(0.01);
  }, TIMEOUT);
});
