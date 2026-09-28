---
name: 13-app-shell
description: 应用外壳：懒加载场景、加载页阶段与淡出、资料视角滚动与吸附、回拉退出、先看资料、失败降级、语言串联与端到端验收
---
# 应用外壳与端到端验收

## 目标
把加载页、三维场景、资料段、键盘入口、语言切换串成完整页面，并用无窗口 Chrome 端到端验证全部交互。

## 业务规则（来源：spec site/loading-shell、site/scene-failure、story/enter-story-view、story/scroll-camera、story/exit-story-view、story/story-sections、profile/language、plaque/plaque-hint、plaque/plaque-text、scene/diorama-layout）
- `<html data-view>`：`diorama` / `entering` / `story`；`<html data-quality>`：`high` / `low`。
- 整体视角：页面不可滚动（`scrollY` 恒为 0），滚轮只缩放；画面上除铭牌外没有文字界面；语言开关不可见。
- 键盘隐藏按钮「查看资料」/ "View profile"：平时视觉不可见；Tab 聚焦时显示在左上角；回车或空格等同点铭牌；仅整体视角且就绪时可聚焦；读屏可读名字。
- 进入完成后：页面可滚动，滚动位置设为第 1 段起点（回拉区高度 = 视口高一半），焦点移到第 1 段标题；不改变 `history.length` 与地址栏。
- 资料视角滚动：镜头随滚动连续变化；滚动停止 150 毫秒后平滑滚到 `snapTarget`；回拉区中途停手弹回第 1 段；滚到 0 且 3D 就绪 → `diorama`，页面恢复不可滚动，资料段隐藏且 `inert`。
- 加载页：状态文字依次「正在加载代码…」/「正在布置雨夜街角…」（英文对应），`role="status"`、`aria-live="polite"`；首帧后 450 毫秒淡出并移除；显示期间三维区域 `aria-busy="true"` 且不可聚焦。
- 「先看资料」：加载页立即移除，直接进入资料视角停在第 1 段起点，背景深蓝径向渐变；场景就绪后三维画面 450 毫秒淡入，镜头对应当前滚动位置；之后滚到顶回到默认视角的整体视角。
- 三维失败（动态导入失败、`mountDiorama` 抛错、上下文丢失）：加载页立即移除，canvas 隐藏，进入资料视角并显示失败提示；滚到顶不退出；不重试。
- 语言：启动按 `detectLanguage(navigator.language)` 并同步 `<html lang>`；资料视角右上角切换后铭牌、资料段、加载页、失败提示、`<html lang>` 一起更新；不写任何存储、Cookie、地址栏。
- 「减少动态效果」不改变任何时长与动效。

## 涉及文件
- 重写：`App.tsx`、`index.css`
- 新建：`components/SceneViewport.tsx`、`components/SceneViewport.css`
- 新建：`components/StoryScroller.tsx`、`components/StoryScroller.css`
- 新建：`components/EnterStoryButton.tsx`、`components/EnterStoryButton.css`
- 修改：`components/LoadingShell.tsx`（接收阶段、语言、淡出、先看资料回调，属性已预留）
- 新建：`tests/scene-helpers.ts`、`tests/app-e2e.test.ts`、`tests/app-failure.test.ts`

## 函数清单
### App.tsx
| 名称 | 职责 |
|---|---|
| `App` | 持有语言、视角状态（用 11 的 `transition`）、3D 就绪 / 失败、加载阶段、加载页可见性、画质；同步 `<html lang>`、`data-view`、`data-quality`；渲染 `LoadingShell`、`SceneViewport`、`StoryScroller`、`EnterStoryButton` |

### components/SceneViewport.tsx
| 名称 | 职责 |
|---|---|
| `SceneViewport` | 动态导入 `diorama/world` 并 `mountDiorama`；导入完成通知进入场景阶段，`ready` 通知就绪，导入失败 / 挂载抛错 / 上下文丢失通知失败；把语言、滚动位置、视角指令传给场景；失败时隐藏 canvas；「先看资料」后就绪时淡入；卸载时 `dispose` |

### components/StoryScroller.tsx
| 名称 | 职责 |
|---|---|
| `StoryScroller` | 按 `storyLayout` 渲染回拉区与 `StorySections`；整体视角锁滚动（`overflow: hidden`），进入后 `scrollTo` 第 1 段起点并聚焦第 1 段标题；监听滚动：上报滚动位置、当前段与文字不透明度，停止 150 毫秒后 `scrollTo({ top: snapTarget, behavior: 'smooth' })`；`scrollY` 到 0 时上报滚到顶 |

