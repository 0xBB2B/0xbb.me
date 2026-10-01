import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Receipt } from '../components/Receipt';
import { APP_DATA, type Language } from '../data';

const decodeEntities = (html: string) =>
  html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');

const noop = () => {};

function renderReceipt(language: Language): string {
  return decodeEntities(renderToStaticMarkup(createElement(Receipt, { language, onAvatarClick: noop })));
}

function assertAscendingIndices(html: string, needles: string[]) {
  let lastIndex = -1;
  for (const needle of needles) {
    const index = html.indexOf(needle, lastIndex + 1);
    expect(index).toBeGreaterThan(lastIndex);
    lastIndex = index;
  }
}

function findAnchorTag(html: string, href: string): string {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<a[^>]*href="${escaped}"[^>]*>`));
  expect(match).not.toBeNull();
  return match![0];
}

const LINKS = [
  { name: 'GitHub', text: 'github.com/0xBB2b', url: 'https://github.com/0xBB2b' },
  { name: 'LinkedIn', text: 'in/0xbb2b', url: 'https://www.linkedin.com/in/0xbb2b' },
  { name: 'Juejin', text: 'juejin.cn', url: 'https://juejin.cn/user/1037558235795032' },
  { name: 'Email', text: 'bb@yorha.xyz', url: 'mailto:bb@yorha.xyz' },
];

const COPY_BY_LANGUAGE = {
  zh: {
    hint: '[ 点头像 · 打印全身照 ]',
    roles: ['全栈工程师', '系统架构师', 'AI Agent开发者'],
    location: '所在地',
    title: '雨夜里还亮着的店',
    focusLabel: '方向',
    directions: ['AI 工作流', '可扩展后端', '游戏 SDK 生态', '支付平台'],
    linksLabel: '链接',
    cta: '一起出发',
  },
  en: {
    hint: '[ TAP PHOTO · PRINT FULL SHOT ]',
    roles: ['Full Stack Engineer', 'System Architect', 'AI Agent Developer'],
    location: 'Based in',
    title: 'Still open on a rainy night',
    focusLabel: 'FOCUS',
    directions: ['AI Workflows', 'Scalable Backends', 'Game SDK Ecosystems', 'Payment Platforms'],
    linksLabel: 'LINKS',
    cta: "Let's get going",
  },
} as const;

describe('Receipt：内容与顺序', () => {
  test.each(['zh', 'en'] as const)('%s：10 项内容按顺序出现', (language) => {
    const c = COPY_BY_LANGUAGE[language];
    const html = renderReceipt(language);
    assertAscendingIndices(html, [
      'RAINY NIGHT · 24H',
      './profile.jpg',
      c.hint,
      '>FUBUKI_BB<',
      ...c.roles,
      c.location,
      'Tokyo · Shanghai',
      '02 · ABOUT',
      c.title,
      APP_DATA.profile.bio[language],
      c.focusLabel,
      ...c.directions,
      c.linksLabel,
      ...LINKS.flatMap((l) => [l.name, l.text]),
      c.cta,
      '→',
      '0XBB.ME · THANK YOU',
    ]);
  });

  test.each(['zh', 'en'] as const)('%s：四个方向各带行尾 ×1', (language) => {
    const html = renderReceipt(language);
    expect(html.match(/×1/g)).toHaveLength(4);
  });

  test.each(['zh', 'en'] as const)('%s：简介只含第一段，紧随其后没有更多正文', (language) => {
    const html = renderReceipt(language);
    const bio = APP_DATA.profile.bio[language];
    const start = html.indexOf(bio);
    expect(start).toBeGreaterThan(-1);
    const closeIndex = html.indexOf('<', start + bio.length);
    expect(html.slice(start + bio.length, closeIndex).trim()).toBe('');
    expect(html.match(new RegExp(bio.slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1);
  });

  test.each(['zh', 'en'] as const)('%s：头像 img 指向 ./profile.jpg', (language) => {
    const html = renderReceipt(language);
    expect(html).toMatch(/<img[^>]*src="\.\/profile\.jpg"/);
  });
});

describe('Receipt：行动语', () => {
  test.each(['zh', 'en'] as const)('%s：文字与箭头是相邻的两个独立元素', (language) => {
    const html = renderReceipt(language);
    const escaped = COPY_BY_LANGUAGE[language].cta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(html).toMatch(new RegExp(`<(\\w+)[^>]*>${escaped}</\\1>\\s*<(\\w+)[^>]*>→</\\2>`));
  });
});

describe('Receipt：链接', () => {
  test('四个链接的 href 正确', () => {
    const html = renderReceipt('zh');
    for (const link of LINKS) findAnchorTag(html, link.url);
  });

  test('外部链接带 target="_blank" 与 rel="noopener"，Email 不带 target', () => {
    const html = renderReceipt('zh');
    for (const link of LINKS.filter((l) => l.name !== 'Email')) {
      const anchor = findAnchorTag(html, link.url);
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener"');
    }
    expect(findAnchorTag(html, 'mailto:bb@yorha.xyz')).not.toContain('target=');
  });
});

describe('Receipt：可交互元素', () => {
  test('名字元素是 <h1 tabindex="-1">FUBUKI_BB</h1>', () => {
    expect(renderReceipt('zh')).toContain('<h1 tabindex="-1">FUBUKI_BB</h1>');
  });

  test('头像是带 aria-haspopup="dialog" 的按钮', () => {
    const html = renderReceipt('zh');
    const match = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/);
    expect(match).not.toBeNull();
    expect(html.indexOf(match![0])).toBeLessThan(html.indexOf('./profile.jpg'));
  });
});

describe('Receipt：不出现技能详情与项目介绍', () => {
  test.each(['zh', 'en'] as const)('%s：输出不含技能列表与项目名称', (language) => {
    const html = renderReceipt(language);
    for (const forbidden of ['bb-spec', 'pi-subagent-cluster', 'Golang', 'Docker']) {
      expect(html).not.toContain(forbidden);
    }
  });
});
