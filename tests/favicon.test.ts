import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const svg = readFileSync(path.resolve(root, 'favicon.svg'), 'utf8');

interface Box { minX: number; minY: number; width: number; height: number }

function parseViewBox(source: string): Box {
  const match = source.match(/viewBox="([\d.\s-]+)"/i);
  if (!match) throw new Error('favicon.svg has no viewBox');
  const [minX, minY, width, height] = match[1].trim().split(/\s+/).map(Number);
  return { minX, minY, width, height };
}

const ARG_COUNTS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

function pathXExtent(d: string) {
  const tokens = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.\d+(?:e-?\d+)?|-?\d+(?:e-?\d+)?/g) ?? [];
  let x = 0;
  let startX = 0;
  let command = 'M';
  let minX = Infinity;
  let maxX = -Infinity;
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      i++;
      if (command.toLowerCase() === 'z') { x = startX; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      continue;
    }
    const key = command.toLowerCase();
    const relative = command === key;
    const count = ARG_COUNTS[key] ?? 2;
    const args = tokens.slice(i, i + count).map(Number);
    i += count;
    if (key === 'h') {
      x = relative ? x + args[0] : args[0];
    } else if (key !== 'v') {
      const endX = args[args.length - 2];
      x = relative ? x + endX : endX;
      if (key === 'm') startX = x;
    }
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    if (command === 'M') command = 'L';
    if (command === 'm') command = 'l';
  }
  return { minX, maxX };
}

function circleXExtent(attrs: string) {
  const cx = Number(attrs.match(/\bcx="(-?[\d.]+)"/)?.[1] ?? 0);
  const r = Number(attrs.match(/\br="(-?[\d.]+)"/)?.[1] ?? 0);
  return { minX: cx - r, maxX: cx + r };
}

function rectXExtent(attrs: string) {
  const x = Number(attrs.match(/\bx="(-?[\d.]+)"/)?.[1] ?? 0);
  const width = Number(attrs.match(/\bwidth="(-?[\d.]+)"/)?.[1] ?? 0);
  return { minX: x, maxX: x + width };
}

function shapeXExtent(source: string) {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const match of source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/?>/gi)) {
    const extent = pathXExtent(match[1]);
    minX = Math.min(minX, extent.minX);
    maxX = Math.max(maxX, extent.maxX);
  }
  for (const match of source.matchAll(/<circle\b([^>]*)\/?>/gi)) {
    const extent = circleXExtent(match[1]);
    minX = Math.min(minX, extent.minX);
    maxX = Math.max(maxX, extent.maxX);
  }
  for (const match of source.matchAll(/<rect\b([^>]*)\/?>/gi)) {
    const extent = rectXExtent(match[1]);
    minX = Math.min(minX, extent.minX);
    maxX = Math.max(maxX, extent.maxX);
  }
  return { minX, maxX };
}

function coversCanvas(attrs: string, viewBox: Box) {
  const x = Number(attrs.match(/\bx="(-?[\d.]+)"/)?.[1] ?? 0);
  const y = Number(attrs.match(/\by="(-?[\d.]+)"/)?.[1] ?? 0);
  const width = Number(attrs.match(/\bwidth="(-?[\d.]+)"/)?.[1] ?? 0);
  const height = Number(attrs.match(/\bheight="(-?[\d.]+)"/)?.[1] ?? 0);
  return x <= viewBox.minX && y <= viewBox.minY
    && x + width >= viewBox.minX + viewBox.width
    && y + height >= viewBox.minY + viewBox.height;
}

test('favicon.svg is an SVG document', () => {
  expect(svg.trim().replace(/^<\?xml[^>]*\?>\s*/i, '')).toMatch(/^<svg\b/i);
});

test('favicon.svg paints with the brand red #c8102a', () => {
  expect(svg).toMatch(/fill="#c8102a"/i);
});

test('favicon.svg renders geometry, not literal text glyphs', () => {
  expect(svg).not.toMatch(/<text\b/i);
});

test('favicon.svg has no rect that paints a full-canvas background', () => {
  const viewBox = parseViewBox(svg);
  const rects = [...svg.matchAll(/<rect\b([^>]*)\/?>/gi)].map((match) => match[1]);
  expect(rects.some((attrs) => coversCanvas(attrs, viewBox))).toBe(false);
});

test('favicon.svg artwork spans at least 80% of the viewBox width', () => {
  const viewBox = parseViewBox(svg);
  const { minX, maxX } = shapeXExtent(svg);
  expect(maxX - minX).toBeGreaterThanOrEqual(viewBox.width * 0.8);
});

test('the built favicon link resolves to a file shipped in dist', () => {
  const distHtml = readFileSync(path.resolve(root, 'dist/index.html'), 'utf8');
  const match = distHtml.match(/<link[^>]*\brel="icon"[^>]*\btype="image\/svg\+xml"[^>]*\bhref="([^"]+)"/i);
  expect(match).not.toBeNull();
  const href = match![1].replace(/^\.\//, '');
  expect(existsSync(path.resolve(root, 'dist', href))).toBe(true);
});
