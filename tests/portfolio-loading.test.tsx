import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { LoadingScreen, LOADING_EXIT_MS } from '../components/portfolio/LoadingScreen';
import { Hud } from '../components/portfolio/Hud';
import { createInput } from '../portfolio/input';
import { createSession } from '../portfolio/state';
import { UI_COPY } from '../portfolio/copy';

const read = (file: string) => readFileSync(path.resolve(import.meta.dir, '..', file), 'utf8');

for (const language of ['en', 'zh'] as const) {
  test(`loading screen has accessible, localized stages without invented percentages (${language})`, () => {
    const code = renderToStaticMarkup(<LoadingScreen language={language} />);
    const world = renderToStaticMarkup(<LoadingScreen language={language} phase="world" onOverview={() => {}} />);
    const ready = renderToStaticMarkup(<LoadingScreen language={language} phase="world" leaving onOverview={() => {}} />);
    expect(code).toContain('role="status"');
    expect(code).toContain('aria-live="polite"');
    expect(code).toContain('disabled=""');
    expect(code).toContain(language === 'en' ? 'Loading the journey…' : '正在加载旅程…');
    expect(world).toContain(language === 'en' ? 'Preparing the town…' : '正在准备小镇…');
    expect(world).not.toContain('disabled=""');
    expect(ready).toContain(language === 'en' ? 'Your journey is ready.' : '旅程准备好了。');
    expect(ready).toContain('is-leaving');
    expect(ready).toContain('disabled=""');
    for (const html of [code, world, ready]) {
      expect(html).not.toMatch(/aria-valuenow|\d+%|<img\b|<image\b|<script\b/);
      expect(html).toContain(`transition-duration:${LOADING_EXIT_MS}ms`);
      expect(html).toContain('FUBUKI_BB');
    }
  });
}

test('initial app shields the unfinished scene and its controls behind a single loading screen', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html.match(/class="loading-screen"/g)).toHaveLength(1);
  expect(html).toContain('class="town-interface" inert="" aria-hidden="true" aria-busy="true"');
  expect(html).toContain('class="world-placeholder"');
  expect(html).not.toContain('<canvas');
});

test('loading uses only the opening screen while graphics failures retain their explanation', () => {
  for (const language of ['en', 'zh'] as const) {
    const session = createSession();
    session.language = language;
    const loading = renderToStaticMarkup(<Hud session={session} input={createInput()} graphics="loading" />);
    expect(loading).not.toContain('graphics-loading');
    expect(loading).not.toContain('graphics-status');
    expect(loading).not.toContain('Loading graphics');
    const failed = renderToStaticMarkup(<Hud session={session} input={createInput()} graphics="unavailable" />);
    expect(failed).toContain('role="alert"');
    expect(failed).toContain(UI_COPY[language].graphicsUnavailable);
  }
});

test('loading layout supports responsive views and reduced motion with shared typography', () => {
  const css = read('components/portfolio/LoadingScreen.css');
  expect(css).toContain('position: fixed');
  expect(css).toContain('overflow: auto');
  expect(css).toContain('@media (max-width: 600px)');
  expect(css).toContain('@media (max-height: 420px)');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain('transition: none');
  expect(css).toContain('animation: none');
  expect(css).not.toMatch(/url\(|@import/);
  expect(css).toContain('var(--font-sans)');
  expect(css).toContain('var(--font-display)');
  expect(read('index.html')).toContain('rel="stylesheet" href="./typography.css"');
});
