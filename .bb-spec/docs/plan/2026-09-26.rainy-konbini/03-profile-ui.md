---
name: 03-profile-ui
description: 共享的个人资料组件、简介卡片对话框与中控屏网页内容组件
---
# 个人资料界面组件

## 目标
简介卡片和中控屏用同一个资料组件显示 8 项内容；简介卡片能区分「先看资料」和「3D 失败」两种样式。

## 业务规则（来源：spec profile/cabin-displays、profile/profile-card、profile/language）
- 8 项内容顺序固定：
  1. 头像 `profile.jpg`（圆角裁切）；
  2. 名字 `FUBUKI_BB`；
  3. 三个职位；
  4. 所在地 `Tokyo · Shanghai`；
  5. 四个方向；
  6. 简介第一段；
  7. 四个链接；
  8. 「EN / 中」语言切换。
- 外部链接 `target="_blank"` + `rel="noopener"`；Email 为 `mailto:bb@yorha.xyz`，不加 `target`。
- 头像加载失败时显示字母「F」占位，其余内容照常显示。
- 文字可被选中（`user-select: text`）；内容超出容器高度时在容器内滚动。
- 简介卡片是原生 `<dialog>` 模态框，有两种模式：
  - `preview`（「先看资料」打开）：有关闭按钮，Esc 可关闭，关闭时回调通知上层；
  - `fault`（3D 失败）：顶部显示失败提示，中文「3D 场景无法加载」，英文 "The 3D scene couldn't load"；没有关闭按钮，Esc 不关闭（拦截 `cancel` 事件）。
  - 打开期间模式可从 `preview` 变为 `fault`，立即去掉关闭按钮并显示提示。
- 中控屏组件只输出网页内容与样式。三维对齐、可见性和可聚焦性由 09 控制：组件接收一个布尔属性，为假时整个根元素设为 `inert` 并隐藏。
- 不显示技能详情和项目介绍。

## 涉及文件
- 新建：`components/ProfileContent.tsx`、`components/ProfileContent.css`
- 新建：`components/ProfileCard.tsx`、`components/ProfileCard.css`
- 新建：`components/CenterScreen.tsx`、`components/CenterScreen.css`
- 新建：`tests/profile-ui.test.tsx`

## 函数清单
### components/ProfileContent.tsx
| 函数名 | 职责 |
|---|---|
| `ProfileContent` | 按固定顺序渲染 8 项资料；接收当前语言与切换语言回调；语言按钮显示「EN / 中」，当前语言高亮并带 `aria-pressed` |
| `Avatar` | 渲染 `./profile.jpg` 的 `<img>`，`onError` 后改为显示 `AVATAR_FALLBACK` 字母 |
| `LinkList` | 从 `APP_DATA.socialLinks` 渲染链接；`mailto:` 链接不加 `target` |

### components/ProfileCard.tsx
| 函数名 | 职责 |
|---|---|
| `ProfileCard` | 包装 `<dialog>`：`open` 为真时 `showModal()`，为假时 `close()`；`mode` 为 `fault` 时渲染失败提示（`role="alert"`）、不渲染关闭按钮并拦截 `cancel`；`preview` 时渲染关闭按钮，`cancel`/点击关闭触发 `onClose` |

### components/CenterScreen.tsx
| 函数名 | 职责 |
|---|---|
| `CenterScreen` | 渲染带屏幕样式（深色玻璃底、窄边距）的容器并放入 `ProfileContent`；`active` 为假时根元素 `inert`、`hidden`；为真时可交互；在内容上的指针拖动调用 `stopPropagation`，避免触发 09 的转头 |

## 协作关系
- 依赖 `data.ts` 的 `APP_DATA` 与 `copy.ts` 的 `COPY`、`AVATAR_FALLBACK`、`rolesLine`、`locationLine`（02 已提供）。
- `ProfileContent` 被 04-site-shell 在构建时渲染成静态英文 HTML（使用同一组件，语言固定 `en`，切换回调为空操作）。
- `CenterScreen` 的根元素由 09 通过 `CSS3DObject` 放进三维场景；`ProfileCard` 由 10 控制开关与模式。

## 验证方式
- 测试入口：`bun test tests/profile-ui.test.tsx`（用 `react-dom/server` 的 `renderToStaticMarkup` 渲染组件并解析字符串）；交互部分在 10 的端到端测试中覆盖。
- 测试输入：分别以 `language='zh'`、`'en'` 渲染 `ProfileContent`；以 `mode='preview'`、`'fault'` 渲染 `ProfileCard`；以 `active=false`、`true` 渲染 `CenterScreen`。
- 预期结果：
  - `ProfileContent` 输出中 8 项按顺序出现（用各项文字在 HTML 中的索引递增判断）。
  - 四个 `<a>` 的 `href` 分别为 GitHub、LinkedIn、Juejin、`mailto:bb@yorha.xyz`；前三个带 `target="_blank"` 与 `rel="noopener"`。
  - 中文输出含「全栈工程师 · 系统架构师 · AI Agent开发者」与简介中文第一段，不含 `\n` 之后的旧第二段文字（如「资料速览」）。
  - `ProfileCard` 的 `fault` 模式输出含「3D 场景无法加载」（中文）或 "The 3D scene couldn't load"（英文），且不含关闭按钮；`preview` 模式含关闭按钮、不含失败提示。
  - `CenterScreen` 在 `active=false` 时根元素带 `inert` 与 `hidden`。
  - 所有输出不含 `bb-spec`、`pi-subagent-cluster`、`Golang` 等技能或项目文字。
- [ ] 上述断言全部通过。
