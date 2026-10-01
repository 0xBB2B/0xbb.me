---
name: receipt
description: 小票的内容、中英文案、链接、版式与贴上来的动画，资料视角、独立资料页和三维失败时共用
---

# 小票

## 目的
把站主资料排成一张便利店收银小票，不论从哪里进来，访客看到的都是同一张。

## 逻辑
- 小票是一张米白色纸条（底色 `#f5f1e6`、字色 `#1d2233`），上下两边是锯齿边。
- 字体：正文用随网站一起发布的等宽网页字体 JetBrains Mono（可变字重，SIL OFL 1.1 授权），中文字符回落到网站的思源黑体（Noto Sans SC）；名字 `FUBUKI_BB` 和简介标题用网站的标题字体思源宋体（Noto Serif SC）；简介段用思源黑体；不使用访客电脑自带的等宽字体（SF Mono、Consolas、Menlo 等），所以 Mac 和 Windows 上看起来一样。
- 自上而下的内容：

| 顺序 | 内容 |
|---|---|
| 1 | 小字 `RAINY NIGHT · 24H` |
| 2 | 圆形头像 `profile.jpg`，右下角一个相机小图标；头像是一个按钮 |
| 3 | 头像下一行小字：中文「[ 点头像 · 打印全身照 ]」，英文 `[ TAP PHOTO · PRINT FULL SHOT ]` |
| 4 | 名字 `FUBUKI_BB`（标题元素，可被程序聚焦），下面三行职位 |
| 5 | 虚线分隔；一行「所在地 ···· Tokyo · Shanghai」（英文 `Based in`） |
| 6 | 虚线分隔；小标签 `02 · ABOUT`、标题、简介第一段 |
| 7 | 虚线分隔；小标签「方向」（英文 `FOCUS`），四个方向各占一行，行尾写 `×1` |
| 8 | 虚线分隔；小标签「链接」（英文 `LINKS`），四个链接各占一行：名称 ···· 链接文字 |
| 9 | 虚线分隔；一行加粗「一起出发 →」（英文 `Let's get going →`） |
| 10 | 条形码图案；最后一行 `0XBB.ME · THANK YOU` |

- 文案：

| 项 | 中文 | 英文 |
|---|---|---|
| 职位 | 全栈工程师 / 系统架构师 / AI Agent开发者 | Full Stack Engineer / System Architect / AI Agent Developer |
| 标题 | 雨夜里还亮着的店 | Still open on a rainy night |
| 四个方向 | AI 工作流 / 可扩展后端 / 游戏 SDK 生态 / 支付平台 | AI Workflows / Scalable Backends / Game SDK Ecosystems / Payment Platforms |

- 简介只用站点数据里简介的第一段。
- 四个链接（名称 / 链接文字 / 地址）：GitHub / `github.com/0xBB2b` / `https://github.com/0xBB2b`；LinkedIn / `in/0xbb2b` / `https://www.linkedin.com/in/0xbb2b`；Juejin / `juejin.cn` / `https://juejin.cn/user/1037558235795032`；Email / `bb@yorha.xyz` / `mailto:bb@yorha.xyz`。外部链接在新标签页打开。
- 头像加载失败时，头像位置显示字母「F」，其余内容照常。
- 版式：
  - 小票宽度不超过 420 像素；
  - 视口宽高比 ≥ 1：小票整体逆时针歪约 0.6°，资料视角、三维失败、独立资料页都一样；
  - 资料视角和三维失败时，视口宽高比 ≥ 1：小票靠画面左侧，左边距为视口宽度的 7%，画面右侧露出便利店门面、保时捷和铭牌；
  - 独立资料页上小票始终水平居中；
  - 视口宽高比 < 1：小票水平居中，不歪；
  - 小票比视口高时，在小票所在的这一层里上下滚动，页面本身不滚动。
- 出现动画：小票从视口上方掉下来，落到位置时轻微回弹，用时约 0.6 秒。
- 文字可被鼠标选中；全站不显示技能详情和项目列表。

## 约束
- 10 项内容与顺序同上表，缺一不可；简介只含第一段。
- 链接 `href` 同上；外部链接带 `target="_blank"` 与 `rel="noopener"`。
- 名字元素可被 `focus()` 聚焦。
- 头像请求失败时显示「F」。
- 资料视角下，1440×900 时小票左边缘与视口左边缘距离为视口宽度的 7%（误差 ±1%）；390×844 下小票水平居中（左右留白差 ≤ 2 像素）。
- 小票高于视口时，滚轮滚动改变小票层的滚动位置，`window.scrollY` 保持 0。
- 出现动画用时 0.5～0.7 秒。
- 名字和简介标题的计算字体以 `Noto Serif SC Variable` 开头。
- 视口宽高比 ≥ 1 时小票带约 0.6° 的逆时针旋转；宽高比 < 1 时不旋转。
- 小票正文的计算字体以 `JetBrains Mono Variable` 开头；网站样式里不出现 SF Mono、Consolas、Menlo、`monospace` 等系统等宽字体名。

## 例子
中文访客在 1440×900 下看到小票贴在画面左侧，右侧是变暗的便利店和保时捷：顶上 `RAINY NIGHT · 24H`，头像下写着「[ 点头像 · 打印全身照 ]」，接着是「FUBUKI_BB」、三行职位、「所在地 ···· Tokyo · Shanghai」、「雨夜里还亮着的店」和简介，「方向」下四行各带 `×1`，「链接」下点 `github.com/0xBB2b` 在新标签页打开 GitHub。滚轮往下，小票往上移，露出条形码和 `0XBB.ME · THANK YOU`。

## 验收
- [ ] 小票 10 项内容与顺序正确（中英文各验一次）。
- [ ] 简介只含第一段。
- [ ] 四个链接的名称、链接文字、`href` 正确，外部链接带 `target="_blank"` 与 `rel="noopener"`。
- [ ] 名字元素调用 `focus()` 后成为 `document.activeElement`。
- [ ] 模拟头像请求失败，头像处显示「F」。
- [ ] 资料视角 1440×900 下小票左边距为视口宽度 7% ±1%；390×844 下左右留白差 ≤ 2 像素。
- [ ] 小票高于视口时滚轮滚动：小票层 `scrollTop` 增加，`window.scrollY` 为 0。
- [ ] 出现动画 0.5～0.7 秒。
- [ ] 小票里 `h1`、`h2` 的 `font-family` 以 `Noto Serif SC Variable` 开头。
- [ ] 1440×900 下小票的 `transform` 含约 -0.6° 的旋转（资料视角与独立资料页各验一次）；390×844 下旋转角为 0。
- [ ] 小票正文的 `font-family` 以 `JetBrains Mono Variable` 开头，其后是思源黑体；样式文件里没有系统等宽字体名。
- [ ] JetBrains Mono 字体包版本固定，并在第三方声明文件中列出名称、版本与 OFL 授权。
- [ ] 页面 DOM 中不含技能详情与项目介绍文字。
