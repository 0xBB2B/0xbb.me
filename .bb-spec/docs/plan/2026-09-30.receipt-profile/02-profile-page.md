---
name: 02-profile-page
description: 新增不带三维的独立资料页 /profile/：双入口构建、构建时预渲染英文小票、元信息、站点地图
---
# 独立资料页 /profile/

## 目标
构建产物多出 `dist/profile/index.html`：不执行脚本也能读到完整英文小票；脚本到了之后按浏览器语言显示，并且能切换语言、弹出全身照；页面不加载任何三维代码。

## 业务规则（来源：spec profile-page、static-profile-html）
- 地址 `/profile/`，产物 `dist/profile/index.html`。背景为深蓝径向渐变，上面叠一层斜向雨丝纹理，小票水平居中。
- 不引用 three.js 和三维场景代码，不创建 WebGL，页面上没有 `<canvas>`。
- 不执行脚本时：小票全部文字（英文）和四个链接已写在 HTML 里，头像是普通图片。
- 脚本执行后：
  - `navigator.language` 以 `zh` 开头（不区分大小写）显示中文，否则英文；
  - 右上角固定「EN / 中」开关，当前语言的按钮 `aria-pressed="true"`；
  - 切换后小票、相片文字和 `<html lang>`（`zh-CN` / `en`）同步更新；
  - 语言不写入 `localStorage`、Cookie 或地址栏；
  - 点头像弹出全身照相片。
- 左上角固定链接：中「← 去看 3D 雨夜街角」/ 英 `← See the 3D rainy corner`，`href="../"`。
- 小票出现时同样有从上方掉下来的动画；脚本接管页面时不能让动画重播一次。
- `<head>`：
  - `<title>`：`FUBUKI_BB — Profile`；
  - `canonical`：`https://0xbb.me/profile/`；
  - `description` 与首页相同；
  - `og:image`、`twitter:image` 为 `https://0xbb.me/profile.jpg`；
  - 网站图标与首页相同。
- 不引用外部域名的脚本或样式表。
- `sitemap.xml` 恰好两个地址：`https://0xbb.me/` 与 `https://0xbb.me/profile/`。
- 首页、独立页中都不出现 "playable"、"walk"、"lighthouse"、「灯塔」。

## 涉及文件
- 新建 `profile/index.html`、`profile.tsx`、`components/ProfilePage.tsx`、`components/ProfilePage.css`
- 修改 `vite.config.ts`（双入口；发布文件清单加 `profile-full-print.jpg`）
- 修改 `plugins/htmlPlugin.ts`（按页面区分：独立页注入预渲染小票和独立页元信息）
- 修改 `copy.ts`（加 `seeScene` 文案）
- 修改 `public/sitemap.xml`

## 成品定义
`profile/index.html`：
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="stylesheet" href="../typography.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/profile.tsx"></script>
  </body>
</html>
```
`vite.config.ts` 中 `build.rollupOptions.input` 改为：
```ts
input: {
  main: path.resolve(__dirname, 'index.html'),
  profile: path.resolve(__dirname, 'profile/index.html'),
},
```
`portfolio-public-assets` 插件的文件清单改为：
```ts
['profile.jpg', 'profile.png', 'profile-full.png', 'profile-full-print.jpg', 'robots.txt', 'sitemap.xml', 'THIRD_PARTY_NOTICES.txt']
```
`public/sitemap.xml`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://0xbb.me/</loc>
    <lastmod>2026-09-30</lastmod>
  </url>
  <url>
    <loc>https://0xbb.me/profile/</loc>
    <lastmod>2026-09-30</lastmod>
  </url>
</urlset>
```

