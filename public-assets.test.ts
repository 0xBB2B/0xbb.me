import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const bitmapMagic = [
  /^\x89PNG\r\n\x1a\n/s,
  /^\xff\xd8\xff/s,
  /^GIF8[79]a/s,
  /^RIFF....WEBP/s,
  /^BM/s,
];

function filesBelow(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap(name => {
    const filename = path.join(directory, name);
    return statSync(filename).isDirectory() ? filesBelow(filename) : [filename];
  });
}

function expectNoConcealedBitmap(filename: string) {
  const bytes = readFileSync(filename);
  const header = bytes.subarray(0, 16).toString('latin1');
  for (const magic of bitmapMagic) expect(header).not.toMatch(magic);
  if (path.extname(filename).toLowerCase() === '.svg') {
    const svg = bytes.toString('utf8');
    expect(svg).toMatch(/^\s*(?:<\?xml[^?]*\?>\s*)?(?:<!--[^]*?-->\s*)*<svg(?:\s|>)/i);
    expect(svg).not.toMatch(/<(?:[\w-]+:)?(?:image|feImage|foreignObject)\b/i);
    expect(svg).not.toMatch(/(?:data:image\/|https?:\/\/)[^)'"\s>]+\.(?:png|jpe?g|gif|webp|bmp|avif)/i);
  }
}

describe('site-entry/AC-5/AC-6: published graphics are vectors or geometry', () => {
  test.each(['profile.png', 'profile-cyber.png', 'profile-full.png'])('public/%s is absent', filename => {
    expect(existsSync(path.join(root, 'public', filename))).toBe(false);
  });

  test('public and built artifacts contain no bitmap bytes or bitmap references', () => {
    const files = [...filesBelow(path.join(root, 'public')), ...filesBelow(path.join(root, 'dist'))];
    expect(files.length).toBeGreaterThan(0);
    for (const filename of files) expectNoConcealedBitmap(filename);
    const searchable = files.filter(file => /\.(?:html|css|js|svg|json)$/i.test(file))
      .map(file => readFileSync(file, 'utf8')).join('\n');
    expect(searchable).not.toMatch(/(?:data:image\/(?:png|jpe?g|gif|webp|bmp|avif)|[^\w-](?:profile(?:-cyber|-full)?\.png)|\.(?:jpe?g|webp|bmp|avif)(?:[?#'"\s)]|$))/i);
  });
});
