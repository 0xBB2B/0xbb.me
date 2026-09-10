import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { htmlPlugin } from './htmlPlugin';

const root = fileURLToPath(new URL('../', import.meta.url));
const siteUrl = new URL('https://0xbb.me/');
const inputHtml = '<!doctype html><html><head></head><body><main>FUBUKI_BB</main></body></html>';
let server: ViteDevServer;

beforeAll(async () => {
  server = await createServer({
    root,
    configFile: false,
    plugins: [htmlPlugin()],
    appType: 'custom',
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
});

afterAll(async () => {
  await server?.close();
});

test('homepage includes the loading shell and critical styles before the entry script runs', async () => {
  const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const html = await server.transformIndexHtml('/', template);
  expect(html.match(/class="loading-screen"/g)).toHaveLength(1);
  expect(html).toContain('<div id="root"><section');
  expect(html).toContain('<style data-loading-styles>');
  expect(html).toContain('Loading the journey…');
  expect(html.indexOf('<style data-loading-styles>')).toBeLessThan(html.indexOf('</head>'));
  expect(html.indexOf('class="loading-screen"')).toBeLessThan(html.indexOf('src="/index.tsx"'));
  expect(html).not.toContain('<div id="root"></div>');
});

test('homepage allows large image previews without changing indexing permission', async () => {
  const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const page = parseMetadata(await server.transformIndexHtml('/', template));
  expect(page.meta.get('robots')).toBe('index, follow, max-image-preview:large');
});

function parseMetadata(html: string) {
  const titles: string[] = [];
  const meta = new Map<string, string>();
  const canonicals: string[] = [];
  const scripts: string[] = [];
  new HTMLRewriter()
    .on('title', {
      element() { titles.push(''); },
      text(chunk) { titles[titles.length - 1] += chunk.text; },
    })
    .on('meta', {
      element(element) {
        const key = element.getAttribute('property') ?? element.getAttribute('name');
        if (key) meta.set(key, element.getAttribute('content') ?? '');
      },
    })
    .on('link[rel="canonical"]', {
      element(element) { canonicals.push(element.getAttribute('href') ?? ''); },
    })
    .on('script[type="application/ld+json"]', {
      element() { scripts.push(''); },
      text(chunk) { scripts[scripts.length - 1] += chunk.text; },
    })
    .transform(html);
  return {
    titles,
    meta,
    canonicals,
    schemas: scripts.map((script) => JSON.parse(script) as Record<string, unknown>),
  };
}

for (const route of ['/', '/game/']) {
  describe(`htmlPlugin public HTML transform: ${route}`, () => {
    let html: string;
    let page: ReturnType<typeof parseMetadata>;
    beforeAll(async () => {
      html = await server.transformIndexHtml(route, inputHtml);
      page = parseMetadata(html);
    });

    test('AC-2: browser title identifies FUBUKI_BB', () => {
      expect(page.titles).toHaveLength(1);
      expect(page.titles[0]).toContain('FUBUKI_BB');
    });

    test.each(['title', 'og:title', 'twitter:title'])('AC-2: %s identifies FUBUKI_BB', (key) => {
      expect(page.meta.get(key)).toContain('FUBUKI_BB');
    });

    test.each(['description', 'og:description', 'twitter:description'])(
      'AC-2: %s describes engineering, AI workflows and exploration',
      (key) => {
        const description = page.meta.get(key);
        expect(description).toMatch(/engineer|工程/i);
        expect(description).toMatch(/AI/i);
        expect(description).toMatch(/workflow|工作流/i);
        expect(description).toMatch(/explor|探索/i);
      },
    );

    test('AC-2: JSON-LD describes a person and their personal website', () => {
      const person = page.schemas.find((schema) => schema['@type'] === 'Person');
      const website = page.schemas.find((schema) => schema['@type'] === 'WebSite');
      expect(person).toBeDefined();
      expect(website).toBeDefined();
      expect(person!.name).toBe('FUBUKI_BB');
      for (const schema of [person!, website!]) {
        expect(schema.description).toMatch(/engineer|工程/i);
        expect(schema.description).toMatch(/AI/i);
        expect(schema.description).toMatch(/workflow|工作流/i);
        expect(schema.description).toMatch(/explor|探索/i);
      }
    });

    test('AC-2: JSON-LD does not invent an employer', () => {
      const person = page.schemas.find((schema) => schema['@type'] === 'Person');
      expect(person).toBeDefined();
      expect(person!.worksFor ?? null).toBeNull();
    });

    test('AC-2: site identity and links contain no CyberDeck, RHYTHM_BLADE or game entry', () => {
      expect(html).not.toMatch(/CyberDeck|RHYTHM_BLADE|节奏光剑/i);
      expect(html).not.toMatch(/\/game(?:[/?#"']|$)/i);
    });

    test('AC-2: canonical points only to the homepage', () => {
      expect(page.canonicals).toHaveLength(1);
      expect(new URL(page.canonicals[0]).href).toBe(siteUrl.href);
    });

    test.each(['og:url', 'twitter:url'])('AC-2: %s points only to the homepage', (key) => {
      expect(page.meta.get(key)).toBeString();
      expect(new URL(page.meta.get(key)!).href).toBe(siteUrl.href);
    });

    test('AC-2: JSON-LD URLs point only to the homepage', () => {
      expect(page.schemas.length).toBeGreaterThan(0);
      for (const schema of page.schemas) {
        expect(schema.url).toBeString();
        expect(new URL(schema.url as string).href).toBe(siteUrl.href);
      }
    });

    test('AC-6: old profile.png references are absent', () => {
      expect(html).not.toContain('profile.png');
    });

    test('search and sharing metadata consistently reference the public profile JPEG', () => {
      const image = new URL('profile.jpg', siteUrl).href;
      expect(page.meta.get('og:image')).toBe(image);
      expect(page.meta.get('twitter:image')).toBe(image);
      for (const type of ['Person', 'WebSite']) {
        expect(page.schemas.find(schema => schema['@type'] === type)?.image).toBe(image);
      }
      expect(html).not.toContain('site-card.svg');
      const bytes = fs.readFileSync(path.join(root, 'public/profile.jpg'));
      expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      expect([...bytes.subarray(-2)]).toEqual([0xff, 0xd9]);
    });
  });
}

for (const route of ['/', '/game/']) {
  test(`AC-2/AC-6: metadata read failure on ${route} reports the error without identity/image fallback`, async () => {
    const readError = Object.assign(new Error('test-only metadata read denied'), { code: 'EACCES' });
    const originalRead = fs.readFileSync;
    const readSpy = spyOn(fs, 'readFileSync').mockImplementation(((file, ...args) => {
      if (String(file) === path.join(root, 'metadata.json')) throw readError;
      return Reflect.apply(originalRead, fs, [file, ...args]);
    }) as typeof fs.readFileSync);
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = await server.transformIndexHtml(route, inputHtml);
      expect(errorSpy).toHaveBeenCalledWith('Error injecting metadata:', readError);
      const page = parseMetadata(html);
      expect(page.titles).toEqual([]);
      expect(page.meta.size).toBe(0);
      expect(page.canonicals).toEqual([]);
      expect(page.schemas).toEqual([]);
      expect(html).not.toMatch(/CyberDeck|RHYTHM_BLADE|profile\.png|data:image|<image\b/i);
    } finally {
      readSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
}
