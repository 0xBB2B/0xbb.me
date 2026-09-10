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

// Inspect referenced bytes, not extensions or response MIME types. Follow SVG
// paint/use references too, so a vector container cannot conceal a bitmap.
async function expectVectorGraphic(reference: string) {
  const pending = [new URL(reference, siteUrl)];
  const visited = new Set<string>();
  while (pending.length) {
    const url = pending.pop()!;
    url.hash = '';
    if (visited.has(url.href)) continue;
    visited.add(url.href);
    let svg: string;
    let base = url;
    if (url.origin === siteUrl.origin) {
      svg = fs.readFileSync(path.join(root, 'public', decodeURIComponent(url.pathname)), 'utf8');
    } else {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      expect(response.ok).toBe(true);
      svg = await response.text();
      base = url.protocol === 'data:' ? siteUrl : new URL(response.url);
    }
    const isSvgDocument = /^\s*(?:<\?xml[^?]*\?>\s*)?(?:<!--[^]*?-->\s*|<!DOCTYPE\s+svg[^>]*>\s*)*<svg(?:\s|>)/i.test(svg);
    expect(isSvgDocument).toBe(true);
    expect(svg).not.toMatch(/<(?:[\w-]+:)?(?:image|feImage|foreignObject)\b/i);
    expect(svg).not.toMatch(/data:image\/(?:png|jpe?g|gif|webp|bmp|avif|x-icon)\b/i);

    const references: string[] = [];
    new HTMLRewriter()
      .on('use, linearGradient, radialGradient, pattern, filter', {
        element(element) {
          const href = element.getAttribute('href') ?? element.getAttribute('xlink:href');
          if (href) references.push(href);
        },
      })
      .transform(svg);
    for (const match of svg.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      references.push(match[2]);
    }
    for (const ref of references) {
      if (!ref.startsWith('#')) pending.push(new URL(ref, base));
    }
  }
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

    test('AC-6: every emitted image resolves to actual pure SVG content', async () => {
      expect(page.meta.get('og:image')).toBeString();
      expect(page.meta.get('twitter:image')).toBeString();
      const person = page.schemas.find((schema) => schema['@type'] === 'Person');
      expect(person?.image).toBeString();
      const references = [
        ...[...page.meta].filter(([key]) => /(?:^|:)image(?::(?:url|secure_url))?$/.test(key)).map(([, value]) => value),
        ...page.schemas.filter((schema) => schema.image !== undefined).map((schema) => schema.image),
      ];
      for (const reference of new Set(references)) {
        expect(reference).toBeString();
        await expectVectorGraphic(reference as string);
      }
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
