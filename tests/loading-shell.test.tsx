import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadingShell } from '../components/LoadingShell';

describe('LoadingShell 的「先看资料」', () => {
  test('中文是链接 <a class="loading-shell-button" href="./profile/">先看资料</a>', () => {
    const html = renderToStaticMarkup(createElement(LoadingShell, { language: 'zh' }));
    expect(html).toMatch(/<a class="loading-shell-button" href="\.\/profile\/">先看资料<\/a>/);
  });

  test('英文文字为 Read the profile first', () => {
    const html = renderToStaticMarkup(createElement(LoadingShell, { language: 'en' }));
    expect(html).toMatch(/<a class="loading-shell-button" href="\.\/profile\/">Read the profile first<\/a>/);
  });

  test.each(['zh', 'en'] as const)('%s 下加载页里没有 <button', (language) => {
    const html = renderToStaticMarkup(createElement(LoadingShell, { language }));
    expect(html).not.toContain('<button');
  });

  test('离场状态下链接仍在，href 不变', () => {
    const html = renderToStaticMarkup(createElement(LoadingShell, { language: 'en', leaving: true }));
    expect(html).toContain('href="./profile/"');
  });
});
