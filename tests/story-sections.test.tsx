import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { StorySections } from '../components/StorySections';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { APP_DATA, type Language } from '../data';
import { COPY, rolesLine, locationLine } from '../copy';

type StorySectionsProps = ComponentProps<typeof StorySections>;

const noop = () => {};

const decodeEntities = (html: string) =>
  html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');

function renderStorySections(overrides: Partial<StorySectionsProps> = {}): string {
  const props: StorySectionsProps = {
    language: 'zh',
    active: true,
    currentIndex: 0,
    failed: false,
    onLanguageChange: noop,
    ...overrides,
  };
  return decodeEntities(renderToStaticMarkup(createElement(StorySections, props)));
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

function textImmediatelyAfter(html: string, marker: string): string {
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const afterMarker = start + marker.length;
  const closeIndex = html.indexOf('<', afterMarker);
  return html.slice(afterMarker, closeIndex);
}

describe('StorySections：三段资料内容与顺序', () => {
  test('zh：小标签、头像、姓名、职位、所在地、标题、简介、方向、链接按顺序出现', () => {
    const html = renderStorySections({ language: 'zh' });
    assertAscendingIndices(html, [
      COPY.zh.sectionLabels[0],
      'profile.jpg',
      '>FUBUKI_BB<',
      rolesLine('zh'),
      locationLine(),
      COPY.zh.sectionLabels[1],
      COPY.zh.aboutTitle,
      APP_DATA.profile.bio.zh,
      COPY.zh.sectionLabels[2],
      COPY.zh.linksTitle,
      APP_DATA.profile.directions[0].zh,
      APP_DATA.profile.directions[1].zh,
      APP_DATA.profile.directions[2].zh,
      APP_DATA.profile.directions[3].zh,
      'https://github.com/0xBB2b',
      'https://www.linkedin.com/in/0xbb2b',
      'https://juejin.cn/user/1037558235795032',
      'mailto:bb@yorha.xyz',
    ]);
  });

  test('en：小标签、头像、姓名、职位、所在地、标题、简介、方向、链接按顺序出现', () => {
    const html = renderStorySections({ language: 'en' });
    assertAscendingIndices(html, [
      COPY.en.sectionLabels[0],
      'profile.jpg',
      '>FUBUKI_BB<',
      rolesLine('en'),
      locationLine(),
      COPY.en.sectionLabels[1],
      COPY.en.aboutTitle,
      APP_DATA.profile.bio.en,
      COPY.en.sectionLabels[2],
      COPY.en.linksTitle,
      APP_DATA.profile.directions[0].en,
      APP_DATA.profile.directions[1].en,
      APP_DATA.profile.directions[2].en,
      APP_DATA.profile.directions[3].en,
      'https://github.com/0xBB2b',
      'https://www.linkedin.com/in/0xbb2b',
      'https://juejin.cn/user/1037558235795032',
      'mailto:bb@yorha.xyz',
    ]);
  });

  test('zh：简介只包含第一段，紧随其后没有更多正文', () => {
    const html = renderStorySections({ language: 'zh' });
    expect(textImmediatelyAfter(html, APP_DATA.profile.bio.zh).trim()).toBe('');
  });

  test('en：简介只包含第一段，紧随其后没有更多正文', () => {
    const html = renderStorySections({ language: 'en' });
    expect(textImmediatelyAfter(html, APP_DATA.profile.bio.en).trim()).toBe('');
  });

  test('第 1 段底部显示 SCROLL ↓ 提示', () => {
    const html = renderStorySections();
    expect(html).toContain(COPY.zh.scrollHint);
  });
});

describe('StorySections：链接', () => {
  test('三个外部链接带 target="_blank" 与 rel="noopener"，Email 链接不带 target', () => {
    const html = renderStorySections();
    for (const link of APP_DATA.socialLinks.filter((l) => l.name !== 'Email')) {
      const anchor = findAnchorTag(html, link.url);
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener"');
    }
    const emailLink = APP_DATA.socialLinks.find((l) => l.name === 'Email')!;
    const mailAnchor = findAnchorTag(html, emailLink.url);
    expect(mailAnchor).not.toContain('target=');
  });
});

describe('StorySections：进度点', () => {
  test('同一时刻只有一个点带 aria-current="true"', () => {
    const html = renderStorySections({ currentIndex: 1 });
    const matches = [...html.matchAll(/aria-current="true"/g)];
    expect(matches).toHaveLength(1);
  });

  test('currentIndex 变化时，带 aria-current="true" 的点在文档中的位置随之推进', () => {
    const positions = ([0, 1, 2] as const).map((currentIndex) => {
      const html = renderStorySections({ currentIndex });
      const match = html.match(/aria-current="true"/);
      expect(match).not.toBeNull();
      return match!.index!;
    });
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
  });
});

describe('StorySections：进度点高亮样式', () => {
  test('只有当前段的点带高亮类名', () => {
    for (const currentIndex of [0, 1, 2] as const) {
      const html = renderStorySections({ currentIndex });
      const dots = [...html.matchAll(/class="(story-dot(?: [^"]*)?)"/g)].map((m) => m[1]);
      expect(dots).toHaveLength(3);
      dots.forEach((cls, i) => expect(cls.includes('story-dot--active')).toBe(i === currentIndex));
    }
  });
});

