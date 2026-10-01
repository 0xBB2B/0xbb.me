import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageToggle } from '../components/LanguageToggle';

describe('LanguageToggle', () => {
  const html = renderToStaticMarkup(
    createElement(LanguageToggle, { language: 'zh', onLanguageChange: () => {} }),
  );

  test('根元素类名为 language-toggle', () => {
    expect(html).toContain('class="language-toggle"');
  });

  test('有 EN 与 中 两个按钮，当前语言按钮 aria-pressed="true"', () => {
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/<button[^>]*>中<\/button>/)![0]).toContain('aria-pressed="true"');
    expect(html.match(/<button[^>]*>EN<\/button>/)![0]).toContain('aria-pressed="false"');
  });
});
