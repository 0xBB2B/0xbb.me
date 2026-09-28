---
name: 08-plaque-and-copy
description: 文案改为资料视角所需内容，铭牌第三行改为所在地，铭牌边框呼吸微光与悬停亮度接口
---
# 文案与铭牌返工

## 目标
文案集中支持资料视角（按钮、标题、提示），铭牌第三行显示所在地，铭牌边框能按时间呼吸发光、能被设为悬停最亮。

## 业务规则（来源：spec plaque/plaque-text、plaque/plaque-hint、story/story-sections、story/enter-story-view、site/scene-failure、site/loading-shell、profile/language）
- 铭牌三行：
  - 第一行 `FUBUKI_BB`（两种语言相同）；
  - 第二行职位，中文「全栈工程师 · 系统架构师 · AI Agent开发者」，英文 "Full Stack Engineer · System Architect · AI Agent Developer"；
  - 第三行 `Tokyo · Shanghai`（两种语言相同）。
  - 切换语言后铭牌重绘，第二行变化，第一、三行不变；默认视角 1440×900 下第三行字高 ≥ 10 像素（沿用已放大的铭牌尺寸）。
- 铭牌边框呼吸微光：
  - 周期 2.4 秒，亮度在最暗与较亮之间平滑往返；最暗时亮度 > 0（黄铜色不熄灭）；
  - 悬停时边框亮度高于呼吸最大值；
  - 铭牌文字本身不发光；
  - 「减少动态效果」不改变呼吸。
- 文案（中 / 英）：

| 用途 | 中文 | 英文 |
|---|---|---|
| 键盘隐藏按钮 | 查看资料 | View profile |
| 第 2 段标题 | 雨夜里还亮着的店 | Still open on a rainy night |
| 第 3 段标题 | 一起出发 | Let's get going |
| 滚动提示 | SCROLL ↓ | SCROLL ↓ |
| 三维失败提示 | 3D 场景无法加载 | The 3D scene couldn't load |
| 加载阶段 1 / 2 | 正在加载代码… / 正在布置雨夜街角… | Loading code… / Setting up the rainy corner… |
| 先看资料按钮 | 先看资料 | Read the profile first |

- 小标签 `01 · WHO`、`02 · ABOUT`、`03 · FOCUS & LINKS` 两种语言相同。
- 不再存在：点车提示、「进入驾驶座」、「关闭」文案。

## 涉及文件
- 修改：`copy.ts`
- 修改：`diorama/textures.ts`（`drawPlaque` 第三行）
- 修改：`diorama/plaque.ts`（边框独立材质、亮度接口、命名）
- 修改：`diorama/rhythm.ts`（呼吸亮度纯函数）
- 修改：`tests/content.test.ts`、`tests/world.test.ts`、`tests/rhythm.test.ts`（改写过期断言、补新用例）

## 函数清单
### copy.ts
| 名称 | 职责 |
|---|---|
| `COPY` | 删除 `plaqueHint`、`closeCard`、`enterCar`；新增 `viewProfile`、`aboutTitle`、`linksTitle`、`scrollHint`、`progressLabel`（进度点读屏标签，如「资料进度」/ "Profile progress"）、`sectionLabels`（三个小标签）；保留加载、先看资料、失败提示、语言、头像、链接等已有键 |

### diorama/textures.ts
| 名称 | 职责 |
|---|---|
| `drawPlaque` | 第三行改画所在地（取自 `copy.ts` 的 `locationLine`），字号与位置沿用 `PLAQUE_LAYOUT` |

### diorama/rhythm.ts
| 名称 | 职责 |
|---|---|
| `PLAQUE_GLOW_PERIOD` | 常量 2.4（秒） |
| `plaqueGlow` | 输入秒数，返回 0～1 之间的呼吸亮度系数，周期 2.4 秒、平滑往返、最小值 > 0 |

### diorama/plaque.ts
| 名称 | 职责 |
|---|---|
| `createPlaque` | 边框改用独立的黄铜材质（自发光可调），边框网格命名为 `plaque-border`，铭牌面板命名为 `plaque-face`；返回值新增边框材质 |
| `setPlaqueGlow` | 按亮度系数设置边框自发光强度；传入悬停标记时使用高于呼吸最大值的固定亮度 |
| `PLAQUE_GLOW` | 呼吸最暗、最亮与悬停三档自发光强度常量（悬停 > 最亮 > 最暗 > 0） |

## 协作关系
- `drawPlaque` 使用 `copy.ts` 的 `rolesLine`、`locationLine`；`CANVAS_TEXT` 已包含 `JSON.stringify(COPY)`，新增文案自动进入字形加载范围。
- 12 的 `world.ts` 每帧调用 `setPlaqueGlow(plaque, plaqueGlow(t), hovered)`；射线检测以 `plaque-border`、`plaque-face` 所在的 `plaque` 组为目标。
- 09 的资料段组件读取本 plan 新增的文案键。

## 验证方式
- 测试入口：`bun test tests/content.test.ts tests/world.test.ts tests/rhythm.test.ts`（world 测试注入 `tests/fake-canvas.ts`）
- 测试输入：直接读取 `COPY`；对假画布调用 `drawPlaque(ctx, 'zh' | 'en')`；调用 `plaqueGlow` 与 `setPlaqueGlow`。
- 预期结果：
  - `COPY.zh` / `COPY.en` 中没有 `plaqueHint`、`closeCard`、`enterCar`；新文案与上表逐字一致。
  - `drawPlaque` 记录到三次 `fillText`：`FUBUKI_BB`、对应语言职位行、`Tokyo · Shanghai`；中英两次调用第三行相同。
  - `plaqueGlow(t) === plaqueGlow(t + 2.4)`（误差 1e-9）；在 0～2.4 秒内采样 240 点，最小值 > 0、最大值 ≤ 1，且最大值与最小值之差 ≥ 0.3。
  - `createPlaque` 后场景中能按名称找到 `plaque-border`、`plaque-face`。
  - `setPlaqueGlow(plaque, x, true)` 后边框自发光强度大于对任意 `x ∈ [0,1]` 调用 `setPlaqueGlow(plaque, x, false)` 的结果；`setPlaqueGlow(plaque, 0, false)` 的强度 > 0。
  - 字形覆盖测试（`CANVAS_TEXT` 包含全部新文案字符）仍通过。
- [ ] 上述断言全部通过，全量 `bun test` 无新增失败。
