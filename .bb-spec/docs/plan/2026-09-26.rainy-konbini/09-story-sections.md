---
name: 09-story-sections
description: 资料视角 3 段资料组件（内容、排版、进度点、滚动提示、语言开关、失败提示），静态输出改用资料段，删除旧组件
---
# 资料段组件与静态输出

## 目标
有一个可复用的资料段组件，既用于资料视角，也被构建时静态渲染进 `index.html`；旧的简介卡片、中控屏、8 项资料组件全部删除。

## 业务规则（来源：spec story/story-sections、site/static-profile-html、site/scene-failure、profile/language）
- 3 段，按顺序：
  1. `01 · WHO`：头像 `profile.jpg`（圆形）、名字 `FUBUKI_BB`（页面主标题）、职位行、所在地 `Tokyo · Shanghai`；
  2. `02 · ABOUT`：标题（中「雨夜里还亮着的店」/ 英 "Still open on a rainy night"）+ 简介第一段；
  3. `03 · FOCUS & LINKS`：标题（中「一起出发」/ 英 "Let's get going"）+ 四个方向 + 四个链接。
- 职位：中「全栈工程师 · 系统架构师 · AI Agent开发者」，英 "Full Stack Engineer · System Architect · AI Agent Developer"。
- 方向：中「AI 工作流 / 可扩展后端 / 游戏 SDK 生态 / 支付平台」，英 "AI Workflows / Scalable Backends / Game SDK Ecosystems / Payment Platforms"。
- 链接：GitHub `https://github.com/0xBB2b`、LinkedIn `https://www.linkedin.com/in/0xbb2b`、Juejin `https://juejin.cn/user/1037558235795032`、Email `mailto:bb@yorha.xyz`；外部链接带 `target="_blank"`、`rel="noopener"`，Email 不带。
- 简介只含第一段；头像加载失败时显示「F」，其余照常。
- 排版：
  - 宽屏（宽高比 ≥ 1）：文字在左侧一栏，最大宽度 520 像素，背后有从左向右变淡的深色渐变；
  - 竖屏（宽高比 < 1）：文字位于视口下方 45% 区域，垫从下向上变淡的深色渐变；
  - 每段高度等于一个视口高度。
- 附加元素（只在资料视角显示）：
  - 右侧竖排 3 个进度点，当前段高亮；
  - 第 1 段底部 `SCROLL ↓`；
  - 右上角固定「EN / 中」，当前语言按钮 `aria-pressed="true"`；
  - 三维失败时，第 1 段上方显示失败提示（中「3D 场景无法加载」/ 英 "The 3D scene couldn't load"）。
- 可见性：只在资料视角可见、可聚焦；其他时候隐藏且 `inert`，Tab 无法聚焦其中链接。
- 文字可被选中；页面不出现技能详情和项目介绍。
- 构建产物 `index.html` 不执行脚本时就含英文版资料段全文（名字、职位、所在地、第 2、3 段标题、四个方向、简介第一段、四个链接 `<a href>`），整体视角下隐藏。

## 涉及文件
- 新建：`components/StorySections.tsx`、`components/StorySections.css`
- 修改：`components/StaticProfile.tsx`（改为输出英文资料段，隐藏）
- 修改：`plugins/htmlPlugin.ts`（内联 `StorySections.css` 代替 `ProfileContent.css`）
- 删除：`components/ProfileCard.tsx`、`components/ProfileCard.css`、`components/CenterScreen.tsx`、`components/CenterScreen.css`、`components/ProfileContent.tsx`、`components/ProfileContent.css`
- 重写：`tests/profile-ui.test.tsx` → 改名 `tests/story-sections.test.tsx`
- 修改：`tests/static-profile.test.ts`、`plugins/htmlPlugin.test.ts`（过期断言）

## 函数清单
### components/StorySections.tsx
| 名称 | 职责 |
|---|---|
| `StorySections` | 渲染 3 段资料 + 进度点 + 语言开关 + SCROLL 提示 + 失败提示；属性：语言、是否激活、当前段序号、是否显示失败提示、每段的 ref 回调（供外壳测量段起点）、文字不透明度、语言切换回调；未激活时根元素 `hidden` + `inert`；第 1 段标题可接收程序聚焦（`tabIndex=-1`） |
| `StoryAvatar` | 头像，加载失败切换为「F」占位 |
| `StoryLinks` | 四个链接列表，按规则设置 `target` / `rel` |
| `ProgressDots` | 3 个进度点，当前段带高亮类名与 `aria-current` |
| `LanguageToggle` | 「EN / 中」两个按钮，`aria-pressed` 标当前语言 |

### components/StaticProfile.tsx
| 名称 | 职责 |
|---|---|
| `StaticProfile` | 以英文、未激活状态渲染 `StorySections`，外层带 `data-static-profile` 并隐藏 |

### plugins/htmlPlugin.ts
| 名称 | 职责 |
|---|---|
| `injectShell` | 内联样式改读 `components/StorySections.css`（与 `LoadingShell.css` 拼接），其余不变 |

## 协作关系
- 使用 `data.ts` 的 `APP_DATA`、`copy.ts` 的 `COPY`、`rolesLine`、`locationLine`、`AVATAR_FALLBACK`，以及 08 新增的标题、提示、标签文案。
- 13 的外壳把 `StorySections` 放在可滚动容器里，传入激活状态、当前段、不透明度与失败标记，并用 ref 回调测量各段位置。
- `StaticProfile` 由 `htmlPlugin` 在构建时静态渲染进 `#root`，客户端 `createRoot` 接管后被替换。

## 验证方式
- 测试入口：`bun test tests/story-sections.test.tsx tests/static-profile.test.ts plugins/htmlPlugin.test.ts`（组件用 `react-dom/server` 渲染为字符串断言；静态测试先 `bun run build`）
- 测试输入：分别以 `zh`、`en`，激活 / 未激活，失败提示开 / 关，当前段 0 / 1 / 2 渲染组件；读取 `dist/index.html`。
- 预期结果：
  - 三段按顺序出现，小标签、标题、职位、方向、简介、链接文字与上文逐字一致（中英各一次）；简介不含第二段。
  - 四个链接 `href` 正确；三个外部链接带 `target="_blank"` 与 `rel="noopener"`，Email 不带。
  - 当前段为 1 时，只有第 2 个进度点带高亮与 `aria-current`。
  - 语言开关当前语言按钮 `aria-pressed="true"`，另一个为 `false`。
  - 未激活时根元素带 `hidden` 和 `inert`；激活时两者都没有。
  - 失败提示开时，提示文字出现在第 1 段内容之前；关时不出现。
  - 第 1 段标题带 `tabIndex="-1"`。
  - 输出中不含技能、项目文字（如 bb-spec、pi-subagent-cluster）。
  - `dist/index.html` 纯文本含名字、英文职位、"Still open on a rainy night"、"Let's get going"、简介第一段英文全文、四个链接地址；内联样式含资料段样式。
  - `components/` 下不再存在 `ProfileCard*`、`CenterScreen*`、`ProfileContent*`。
- [ ] 上述断言全部通过，全量 `bun test` 无新增失败。
- [ ] 头像失败显示「F」、390×844 文字在下方 45% 区域、Tab 不可聚焦未激活链接，在 13 的端到端测试中确认。
