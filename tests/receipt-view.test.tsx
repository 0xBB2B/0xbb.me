import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReceiptView } from '../components/ReceiptView';
import type { Language } from '../data';
import type { View } from '../diorama/view-state';

type Props = Parameters<typeof ReceiptView>[0];

const noop = () => {};

function render(overrides: Partial<Props> = {}): string {
  const props: Props = {
    language: 'zh',
    view: 'story',
    failed: false,
    showBack: true,
    onBack: noop,
    onLanguageChange: noop,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(ReceiptView, props));
}

const decodeEntities = (html: string) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const rootTag = (html: string) => html.match(/^<[^>]+>/)![0];

describe('ReceiptView 内容', () => {
  test('story 时含小票、语言开关，名字是可编程聚焦的 h1', () => {
    const html = render();
    expect(html).toContain('class="receipt"');
    expect(html).toContain('class="language-toggle"');
    expect(html).toMatch(/<h1[^>]*tabindex="-1"[^>]*>FUBUKI_BB<\/h1>/);
  });

  test.each([
    ['zh', '返回全景'],
    ['en', 'Back to overview'],
  ] as [Language, string][])('showBack 为 true 时 %s 语言下有返回按钮「%s」', (language, label) => {
    const html = render({ language, showBack: true });
    expect(html).toMatch(new RegExp(`<button[^>]*>${label}</button>`));
  });

  test('showBack 为 false 时没有返回按钮', () => {
    const html = render({ showBack: false });
    expect(html).not.toContain('返回全景');
    expect(html).not.toContain('Back to overview');
  });

  test.each([
    ['zh', '3D 场景无法加载'],
    ['en', "The 3D scene couldn't load"],
  ] as [Language, string][])('failed 为 true 时 %s 语言下显示失败提示', (language, message) => {
    expect(decodeEntities(render({ language, failed: true }))).toContain(message);
  });

  test('failed 为 false 时不显示失败提示', () => {
    const html = decodeEntities(render({ failed: false }));
    expect(html).not.toContain('3D 场景无法加载');
    expect(html).not.toContain("The 3D scene couldn't load");
  });

  test('语言为 en 时小票文字是英文，且页面不含进度点与 SCROLL 提示', () => {
    const html = render({ language: 'en' });
    expect(html).toContain('Still open on a rainy night');
    expect(html).not.toContain('story-dot');
    expect(html).not.toContain('story-sections');
    expect(html).not.toContain('SCROLL ↓');
  });
});

describe('ReceiptView 各视角的显示与 inert', () => {
  test.each(['diorama', 'entering'] as View[])('%s 时根元素带 hidden 与 inert', (view) => {
    const tag = rootTag(render({ view }));
    expect(tag).toMatch(/\shidden(=|\s|>)/);
    expect(tag).toMatch(/\sinert(=|\s|>)/);
  });

  test('story 时根元素既不 hidden 也不 inert', () => {
    const tag = rootTag(render({ view: 'story' }));
    expect(tag).not.toMatch(/\shidden(=|\s|>)/);
    expect(tag).not.toMatch(/\sinert(=|\s|>)/);
  });

  test('exiting 时仍渲染小票，根元素 inert 但不 hidden', () => {
    const html = render({ view: 'exiting' });
    const tag = rootTag(html);
    expect(html).toContain('class="receipt"');
    expect(tag).toMatch(/\sinert(=|\s|>)/);
    expect(tag).not.toMatch(/\shidden(=|\s|>)/);
  });
});
