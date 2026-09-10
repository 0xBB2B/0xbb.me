import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const removed = [
  'game/index.html', 'game/main.tsx', 'game/audioAnalysis.ts', 'game/audioAnalysis.test.ts',
  'game/chart.ts', 'game/chart.test.ts', 'game/judge.ts', 'game/judge.test.ts',
  'game/scoring.ts', 'game/scoring.test.ts', 'game/chiptune.ts', 'game/types.ts',
  'components/beat-saber/BeatSaberGame.tsx', 'components/beat-saber/BeatSaberPlaceholder.tsx',
  'components/beat-saber/sceneAssets.ts', 'components/beat-saber/sceneAssets.test.ts',
  'constants.tsx', 'types.ts', 'hooks/useMediaQuery.ts', 'lib/scrollToAnchor.ts', 'public/music.ogg',
];

test('the unused rhythm-game implementation, adapters and dedicated tests are deleted', () => {
  for (const file of removed) expect(existsSync(path.join(root, file)), file).toBe(false);
});

test('the temporary design directory is removed while production models and the selected portrait remain', () => {
  expect(existsSync(path.join(root, 'design-reference'))).toBe(false);
  for (const name of ['player-voxel.ts', 'player-voxel-black.ts']) {
    expect(existsSync(path.join(root, 'portfolio/models', name)), name).toBe(true);
  }
  expect(existsSync(path.join(root, 'public/profile-full.png'))).toBe(true);
});

test('the application keeps its runtime dependencies but no longer carries motion or its private packages', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  expect(Object.keys(pkg.dependencies).sort()).toEqual(['react', 'react-dom', 'three']);
  expect(readFileSync(path.join(root, 'bun.lock'), 'utf8')).not.toMatch(/"(?:motion|framer-motion|motion-dom|motion-utils)"\s*:/);
});

test('the built public entry cannot load the removed game or music', () => {
  expect(existsSync(path.join(root, 'dist/index.html'))).toBe(true);
  expect(existsSync(path.join(root, 'dist/game'))).toBe(false);
  expect(existsSync(path.join(root, 'dist/music.ogg'))).toBe(false);
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  expect(html).not.toMatch(/RHYTHM_BLADE|BeatSaber|music\.ogg|href=["'][^"']*\/game\//i);
});
