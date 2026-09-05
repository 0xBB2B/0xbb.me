---
id: T-6
title: M1 世界视口与故障接入
depends_on: [T-1, T-2, T-5]
files: [/Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.test.tsx]
refs: [portfolio/graphics-runtime/AC-1, portfolio/graphics-runtime/AC-2, portfolio/responsive-layout/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/WorldViewport.test.tsx
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
把可释放图形运行时接入 React，加载和故障不阻断速览，尺寸变化不重置阅读。
## 2. 业务规则
- graphics-runtime/C-1：在图形尚未加载完成期间，系统应显示加载状态和可用的资料速览入口，不要求等待游戏就能阅读资料。
- graphics-runtime/C-2：如果浏览器不能初始化图形或必要场景、角色资源加载报错，系统应展示明确的图形不可用说明和完整资料，不停留在只有加载提示或空白的页面。
- responsive-layout/C-4：如果访客在探索或阅读中改变窗口尺寸或手机方向，系统应重新适配布局，保持主人公位置和已打开的阅读内容，不将其重置到起点。
### graphics-runtime/AC-1 加载期间可读 ← C-1
- 触发: 操作 限速加载图形资源，在完成前打开资料速览。
- Given: 个人资料已可访问，必要图形资源仍在加载。
- When: 访客观察加载状态并激活资料速览入口。
- Then: 加载状态明确，访客无需等待图形即可阅读简介、技能、作品与联系方式。
### graphics-runtime/AC-2 初始化与资源失败 ← C-2
- 触发: 操作 分别禁用所需图形能力、阻断一项必要场景资源、阻断角色资源后打开主页。
- Given: 浏览器可以加载个人资料，各次测试使一种必要图形条件失败。
- When: 访客等待失败被浏览器报告并查看页面。
- Then: 每种失败均显示图形不可用说明与完整资料，作品和联系方式可用，没有只有加载提示或空白的页面。
### responsive-layout/AC-4 改变显示区域 ← C-4
- 触发: 操作 在道路中段和对话打开时改变窗口尺寸，并在手机竖横屏之间切换。
- Given: 主人公已离开起点，对话测试使用已打开的非首段内容。
- When: 访客改变显示区域后继续操作。
- Then: 布局适配新的显示区域，主人公仍在原位置，对话仍显示原段落，操作入口仍可用。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx`、`/Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css`。
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.test.tsx`。
## 6. 函数清单
- WorldViewport.tsx：WorldViewport，管理图形挂载/卸载、加载与故障通知和容器尺寸适配。
- WorldViewport.css：无函数，视口尺寸及画面布局。
## 7. 协作关系
消费 runtime 的状态与释放接口、copy 的本地化说明，通知 App 呈现完整 Overview；同一探索状态由外部持有。资料层与速览不包在图形异步边界内，不增加测试依赖。
## 8. 验证方式
- React 公开组件静态输出入口：加载中、就绪、故障及 en/zh 输入对应状态提示；无位图引用，无要求桌面才可使用的占位。
- M1 组合后必须用 ego-browser：限速必要模块时先打开速览；分别禁用图形初始化、阻断实际场景模块响应、阻断实际角色模块响应，检查失败说明及完整资料和可用链接。不能用不存在的位图 URL 伪造故障覆盖。
- 从道路中段和对话非首段分别在 1440×900、390×844、844×390 间调整尺寸；画面重适配，位置、面板、段落保持，关闭和语言入口可用。
- 挂载/卸载及失败后不出现重复画布、未释放循环或覆盖资料的空白层；上述浏览器门禁不能由静态输出测试替代。
