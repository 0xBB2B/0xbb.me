import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileContent } from '../components/ProfileContent';
import { ProfileCard } from '../components/ProfileCard';
import { CenterScreen } from '../components/CenterScreen';
import { APP_DATA, type Language } from '../data';
import { COPY, rolesLine, locationLine } from '../copy';

const noop = () => {};

function renderProfileContent(language: Language) {
  return renderToStaticMarkup(createElement(ProfileContent, { language, onLanguageChange: noop }));
}

const decodeEntities = (html: string) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');

function renderProfileCard(open: boolean, mode: 'preview' | 'fault', language: Language) {
  return decodeEntities(renderToStaticMarkup(
    createElement(ProfileCard, { open, mode, language, onLanguageChange: noop, onClose: noop }),
  ));
}

function renderCenterScreen(active: boolean, language: Language) {
  return renderToStaticMarkup(createElement(CenterScreen, { active, language, onLanguageChange: noop }));
}

function assertAscendingIndices(html: string, needles: string[]) {
  let lastIndex = -1;
  for (const needle of needles) {
    const index = html.indexOf(needle);
    expect(index).toBeGreaterThan(-1);
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

describe('ProfileContent', () => {
  test('zh: renders the 8 profile items in fixed order', () => {
    const html = renderProfileContent('zh');
    assertAscendingIndices(html, [
      'profile.jpg',
      '>FUBUKI_BB<',
      rolesLine('zh'),
      locationLine(),
      APP_DATA.profile.directions[0].zh,
      '每一个界面背后',
      'https://github.com/0xBB2b',
      'aria-pressed',
    ]);
    expect(html).toContain('<img');
    expect(html).toContain(`alt="${COPY.zh.avatarAlt}"`);
  });

  test('en: renders the 8 profile items in fixed order', () => {
    const html = renderProfileContent('en');
    assertAscendingIndices(html, [
      'profile.jpg',
      '>FUBUKI_BB<',
      rolesLine('en'),
      locationLine(),
      APP_DATA.profile.directions[0].en,
      'Behind every interface is a small promise',
      'https://github.com/0xBB2b',
      'aria-pressed',
    ]);
    expect(html).toContain('<img');
    expect(html).toContain(`alt="${COPY.en.avatarAlt}"`);
  });

  test('external links open in a new tab with rel=noopener, mailto link does not', () => {
    const html = renderProfileContent('zh');
    for (const link of APP_DATA.socialLinks.filter((l) => l.name !== 'Email')) {
      const anchor = findAnchorTag(html, link.url);
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener"');
    }
    const emailLink = APP_DATA.socialLinks.find((l) => l.name === 'Email')!;
    const mailAnchor = findAnchorTag(html, emailLink.url);
    expect(mailAnchor).not.toContain('target=');
  });

  test('zh: language toggle shows EN/中 with aria-pressed on the current language', () => {
    const html = renderProfileContent('zh');
    expect(html).toContain('>EN<');
    expect(html).toContain('>中<');
    const zhButton = html.match(/<button[^>]*>中<\/button>/);
    expect(zhButton).not.toBeNull();
    expect(zhButton![0]).toContain('aria-pressed="true"');
  });

  test('en: language toggle shows EN/中 with aria-pressed on the current language', () => {
    const html = renderProfileContent('en');
    const enButton = html.match(/<button[^>]*>EN<\/button>/);
    expect(enButton).not.toBeNull();
    expect(enButton![0]).toContain('aria-pressed="true"');
  });
});

describe('ProfileCard', () => {
  test('fault mode (zh): shows the failure alert and no close button', () => {
    const html = renderProfileCard(true, 'fault', 'zh');
    expect(html).toContain(COPY.zh.sceneFailed);
    expect(html).toMatch(/role="alert"/);
    expect(html).not.toContain(COPY.zh.closeCard);
    expect(html).toContain('>FUBUKI_BB<');
    expect(html).toContain(APP_DATA.profile.bio.zh);
  });

  test('fault mode (en): shows the failure alert and no close button', () => {
    const html = renderProfileCard(true, 'fault', 'en');
    expect(html).toContain(COPY.en.sceneFailed);
    expect(html).toMatch(/role="alert"/);
    expect(html).not.toContain(COPY.en.closeCard);
    expect(html).toContain('>FUBUKI_BB<');
    expect(html).toContain(APP_DATA.profile.bio.en);
  });

  test('preview mode (zh): shows the close button and no failure alert', () => {
    const html = renderProfileCard(true, 'preview', 'zh');
    expect(html).toContain(COPY.zh.closeCard);
    expect(html).not.toContain(COPY.zh.sceneFailed);
    expect(html).not.toMatch(/role="alert"/);
    expect(html).toContain('>FUBUKI_BB<');
    expect(html).toContain(APP_DATA.profile.bio.zh);
  });

  test('preview mode (en): shows the close button and no failure alert', () => {
    const html = renderProfileCard(true, 'preview', 'en');
    expect(html).toContain(COPY.en.closeCard);
    expect(html).not.toContain(COPY.en.sceneFailed);
    expect(html).not.toMatch(/role="alert"/);
    expect(html).toContain('>FUBUKI_BB<');
    expect(html).toContain(APP_DATA.profile.bio.en);
  });

  test('renders as a dialog element opened only through showModal', () => {
    const html = renderProfileCard(true, 'preview', 'zh');
    expect(html).toMatch(/<dialog[\s>]/);
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });

  test('fault notice comes before the profile content', () => {
    const html = renderProfileCard(true, 'fault', 'en');
    assertAscendingIndices(html, ['role="alert"', '>FUBUKI_BB<']);
  });
});

describe('CenterScreen', () => {
  test('active=false: root element carries inert and hidden', () => {
    const html = renderCenterScreen(false, 'zh');
    const rootTag = html.match(/^<[^>]+>/)![0];
    expect(rootTag).toContain('inert');
    expect(rootTag).toContain('hidden');
  });

  test('active=true: root element has neither inert nor hidden', () => {
    const html = renderCenterScreen(true, 'zh');
    const rootTag = html.match(/^<[^>]+>/)![0];
    expect(rootTag).not.toContain('inert');
    expect(rootTag).not.toContain('hidden');
  });

  test('renders the profile content inside', () => {
    const html = renderCenterScreen(true, 'zh');
    expect(html).toContain('>FUBUKI_BB<');
    expect(html).toContain(APP_DATA.profile.bio.zh);
  });
});

describe('legacy content removal', () => {
  test('none of the profile UI outputs contain removed skill or project text', () => {
    const outputs = [
      renderProfileContent('zh'),
      renderProfileContent('en'),
      renderProfileCard(true, 'preview', 'zh'),
      renderProfileCard(true, 'fault', 'en'),
      renderCenterScreen(true, 'zh'),
      renderCenterScreen(false, 'en'),
    ];
    for (const html of outputs) {
      for (const forbidden of ['bb-spec', 'pi-subagent-cluster', 'Golang', 'Docker']) {
        expect(html).not.toContain(forbidden);
      }
    }
  });

  test('zh output does not contain the old bio second paragraph', () => {
    const html = renderProfileContent('zh');
    expect(html).not.toContain('资料速览');
    expect(html).not.toContain('作品星星');
  });
});
