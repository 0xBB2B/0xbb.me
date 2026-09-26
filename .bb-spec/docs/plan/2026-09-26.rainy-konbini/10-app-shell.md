---
name: 10-app-shell
description: 重写应用外壳：懒加载三维场景、加载页阶段与淡出、失败转简介卡片、语言串联，并做端到端验收
---
# 应用外壳与端到端验收

## 目标
把加载页、三维场景、中控屏、简介卡片、键盘入口、语言切换串成完整页面，并用无窗口 Chrome 端到端验证全部交互。

## 业务规则（来源：spec site/loading-shell、profile/profile-card、profile/language、cabin/enter-driver-view、cabin/exit-driver-view、cabin/car-hover-hint、cabin/driver-look、profile/cabin-displays、plaque/plaque-text、scene/quality-tier）
- 加载页：
  - 状态文字依次为代码阶段（「正在加载代码…」/ "Loading code…"）、场景阶段（「正在布置雨夜街角…」/ "Setting up the rainy corner…"）。
  - 场景首帧画出后 450 毫秒淡出，然后移除。
  - 显示期间三维区域 `aria-busy="true"` 且不可聚焦。
  - 「先看资料」打开 `preview` 模式的简介卡片，场景继续加载。
- 失败处理：三种失败都立即移除加载页，打开 `fault` 模式的简介卡片（有提示、无关闭、Esc 不关）。三种失败是：
  - 三维模块动态导入失败；
  - `mountDiorama` 抛错（WebGL 创建失败）；
  - `webglcontextlost`。
  `preview` 卡片打开期间发生失败，卡片立即切为 `fault`。
- `preview` 卡片关闭后，回到加载页（未就绪）或整体视角（已就绪）。
- 语言：
  - 启动时 `detectLanguage(navigator.language)` 并同步 `<html lang>`；
  - 中控屏或卡片切换语言后，铭牌（`setLanguage`）、中控屏、卡片、加载页、`<html lang>` 一起更新；
  - 不写任何存储。
- `<html>` 的 `data-view` 同步视角状态，`data-quality` 同步画质档。
- 键盘入口按钮只在 `data-view="diorama"` 且场景就绪时可聚焦。
- `reduced-motion` 不改变淡出时长和任何动效。

## 涉及文件
- 重写：`App.tsx`、`index.css`
- 新建：`components/SceneViewport.tsx`、`components/SceneViewport.css`
- 修改：`components/LoadingShell.tsx`（接收阶段、语言、淡出、按钮回调，04 已预留属性）
- 新建：`tests/app-e2e.test.ts`、`tests/app-failure.test.ts`、`tests/scene-helpers.ts`（用 `DEFAULT_CAMERA`、`CAR_CENTER` 投影求点车坐标）

## 函数清单
### App.tsx
| 函数名 | 职责 |
|---|---|
| `App` | 持有语言、图形状态（`loading`/`ready`/`unavailable`）、加载阶段、加载页可见性、卡片开关与模式、视角状态；把语言变化同步到 `<html lang>`，把视角与画质写入 `data-view`、`data-quality`；渲染 `LoadingShell`、`SceneViewport`、`ProfileCard`、`EnterCarButton` |

### components/SceneViewport.tsx
| 函数名 | 职责 |
|---|---|
| `SceneViewport` | 动态导入 `diorama/world` 并调用 `mountDiorama`；导入完成通知进入场景阶段，`ready` 通知就绪，导入失败、挂载抛错、上下文丢失通知不可用；通过 portal 把 `CenterScreen` 渲染进 `screenElement`（`active` = 视角为 `driver`）；语言变化时调用 `setLanguage`；卸载时 `dispose` |

## 协作关系
- 使用 02 的 `detectLanguage`、`applyDocumentLanguage`、`COPY`；03 的 `ProfileCard`、`CenterScreen`；04 的 `LoadingShell`；09 的 `mountDiorama` 与 `EnterCarButton`。
- 客户端用 `createRoot` 接管 04 静态渲染的 `#root`。

## 验证方式
- 测试入口：`bun run build`，再 `bun test tests/app-e2e.test.ts tests/app-failure.test.ts`。用 `tests/browser.ts` 的 `runBrowser` 驱动 `bun run preview` 的生产页面，视口 1440×900（竖屏用例 390×844）。
- 测试输入：真实鼠标与键盘事件（CDP `Input.dispatch*`）；点车坐标由 `tests/scene-helpers.ts` 投影 `CAR_CENTER` 得到；失败用例通过 CDP 拦截 `diorama` 相关 JS 请求、在页面脚本前注入覆盖 `HTMLCanvasElement.prototype.getContext` 返回 `null`、或调用 `WEBGL_lose_context.loseContext()`。
- 预期结果：
  - 加载：首帧前状态元素带 `role="status"`、`aria-live="polite"`；就绪后 450 毫秒内加载页从 DOM 移除；加载中三维区域 `aria-busy="true"`。
  - 悬停：移到车上 canvas `cursor` 为 `pointer`，移到路面恢复。
  - 进车：
    - 点车后 `data-view` 依次为 `entering`、`driver`，间隔 ≤ 3.5 秒；
    - `history.length` 加 1，`location.pathname` 不变；
    - 过渡中按 Esc 无效；
    - 1440×900 下中控屏元素矩形完整在视口内；390×844 下其宽度 ≥ 234 像素。
  - 中控屏：`driver` 时可见，含 8 项内容，文字可被 `window.getSelection` 选中，四个链接 `href` 正确；`diorama` 时 Tab 无法聚焦到其中链接。
  - 转头：驾驶位大幅拖动后，再拖回，画面无空洞（截图中无纯背景色大块）；滚轮不改变镜头（中控屏元素矩形不变）。
  - 出车：
    - 点门把手、按 Esc、`history.back()` 三种方式均使 `data-view` 回到 `diorama`，用时 ≤ 3.5 秒；
    - 门把手与 Esc 方式结束后 `history.length` 与进车前相同，且再次进出不累积历史。
  - 键盘入口：Tab 聚焦后按钮可见（矩形宽高 > 0 且在视口内），回车后 `data-view` 变为 `entering`；未聚焦时视觉不可见。
  - 语言：`navigator.language` 覆盖为 `zh-CN` 时 `<html lang="zh-CN">`；在中控屏点「EN」后 `<html lang="en">`、中控屏为英文；刷新后回到中文；`localStorage.length` 为 0、`document.cookie` 为空。
  - 失败：三种失败都出现含「3D 场景无法加载」或英文提示的 `<dialog open>`，无关闭按钮，按 Esc 仍打开；加载页已移除。
  - 先看资料：点击后卡片打开且有关闭按钮，Esc 关闭；场景就绪后看到整体视角（`data-view="diorama"`）。
  - 铭牌第三行：用 `scene-helpers` 投影铭牌第三行上下边缘，像素高度 ≥ 10。
- [ ] 上述端到端断言全部通过。
