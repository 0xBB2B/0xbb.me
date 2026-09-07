---
id: T-30
title: M2 完整三场景旅程
depends_on: [T-29]
files: [/Users/bb/Projects/0xbb.me/portfolio/journey.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/data.ts, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.css, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/tests/portfolio-journey.test.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-reading.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-4, portfolio/npc-dialogue/AC-3, portfolio/bilingual/AC-2, portfolio/npc-dialogue/AC-6]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: todo
agent: ""
commit: ""
note: "USER-041批准M2，AI-035采用单世界连续扩建/纯数据分区/明确NPC身份；主角与M1交互保持，不自动进入M3或发布。"
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
- npc-dialogue/C-6：系统应将全部 NPC 以统一的 Minecraft 方块三维像素风格呈现，头部、躯干和四肢具有方块体积，以衣装色块和配饰区分身份，不使用 SVG 或位图人物。
### npc-dialogue/AC-6 NPC 统一方块风格 ← C-6
- 触发: 操作 访问已交付场景并逐一观察 NPC。
- Given: 对应场景及 NPC 已交付，人物图形正常加载。
- When: 访客观察 NPC 的头部、躯干、四肢及身份配色。
- Then: 所有 NPC 都有 Minecraft 方块三维形体，风格与主角一致且身份可区分；没有 SVG 或位图 NPC。
## 3. 涉及文件
- files 中列明所有授权路径；不存在则新建，已存在则仅为本行为修改，明确淘汰项删除。worker在授权测试中先建立真实Red，冻结预期后再实现Green；文件未改不必为了清单而修改。
## 6. 函数清单
- workshop/gallery：独立程序化立体场景，导师与策展人、准确双语台词和项目链接。
- journey/world/runtime/state：纯数据旅程定义、三场景排序、道路连接、跟随镜头与环境连续混合，允许交界停留/反向。
- Hud/Dialogue/copy：正确显示当前场景、当前NPC身份和段落/作品链接，不回退起点。data仅使本站作品说明准确反映本轮三景，其余资料事实冻结。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit`。
- 测试授权：新增tests/portfolio-journey.test.ts；tests/portfolio-reading.test.ts仅允许为nearbyNpc从单NPC布尔值泛化为明确NPC身份迁移对应公开模型断言，保留全部浏览器行程与语义断言，不因M2删掉M1覆盖；此迁移只能在Red阶段进行。tests/browser.ts及其他所有已交付测试冻结，只读复跑。
- 真实入口是已有单城镇主页 /；保持页面可达，测试对目标三场景和后两个NPC行为断言失败才是Red，不导入尚不存在的workshop/gallery模块。
- 从城镇走到终点并返回，各NPC完整读中英，技能和作品链接按业务规则；两个交界各停留并左右往返3次，无网页跳转、黑屏、瞬移或道路断口。
- 观察暖光城镇、蓝色设备工坊、星夜展览三种立体环境、前中后景、接触阴影；人物统一Minecraft三维几何，非人物图形可用纯SVG或几何，不用测试夹具冒充发布场景。
- 保持触屏、输入释放、阅读暂停、双语语义段落和故障速览的既有契约；不自动进入此任务，须新授权。

- USER-041/AI-035：保留起点-8、迎宾者x=2、当前城镇建筑与主角。扩展世界右端和两处交界；journey.ts集中定义分区/交界/NPC坐标/身份（纯数据，不import图形模块），所有运行、文案、几何使用同一事实源，不复制不一致的位置常量。
- 工坊是蓝青设备、工作台、管线和立体结构，导师采用蓝灰衣装；展街是深蓝紫星夜、展台/框架与可见灯光层次，策展人采用紫灰衣装。NPC仍为无纹理方块几何且贴地、不挡路，不虚构姓名履历。环境变化必须来自真实几何/光照和连续混合，不能只换场景文字或给同一城镇套滤镜。
- 世界坐标连续、沿道路同一高程0.035向右延伸，无断口/重叠闪烁；原城镇地面和远景范围过大时仅做衔接必需的边界处理，不挪动现有建筑/树木/迎宾者。不用透明盖片掩盖道路错位。
- 复用单个canvas、renderer、camera和session；背景、雾、光照可随道路位置平滑变化，镜头原跟随方式与缩放不变，移动速度3.2不变。需要让新区域也有正确投影/落地关系，不能只让城镇有光照、后两景漆黑。
- NPC提示保持≤1.8单位、范围外忽略E，明确当前NPC身份并在打开时锁定对话对象；旧单NPC字段如需泛化直接迁移，不保留旧新两套模式或兼容选择。原有GREETER_X等仍真实用于城镇的常量可保留，但不可仅为旧测试伪造旁路。
- 延续既有三页阅读：迎宾原三页不变；导师按资料中六技能原顺序每页两项，展示原等级而非百分比；策展人按原作品顺序每页一项，显示名称/ONLINE/双语介绍及该项目访问和源码入口。上一/下一页边界禁用、Esc/按钮关闭、重读第一页保持，语言切换保持同一NPC同一页。
- 不增加或杜撰个人能力/等级/履历/成果；新增NPC介绍由同一APP_DATA现有技能和项目生成。data.ts仅更新本站作品介绍为本轮实际完成的三景，不改其它事实/链接，不造第二套资料。Overview及故障阅读仍使用同一事实源。
- 显示当前分区的中英名称及序号，Town原提示/标签在城镇保持；对话可滚动且新作品链接/翻页/关闭/语言三视口可达，不以删除文字来适配短屏。保留交谈范围提示和非强制弹窗，不新增任务/战斗/跳跃/传送。
- 新测试Red先从现有单城镇主页断言缺少工坊/展街/导师/策展人或无法走完三景，不能import不存在的workshop/gallery/journey模块制造Red；可用现有公开createSession/advance/createWorld接口观察现有世界。新生产模块仅Green时创建。
- 真实浏览器走完全程并沿原路返回，记录三个场景和三NPC的实际截图/主题，不注入window状态、不改人物速度、不传送角色。使用有界观察真实场景标签/Talk提示驱动旅程，不照搬固定1.2秒往返，finally释放键盘/触屏。新增长旅程测试可设置合理有界超时，不无限轮询或重跑碰运气。
- 两处交界分别停留并往返3次；除DOM标签外检查实际画布连续帧、位置/相机无突变、无导航/无canvas重挂、道路衔接及灯光/远景渐变。只换文字、背景像素变化或只测状态函数不算完整视觉证据。
- 1440×900、390×844、844×390均实际走到后两景、主动交谈、读完整双语、点项目链接并回头；可读到所有信息，目标URL不随语言变化。外站可用性不冒充本站承诺。
- 保留整个M1回归，包括无挂件黑装2.4高、步态/接地、输入释放、阅读暂停、语言/页连续、旋转保持、真实WebGL失效可见单资料窗口及刷新英文起点。App/WorldViewport/输入/主角源码/GLB/元信息/构建配置/素材迁移均冻结；禁止新静态图形import污染资料路径。
- 新旅程必须在实际静态构建中通过，不只开发服务器；新增测试可用原helper在独立静态预览端口测试并关闭自己启动的服务，不能关闭已有开发服务。测试魔数扫描/无位图保持，禁止任何新增图片纹理/SVG人物/依赖。
- 对完整verify给出每个命令实际退出码；worker最终必须提交唯一structured_output，缺证据如实FAIL，不引用T-29通过结果当本轮三景通过。不写git/任务/规范/台账或派工；临时日志/截图/dist/自建服务验证后清理。
- M2结束后停止等待用户三景效果确认，不执行T-31/T-32、不推送部署、不宣布整站accepted。若文件范围不足，报告具体技术需要，不越权改文件或删回归测试。