describe('StorySections：简介只有一段', () => {
  test.each(['zh', 'en'] as const)('%s：第 2 段只有一个简介段落，内容等于第一段', (language) => {
    const html = renderStorySections({ language });
    const bios = [...html.matchAll(/<p class="story-bio">([^<]*)<\/p>/g)];
    expect(bios).toHaveLength(1);
    expect(bios[0][1]).toBe(APP_DATA.profile.bio[language]);
  });
});

describe('StorySections：语言切换', () => {
  test('zh：语言按钮显示 EN / 中，当前语言按钮 aria-pressed=true，另一个 aria-pressed=false', () => {
    const html = renderStorySections({ language: 'zh' });
    expect(html).toContain('>EN<');
    expect(html).toContain('>中<');
    const zhButton = html.match(/<button[^>]*>中<\/button>/);
    expect(zhButton).not.toBeNull();
    expect(zhButton![0]).toContain('aria-pressed="true"');
    const enButton = html.match(/<button[^>]*>EN<\/button>/);
    expect(enButton).not.toBeNull();
    expect(enButton![0]).toContain('aria-pressed="false"');
  });

  test('en：语言按钮显示 EN / 中，当前语言按钮 aria-pressed=true，另一个 aria-pressed=false', () => {
    const html = renderStorySections({ language: 'en' });
    const enButton = html.match(/<button[^>]*>EN<\/button>/);
    expect(enButton).not.toBeNull();
    expect(enButton![0]).toContain('aria-pressed="true"');
    const zhButton = html.match(/<button[^>]*>中<\/button>/);
    expect(zhButton).not.toBeNull();
    expect(zhButton![0]).toContain('aria-pressed="false"');
  });
});

describe('StorySections：可见性', () => {
  test('active=false 时根元素带 hidden 与 inert', () => {
    const html = renderStorySections({ active: false });
    const rootTag = html.match(/^<[^>]+>/)![0];
    expect(rootTag).toContain('hidden');
    expect(rootTag).toContain('inert');
  });

  test('active=true 时根元素既无 hidden 也无 inert', () => {
    const html = renderStorySections({ active: true });
    const rootTag = html.match(/^<[^>]+>/)![0];
    expect(rootTag).not.toContain('hidden');
    expect(rootTag).not.toContain('inert');
  });
});

describe('StorySections：三维加载失败提示', () => {
  test('failed=true（zh）：失败提示出现在 FUBUKI_BB 之前', () => {
    const html = renderStorySections({ failed: true, language: 'zh' });
    assertAscendingIndices(html, [COPY.zh.sceneFailed, '>FUBUKI_BB<']);
  });

  test('failed=true（en）：失败提示出现在 FUBUKI_BB 之前', () => {
    const html = renderStorySections({ failed: true, language: 'en' });
    assertAscendingIndices(html, [COPY.en.sceneFailed, '>FUBUKI_BB<']);
  });

  test('failed=false 时不出现失败提示', () => {
    const html = renderStorySections({ failed: false, language: 'zh' });
    expect(html).not.toContain(COPY.zh.sceneFailed);
  });
});

describe('StorySections：可聚焦入口', () => {
  test('第 1 段标题（h1，内容 FUBUKI_BB）带 tabindex="-1"', () => {
    const html = renderStorySections();
    const match = html.match(/<h1([^>]*)>FUBUKI_BB<\/h1>/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain('tabindex="-1"');
  });
});

describe('StorySections：不出现已下线内容', () => {
  test('输出中不包含技能列表与已下线项目名称', () => {
    const outputs = [
      renderStorySections({ language: 'zh' }),
      renderStorySections({ language: 'en' }),
      renderStorySections({ active: false }),
      renderStorySections({ failed: true }),
    ];
    for (const html of outputs) {
      for (const forbidden of ['bb-spec', 'pi-subagent-cluster', 'Golang', 'Docker']) {
        expect(html).not.toContain(forbidden);
      }
    }
  });
});

describe('旧资料组件已删除', () => {
  const root = path.resolve(import.meta.dir, '..');
  test.each([
    'components/ProfileCard.tsx',
    'components/ProfileCard.css',
    'components/CenterScreen.tsx',
    'components/CenterScreen.css',
    'components/ProfileContent.tsx',
    'components/ProfileContent.css',
  ])('%s 不再存在', (relPath) => {
    expect(existsSync(path.join(root, relPath))).toBe(false);
  });
});
