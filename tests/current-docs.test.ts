import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const forbidden = /(?:保留.{0,60}(?:以|用于|为了)兼容|加注释.{0,12}(?:废弃|弃用)|标记.{0,12}(?:已废弃|已弃用)|新旧.{0,12}(?:并列|并行|共存)|不先生成旧|旧白色内搭|不经过旧|@deprecated|backwards? compatibility)/i;

test('current documentation describes active behavior without migration-era instructions', () => {
  const files = ['README.md', 'artifacts/game-progress.md', '.pi-spec/spec/INDEX.md',
    '.pi-spec/requirements/2026-09-05.hd2d-portfolio/requirements.md',
    '.pi-spec/requirements/2026-09-05.hd2d-portfolio/acceptance.md',
    ...readdirSync(path.join(root, '.pi-spec/spec/portfolio')).filter(file => file.endsWith('.md')).map(file => `.pi-spec/spec/portfolio/${file}`)];
  for (const file of files) {
    const content = readFileSync(path.join(root, file), 'utf8');
    expect(content, file).not.toMatch(forbidden);
    expect(content, file).not.toMatch(/当前进入 M1|尚未开始实现|继续使用真实Bun\/ego|基础player-voxel\.ts仍/);
  }
});

test('production comments explain current mechanics rather than keeping deprecated alternatives', () => {
  const files: string[] = ['App.tsx'];
  const visit = (directory: string) => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:ts|tsx|css)$/.test(file) && !/\.test\.tsx?$/.test(file)) files.push(file);
    }
  };
  visit('portfolio'); visit('components');
  for (const file of files) {
    const comments = readFileSync(path.join(root, file), 'utf8').match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) ?? [];
    expect(comments.join('\n'), file).not.toMatch(forbidden);
  }
});
