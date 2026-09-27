import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.join(import.meta.dir, '../components/StorySections.css'), 'utf8');

function wideMediaBlock(source: string): string {
  const marker = '@media (min-aspect-ratio: 1/1)';
  const markerStart = source.indexOf(marker);
  expect(markerStart).toBeGreaterThan(-1);
  const braceStart = source.indexOf('{', markerStart);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(braceStart, i + 1);
}

function gradientStops(block: string): { position: number; alpha: number }[] {
  const match = block.match(/\.story-section::before\s*\{[^}]*linear-gradient\(([^)]*(?:\)[^)]*)*)\)/);
  expect(match).not.toBeNull();
  const stopPattern = /rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)\s*(\d+(?:\.\d+)?)%/g;
  const result: { position: number; alpha: number }[] = [];
  for (const stop of match![1].matchAll(stopPattern)) {
    result.push({ alpha: Number(stop[1]), position: Number(stop[2]) });
  }
  return result;
}

describe('the wide-screen story text scrim stays dark enough over bright backgrounds', () => {
  const stops = gradientStops(wideMediaBlock(css));

  test('the gradient starts (0%) at least 0.9 opaque', () => {
    const first = stops.find((s) => s.position === 0);
    expect(first?.alpha).toBeGreaterThanOrEqual(0.9);
  });

  test('the gradient stays at least 0.65 opaque near the 45% stop', () => {
    const closest = stops.reduce((best, s) => (Math.abs(s.position - 45) < Math.abs(best.position - 45) ? s : best));
    expect(closest.alpha).toBeGreaterThanOrEqual(0.65);
  });
});
