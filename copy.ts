import { APP_DATA, type Language } from './data';

export const COPY = {
  en: {
    loadingCode: 'Loading code…',
    loadingScene: 'Setting up the rainy corner…',
    readFirst: 'Read the profile first',
    sceneFailed: "The 3D scene couldn't load",
    viewProfile: 'View profile',
    aboutTitle: 'Still open on a rainy night',
    linksTitle: "Let's get going",
    scrollHint: 'SCROLL ↓',
    progressLabel: 'Profile progress',
    sectionLabels: ['01 · WHO', '02 · ABOUT', '03 · FOCUS & LINKS'],
    languageLabel: 'Language',
    avatarAlt: 'Portrait of FUBUKI_BB',
    locationLabel: 'Based in',
    directionsLabel: 'Focus',
    linksLabel: 'Links',
  },
  zh: {
    loadingCode: '正在加载代码…',
    loadingScene: '正在布置雨夜街角…',
    readFirst: '先看资料',
    sceneFailed: '3D 场景无法加载',
    viewProfile: '查看资料',
    aboutTitle: '雨夜里还亮着的店',
    linksTitle: '一起出发',
    scrollHint: 'SCROLL ↓',
    progressLabel: '资料进度',
    sectionLabels: ['01 · WHO', '02 · ABOUT', '03 · FOCUS & LINKS'],
    languageLabel: '语言',
    avatarAlt: 'FUBUKI_BB 的头像',
    locationLabel: '所在地',
    directionsLabel: '方向',
    linksLabel: '链接',
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export const AVATAR_FALLBACK = 'F';

export function rolesLine(language: Language) {
  return APP_DATA.profile.roles[language].join(' · ');
}

export function locationLine() {
  return APP_DATA.profile.location.join(' · ');
}
