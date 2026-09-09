import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.dirname(new URL(import.meta.url).pathname);
// Preserve exact user-provided source files; only profile-full.png can enter the published build.
// Pin bytes instead of deleting user files or accepting arbitrary bitmap assets.
const userPortraits: Record<string, string> = {
  'profile-full.png': '93112c75b439d72949250c21da06d5a6ff86be5e7211ed1ee09eb17575747a8f',
  'profile.png': '3bbaa161ddf6141706341ab661ba3da59230e8a87b932e1eefdd6f2bd132e2d8',
  'profile.jpg': 'c28ed9a1e2296e6b667212bd3758323b496791982f25b4e663d84ebbb2422543',
};
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
  const basename = path.basename(filename);
  if (userPortraits[basename] && (path.dirname(filename) === path.join(root, 'public')
    || (path.dirname(filename) === path.join(root, 'dist') && basename === 'profile-full.png'))) {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(userPortraits[basename]);
    return;
  }
  const header = bytes.subarray(0, 16).toString('latin1');
  for (const magic of bitmapMagic) expect(header).not.toMatch(magic);
  if (path.extname(filename).toLowerCase() === '.svg') {
    const svg = bytes.toString('utf8');
    expect(svg).toMatch(/^\s*(?:<\?xml[^?]*\?>\s*)?(?:<!--[^]*?-->\s*)*<svg(?:\s|>)/i);
    expect(svg).not.toMatch(/<(?:[\w-]+:)?(?:image|feImage|foreignObject)\b/i);
    expect(svg).not.toMatch(/(?:data:image\/|https?:\/\/)[^)'"\s>]+\.(?:png|jpe?g|gif|webp|bmp|avif)/i);
  }
}

describe('site-entry/AC-5/AC-6: only the user portrait is referenced outside vector/geometry graphics', () => {
  test('unapproved cyber portrait is absent and the selected full portrait is present', () => {
    expect(existsSync(path.join(root, 'public', 'profile-cyber.png'))).toBe(false);
    expect(existsSync(path.join(root, 'public', 'profile-full.png'))).toBe(true);
    if (existsSync(path.join(root, 'dist'))) {
      expect(existsSync(path.join(root, 'dist', 'profile-full.png'))).toBe(true);
      for (const file of ['profile.png', 'profile.jpg']) expect(existsSync(path.join(root, 'dist', file))).toBe(false);
      for (const file of ['robots.txt', 'site-card.svg', 'sitemap.xml']) {
        expect(readFileSync(path.join(root, 'dist', file)).equals(readFileSync(path.join(root, 'public', file)))).toBe(true);
      }
    }
  });

  test('all other artifacts contain no concealed bitmaps or unapproved image references', () => {
    const files = [...filesBelow(path.join(root, 'public')), ...filesBelow(path.join(root, 'dist'))];
    expect(files.length).toBeGreaterThan(0);
    for (const filename of files) expectNoConcealedBitmap(filename);
    const searchable = files.filter(file => /\.(?:html|css|js|svg|json)$/i.test(file))
      .map(file => readFileSync(file, 'utf8')).join('\n');
    const withoutSelectedPortrait = searchable.replaceAll('profile-full.png', 'approved-persona');
    expect(withoutSelectedPortrait).not.toMatch(/(?:data:image\/(?:png|jpe?g|gif|webp|bmp|avif)|[^\w-](?:profile(?:-cyber|-full)?\.png)|\.(?:jpe?g|webp|bmp|avif)(?:[?#'"\s)]|$))/i);
  });
});
