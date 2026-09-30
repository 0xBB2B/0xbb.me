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
    backToOverview: 'Back to overview',
    seeScene: '← See the 3D rainy corner',
    receiptStore: 'RAINY NIGHT · 24H',
    tapPhotoHint: '[ TAP PHOTO · PRINT FULL SHOT ]',
    focusLabel: 'FOCUS',
    receiptLinksLabel: 'LINKS',
    receiptThanks: '0XBB.ME · THANK YOU',
    developing: 'DEVELOPING…',
    photoFailed: "The photo didn't print",
    printAgain: 'Print again',
    closePhoto: 'Close',
    dismissHint: 'Tap outside or press Esc to close',
    fullAlt: 'Full-length portrait of FUBUKI_BB',
    photoCaption: '0xBB MART PHOTO · L',
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
    backToOverview: '返回全景',
    seeScene: '← 去看 3D 雨夜街角',
    receiptStore: 'RAINY NIGHT · 24H',
    tapPhotoHint: '[ 点头像 · 打印全身照 ]',
    focusLabel: '方向',
    receiptLinksLabel: '链接',
    receiptThanks: '0XBB.ME · THANK YOU',
    developing: '显影中…',
    photoFailed: '照片没能打印出来',
    printAgain: '再打印一次',
    closePhoto: '关闭',
    dismissHint: '点空白处或按 Esc 关闭',
    fullAlt: 'FUBUKI_BB 的全身像',
    photoCaption: '0xBB MART PHOTO · L',
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export const AVATAR_FALLBACK = 'F';

export function rolesLine(language: Language) {
  return APP_DATA.profile.roles[language].join(' · ');
}

export function locationLine() {
  return APP_DATA.profile.location.join(' · ');
}
