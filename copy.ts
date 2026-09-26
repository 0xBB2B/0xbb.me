import { APP_DATA, type Language } from './data';

export const COPY = {
  en: {
    plaqueHint: "Tap the red car to take the driver's seat",
    loadingCode: 'Loading code…',
    loadingScene: 'Setting up the rainy corner…',
    readFirst: 'Read the profile first',
    sceneFailed: "The 3D scene couldn't load",
    closeCard: 'Close',
    enterCar: "Take the driver's seat",
    languageLabel: 'Language',
    avatarAlt: 'Portrait of FUBUKI_BB',
    locationLabel: 'Based in',
    directionsLabel: 'Focus',
    linksLabel: 'Links',
  },
  zh: {
    plaqueHint: '点击红色跑车，坐进驾驶座',
    loadingCode: '正在加载代码…',
    loadingScene: '正在布置雨夜街角…',
    readFirst: '先看资料',
    sceneFailed: '3D 场景无法加载',
    closeCard: '关闭',
    enterCar: '进入驾驶座',
    languageLabel: '语言',
    avatarAlt: 'FUBUKI_BB 的头像',
    locationLabel: '所在地',
    directionsLabel: '方向',
    linksLabel: '链接',
  },
} satisfies Record<Language, Record<string, string>>;

export const AVATAR_FALLBACK = 'F';

export function rolesLine(language: Language) {
  return APP_DATA.profile.roles[language].join(' · ');
}

export function locationLine() {
  return APP_DATA.profile.location.join(' · ');
}
