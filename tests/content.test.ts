import { expect, test, describe } from 'bun:test';
import { APP_DATA } from '../data';
import { COPY, AVATAR_FALLBACK, rolesLine, locationLine } from '../copy';

describe('APP_DATA.profile', () => {
  test('name is FUBUKI_BB', () => {
    expect(APP_DATA.profile.name).toBe('FUBUKI_BB');
  });

  test('roles are provided per language in the fixed order', () => {
    expect(APP_DATA.profile.roles.en).toEqual(['Full Stack Engineer', 'System Architect', 'AI Agent Developer']);
    expect(APP_DATA.profile.roles.zh).toEqual(['全栈工程师', '系统架构师', 'AI Agent开发者']);
  });

  test('location is Tokyo then Shanghai', () => {
    expect(APP_DATA.profile.location).toEqual(['Tokyo', 'Shanghai']);
  });

  test('directions list has four entries each with en and zh', () => {
    expect(APP_DATA.profile.directions).toEqual([
      { id: 'ai-workflows', en: 'AI Workflows', zh: 'AI 工作流' },
      { id: 'scalable-backends', en: 'Scalable Backends', zh: '可扩展后端' },
      { id: 'game-sdk-ecosystems', en: 'Game SDK Ecosystems', zh: '游戏 SDK 生态' },
      { id: 'payment-platforms', en: 'Payment Platforms', zh: '支付平台' },
    ]);
  });

  test('bio keeps only the first paragraph, with no line breaks', () => {
    expect(APP_DATA.profile.bio.zh).not.toContain('\n');
    expect(APP_DATA.profile.bio.en).not.toContain('\n');
    expect(APP_DATA.profile.bio.zh).toBe('每一个界面背后，都藏着一个朴素的约定：让人找到方向，把事情做好，或是开始一段新的尝试。这里记录着全栈工程、系统架构，以及对 AI 工作流的持续探索。');
    expect(APP_DATA.profile.bio.en).toBe('Behind every interface is a small promise: that someone can find their way, finish their work, or begin something new. This corner of the web brings together full-stack engineering, system architecture, and an ongoing exploration of AI workflows.');
  });
});

describe('APP_DATA.socialLinks', () => {
  test('lists GitHub, LinkedIn, Juejin, Email in that order', () => {
    expect(APP_DATA.socialLinks).toEqual([
      { name: 'GitHub', url: 'https://github.com/0xBB2b' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/0xbb2b' },
      { name: 'Juejin', url: 'https://juejin.cn/user/1037558235795032' },
      { name: 'Email', url: 'mailto:bb@yorha.xyz' },
    ]);
  });
});

describe('APP_DATA shape', () => {
  test('no longer carries skills or projects keys', () => {
    expect(Object.keys(APP_DATA)).not.toContain('skills');
    expect(Object.keys(APP_DATA)).not.toContain('projects');
  });
});

describe('copy', () => {
  test('AVATAR_FALLBACK is F', () => {
    expect(AVATAR_FALLBACK).toBe('F');
  });

  test('rolesLine joins roles with a middle dot per language', () => {
    expect(rolesLine('zh')).toBe('全栈工程师 · 系统架构师 · AI Agent开发者');
    expect(rolesLine('en')).toBe('Full Stack Engineer · System Architect · AI Agent Developer');
  });

  test('locationLine joins Tokyo and Shanghai with a middle dot', () => {
    expect(locationLine()).toBe('Tokyo · Shanghai');
  });

  test('COPY has matching zh/en interface strings', () => {
    expect(COPY.zh.loadingCode).toBe('正在加载代码…');
    expect(COPY.en.loadingCode).toBe('Loading code…');
    expect(COPY.zh.loadingScene).toBe('正在布置雨夜街角…');
    expect(COPY.en.loadingScene).toBe('Setting up the rainy corner…');
    expect(COPY.zh.readFirst).toBe('先看资料');
    expect(COPY.en.readFirst).toBe('Read the profile first');
    expect(COPY.zh.sceneFailed).toBe('3D 场景无法加载');
    expect(COPY.en.sceneFailed).toBe("The 3D scene couldn't load");
  });

  test('COPY carries the keyboard button and story-section copy under their keys', () => {
    expect(COPY.zh.viewProfile).toBe('查看资料');
    expect(COPY.en.viewProfile).toBe('View profile');
    expect(COPY.zh.aboutTitle).toBe('雨夜里还亮着的店');
    expect(COPY.en.aboutTitle).toBe('Still open on a rainy night');
    expect(COPY.zh.linksTitle).toBe('一起出发');
    expect(COPY.en.linksTitle).toBe("Let's get going");
    expect(COPY.zh.scrollHint).toBe('SCROLL ↓');
    expect(COPY.en.scrollHint).toBe('SCROLL ↓');
  });

  test('the three story section tags are identical and ordered in both languages', () => {
    const tags = ['01 · WHO', '02 · ABOUT', '03 · FOCUS & LINKS'];
    expect(COPY.zh.sectionLabels).toEqual(tags);
    expect(COPY.en.sectionLabels).toEqual(tags);
  });
});
