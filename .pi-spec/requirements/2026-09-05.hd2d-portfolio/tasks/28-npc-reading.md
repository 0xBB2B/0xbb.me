---
id: T-28
title: M1 NPC 与双语资料阅读
depends_on: [T-27]
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/index.css, /Users/bb/Projects/0xbb.me/data.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/input.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.css, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.css, /Users/bb/Projects/0xbb.me/tests/browser.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-reading.test.ts]
refs: [portfolio/npc-dialogue/AC-1, portfolio/npc-dialogue/AC-2, portfolio/npc-dialogue/AC-3, portfolio/npc-dialogue/AC-4, portfolio/npc-dialogue/AC-5, portfolio/bilingual/AC-1, portfolio/bilingual/AC-2, portfolio/bilingual/AC-3, portfolio/profile-overview/AC-1, portfolio/profile-overview/AC-2, portfolio/profile-overview/AC-3, portfolio/profile-overview/AC-4, portfolio/profile-overview/AC-5, portfolio/player/AC-6]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在可玩城镇中加入一位迎宾NPC、主动对话、双语切换和无需行走的完整资料速览，所有角色与界面均代码化。
## 2. 业务规则
- npc-dialogue/C-1：当主人公进入 NPC 交谈范围时，系统应显示该 NPC 的交谈提示；离开范围时撤去提示，单纯靠近不得自动打开对话。
- npc-dialogue/C-2：当交谈提示可见且访客按 E 或点击交谈按钮时，系统应打开对应 NPC 的介绍并暂停行走，桌面与触屏均可完成阅读。
- npc-dialogue/C-3：系统应通过迎宾者介绍 FUBUKI_BB 的全栈工程、系统架构与 AI 工作流背景，通过工坊导师介绍 AI、Harness Engineering、Context Engineering、Prompt Engineering、Go、Docker / K8s 共 6 项技能，通过策展人介绍 0xbb.me、bb-spec、pi-subagent-cluster 共 3 个作品并提供相应作品与源码入口。
- npc-dialogue/C-4：在介绍打开期间，系统应提供翻页和关闭操作，不要求读完才能继续探索；再次与该 NPC 交谈时仍能阅读完整介绍。
- npc-dialogue/C-5：如果没有 NPC 交谈提示，系统应忽略交谈输入，不打开远处 NPC 的介绍或空白对话；对话操作不能触发战斗、任务解锁或真实 AI 问答。
### npc-dialogue/AC-1 交谈提示不强制弹出 ← C-1
- 触发: 操作 靠近一位 NPC，停留后不交谈并走开。
- Given: 主人公尚在该 NPC 交谈范围外。
- When: 访客走近、停留，再离开。
- Then: 范围内显示提示但不自动弹出介绍，离开后提示消失。
### npc-dialogue/AC-2 主动开启 ← C-2
- 触发: 操作 在交谈提示出现后分别按 E 和点击交谈按钮。
- Given: 主人公在 NPC 交谈范围内，对话尚未打开。
- When: 桌面访客按 E，触屏访客点击交谈按钮。
- Then: 两种操作均打开当前 NPC 的介绍，并暂停行走，不会打开另一场景角色的对话。
### npc-dialogue/AC-3 三段介绍覆盖 ← C-3
- 触发: 操作 与三个场景的 NPC 分别交谈并阅读全部段落。
- Given: 三个场景与 NPC 均可访问。
- When: 访客阅读迎宾者、工坊导师与策展人的完整介绍并检查作品入口。
- Then: 分别覆盖 FUBUKI_BB 的背景、列出的 6 项技能和 3 个作品；作品与源码入口分别对应所介绍项目，不出现未经确认的个人履历。
### npc-dialogue/AC-4 翻页关闭与重读 ← C-4
- 触发: 操作 翻页阅读、在未读完时关闭，随后再次交谈。
- Given: 某位 NPC 的介绍已打开。
- When: 访客翻页后关闭，重新与同一 NPC 交谈并阅读全部内容。
- Then: 可以翻页、提前关闭并恢复探索；重读不因此前已经交谈而被禁止，也不要求完成任务。
### npc-dialogue/AC-5 范围外交谈 ← C-5
- 触发: 操作 在没有交谈提示的位置按 E 或尝试交谈操作。
- Given: 主人公远离所有 NPC，未打开任何对话。
- When: 访客触发交谈输入。
- Then: 不打开远处角色或空白对话，不启动 AI 请求、战斗或任务解锁，主人公仍可正常行走。
- bilingual/C-1：当访客首次进入或刷新主页时，系统应默认使用英文并从探索起点开始，不恢复上次刷新前的语言或位置。
- bilingual/C-2：当访客切换中文或英文时，系统应同步切换可见界面提示、场景名称、NPC 介绍、资料速览和故障说明；技术、项目、品牌名称和链接目标保持其原有身份与含义。
- bilingual/C-3：如果访客在探索中、对话中或资料速览中切换语言，系统应保持主人公位置；已打开的阅读面板不关闭，NPC 对话仍处于语义对应的同一段落。
### bilingual/AC-1 初始语言与刷新 ← C-1
- 触发: 操作 首次进入主页，切换中文并向右走后刷新。
- Given: 浏览器可正常打开主页。
- When: 访客观察初始语言，切换中文、移动后刷新。
- Then: 首次进入和刷新后均为英文，刷新后主人公从起点开始，不恢复先前位置。
### bilingual/AC-2 双向全量切换 ← C-2
- 触发: 操作 切换中文并阅读三个 NPC 和资料速览，再切回英文。
- Given: 主页运行正常，全部内容可访问。
- When: 访客在两种语言下检查提示、场景名、介绍、技能、作品与联系方式。
- Then: 两种语言均覆盖完整内容，不出现未翻译的界面占位文字或丢失介绍；项目与技术名称可使用原名，外链目标不随语言变化。
### bilingual/AC-3 阅读位置连续 ← C-3
- 触发: 操作 分别在道路中段、NPC 后续段落和资料速览打开时切换语言。
- Given: 主人公已经离开起点，NPC 验证使用非首段介绍。
- When: 访客在三种状态下切换语言。
- Then: 主人公不回到起点；打开的对话或速览不关闭，NPC 介绍仍是原段落对应主题，只改变语言。
- profile-overview/C-1：系统应介绍 FUBUKI_BB 是全栈工程师、系统架构师与 AI 探索者，地点为 Tokyo、Shanghai，工作方向包括 AI 工作流、可扩展后端、游戏 SDK 生态与交易平台，不添加未经确认的雇主、客户、奖项或成绩。
- profile-overview/C-2：系统应展示 6 项技能及其等级：AI 999、Harness Engineering 99、Context Engineering 99、Prompt Engineering 99、Go (Golang) 90、Docker / K8s 85；等级不得改写为百分比熟练度。
- profile-overview/C-3：系统应展示 3 个 ONLINE 作品及下方作品表中对应的介绍、访问与源码入口；站点自身作品介绍应描述 HD-2D 探索主页。
- profile-overview/C-4：系统应提供下方联系表中的 GitHub、LinkedIn、Juejin 和 Email 共 4 个入口，文字或可访问名称能区分其目标。
- profile-overview/C-5：当访客打开资料速览时，系统应在无需行走或 NPC 对话的情况下提供完整资料，暂停行走；关闭速览后回到打开前的位置。
### profile-overview/AC-1 个人事实 ← C-1
- 触发: 操作 打开资料速览并阅读简介。
- Given: 访客首次进入主页，未操作主人公。
- When: 访客查看简介，并与 NPC 的背景介绍比较。
- Then: 主人姓名、职业、地点和工作方向符合约束，两处内容表达相同事实，不出现未经确认的个人成果或雇佣关系。
### profile-overview/AC-2 六项技能 ← C-2
- 触发: 操作 打开资料速览的技能内容。
- Given: 资料速览可访问。
- When: 访客逐项查看技能及等级。
- Then: 展示列出的 6 项技能与对应等级，数值没有被转换为百分比或删改。
### profile-overview/AC-3 三个作品与链接 ← C-3
- 触发: 操作 阅读作品列表并逐一激活访问与源码入口。
- Given: 资料速览可访问，浏览器允许正常外链导航。
- When: 访客检查 3 个作品的名称、状态、描述及链接目标。
- Then: 3 个作品均为 ONLINE，介绍要点和链接与作品表一致；浏览器导航到对应地址，不以第三方服务的实时可用性作为本站承诺。
### profile-overview/AC-4 四个联系入口 ← C-4
- 触发: 操作 检查并激活 GitHub、LinkedIn、Juejin 和 Email。
- Given: 资料速览可访问。
- When: 访客逐一使用 4 个入口。
- Then: 各入口具有可辨认名称并指向联系表地址；邮件入口使用指定邮件地址，实际是否打开邮件客户端取决于访客设备设置。
### profile-overview/AC-5 无需游戏的阅读与返回 ← C-5
- 触发: 操作 在起点直接打开速览，再在道路中段打开和关闭速览。
- Given: 图形运行正常，访客尚未完成任何 NPC 介绍。
- When: 访客阅读速览，尝试移动并关闭。
- Then: 全部资料无需解锁即可阅读；打开期间人物不移动，关闭后仍处于打开前的位置。
- player/C-6：在 NPC 对话或资料速览打开期间，系统应暂停主人公行走；关闭后主人公仍在打开前的位置，只有重新输入方向才继续移动。
### player/AC-6 阅读暂停移动 ← C-6
- 触发: 操作 分别打开 NPC 对话与资料速览，输入方向后关闭。
- Given: 主人公位于道路中段，NPC 对话在可交谈位置开启。
- When: 访客阅读期间尝试键盘或触屏移动，随后关闭阅读面板。
- Then: 阅读期间位置不变，关闭后仍在打开前的位置，不因阅读期间的方向输入而自行继续行走。
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
- data/copy：中英事实、六技能等级、三个作品、四联系目标和界面词条，不编造履历。
- state/input：靠近提示、主动交谈、翻页关闭重读、语言切换不重置位置、阅读暂停并释放输入。
- town：迎宾NPC几何、位置及双语背景段落，不预制后两景。
- App/Hud/Dialogue/Overview：唯一状态组合、纯代码头像/UI、长内容可读、所有链接与明确关闭入口。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun test ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts`。
- 测试授权：仅新增或修改 tests/portfolio-reading.test.ts、tests/browser.ts；复跑已有tests/portfolio-playable.test.ts，不弱化其断言，不改生产代码。
- 通过真实主页 / 和既有Bun/ego-browser测试入口，先确认城镇可访问，再走近NPC、按E或点交谈；失败应来自缺少NPC提示/对话等目标行为，而非新内部模块的导入错误。
- 靠近仅显示提示，走开撤去；范围外E无效；对话可翻页、提前关闭、重读。阅读中方向输入不得移动人物，关闭后必须新输入才续走。
- 初始英文，切换中文覆盖提示、城镇名称、NPC和速览，保持位置/面板/语义段落；刷新回到英文起点，无存档。首次不走动即可打开速览。
- 在两语言下逐项检查以下完整个人事实、等级及链接；仅站点自身作品介绍更新为HD-2D主页，不添加雇主或成果。NPC在M1只介绍背景，完整三NPC覆盖由T-30完成。
- 真实点击网页链接核对导航目标；第三方实时故障和系统无邮件客户端不能误报本站目标错误。长正文可滚动，翻页、关闭和语言入口可触达。
- 串行修改已有文件只为本行为，不另造探索状态或复制第二套个人资料；不增加后台、真实AI问答、音频、战斗、存档或依赖。
