import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { startHeadlessBrowser } from './headless-browser';

const root = path.resolve(import.meta.dir, '..');
const files = ['profile.png', 'profile.jpg', 'profile-full.png'];

test('published image URLs return the exact original files and decode in a windowless browser', async () => {
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
    const pathname = new URL(request.url).pathname;
    const match = pathname.match(/^\/(?:portfolio\/)?(profile(?:-full)?\.(?:png|jpg))$/);
    if (!match || !files.includes(match[1])) return new Response('Not found', { status: 404 });
    return new Response(Bun.file(path.join(root, 'dist', match[1])));
  } });
  const browser = await startHeadlessBrowser();
  try {
    for (const prefix of ['', 'portfolio/']) for (const file of files) {
      const url = `http://127.0.0.1:${server.port}/${prefix}${file}`;
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(file.endsWith('.jpg') ? 'image/jpeg' : 'image/png');
      expect(Buffer.from(await response.arrayBuffer()).equals(readFileSync(path.join(root, 'public', file)))).toBe(true);
      await browser.cdp('Page.navigate', { url });
      let decoded = false;
      for (let i = 0; i < 80; i++) {
        decoded = await browser.evaluate<boolean>('location.href === ' + JSON.stringify(url) + ' && !!document.querySelector("img")?.naturalWidth');
        if (decoded) break;
        await Bun.sleep(25);
      }
      expect(decoded, url).toBe(true);
    }
  } finally { await browser.close(); server.stop(true); }
}, 30_000);

test('GitHub Actions builds static dist with Bun and uploads it for Pages deployment', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  for (const value of ['ubuntu-latest', 'actions/checkout@', 'oven-sh/setup-bun@', 'bun install --frozen-lockfile',
    'bun run build', 'actions/upload-pages-artifact@', 'path: ./dist', 'needs: build', 'pages: write', 'id-token: write', 'actions/deploy-pages@']) expect(workflow).toContain(value);
  expect(workflow).not.toMatch(/run:\s*(?:bun test|bun run dev|bun run preview)/);
});