## 函数清单
### components/ProfilePage.tsx
| 函数名 | 职责 |
|---|---|
| `ProfilePage` | 独立页整页：雨丝背景、左上角返回 3D 链接、右上角 `LanguageToggle`、居中的 `Receipt`、按需渲染 `PhotoPrint`；持有语言和「相片是否打开」；首次渲染固定英文（与静态 HTML 一致），挂载后按 `detectLanguage(navigator.language)` 切换；语言变化时调用 `applyDocumentLanguage` |
### profile.tsx
| 函数名 | 职责 |
|---|---|
| （模块入口） | 引入 `index.css` 以外的全局样式（`typography.css` 已由 HTML 链接），用 `hydrateRoot` 接管 `#root` 里的预渲染内容并渲染 `ProfilePage`；用 hydrate 而不是重新渲染，是为了不让小票掉落动画重播 |
### plugins/htmlPlugin.ts
| 函数名 | 职责 |
|---|---|
| `pageOf` | 由 `transformIndexHtml` 的上下文路径判断当前是首页还是 `profile/index.html` |
| `injectProfile` | 把 `renderToString(ProfilePage)` 的英文结果注入独立页 `#root` |
| `profileTags` | 生成独立页 `<head>` 标签：title、description、canonical、og / twitter 标题、描述、图片 |
| `htmlPlugin`（修改） | 首页走原来的加载页注入和首页元信息；独立页走 `injectProfile` 和 `profileTags` |
### copy.ts
| 函数名 | 职责 |
|---|---|
| `COPY`（修改） | 中英各加 `seeScene` |

## 协作关系
`ProfilePage` 复用 01 的 `Receipt`、`PhotoPrint`、`LanguageToggle`，以及现有的 `language.ts`（`detectLanguage`、`applyDocumentLanguage`）。独立页入口只 import 这些组件，不 import `diorama/` 下任何文件。`htmlPlugin` 在构建时用 `react-dom/server` 预渲染，写法和现有的 `LoadingShell` 注入一致。

## 验证方式
- 测试入口：
  - `bun run build` 后读 `dist/profile/index.html`、`dist/sitemap.xml`；
  - `vite preview` 加 `tests/browser.ts` 打开 `/profile/`。
- 测试输入：禁用脚本解析 HTML；浏览器语言 `zh-CN` / `en-US`；拦截 `profile-full-print.jpg` 请求（挂起 / 失败）。
- 预期结果：
  - [ ] `dist/profile/index.html` 纯文本包含 `FUBUKI_BB`、`Full Stack Engineer`、简介第一段英文全文、四个链接地址。
  - [ ] `<title>` 为 `FUBUKI_BB — Profile`，`canonical` 为 `https://0xbb.me/profile/`，`og:image`、`twitter:image` 为 `https://0xbb.me/profile.jpg`。
  - [ ] 独立页没有外部域名的 `<script src>` 或样式表；引用的 JS 文件里不含 three.js 代码（产物中 `world-*.js` 不被独立页引用）。
  - [ ] 浏览器打开 `/profile/`：网络请求没有 `world-*.js`，DOM 没有 `<canvas>`。
  - [ ] `zh-CN` 显示中文、`en-US` 显示英文；点「EN / 中」后小票文字与 `<html lang>` 更新；`localStorage`、Cookie、地址栏没有语言记录。
  - [ ] 左上角链接文字正确，`href` 为 `../`。
  - [ ] 未点头像时没有 `profile-full-print.jpg` 请求；点头像后出现对话框、请求一次、焦点在 ✕；Esc、✕、点遮罩都能关闭，关闭后焦点回头像。
  - [ ] 日期戳文字为当天日期的 `'YY M D`。
  - [ ] 图片请求挂起时显示「显影中…」，此时不显示日期戳；失败时显示失败文字与「再打印一次」，点击后再次请求，且焦点仍在对话框内（在 ✕ 上）。
  - [ ] 让 `profile.jpg` 请求直接失败（404）后打开 `/profile/`：头像位置显示「F」，不出现破图（覆盖「预渲染 HTML 被脚本接管前图片已失败」的情况）。
  - [ ] 语言开关有样式（按钮带边框，当前语言按钮底色为 `#f3d9a0`）。
  - [ ] `sitemap.xml` 恰好两个 `<loc>`；`dist/profile-full-print.jpg` 存在。
  - [ ] `dist/index.html` 与 `dist/profile/index.html` 都不含 "playable"、"walk"、"lighthouse"、「灯塔」。
