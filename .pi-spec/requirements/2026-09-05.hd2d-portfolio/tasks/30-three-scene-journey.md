---
id: T-30
title: M2 一NPC与八看板的完整三景旅程
depends_on: [T-29]
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/data.ts, /Users/bb/Projects/0xbb.me/portfolio/journey.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/input.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.css, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.css, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/components/portfolio/Boards.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Boards.css, /Users/bb/Projects/0xbb.me/components/portfolio/BoardDetails.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/BoardDetails.css, /Users/bb/Projects/0xbb.me/tests/portfolio-journey.test.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-reading.test.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-delivery.test.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-boards.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-4, portfolio/world/AC-5, portfolio/npc-dialogue/AC-3, portfolio/npc-dialogue/AC-7, portfolio/profile-overview/AC-2, portfolio/profile-overview/AC-6, portfolio/bilingual/AC-2, portfolio/bilingual/AC-3, portfolio/player/AC-6, portfolio/responsive-layout/AC-3, portfolio/responsive-layout/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: todo
agent: ""
commit: ""
note: "USER-042..046批准五项无等级技能、一NPC/八看板与建筑过渡/观景平台；AI-038原地修订未提交M2，旧131项通过不用于新契约。"
---
## 1. 目标
保留城镇迎宾与主角，以五技能/三作品看板替换后两NPC，丰富工坊/展街建筑与过渡，用观景平台收尾，完整双语阅读并保留M1故障与操作能力。
## 2. 业务规则
- world/C-1：系统应按从左到右的顺序展示黄昏城镇、科技工坊、星夜展街，共 3 个场景；仅城镇有一位迎宾 NPC 介绍背景，工坊的五块技能看板和展街的三块作品看板分别介绍技能与作品，后两景没有 NPC。
### world/AC-1 三段旅程 ← C-1
- 触发: 操作 从起点持续向右探索到终点并观察NPC和看板。
- Given: 新进入主页，图形加载成功，主人公位于起点。
- When: 访客依次走过整个世界并查看迎宾介绍、技能看板和作品看板。
- Then: 依次出现黄昏城镇、科技工坊、星夜展街，仅城镇有迎宾NPC；工坊五块技能看板、展街三块作品看板，无导师或策展人，内容依次为背景、技能、作品。

- world/C-2：系统应展示 HD-2D 世界，其中像素人物位于立体布景中，道路、前景和远景具有可见纵深，场景物体具有明暗面与落地阴影；黄昏城镇保留暖光主体；工坊有完整建筑立面、窗户、屋檐、工作台及连接的管线，技能看板嵌入建筑或设备；展街有展馆立面、作品橱窗、廊架和远处城市灯光，不以孤立设备、空色框或单纯换色代替完整环境。
### world/AC-2 立体布景与场景辨识 ← C-2
- 触发: 操作 在三个场景分别行走、停下并观察画面。
- Given: 三个场景均可访问，图形加载成功。
- When: 访客在每处观察主人公、道路、近处道具和远景。
- Then: 可见清晰像素人物、立体物体明暗面与落地阴影、前中后景层次；可辨认保留的暖光城镇、具有立面/窗户/屋檐/工作台/连接管线的工坊、具有展馆立面/作品橱窗/廊架/远处城市灯光的星夜展街；看板融入布景，不是孤立设备、空色框或平面背景滤镜。

- world/C-3：当主人公跨越任意两个相邻场景的交界时，系统应连续跟随其位置，通过砖墙、仓库门、渐多的金属构件连接城镇与工坊，通过玻璃顶连廊连接工坊与展街；铺装、建筑、灯光渐变，不仅改变天空颜色，不切换网页、不黑屏、不出现人物瞬移或道路断口。
### world/AC-3 连续跨区 ← C-3
- 触发: 操作 向右走过城镇与工坊、工坊与展街两个交界。
- Given: 图形加载成功，主人公即将经过交界。
- When: 访客保持向右行走直到进入下一场景。
- Then: 镜头和主人公位置连续，道路保持连接，城镇与工坊之间有砖墙/仓库门/金属构件衔接，工坊与展街之间有玻璃顶连廊，铺装和灯光逐渐变化，而非仅全局换色；地址不因跨区而跳转，没有黑屏、人物瞬移或新的入场加载页。

- world/C-4：如果主人公在交界处停留或反向行走，系统应维持连续画面并允许沿原路返回，不反复触发切屏或将主人公重置到场景入口。
### world/AC-4 交界往返 ← C-4
- 触发: 操作 在两个交界处各停留一次并左右往返 3 次。
- Given: 主人公已到达相应交界，画面可见。
- When: 访客停下，再交替向左和向右移动。
- Then: 画面不反复切屏，主人公不重置到入口，可沿相同道路返回先前场景。

