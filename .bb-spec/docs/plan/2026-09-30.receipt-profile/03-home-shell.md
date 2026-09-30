---
name: 03-home-shell
description: 首页清理：加载页「先看资料」改成指向 /profile/ 的链接，删除首页隐藏资料与 readFirst 路径
---
# 首页加载页与隐藏资料清理

## 目标
首页加载页的「先看资料」变成普通链接，脚本没到也能点，点了就去 `/profile/`。首页不再藏看不见的资料文字，也不再有「先看资料后在同页进入资料视角」这条路径。

## 业务规则（来源：spec loading-shell、static-profile-html）
- 加载页上的「先看资料」（英文 "Read the profile first"）是普通链接 `<a href="./profile/">`，外观保持带细边框的按钮样式。脚本还没下载完或正在执行时点它，浏览器同样跳转；跳走后三维场景不再加载。
- 加载页只在两种时机移除：场景首帧后淡出 450 毫秒，或三维失败时立即移除。
- 禁用 JavaScript 打开首页时，加载页的名字、状态文字和「先看资料」链接都可见，链接 `href` 为 `./profile/`。
- 首页正文里没有 `hidden`、`display:none` 或移到屏幕外的个人资料段落；`dist/index.html` 不含简介第一段英文正文。
- 首页 `description` 用一句话介绍站主并提到雨夜便利店微缩模型，不再说「滚动浏览资料」。
- 整体视角下页面不能滚动（原来由 `StoryScroller` 用 JS 设置，现改成全局样式）。

## 涉及文件
- 修改 `components/LoadingShell.tsx`（按钮 → 链接；删 `onReadFirst` 属性）
- 修改 `components/LoadingShell.css`（`.loading-shell-button` 选择器改为链接的等效样式，去掉下划线）
- 删除 `components/StaticProfile.tsx`
- 修改 `plugins/htmlPlugin.ts`（`injectShell` 不再渲染 `StaticProfile`，也不再内联 `StorySections.css`）
- 修改 `diorama/view-state.ts`（删 `readFirst` 事件）
- 修改 `App.tsx`（删 `handleReadFirst` 和给 `LoadingShell` 传的 `onReadFirst`）
- 修改 `index.css`（`html { overflow: hidden; }`）
- 修改 `metadata.json`（`description` 句尾改写）
- 删除或修改的测试：`tests/static-profile.test.ts`（整份删除，由 02 的独立页构建断言取代）、`tests/view-state.test.ts` 中 `readFirst` 用例、`plugins/htmlPlugin.test.ts` 中关于 StaticProfile 的断言、`tests/app-e2e.test.ts` 中点「先看资料」进入资料视角的用例

## 成品定义
`metadata.json` 的 `description` 改为：
```json
"description": "FUBUKI_BB — full-stack engineer and AI agent developer. Explore a rainy-night Tokyo convenience store diorama, then tap the brass plaque to read the profile receipt."
```
`index.css` 新增一行：
```css
html { overflow: hidden; }
```

## 函数清单
### components/LoadingShell.tsx
| 函数名 | 职责 |
|---|---|
| `LoadingShell`（修改） | 去掉 `onReadFirst`；「先看资料」渲染为 `<a className="loading-shell-button" href="./profile/">` |
### plugins/htmlPlugin.ts
| 函数名 | 职责 |
|---|---|
| `injectShell`（修改） | 只注入 `LoadingShell` 的静态 HTML 和 `LoadingShell.css` |
### diorama/view-state.ts
| 函数名 | 职责 |
|---|---|
| `transition`（修改） | 删除 `readFirst` 分支；`ViewEvent` 类型去掉 `readFirst` |
### App.tsx
| 函数名 | 职责 |
|---|---|
| `App`（修改） | 删除 `handleReadFirst`，`LoadingShell` 不再传 `onReadFirst` |

## 协作关系
这份 plan 只动首页的外壳和构建注入，不碰资料视角（05 负责）。`htmlPlugin.ts` 在 02 里已经按页面分流，本 plan 只改首页分支里的 `injectShell`。

## 验证方式
- 测试入口：`bun run build` 后读 `dist/index.html`；`renderToStaticMarkup(createElement(LoadingShell, { language }))`；`transition(state, event)`；浏览器用 `tests/browser.ts` 打开首页。
- 测试输入：中英两种语言；无限挂起三维代码请求（`world-*.js`）来模拟慢网。
- 预期结果：
  - [ ] `LoadingShell` 输出含 `<a class="loading-shell-button" href="./profile/">`，文字中「先看资料」/ 英 `Read the profile first`；不含 `<button`。
  - [ ] `dist/index.html` 不执行脚本即含 `FUBUKI_BB`、状态文字与 `href="./profile/"`；不含简介第一段英文正文；不含 `data-static-profile`。
  - [ ] `dist/index.html` 的 `description` 与上面的成品一致，不含 "scroll"。
  - [ ] `ViewEvent` 不再接受 `readFirst`（类型检查 `bunx tsc --noEmit` 通过，且测试里不再出现该事件）。
  - [ ] 挂起三维代码请求时点「先看资料」，地址变为 `/profile/`。
  - [ ] 整体视角下滚动滚轮后 `window.scrollY` 仍为 0，镜头距离改变。
  - [ ] 首帧后加载页在 450 毫秒内淡出并移除（原用例保持通过）。
