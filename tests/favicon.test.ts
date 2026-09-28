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

function rootTag(source: string): string {
  const match = source.match(/<svg\b[^>]*>/i);
  if (!match) throw new Error('favicon.svg has no <svg> root');
  return match[0];
}

function pathCells(d: string): Set<string> {
  const covered = new Set<string>();
  const tokens = d.match(/[Mhvz]|-?\d+(?:\.\d+)?/g) ?? [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let points: [number, number][] = [];

  function flush(): void {
    if (points.length === 0) return;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.floor(Math.min(...xs));
    const maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let cx = minX; cx < maxX; cx++) {
      for (let cy = minY; cy < maxY; cy++) covered.add(`${cx},${cy}`);
    }
    points = [];
  }

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M') {
      flush();
      x = Number(tokens[i + 1]);
      y = Number(tokens[i + 2]);
      startX = x;
      startY = y;
      points.push([x, y]);
      i += 3;
    } else if (token === 'h') {
      x += Number(tokens[i + 1]);
      points.push([x, y]);
      i += 2;
    } else if (token === 'v') {
      y += Number(tokens[i + 1]);
      points.push([x, y]);
      i += 2;
    } else if (token === 'z') {
      x = startX;
      y = startY;
      points.push([x, y]);
      i += 1;
    } else {
      i += 1;
    }
  }
  flush();
  return covered;
}

function coveredCells(source: string): Set<string> {
  const covered = new Set<string>();
  for (const match of source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/?>/gi)) {
    for (const cell of pathCells(match[1])) covered.add(cell);
  }
  return covered;
}

function fillColors(source: string): string[] {
  return [...new Set([...source.matchAll(/\bfill="#([0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()))];
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

test('favicon.svg is an SVG document', () => {
  expect(svg.trim().replace(/^<\?xml[^>]*\?>\s*/i, '')).toMatch(/^<svg\b/i);
});

test('favicon.svg uses a 32x32 pixel-art viewBox', () => {
  expect(parseViewBox(svg)).toEqual({ minX: 0, minY: 0, width: 32, height: 32 });
});

test('favicon.svg keeps pixel edges crisp', () => {
  expect(rootTag(svg)).toMatch(/shape-rendering="crispEdges"/i);
});

test('favicon.svg uses between 2 and 16 distinct fill colors', () => {
  const colors = fillColors(svg);
  expect(colors.length).toBeGreaterThanOrEqual(2);
  expect(colors.length).toBeLessThanOrEqual(16);
});

test('favicon.svg includes a blue pixel color', () => {
  const hasBlue = fillColors(svg).some((hex) => {
    const [r, , b] = rgb(hex);
    return b - r > 40;
  });
  expect(hasBlue).toBe(true);
});

test('favicon.svg includes a silver/white pixel color', () => {
  const hasSilver = fillColors(svg).some((hex) => rgb(hex).every((channel) => channel >= 200));
  expect(hasSilver).toBe(true);
});

test('favicon.svg leaves the four corner pixels uncovered', () => {
  const covered = coveredCells(svg);
  for (const corner of ['0,0', '31,0', '0,31', '31,31']) {
    expect(covered.has(corner)).toBe(false);
  }
});

test('favicon.svg renders pixel blocks, not text glyphs or embedded images', () => {
  expect(svg).not.toMatch(/<text\b/i);
  expect(svg).not.toMatch(/<image\b/i);
  expect(svg).not.toMatch(/<foreignObject\b/i);
  expect(svg).not.toMatch(/data:image/i);
});

test('the built favicon link resolves to a file shipped in dist', () => {
  const distHtml = readFileSync(path.resolve(root, 'dist/index.html'), 'utf8');
  const match = distHtml.match(/<link[^>]*\brel="icon"[^>]*\btype="image\/svg\+xml"[^>]*\bhref="([^"]+)"/i);
  expect(match).not.toBeNull();
  const href = match![1].replace(/^\.\//, '');
  expect(existsSync(path.resolve(root, 'dist', href))).toBe(true);
});