- world/C-5：当主人公到达最右端时，系统应以含栏杆、长椅、树木和远景的观景平台收尾，人物可停留并原路返回；道路及前后景不以裸露矩形截面或地面缺口结束。
### world/AC-5 观景平台收尾 ← C-5
- 触发: 操作 走到最右端停留，再向左返回。
- Given: 三景可访问，人物接近旅程终点。
- When: 访客观察右端全景、停止和回头。
- Then: 可见栏杆、长椅、树木和远景构成的观景平台，角色停留不穿地，可原路返回；道路不生硬截断，视口内无底面缺口或裸露矩形截面。

- npc-dialogue/C-3：系统应通过迎宾者介绍 FUBUKI_BB 的全栈工程、系统架构与 AI 工作流背景；工坊五块看板依次展示 AI Agent、Golang、Docker/k8s、游戏发行SDK、支付平台，不含等级；展街三块看板分别展示 0xbb.me、bb-spec、pi-subagent-cluster，并在各自详情提供准确的访问与源码入口。后两景不保留导师、策展人或其对话。
### npc-dialogue/AC-3 三段介绍覆盖 ← C-3
- 触发: 操作 与迎宾者交谈并逐一查看五块技能及三块作品看板。
- Given: 三个场景、迎宾者和八块看板均可访问。
- When: 访客阅读迎宾背景、每块技能和作品看板摘要及详情，检查作品入口。
- Then: 分别覆盖FUBUKI_BB背景、五项无等级技能和三个作品；每块看板有实际可读名称/摘要，详情属于该板，不是NPC台词；作品链接准确，不出现未经确认的个人履历。

- npc-dialogue/C-7：系统应在每块看板上显示随场景移动的中英名称与摘要；横向距离不超过1.8场景单位时显示查看提示，按E或查看按钮打开该板详情并暂停移动，不自动弹出。详情不使用对话口吻，语言切换保持同一板内容，可用关闭按钮或Esc关闭并重复查看；关闭后须新方向输入才移动，范围外忽略查看，对话、详情与速览互斥。
### npc-dialogue/AC-7 看板主动查看与阅读连续性 ← C-7
- 触发: 操作 接近技能或作品看板，按E或点击查看，切换语言、关闭并重新查看。
- Given: 主人公在正常三维场景中，当前无阅读面板。
- When: 访客观察板面及提示，进入/离开横向1.8单位范围，并在详情中尝试移动和切语言。
- Then: 名称与摘要随布景移动；范围内显示查看提示但不自动打开，E/查看打开对应单板详情；阅读时位置不变、语言切换保持同一内容，关闭按钮/Esc关闭，旧方向输入不续走；范围外不能打开远处详情，可以重复查看。作品详情含对应访问/源码链接，五项技能无等级，三个阅读入口互斥。

- profile-overview/C-2：系统应按顺序展示 AI Agent、Golang、Docker/k8s、游戏发行SDK、支付平台共 5 项技能及中性领域介绍，不显示等级、分数、百分比或评级；看板、资料速览和故障阅读的内容一致，不虚构成果。
### profile-overview/AC-2 五项无等级技能 ← C-2
- 触发: 操作 打开资料速览的技能内容。
- Given: 资料速览可访问。
- When: 访客逐项查看技能名称与介绍。
- Then: 依次展示 AI Agent、Golang、Docker/k8s、游戏发行SDK、支付平台五项，与看板内容一致，不出现等级、分数、百分比或评级。

- profile-overview/C-6：如果图形不可用，系统仍应展示相同的简介、5 项技能、3 个作品及 4 个联系入口，不能要求先恢复游戏才能阅读或使用外链。
### profile-overview/AC-6 图形故障仍可阅读 ← C-6
- 触发: 操作 禁用所需图形能力或使必要图形资源报错后访问主页。
- Given: 浏览器能加载个人资料，但图形不可用。
- When: 访客阅读资料并检查作品和联系入口。
- Then: 简介、5 项技能、3 个作品、4 个联系入口仍完整可用，不要求恢复游戏或前往 NPC。

- bilingual/C-2：当访客切换中文或英文时，系统应同步切换可见界面提示、场景名称、NPC 介绍、看板摘要与详情、资料速览和故障说明；技术、项目、品牌名称和链接目标保持其原有身份与含义。
### bilingual/AC-2 双向全量切换 ← C-2
- 触发: 操作 切换中文并阅读迎宾NPC、八块看板及详情和资料速览，再切回英文。
- Given: 主页运行正常，全部内容可访问。
- When: 访客在两种语言下检查提示、场景名、介绍、技能、作品与联系方式。
- Then: 两种语言均覆盖完整内容，不出现未翻译的界面占位文字或丢失介绍；项目与技术名称可使用原名，外链目标不随语言变化。

