---
id: T-30
title: M2 完整三场景旅程
depends_on: [T-29]
files: [/Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx, /Users/bb/Projects/0xbb.me/tests/browser.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-journey.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-4, portfolio/npc-dialogue/AC-3, portfolio/bilingual/AC-2]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./tests/portfolio-journey.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在M1用户视觉确认和新授权后，扩建科技工坊和星夜展街，实现完整三段NPC介绍与两个连续交界。
## 2. 业务规则
- world/C-1：系统应按从左到右的顺序展示黄昏城镇、科技工坊、星夜展街，共 3 个场景；各场景至少有 1 位 NPC，分别承担背景、技能、作品介绍。
- world/C-2：系统应展示 HD-2D 世界，其中像素人物位于立体布景中，道路、前景和远景具有可见纵深，场景物体具有明暗面与落地阴影；黄昏城镇以暖光为主，科技工坊具有蓝色科技细节，星夜展街呈现夜色展览环境。
- world/C-3：当主人公跨越任意两个相邻场景的交界时，系统应连续跟随其位置，并逐步改变环境表现，不切换网页、不黑屏、不出现人物瞬移或道路断口。
- world/C-4：如果主人公在交界处停留或反向行走，系统应维持连续画面并允许沿原路返回，不反复触发切屏或将主人公重置到场景入口。
### world/AC-1 三段旅程 ← C-1
- 触发: 操作 从起点持续向右探索到终点并观察各场景 NPC。
- Given: 新进入主页，图形加载成功，主人公位于起点。
- When: 访客依次走过整个世界并在各 NPC 处查看交谈主题。
- Then: 依次出现黄昏城镇、科技工坊、星夜展街，每处至少 1 位 NPC，主题依次为背景、技能、作品。
### world/AC-2 立体布景与场景辨识 ← C-2
- 触发: 操作 在三个场景分别行走、停下并观察画面。
- Given: 三个场景均可访问，图形加载成功。
- When: 访客在每处观察主人公、道路、近处道具和远景。
- Then: 可见清晰像素人物、立体物体明暗面与落地阴影、前中后景层次；三个场景分别可辨认暖光城镇、蓝色设备工坊和星夜展览环境，而非单张平面背景加滤镜。
### world/AC-3 连续跨区 ← C-3
- 触发: 操作 向右走过城镇与工坊、工坊与展街两个交界。
- Given: 图形加载成功，主人公即将经过交界。
- When: 访客保持向右行走直到进入下一场景。
- Then: 镜头和主人公位置连续，道路保持连接，环境逐步变化；地址不因跨区而跳转，没有黑屏、人物瞬移或新的入场加载页。
### world/AC-4 交界往返 ← C-4
- 触发: 操作 在两个交界处各停留一次并左右往返 3 次。
- Given: 主人公已到达相应交界，画面可见。
- When: 访客停下，再交替向左和向右移动。
- Then: 画面不反复切屏，主人公不重置到入口，可沿相同道路返回先前场景。
- npc-dialogue/C-3：系统应通过迎宾者介绍 FUBUKI_BB 的全栈工程、系统架构与 AI 工作流背景，通过工坊导师介绍 AI、Harness Engineering、Context Engineering、Prompt Engineering、Go、Docker / K8s 共 6 项技能，通过策展人介绍 0xbb.me、bb-spec、pi-subagent-cluster 共 3 个作品并提供相应作品与源码入口。
### npc-dialogue/AC-3 三段介绍覆盖 ← C-3
- 触发: 操作 与三个场景的 NPC 分别交谈并阅读全部段落。
- Given: 三个场景与 NPC 均可访问。
- When: 访客阅读迎宾者、工坊导师与策展人的完整介绍并检查作品入口。
- Then: 分别覆盖 FUBUKI_BB 的背景、列出的 6 项技能和 3 个作品；作品与源码入口分别对应所介绍项目，不出现未经确认的个人履历。
- bilingual/C-2：当访客切换中文或英文时，系统应同步切换可见界面提示、场景名称、NPC 介绍、资料速览和故障说明；技术、项目、品牌名称和链接目标保持其原有身份与含义。
### bilingual/AC-2 双向全量切换 ← C-2
- 触发: 操作 切换中文并阅读三个 NPC 和资料速览，再切回英文。
- Given: 主页运行正常，全部内容可访问。
- When: 访客在两种语言下检查提示、场景名、介绍、技能、作品与联系方式。
- Then: 两种语言均覆盖完整内容，不出现未翻译的界面占位文字或丢失介绍；项目与技术名称可使用原名，外链目标不随语言变化。
| 作品 | 介绍要点 | 访问入口 | 源码入口 |
|---|---|---|---|
| 0xbb.me | 可操控角色、NPC 介绍、三场景的 HD-2D 个人主页 | https://0xbb.me | https://github.com/0xBB2B/0xbb.me |
| bb-spec | 将模糊需求推进到审查交付的规范驱动流程，支持追踪、续接与对抗性验证 | https://github.com/0xBB2B/bb-spec | https://github.com/0xBB2B/bb-spec |
| pi-subagent-cluster | 分解任务并在隔离工作进程中执行，以审查驱动重试和层级升级 | https://pi.dev/packages/@0xbb2b/pi-subagent-cluster | https://github.com/0xBB2B/pi-subagent-cluster |

| 联系入口 | 目标 |
|---|---|
| GitHub | https://github.com/0xBB2b |
| LinkedIn | https://www.linkedin.com/in/0xbb2b |
| Juejin | https://juejin.cn/user/1037558235795032 |
| Email | mailto:bb@yorha.xyz |
## 3. 涉及文件
- files 中列明所有授权路径；不存在则新建，已存在则仅为本行为修改，明确淘汰项删除。测试只由测试角色修改，生产代码只在可信 Red 后实现。
## 6. 函数清单
- workshop/gallery：独立程序化立体场景，导师与策展人、准确双语台词和项目链接。
- world/runtime/state：三场景排序、道路连接、跟随镜头与环境连续混合，允许交界停留/反向。
- Hud/Dialogue/copy：正确显示当前场景和当前NPC段落，不回退起点。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./tests/portfolio-journey.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts`。
- 测试授权：仅在M2获授权后新增或修改tests/portfolio-journey.test.ts、tests/browser.ts；复跑已交付M1测试，不修改生产代码。
- 真实入口是已有单城镇主页 /；保持页面可达，测试对目标三场景和后两个NPC行为断言失败才是Red，不导入尚不存在的workshop/gallery模块。
- 从城镇走到终点并返回，各NPC完整读中英，技能和作品链接按业务规则；两个交界各停留并左右往返3次，无网页跳转、黑屏、瞬移或道路断口。
- 观察暖光城镇、蓝色设备工坊、星夜展览三种立体环境、前中后景、接触阴影；无位图、不用测试夹具冒充发布场景。
- 保持触屏、输入释放、阅读暂停、双语语义段落和故障速览的既有契约；不自动进入此任务，须新授权。
