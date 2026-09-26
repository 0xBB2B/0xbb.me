---
name: 02-content-and-language
description: 精简个人资料数据，集中中英文界面文案，实现初始语言判定与 html lang 同步
---
# 内容数据与语言

## 目标
全站共用一份个人资料和一份中英文文案，并按浏览器语言选出初始语言。

## 业务规则（来源：spec profile/language、profile/cabin-displays、plaque/plaque-text、site/loading-shell、profile/profile-card、cabin/enter-driver-view）
- 两种语言 `zh`、`en`。`navigator.language` 以 `zh` 开头（不区分大小写）为中文，否则英文。
- `<html lang>`：中文 `zh-CN`，英文 `en`。语言选择不持久化（不写 localStorage、Cookie、地址栏）。
- 个人资料字段：名字 `FUBUKI_BB`；三个职位；所在地 Tokyo、Shanghai；四个方向；简介只保留第一段；四个链接 GitHub、LinkedIn、Juejin、Email。
- 不再有技能（skills）与项目（projects）数据。
- 铭牌第二行职位用「 · 」连接；第三行提示：中文「点击红色跑车，坐进驾驶座」，英文 "Tap the red car to take the driver's seat"。
- 加载页两阶段文字、「先看资料」按钮；简介卡片失败提示；键盘入口「进入驾驶座」——文案见下方成品。

## 涉及文件
- 修改：`data.ts`
- 新建：`copy.ts`
- 新建：`language.ts`
- 新建：`tests/content.test.ts`、`tests/language.test.ts`

## 成品定义
### data.ts（最终内容，exec 原样落盘）
```ts
export type Language = 'en' | 'zh';
export type LocalizedText = Record<Language, string>;

export const APP_DATA = {
  profile: {
    name: 'FUBUKI_BB',
    roles: {
      en: ['Full Stack Engineer', 'System Architect', 'AI Agent Developer'],
      zh: ['全栈工程师', '系统架构师', 'AI Agent开发者'],
    } satisfies Record<Language, string[]>,
    location: ['Tokyo', 'Shanghai'],
    bio: {
      en: 'Behind every interface is a small promise: that someone can find their way, finish their work, or begin something new. This corner of the web brings together full-stack engineering, system architecture, and an ongoing exploration of AI workflows.',
      zh: '每一个界面背后，都藏着一个朴素的约定：让人找到方向，把事情做好，或是开始一段新的尝试。这里记录着全栈工程、系统架构，以及对 AI 工作流的持续探索。',
    } satisfies LocalizedText,
    directions: [
      { id: 'ai-workflows', en: 'AI Workflows', zh: 'AI 工作流' },
      { id: 'scalable-backends', en: 'Scalable Backends', zh: '可扩展后端' },
      { id: 'game-sdk-ecosystems', en: 'Game SDK Ecosystems', zh: '游戏 SDK 生态' },
      { id: 'payment-platforms', en: 'Payment Platforms', zh: '支付平台' },
    ],
  },
  socialLinks: [
    { name: 'GitHub', url: 'https://github.com/0xBB2b' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/0xbb2b' },
    { name: 'Juejin', url: 'https://juejin.cn/user/1037558235795032' },
    { name: 'Email', url: 'mailto:bb@yorha.xyz' },
  ],
};
```

### copy.ts（最终内容，exec 原样落盘）
```ts
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
```

## 函数清单
### language.ts
| 函数名 | 职责 |
|---|---|
| `detectLanguage` | 输入浏览器语言字符串（可能为空），以 `zh` 开头（不区分大小写）返回 `'zh'`，否则 `'en'` |
| `htmlLang` | 把 `Language` 映射为 `<html lang>` 取值：`zh` → `zh-CN`，`en` → `en` |
| `applyDocumentLanguage` | 把 `document.documentElement.lang` 设为 `htmlLang` 的结果；不写任何存储 |

## 协作关系
- `copy.ts` 的 `rolesLine`、`locationLine` 读取 `data.ts`，供铭牌（06）、资料组件（03）使用。
- `language.ts` 由 10-app-shell 在启动与切换语言时调用。

## 验证方式
- 测试入口：`bun test tests/content.test.ts tests/language.test.ts`
- 测试输入：直接导入 `data.ts`、`copy.ts`、`language.ts` 的导出。
- 预期结果：
  - `detectLanguage('zh-CN')`、`detectLanguage('ZH-tw')` 为 `'zh'`；`detectLanguage('ja-JP')`、`detectLanguage('')`、`detectLanguage(undefined)` 为 `'en'`。
  - `htmlLang('zh') === 'zh-CN'`，`htmlLang('en') === 'en'`。
  - `APP_DATA` 没有 `skills`、`projects` 键；`bio.en`、`bio.zh` 都不含换行符 `\n`。
  - `rolesLine('zh') === '全栈工程师 · 系统架构师 · AI Agent开发者'`，`rolesLine('en') === 'Full Stack Engineer · System Architect · AI Agent Developer'`。
  - `COPY.zh.plaqueHint === '点击红色跑车，坐进驾驶座'`，`COPY.en.plaqueHint === "Tap the red car to take the driver's seat"`。
  - 四个链接地址与成品一致。
- [ ] 上述断言全部通过。
- [ ] `applyDocumentLanguage` 调用前后 `localStorage` 长度不变（在浏览器环境测试可放到 10 的端到端用例中）。
