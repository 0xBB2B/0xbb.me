---
id: T-9
title: M1 主页组合与基础布局
depends_on: [T-6, T-7, T-8]
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/index.css, /Users/bb/Projects/0xbb.me/App.test.tsx]
refs: [portfolio/bilingual/AC-1, portfolio/bilingual/AC-3, portfolio/responsive-layout/AC-1]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./App.test.tsx
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
以共享探索状态组合主页，替换旧 HUD 页面及其基础样式，维持双语阅读位置和三视口入口。
## 2. 业务规则
- bilingual/C-1：当访客首次进入或刷新主页时，系统应默认使用英文并从探索起点开始，不恢复上次刷新前的语言或位置。
- bilingual/C-3：如果访客在探索中、对话中或资料速览中切换语言，系统应保持主人公位置；已打开的阅读面板不关闭，NPC 对话仍处于语义对应的同一段落。
- responsive-layout/C-1：系统应在 1440×900、390×844、844×390 三种视口展示可用的主人公画面、语言入口及资料速览入口，不产生整页水平滚动。
### bilingual/AC-1 初始语言与刷新 ← C-1
- 触发: 操作 首次进入主页，切换中文并向右走后刷新。
- Given: 浏览器可正常打开主页。
- When: 访客观察初始语言，切换中文、移动后刷新。
- Then: 首次进入和刷新后均为英文，刷新后主人公从起点开始，不恢复先前位置。
### bilingual/AC-3 阅读位置连续 ← C-3
- 触发: 操作 分别在道路中段、NPC 后续段落和资料速览打开时切换语言。
- Given: 主人公已经离开起点，NPC 验证使用非首段介绍。
- When: 访客在三种状态下切换语言。
- Then: 主人公不回到起点；打开的对话或速览不关闭，NPC 介绍仍是原段落对应主题，只改变语言。
### responsive-layout/AC-1 三种视口入口 ← C-1
- 触发: 操作 分别以 1440×900、390×844、844×390 打开主页。
- Given: 图形与必要资源加载成功。
- When: 访客查看世界画面、语言入口和资料速览入口。
- Then: 每种视口均能看到并使用对应入口，主人公可见，页面没有需要左右拖动才能消除的整页水平溢出。
## 3. 涉及文件
- 修改 `/Users/bb/Projects/0xbb.me/App.tsx`：直接替换旧 HUD 主页，仅组合共享状态与四种组件。
- 修改 `/Users/bb/Projects/0xbb.me/index.css`：替换旧 HUD 专属样式为基础页面尺寸、排版和全局阅读样式。
- 新建 `/Users/bb/Projects/0xbb.me/App.test.tsx`。
## 6. 函数清单
- App.tsx：App，持有一次探索会话并组合 WorldViewport、Hud、Dialogue、Overview。
- index.css：无函数；只基础样式，组件规则由各组件所有者负责。
## 7. 协作关系
所有界面消费同一 T-2 状态；图形故障自动展示 Overview，不依赖成功挂载世界；切换语言及尺寸不重新创建会话。去掉旧 App 导航、位图和光剑入口，不添加持久化或后端。
## 8. 验证方式
- 公开 App 渲染入口：初始英文、FUBUKI_BB 身份、操作说明、语言与速览入口；加载时资料入口已存在，不出现旧 HUD 专属内容、位图或光剑链接。
- ego-browser 首次打开/中文移动后刷新：两次均英文起点。中段、迎宾者非首段、打开速览三状态切换语言：位置、面板和主题不变。
- 三指定视口观察主人公及所有入口，页面 scrollWidth 不超过视口宽度，触屏能操作；长正文在自身区域阅读。
- M1 全链路录制：行走、转向、靠近不自动弹窗、交谈、翻页、关闭、速览、故障与语言；实际 M1 验收在 T-10～T-13 完成后执行，用户视觉/手感确认前停止，不执行 M2/M3。