- bilingual/C-3：如果访客在探索中、对话中、看板详情中或资料速览中切换语言，系统应保持主人公位置；已打开的阅读面板不关闭，NPC 对话仍处于语义对应的同一段落，看板详情仍属于同一看板。
### bilingual/AC-3 阅读位置连续 ← C-3
- 触发: 操作 分别在道路中段、NPC 后续段落、看板详情和资料速览打开时切换语言。
- Given: 主人公已经离开起点，NPC 验证使用非首段介绍。
- When: 访客在这些状态下切换语言。
- Then: 主人公不回到起点；打开的对话或速览不关闭，NPC介绍仍是原段落对应主题，看板摘要及详情仍属于原看板，只改变语言。

- player/C-6：在 NPC 对话、看板详情或资料速览打开期间，系统应暂停主人公行走；关闭后主人公仍在打开前的位置，只有重新输入方向才继续移动。
### player/AC-6 阅读暂停移动 ← C-6
- 触发: 操作 分别打开 NPC 对话、看板详情与资料速览，输入方向后关闭。
- Given: 主人公位于道路中段，NPC 对话在可交谈位置开启。
- When: 访客阅读期间尝试键盘或触屏移动，随后关闭阅读面板。
- Then: 阅读期间位置不变，关闭后仍在打开前的位置，不因阅读期间的方向输入而自行继续行走。

- responsive-layout/C-3：在任一指定视口下阅读 NPC 对话、看板详情或资料速览期间，系统应允许读到全部正文，并能激活翻页、关闭和语言切换操作，不因正文长度而裁掉必要操作。
### responsive-layout/AC-3 双语长内容可读 ← C-3
- 触发: 操作 在三种视口分别阅读中文和英文 NPC 对话、看板详情与完整资料速览。
- Given: 介绍包含所有技能、作品和联系方式。
- When: 访客浏览全部正文并使用翻页、语言切换与关闭操作。
- Then: 所有正文可读，必要时可在阅读区域滚动；必要操作不被屏幕边缘裁切，两种语言均可完成阅读和关闭。

- responsive-layout/C-4：如果访客在探索或阅读中改变窗口尺寸或手机方向，系统应重新适配布局，保持主人公位置和已打开的阅读内容，不将其重置到起点。
### responsive-layout/AC-4 改变显示区域 ← C-4
- 触发: 操作 在道路中段和对话打开时改变窗口尺寸，并在手机竖横屏之间切换。
- Given: 主人公已离开起点，对话测试使用已打开的非首段内容。
- When: 访客改变显示区域后继续操作。
- Then: 布局适配新的显示区域，主人公仍在原位置，对话仍显示原段落，操作入口仍可用。

