---
name: 04-site-shell
description: 构建时静态输出加载页与英文简介，更新元信息、站点地图、网站图标与第三方声明
---
# 站点外壳与搜索信息

## 目标
构建产物 `index.html` 不跑脚本也能显示加载页、带有完整英文资料文字和正确的搜索与分享信息；网站图标换成红色 911 剪影。

## 业务规则（来源：spec site/loading-shell、site/static-profile-html、site/favicon）
- 加载页是写在 `index.html` 里的静态内容，样式内联。内容包括：
  - 全屏深蓝雨夜背景；
  - 名字 `FUBUKI_BB`；
  - 状态文字（静态阶段为英文 "Loading code…"），所在元素带 `role="status"`、`aria-live="polite"`；
  - 循环加载指示；
  - 「Read the profile first」按钮（静态阶段按钮存在但无行为，10 接管）。
- `index.html` 不跑脚本时包含英文资料全文：名字、职位、所在地、方向、简介第一段、四个链接（`<a href>`）。这段内容平时隐藏，供简介卡片使用。
- `<title>` 为 `FUBUKI_BB — Engineering, AI Workflows & Exploration`。`canonical` 为 `https://0xbb.me`。`og:image`、`twitter:image` 为 `https://0xbb.me/profile.jpg`。输出 `Person` 与 `WebSite` 两段 JSON-LD（沿用现有 `plugins/htmlPlugin.ts` 的注入逻辑）。
- `index.html` 不出现 "playable"、"walk"、"lighthouse"、「灯塔」；不引用外部域名的脚本或样式表。
- `sitemap.xml` 只含 `https://0xbb.me/`。
- 网站图标：SVG，红色 `#c8102a` 的 911 侧身剪影，车头朝右，透明背景，无 `<text>`，剪影宽度 ≥ `viewBox` 宽度的 80%。

## 涉及文件
- 修改：`plugins/htmlPlugin.ts`
- 新建：`components/LoadingShell.tsx`、`components/LoadingShell.css`
- 新建：`components/StaticProfile.tsx`
- 修改：`metadata.json`、`public/sitemap.xml`、`favicon.svg`、`public/THIRD_PARTY_NOTICES.txt`（只改标题行）
- 修改：`plugins/htmlPlugin.test.ts`；新建 `tests/favicon.test.ts`、`tests/static-profile.test.ts`

## 成品定义
### metadata.json
```json
{
  "name": "FUBUKI_BB",
  "description": "FUBUKI_BB — full-stack engineer and AI agent developer. Step into a rainy-night Tokyo convenience store diorama and take the driver's seat to read the profile.",
  "keywords": ["Full Stack Engineer", "System Architect", "AI Agent Developer", "AI Workflows", "Scalable Backends", "Game SDK Ecosystems", "Payment Platforms", "FUBUKI_BB"],
  "author": { "name": "FUBUKI_BB", "email": "bb@yorha.xyz", "role": "Full Stack Engineer & AI Agent Developer" },
  "siteUrl": "https://0xbb.me",
  "social": { "github": "https://github.com/0xBB2b", "linkedin": "https://www.linkedin.com/in/0xbb2b", "email": "mailto:bb@yorha.xyz" },
  "image": "/profile.jpg",
  "locale": "en_US",
  "themeColor": "#142047"
}
```
### public/sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://0xbb.me/</loc>
    <lastmod>2026-09-26</lastmod>
  </url>
</urlset>
```
### favicon.svg
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path fill="#c8102a" d="M3 27h12v2H3z"/>
  <path fill="#c8102a" d="M9 29h2v2H9z"/>
  <path fill="#c8102a" d="M4 43v-7c0-3 2-5 6-6 6-5 12-10 20-10.5 6-.5 10 2.5 14 7.5 6 1 13 3 16 6 1.5 1.5 2 4 1.5 7l-.5 3z"/>
  <path fill="#1b2436" d="M15 29c5-5 10-7 15-7 4 0 7 2 10 5z"/>
  <circle cx="16" cy="43" r="5.5" fill="#16171d"/>
  <circle cx="49" cy="43" r="5.5" fill="#16171d"/>
</svg>
```
### public/THIRD_PARTY_NOTICES.txt
第一行标题由 `MC-2D Portfolio` 改为 `0xbb.me — Rainy Konbini Portfolio`，其余许可证正文不变。

## 函数清单
### components/LoadingShell.tsx
| 函数名 | 职责 |
|---|---|
| `LoadingShell` | 渲染加载页结构：名字、状态文字元素（`role="status"`、`aria-live="polite"`）、加载指示、「先看资料」按钮；接收可选的语言、阶段、按钮回调与淡出状态属性，默认值为英文、代码阶段、无回调（供静态渲染） |

### components/StaticProfile.tsx
| 函数名 | 职责 |
|---|---|
| `StaticProfile` | 用 03 的 `ProfileContent`（语言固定 `en`）渲染一个隐藏容器（`hidden` 属性，带 `data-static-profile`），供爬虫读取与简介卡片首屏复用 |

### plugins/htmlPlugin.ts
| 函数名 | 职责 |
|---|---|
| `htmlPlugin` | 在 `transformIndexHtml` 中：把 `<div id="root"></div>` 替换为包含 `LoadingShell` 与 `StaticProfile` 静态标记的 `#root`；把 `LoadingShell.css` 与 `ProfileContent.css` 内联为 `<style data-shell-styles>`；元信息与 JSON-LD 注入逻辑保持不变 |

## 协作关系
- 依赖 03 的 `ProfileContent`；10 在客户端挂载时用 `createRoot` 接管 `#root`，渲染同结构的 `LoadingShell` 并开始阶段文字与淡出。
- `vite.config.ts` 公开资源清单已在 01 更新，本 plan 不再改动。

## 验证方式
- 测试入口：`bun run build`，然后 `bun test plugins/htmlPlugin.test.ts tests/static-profile.test.ts tests/favicon.test.ts`
- 测试输入：`dist/index.html`、`dist/sitemap.xml`、根目录 `favicon.svg`。
- 预期结果：
  - `dist/index.html` 去掉 `<script>` 后的文本包含 `FUBUKI_BB`、`Full Stack Engineer`、英文简介第一段全文、`https://github.com/0xBB2b`、`https://www.linkedin.com/in/0xbb2b`、`https://juejin.cn/user/1037558235795032`、`mailto:bb@yorha.xyz`。
  - 存在带 `role="status"` 与 `aria-live="polite"` 的元素，文字为 "Loading code…"；存在文字为 "Read the profile first" 的按钮。
  - `<title>`、`canonical`、`og:image`、`twitter:image` 与业务规则一致；两段 JSON-LD 可被 `JSON.parse`，`@type` 分别为 `Person`、`WebSite`。
  - HTML 不含 `playable`、`walk`、`lighthouse`、`灯塔`（不区分大小写），不含外部域名的 `<script src>` 或 `<link rel="stylesheet">`。
  - `dist/sitemap.xml` 只有一个 `<loc>https://0xbb.me/</loc>`。
  - `favicon.svg` 含 `#c8102a`，不含 `<text`；所有 `path`/`circle` 的横向包围范围 ≥ 51.2（即 64 × 80%）；`dist/index.html` 含 `<link rel="icon" type="image/svg+xml"` 且 `dist/` 中存在对应文件。
- [ ] 上述断言全部通过。
