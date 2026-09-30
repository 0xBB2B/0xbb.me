---
name: 04-receipt-view
description: 资料视角外层换成小票：返回按钮、语言开关、失败提示、焦点、Esc 与相片的优先级，删除三段资料组件
---
# 资料视角外层（ReceiptView）

## 目标
进入资料视角后，页面上显示的是小票（加返回按钮和语言开关），不再是 3 段滚动资料；三维失败时同样显示小票和失败提示。`StoryScroller`、`StorySections` 整套删除。

## 业务规则（来源：spec enter-story-view、exit-story-view、scene-failure、language）
- `data-view="story"` 时显示小票层：小票（从上方掉下，约 0.6 秒）、左上角「返回全景」按钮（英文 "Back to overview"）、右上角「EN / 中」语言开关。
- 进入后键盘焦点移到小票里的名字 `FUBUKI_BB`（`<h1 tabIndex={-1}>`，聚焦时不滚动）。
- 小票比视口高时，在小票层里上下滚动（小票层 `overflow-y: auto`），`window.scrollY` 保持 0；滚轮、触摸只滚小票，不退出、不翻页。
- 退出只有两种方式：按 Esc，或点「返回全景」。相片打开时按 Esc 只关相片，`data-view` 仍为 `story`。
- `data-view="exiting"` 时，小票、语言开关、返回按钮约 0.3 秒淡出，不可点击、不可聚焦（`inert`）；`diorama` 和 `entering` 状态下小票层隐藏、`inert`，Tab 聚焦不到其中的链接。
- 返回按钮只在「三维已就绪、未失败、处于资料视角或退出中」时渲染；进入中和整体视角下不渲染。
- 三维失败（代码加载失败、WebGL 创建失败、上下文丢失）：加载页立即移除，`data-view="story"`，显示同一张小票，小票上方一行 中「3D 场景无法加载」/ 英 "The 3D scene couldn't load"；没有返回按钮，按 Esc 不退出；小票、相片、语言开关照常可用；在资料视角里读小票时发生失败，小票层滚动位置不变。
- 语言开关切换后，小票、相片文字、铭牌、`<html lang>` 同步更新；语言不持久化。整体视角下没有语言开关。

## 涉及文件
- 新建 `components/ReceiptView.tsx`、`components/ReceiptView.css`
- 修改 `App.tsx`（用 `ReceiptView` 替换 `StoryScroller`；删掉 `onScrollChange` 接线）
- 修改 `components/SceneViewport.tsx`（删除「资料视角时调用 `startStoryWithoutEntering` 和 `setScroll`」的 effect，删除句柄上的 `setScroll`）
- 删除 `components/StoryScroller.tsx`、`components/StorySections.tsx`、`components/StorySections.css`
- 修改 `copy.ts`：删除不再使用的键，包括 `scrollHint`、`progressLabel`、`sectionLabels`、`directionsLabel`，以及 01/02 新增键之外所有已无引用的键；保留 `sceneFailed`、`backToOverview`、`languageLabel`、`aboutTitle`、`linksTitle`、`avatarAlt`、`locationLabel` 等仍在用的键
- 测试：
  - 删除 `tests/story-sections.test.tsx`、`tests/story-sections-gradient.test.ts`；
  - 改写 `tests/app-e2e.test.ts` 中资料视角、翻页、进度点、失败提示的用例；
  - 改写 `tests/content.test.ts` 中 `scrollHint`、`sectionLabels` 的断言；
  - 改写 `tests/app-failure.test.ts` 中和资料段有关的断言。

## 函数清单
### components/ReceiptView.tsx
| 函数名 | 职责 |
|---|---|
| `ReceiptView` | 资料视角外层：可滚动的小票层、失败提示、`Receipt`、按需的 `PhotoPrint`、`LanguageToggle`、返回按钮。按 `view` 控制显示、淡出和 `inert`；进入 `story` 时聚焦名字；持有「相片是否打开」，关闭时把焦点还给头像按钮 |
| `BackButton` | 「返回全景」按钮，点击调用退出回调 |
### App.tsx
| 函数名 | 职责 |
|---|---|
| `App`（修改） | 渲染 `ReceiptView`，传入语言、`view`、`failed`、`showBack`、退出回调、切换语言回调；原有的 Esc 处理保留（`PhotoPrint` 在相片打开时，在 window 捕获阶段拦下 Esc，并阻止它继续传到 App） |
### components/SceneViewport.tsx
| 函数名 | 职责 |
|---|---|
| `SceneViewport`（修改） | 删除 `startStoryWithoutEntering` / `setScroll` 相关 effect 与句柄方法 |

## 协作关系
- `ReceiptView` 使用 01 的 `Receipt`、`PhotoPrint`、`LanguageToggle`。
- 进入、退出仍由 `diorama/world.ts` 的 `enterStory` / `exitToDiorama` 驱动，`App` 通过 `onViewChange` 得到 `entering` / `story` / `exiting` / `diorama` 四种状态。
- 本 plan 完成后，资料视角的镜头仍在停靠点 1（`world.ts` 里的 `scrollY` 恒为 0）；三维暂停和删除滚动镜头由 05 负责。

## 验证方式
- 测试入口：
  - `vite preview` 加 `tests/browser.ts` 打开首页（`app-e2e` 的写法），用键盘隐藏按钮「查看资料」进入资料视角；
  - `renderToStaticMarkup(createElement(ReceiptView, props))`。
- 测试输入：中英两种语言；拦截三维代码请求、让 `getContext` 返回 `null`、调用 `WEBGL_lose_context.loseContext()`；视口 1440×900 与 390×844。
- 预期结果：
  - [ ] 进入后 `data-view` 为 `story`，小票可见，`document.activeElement` 是小票里的 `h1`。
  - [ ] 资料视角下有「返回全景」按钮和语言开关；点「EN」后小票、铭牌、`<html lang>` 变英文。
  - [ ] 小票高于视口时滚轮滚动：小票层 `scrollTop` 增加，`window.scrollY` 为 0，`data-view` 仍为 `story`。
  - [ ] 1440×900 下小票右边距为视口宽度 7% ±1%；390×844 下左右留白差 ≤ 2 像素。
  - [ ] 按 Esc 后 `data-view` 依次为 `exiting`、`diorama`，间隔 ≤ 1.2 秒；点返回按钮效果相同；退出后 Tab 聚焦不到小票里的链接。
  - [ ] 点头像打开相片后按 Esc：相片关闭，`data-view` 仍为 `story`；再按 Esc 才退出。
  - [ ] 三种失败方式都使加载页移除、`data-view="story"`、小票可见、出现失败提示、没有可见的返回按钮；按 Esc 后仍为 `story`；页面没有可见的 canvas。
  - [ ] 资料视角下触发上下文丢失：失败提示出现，小票层 `scrollTop` 不变。
  - [ ] 整体视角下 DOM 中没有可见的语言开关；页面中不含 `story-dot`、`SCROLL ↓`。