## 3. 涉及文件
- data.ts/copy.ts：统一五项技能与中性双语摘要/详情；项目现有名称、ONLINE、介绍与URL不变，本站介绍改为一NPC/看板三景。去除等级字段，不留旧六项评级旁路。
- journey/state/input：统一场景、迎宾和八看板身份/位置/阅读状态；删除导师策展人数据、打开路径和对话分支，不添加新旧并行模式。
- workshop/gallery/world/runtime/town：完整建筑、两种过渡、观景平台与真实地面/灯光；town仅允许衔接边界必要改动，主角和城镇主体冻结。
- App/WorldViewport/Hud：连接同一会话与看板投影/查看输入，故障入口隔离；原镜头/速度/画布生命期保持。
- 新建Boards.tsx/css、BoardDetails.tsx/css：场景固定摘要与单板详情（若无必要可不用新文件，不写空壳）；修改Dialogue只保留迎宾三页，不冒充看板详情。
- Overview.tsx/css：正常与故障阅读统一五技能无评级，沿用单资料界面；相关CSS只为必要看板/详情/布局变更。
- 四份授权测试：portfolio-boards新测试；journey、reading、delivery迁移三NPC/六等级契约并加强有效回归。其它测试和helper只读。
## 6. 函数清单
- 旅程定义与范围计算：区分迎宾与看板，稳定ID控制同一内容，单一位置数据。
- 场景构造与环境更新：建筑、道路、衔接、看板载体、观景平台及渐变光照。
- 看板投影与详情：将标题摘要固定在世界看板上，语言/相机移动时同步，打开正确详情并暂停移动。
- 资料与阅读状态：统一资料、互斥/关闭/重新输入恢复，故障时只有可见完整资料。
## 7. 协作关系
- 已授权主agent整理竖切片，允许任务跨多生产文件；完整任务文件≤200行，不限代码行数。只用现有React/Three/Vite/Bun/ego，无新依赖，不操作git/规范/任务/台账或派工。
- 当前未提交M2是旧131项通过的三NPC基线，不是新要求通过；只保留可复用正确实现，删除无用旧导师/策展人和技能等级，不重复搭两套流程。
- 看板为普通非人物UI，可用真实DOM文字投影到三维几何载体或已有纯矢量能力，不使用CanvasTexture/PNG/JPG/SVG内嵌位图，不安装字体库。投影必须随相机移动、不穿越前景乱浮、不固定屏幕，不把标题放进只有测试能看见的节点。
- 主角源码、底模/GLB、geometry.ts、步态/接地、移动速度3.2及相机缩放保持；允许为布局扩展道路长度/分区和看板站位，必须集中定义并保持起点-8和迎宾x2，不在各模块复制不一致常量。
- 八看板互相间隔足够使1.8横向范围不重叠；每板1详情，无跨板分页。迎宾仍三页、重读第一页。技能英文名AI Agent/Golang/Docker/k8s/Game Publishing SDK/Payment Platforms；仅中性领域概述，不编造SDK登录/渠道数量/支付机构/交易成绩等未经确认能力。
- 原事实：FUBUKI_BB为全栈工程师/系统架构师/AI探索者，Tokyo与Shanghai，背景方向现有资料不擅自扩写。项目0xbb.me、bb-spec、pi-subagent-cluster，链接来自现有data.ts冻结目标；联系方式GitHub/LinkedIn/Juejin/Email冻结。
## 8. 验证方式
- 测试授权：先改tests/portfolio-journey.test.ts、portfolio-reading.test.ts、portfolio-delivery.test.ts的过时三NPC/六等级预期并新增portfolio-boards.test.ts，建立当前真实Red后冻结断言。保留迎宾、暂停、重读、双语、resize、故障可见性、原图迁移/无位图的所有有效断言，不能删除整段失败旅程逃避。
- 新Red须使用当前真实主页/已有公开模块输出：当前后两NPC存在、看板摘要缺失、技能仍六项/数字等级、终点缺观景平台均为可证伪缺陷；不能import不存在Boards/新模块制造Red，不把构建/网络工具异常当业务Red。新模块仅在Green实现。
- 功能验收逐一访问5技能+3作品看板：板面确有可见名称/摘要且固定布景；≤1.8时提示，范围外E忽略，路过不自动弹窗；E/触屏查看打开该板自己的详情，不是NPC对话，不使用导师/策展人称呼。语言切换保持同一板和位置，无等级/分数/百分比/评级，全部作品链接准确。
- 详情/迎宾/速览只可一个打开；Esc/按钮关闭，阅读时方向输入不移动，关闭后旧键/触摸不续走，新输入恢复；切语言、旋转保持内容、暂停/边界不穿地。无图形时不展示可激活的看板，仍有同一五技能/三作品/四联系资料和可见双语故障说明。
- 场景验收需实际截图逐张查看：工坊完整立面/窗户/屋檐/工作台/连接管线，5技能板嵌入；城镇向工坊由砖墙/仓库门/金属构件/铺装衔接，暖灯逐步加入蓝青。工坊到展街有玻璃顶连廊，设备渐少、灯柱/绿植/展架渐多。展街有展馆立面/3作品橱窗/廊架/城市灯光，不用旧大山+三个空色框充数。
- 终点验收实际走到右端停留/回头：栏杆/长椅/树木/远景组成观景平台，道路在场景设计中收尾，不是平板突然截断。保留之前Raycaster全旅程前后景地面/0.035鞋底测试、按钮对比、城镇石板与起点外观，允许测试按扩展长度采样而非硬绑旧66终点。
- 三视口1440×900、390×844、844×390，至少实际看起点、两交界、技能板、作品板、终点及详情；两交界各停留并往返3次，URL/canvas不变、无瞬移黑屏，逐渐变化必须包含布景而非只换天空色。截图哈希或几何节点名字不能替代视觉验收。
- 真实浏览器用原ego-browser/helper，旅程采用有界公开提示/场景观察而非固定时长回到某位置，finally释放键盘/触屏。不能注入window状态、传送人物、改速度方便测试。应在真实静态构建中走完全程/查看详情/故障恢复，不仅开发页。
- 原tests/browser.ts、portfolio-playable.test.ts、character-toggle.test.ts、character.test.ts、character-design.test.ts、htmlPlugin/reference/public-assets测试冻结，复跑。App/运行时修改仍需保持动态图形加载隔离，失效不阻断资料，看板摘要不能引入打包图片。
- 所有生产和测试写入必须在files内；为工程准确需要扩大范围时先报告，不擅自加文件或改依赖/元信息/部署/旧game。结构化结果区分真实Red、Green、实际视觉证据与尚未完成项。
- 完成完整frontmatter verify与类型检查，清理dist/测试日志/截图/自行启动的预览服务，保留现有3000开发服务；停止在M2确认，不推进M3、不发布、不把旧测试PASS作为本轮放行依据。