### components/EnterStoryButton.tsx
| 名称 | 职责 |
|---|---|
| `EnterStoryButton` | 视觉隐藏、聚焦时显示在左上角的原生 `<button>`，文字随语言；不可用时 `tabIndex=-1`；点击回调进入 |

### tests/scene-helpers.ts
| 名称 | 职责 |
|---|---|
| `plaquePoint` | 用 `DEFAULT_CAMERA`、`PLAQUE_PANEL`、视口尺寸（含 `portraitDistanceScale`）投影出铭牌中心屏幕坐标 |
| `roadPoint` | 投影一个路面点（悬停恢复用） |

## 协作关系
- 使用 02 `detectLanguage`、`applyDocumentLanguage`；08 `COPY`；09 `StorySections`；11 `transition`、`storyLayout`、`snapTarget`、`poseAtScroll`（取不透明度与段序号）；12 `mountDiorama`；04 `LoadingShell`。
- 客户端 `createRoot` 接管 `htmlPlugin` 静态渲染的 `#root`。

## 验证方式
- 测试入口：`bun run build`，再 `bun test tests/app-e2e.test.ts tests/app-failure.test.ts`；用 `tests/browser.ts` 的 `runBrowser` 驱动 `bun run preview`，视口 1440×900（竖屏用例 390×844）；真实鼠标、键盘、滚轮事件（CDP `Input.dispatch*`）。
- 预期结果（端到端）：
  - 加载：首帧前状态元素带 `role="status"`、`aria-live="polite"`，三维区域 `aria-busy="true"`；就绪后 450 毫秒内加载页移除，`data-view="diorama"`。
  - 整体视角：滚轮后 `scrollY === 0` 且铭牌投影尺寸变化（镜头距离改变）；除 canvas 外无可见文字元素（未聚焦的隐藏按钮除外）；无可见语言开关。
  - 悬停：移到 `plaquePoint` canvas `cursor` 为 `pointer`，移到 `roadPoint` 恢复。
  - 进入：点 `plaquePoint` 后 `data-view` 依次 `entering`、`story`，间隔 ≤ 1.5 秒；过渡中按 Esc、滚轮不改变状态；`history.length`、`location.href` 不变；`document.activeElement` 为第 1 段标题；在铭牌上拖动 30 像素松开不进入。
  - 资料段：3 段内容可见、文字可被 `getSelection` 选中、链接 `href` 正确；滚到第 2 段只有第 2 个进度点高亮；390×844 下第 1 段文字矩形顶部 ≥ 视口高 55%。
  - 吸附：滚到第 1、2 段之间 60% 停止，1 秒后 `scrollY` 等于第 2 段起点。
  - 退出：滚到回拉区一半停止，1 秒后回到第 1 段起点；滚到 0 后 `data-view="diorama"`，拖动能旋转、滚轮能缩放，资料段链接无法 Tab 聚焦。
  - 键盘：Tab 聚焦隐藏按钮时其矩形宽高 > 0 且在视口左上角，回车后 `data-view` 变 `entering`；资料视角下无法聚焦到它。
  - 语言：`navigator.language` 覆盖为 `zh-CN` 时 `<html lang="zh-CN">`；资料视角点「EN」后 `<html lang="en">`、资料段为英文；刷新后回到中文；`localStorage.length === 0`、`document.cookie === ''`。
  - 铭牌：`plaquePoint` 上下 ±字高投影出的第三行像素高度 ≥ 10。
  - 先看资料：点击后加载页立即移除、`data-view="story"`；就绪后 canvas 不透明度在 450 毫秒内到 1；滚到 0 后 `data-view="diorama"`。
  - 头像：拦截 `profile.jpg` 请求后头像处显示「F」。
- 预期结果（失败，`tests/app-failure.test.ts`）：
  - 拦截 `diorama` 相关 JS、页面脚本前覆盖 `getContext` 返回 `null`、就绪后调用 `WEBGL_lose_context.loseContext()` 三种情况：加载页已移除，`data-view="story"`，出现「3D 场景无法加载」或英文提示，无可见 canvas，四个链接可点；滚到 0 后仍为 `story`。
  - 先点「先看资料」再触发上下文丢失：失败提示出现，`scrollY` 不变。
- [ ] 上述端到端断言全部通过。
