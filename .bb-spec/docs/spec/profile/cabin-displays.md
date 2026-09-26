---
name: cabin-displays
description: 驾驶位中控屏与仪表盘显示的个人资料内容、呈现方式与可见性
---

# 中控屏与仪表盘内容

## 目的
坐进驾驶座后，在车内屏幕上看到站主的详细资料，并能复制文字、打开链接。

## 逻辑
- **仪表盘**（方向盘后）显示名字 `FUBUKI_BB`，作为三维画面的一部分绘制，不需要可选中。
- **中控屏**（驾驶位右前方）显示以下内容，按顺序自上而下：
  1. 头像：`profile.jpg`，圆形或圆角方形裁切；
  2. 名字：`FUBUKI_BB`；
  3. 职位：全栈工程师、系统架构师、AI Agent开发者（英文：Full Stack Engineer、System Architect、AI Agent Developer）；
  4. 所在地：Tokyo · Shanghai；
  5. 四个方向：AI 工作流、可扩展后端、游戏 SDK 生态、支付平台（英文：AI Workflows、Scalable Backends、Game SDK Ecosystems、Payment Platforms）；
  6. 简介：站点数据中简介的第一段（中英文各一段）；
  7. 四个链接：GitHub、LinkedIn、Juejin、Email；
  8. 语言切换：EN / 中。
- 中控屏内容是真实的网页元素，叠放在三维中控屏的位置上并随镜头保持对齐：
  - 文字可以选中复制；
  - 外部链接在新标签页打开，Email 使用 `mailto:`；
  - 内容超出屏幕高度时，在屏幕范围内滚动。
- 只有在驾驶位视角（非过渡状态）时，中控屏内容才可见、可点击、可被键盘聚焦；其他时候隐藏且不可聚焦。
- 站点任何位置都不显示技能详情（技能卡片、技能说明）和项目列表。

## 约束
- 中控屏包含上列 8 项，缺一不可，顺序一致。
- 简介只显示第一段，不出现第二段内容。
- 四个链接地址：`https://github.com/0xBB2b`、`https://www.linkedin.com/in/0xbb2b`、`https://juejin.cn/user/1037558235795032`、`mailto:bb@yorha.xyz`。
- 外部链接带 `target="_blank"` 与 `rel="noopener"`。
- 中控屏文字可被鼠标选中。
- 非驾驶位视角时，中控屏元素不可见且无法通过 Tab 键聚焦。
- 页面中不出现技能详情和项目名称（如 bb-spec、pi-subagent-cluster 的项目介绍）。

## 例子
中文访客坐进驾驶座，中控屏从上到下依次显示：
- 头像、「FUBUKI_BB」；
- 「全栈工程师 · 系统架构师 · AI Agent开发者」「Tokyo · Shanghai」；
- 四个方向标签；
- 一段以「每一个界面背后，都藏着一个朴素的约定」开头的简介；
- GitHub、LinkedIn、Juejin、Email 四个链接和「EN / 中」切换。

访客拖选简介里的一句话并复制成功；点击 GitHub 在新标签页打开 `https://github.com/0xBB2b`；仪表盘上亮着「FUBUKI_BB」。

## 验收
- [ ] 驾驶位视角下中控屏按顺序显示 8 项内容。
- [ ] 简介只含第一段文字。
- [ ] 四个链接的 `href` 与约束一致，外部链接带 `target="_blank"` 和 `rel="noopener"`。
- [ ] 中控屏文字可被选中。
- [ ] 内容超出时在屏幕区域内可滚动，不溢出到屏幕外。
- [ ] 整体视角下中控屏元素不可见，Tab 键无法聚焦到其中链接。
- [ ] 仪表盘显示 `FUBUKI_BB`。
- [ ] 页面 DOM 中不含技能详情与项目介绍文字。
