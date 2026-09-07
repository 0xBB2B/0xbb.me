---
id: T-29
title: M1 人物素材受控的静态样板与故障阅读
depends_on: [T-28]
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/index.css, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.css, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.css, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/vite.config.ts, /Users/bb/Projects/0xbb.me/index.html, /Users/bb/Projects/0xbb.me/metadata.json, /Users/bb/Projects/0xbb.me/plugins/htmlPlugin.ts, /Users/bb/Projects/0xbb.me/public/site-card.svg, /Users/bb/Projects/0xbb.me/public/profile-full.png, /Users/bb/Projects/0xbb.me/design-reference/profile-full.png, /Users/bb/Projects/0xbb.me/public/profile.png, /Users/bb/Projects/0xbb.me/public/profile-cyber.png, /Users/bb/Projects/0xbb.me/plugins/htmlPlugin.test.ts, /Users/bb/Projects/0xbb.me/public-assets.test.ts, /Users/bb/Projects/0xbb.me/design-reference/reference.test.ts,  /Users/bb/Projects/0xbb.me/tests/portfolio-delivery.test.ts]
refs: [portfolio/graphics-runtime/AC-1, portfolio/graphics-runtime/AC-2, portfolio/graphics-runtime/AC-3, portfolio/bilingual/AC-4, portfolio/profile-overview/AC-6, portfolio/responsive-layout/AC-2, portfolio/responsive-layout/AC-3, portfolio/responsive-layout/AC-4, portfolio/site-entry/AC-1, portfolio/site-entry/AC-2, portfolio/site-entry/AC-3, portfolio/site-entry/AC-5, portfolio/site-entry/AC-6]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: bc99254e-f286-45ca-9ae9-d48f371405d0
commit: ef8381d34a1bdae1f8d5372ad87816eb1a09de73
note: "AI-034返修bc99254e正常完成且red-green PASS；主agent最终完整verify为115 pass/2911断言，build与tsc成功。实际静态站390×844的NPC第2页触发真实上下文丢失，中英文说明均在唯一dialog内可见且顶层命中，刷新恢复英文起点。已清理孤立故障样式和无关导入写法；USER-040已确认M1样板，允许保存当前成果；不自动执行T-30，不将M1确认当整站accepted。"
---
## 1. 目标
交付真实可运行的单城镇M1静态样板，完成双语故障阅读、三视口及矢量/几何图形内容检查，停止等待用户视觉与手感确认。
## 2. 业务规则
- graphics-runtime/C-1：在图形尚未加载完成期间，系统应显示加载状态和可用的资料速览入口，不要求等待游戏就能阅读资料。
- graphics-runtime/C-2：如果浏览器不能初始化图形或必要场景、角色资源加载报错，系统应展示明确的图形不可用说明和完整资料，不停留在只有加载提示或空白的页面。
- graphics-runtime/C-3：如果运行期间图形失效，系统应停止依赖图形的探索并提供资料阅读；访客刷新后图形能力和必要资源恢复正常时，可重新从起点探索。
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
### graphics-runtime/AC-3 运行失效与刷新恢复 ← C-3
- 触发: 操作 在探索期间使图形上下文失效，恢复条件后刷新。
- Given: 主人公已离开起点，随后模拟运行中的图形失效。
- When: 访客查看故障状态，再在支持图形且资源可用的条件下刷新。
- Then: 失效时仍能阅读资料；刷新后恢复可操控世界，主人公从起点开始，不尝试恢复失效前存档。
- bilingual/C-4：如果图形不可用，系统仍应允许切换中文与英文，故障说明和完整资料采用所选语言，链接仍可使用。
### bilingual/AC-4 故障阅读仍可切换 ← C-4
- 触发: 操作 在图形不可用的主页上切换中文与英文。
- Given: 浏览器不支持所需图形能力，或必要图形资源加载报错，已显示资料。
- When: 访客切换语言并打开一个作品或联系入口。
- Then: 两种语言的故障说明与完整资料均可阅读，外链仍指向对应目标，不依赖游戏恢复。
- profile-overview/C-6：如果图形不可用，系统仍应展示相同的简介、6 项技能、3 个作品及 4 个联系入口，不能要求先恢复游戏才能阅读或使用外链。
### profile-overview/AC-6 图形故障仍可阅读 ← C-6
- 触发: 操作 禁用所需图形能力或使必要图形资源报错后访问主页。
- Given: 浏览器能加载个人资料，但图形不可用。
- When: 访客阅读资料并检查作品和联系入口。
- Then: 简介、6 项技能、3 个作品、4 个联系入口仍完整可用，不要求恢复游戏或前往 NPC。
- responsive-layout/C-2：在触屏操作期间，系统应提供可触达的左右行走按钮和交谈操作；在桌面操作期间，系统应提供 A/D 或左右方向键行走及 E 交谈的说明。
- responsive-layout/C-3：在任一指定视口下阅读 NPC 对话或资料速览期间，系统应允许读到全部正文，并能激活翻页、关闭和语言切换操作，不因正文长度而裁掉必要操作。
- responsive-layout/C-4：如果访客在探索或阅读中改变窗口尺寸或手机方向，系统应重新适配布局，保持主人公位置和已打开的阅读内容，不将其重置到起点。
### responsive-layout/AC-2 对应设备操作 ← C-2
- 触发: 操作 在桌面检查说明，在触屏模式使用左右与交谈控件。
- Given: 三种指定视口均可访问，手机视口使用触屏输入。
- When: 桌面访客根据说明操作，触屏访客通过屏幕按钮走到 NPC 旁并交谈。
- Then: 两类访客均可移动和交谈；触屏不出现要求改用桌面才能探索的占位说明。
### responsive-layout/AC-3 双语长内容可读 ← C-3
- 触发: 操作 在三种视口分别阅读中文和英文 NPC 对话与完整资料速览。
- Given: 介绍包含所有技能、作品和联系方式。
- When: 访客浏览全部正文并使用翻页、语言切换与关闭操作。
- Then: 所有正文可读，必要时可在阅读区域滚动；必要操作不被屏幕边缘裁切，两种语言均可完成阅读和关闭。
### responsive-layout/AC-4 改变显示区域 ← C-4
- 触发: 操作 在道路中段和对话打开时改变窗口尺寸，并在手机竖横屏之间切换。
- Given: 主人公已离开起点，对话测试使用已打开的非首段内容。
- When: 访客改变显示区域后继续操作。
- Then: 布局适配新的显示区域，主人公仍在原位置，对话仍显示原段落，操作入口仍可用。
- site-entry/C-1：当访客打开 / 时，系统应默认加载探索世界，显示个人身份和操作引导，并提供无需行走即可进入的资料速览入口。
- site-entry/C-2：系统应使用包含 FUBUKI_BB 的个人主页标题及与工程、AI 工作流和探索个人主页相符的页面说明，不以节奏光剑游戏作为站点身份或介绍。
- site-entry/C-3：系统应通过命令 bun run build 生成可静态托管的页面与资源；访客浏览主页、交谈、切换语言和打开速览不需要账号、服务端存档或独立后端应用。
- site-entry/C-5：系统应以 Minecraft 方块三维几何呈现主人公与 NPC，人物不得使用 SVG 或图片纹理；背景、道具、特效、非人物图标及交互 UI 可使用纯矢量 SVG 或程序化几何。成品不得包含或加载 PNG、JPG 等位图素材，原始设计参考与验收截图仅为非发布材料。
- site-entry/C-6：如果本站图形以矢量、三维模型、内联数据或外部资源呈现，系统不得包含 SVG 内嵌图像、Base64 位图、外链位图或改扩展名的位图；浏览器正常屏幕栅格化不视为使用位图素材。
### site-entry/AC-1 默认探索入口 ← C-1
- 触发: 请求 GET / 并在浏览器打开该页面。
- Given: 网站构建结果已由静态服务提供，图形条件正常。
- When: 访客首次打开根地址。
- Then: 默认体验是探索世界，有个人身份、操作引导和可直接进入的资料速览，不需要先打开独立游戏页。
### site-entry/AC-2 页面身份 ← C-2
- 触发: 操作 查看根页面标题与页面说明。
- Given: 根页面已加载。
- When: 访客查看浏览器标题与对外提供的页面描述。
- Then: 标题包含 FUBUKI_BB，说明与工程、AI 工作流和探索个人主页相符，不把本站描述为节奏光剑游戏。
### site-entry/AC-3 纯静态构建 ← C-3
- 触发: 命令 bun run build，并通过静态服务打开构建结果。
- Given: 已安装项目约定依赖，构建环境可用。
- When: 执行构建，再仅用静态服务访问主页、NPC 对话、语言切换和资料速览。
- Then: 构建退出码为 0；上述功能无需独立后端应用、登录或服务端存档即可使用。
### site-entry/AC-5 矢量与几何图形成品 ← C-5
- 触发: 命令 bun run build，并检查生成的图形产物和完整页面。
- Given: 构建成功，桌面和触屏均可访问全部场景、NPC 与阅读界面。
- When: 检查构建产物的实际图形格式，操作主人公、NPC、全部场景和交互 UI，查看头像、图标与页面图形引用。
- Then: 主人公与 NPC 为无图片纹理的 Minecraft 方块三维人物，没有 SVG 人物方案；其他图形可为纯 SVG 或几何。成品无 PNG/JPG，参考图及验收截图不在发布产物中，实际行走与交互动画正常。
### site-entry/AC-6 图形容器不隐藏位图 ← C-6
- 触发: 操作 在浏览器中访问所有场景和阅读界面，检查收到的图形响应、SVG 内容、样式图形引用及内联图形数据。
- Given: 构建产物由静态服务提供，浏览器能记录本站资源请求和响应内容。
- When: 核对图形内容而非仅文件后缀，展开矢量或内联图形数据，检查本站图形的外部引用。
- Then: 图形内容不含 SVG 内嵌图像、Base64 位图、外链位图、伪装格式位图或模型图片纹理；网页不加载 PNG/JPG 等素材，不以没有图片请求替代对内联内容的检查。
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
- files 中列明所有授权路径；不存在则新建，已存在则仅为本行为修改，明确淘汰项删除。worker先在授权测试中建立真实Red，冻结断言后实现Green。
## 6. 函数清单
- runtime/WorldViewport/App：图形加载及失效反馈，资料不依赖图形成功；尺寸和语言切换不重建会话。
- vite/index/metadata/htmlPlugin：根页静态构建，去掉旧HUD模板CDN及游戏构建/元数据分支，图形引用遵守纯矢量或几何、不使用位图的边界。
- 参考与素材：原profile-full.png逐字节迁至design-reference，删除旧运行头像位图，不新建图片素材。
- 现有阅读组件与CSS：三种视口下长内容可读且必要操作可达；仅修正当前样板交付问题。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- AI-034本轮返修优先：现有故障alert在模态Overview外，390×844真实WEBGL_lose_context后被遮挡。先在tests/portfolio-delivery.test.ts增加实际可见性断言建立Red，再修说明与资料同处可见区域，不以提高普通z-index或body文字匹配掩盖问题。说明必须在视口内且不被顶层dialog遮挡，语言切换后同步可见。
- 用真实canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()触发上下文失效（不要仅dispatchEvent伪装实际图形失效），在三视口实看说明/语言/全资料。分别在NPC非首段对话和速览已打开时触发，最终仅一个活动阅读面板，停止探索/交谈，不留下两个open dialog；可读完整资料并切语言，刷新恢复起点。
- 保留原有效元信息/图形/角色/输入/阅读断言，不引用旧115项PASS当新可见性通过；补充断言只在Red阶段，随后冻结，完整verify再次通过并提交真实截图观察证据。清理测试产生的临时输出与自建服务，不关闭既有开发服务。
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit`。
- 测试授权：仅新增或修改 plugins/htmlPlugin.test.ts、public-assets.test.ts、design-reference/reference.test.ts、tests/portfolio-delivery.test.ts；tests/browser.ts及所有既有角色/行走/阅读测试只读复跑，已有测试不得弱化，复跑前两任务测试；测试不改生产文件。
- 实际公开入口为开发主页 / 与构建后静态主页；先运行真实构建和浏览器，再核对标签、资源内容及交互，不用配置字符串代替静态交付结果。
- 现有 plugins/htmlPlugin.test.ts 与 public-assets.test.ts 源自旧任务测试，归本任务，先读取并复现，不删除失败用例规避问题。
- 必要图形/角色模块加载失败、初始化失败、运行上下文丢失分别通过浏览器触发；资料/双语/外链仍可用。恢复图形条件后刷新回起点；禁止以阻断不存在的位图URL伪造失败路径。
- 加载中就能打开资料；1440×900、390×844、844×390均能操控与阅读，旋转/调整尺寸不重置位置或对话段落，全部长文可达。
- 原图迁移输入：public/profile-full.png → design-reference/profile-full.png，测试记录执行前SHA-256，目标须同字节、1696×2528 RGB PNG；不覆盖不同目标，参考图不入dist。
- 删除公开目标：public/profile.png、public/profile-cyber.png，页面不请求/profile.png或/profile-cyber.png。profile-cyber.png已在实现前删除，不恢复制造Red；music.ogg是其它任务既有删除，本任务不改动或提交。
- 检查真实构建文件魔数、网络响应、CSS/HTML/SVG引用及内联编码：所有图形均为矢量或几何，不加载人物位图或模型图片纹理，不含Base64位图或SVG包裹位图。测试截图仅在忽略的缓存作为验收证据，不作为成品。
- 检查静态根页身份FUBUKI_BB、canonical、说明及纯矢量图形引用，不能含旧游戏身份或虚构雇佣关系；不扩展额外SEO产品功能。
- 复跑实际M1移动/对话/双语/速览/故障及三视口，录制待机、行走、转向并给用户看。完整三场景及发布验收尚未完成，不以M1证据报整站accepted，不进入T-30。

- AI-033：新增public/site-card.svg仅为无人物的站点文字/几何图，用于替代旧头像分享引用。必须是真SVG无image/foreignObject/外链图片，不做SVG人物，不调整已确认的城镇/人物设计。
- profile-full.png执行前SHA256基线93112c75b439d72949250c21da06d5a6ff86be5e7211ed1ee09eb17575747a8f；目标design-reference/profile-full.png目前不存在。逐字节迁移并新增reference.test.ts验证，不覆盖不同目标、不删原始设计数据。public/profile-cyber.png已删，只按授权记录该删除；public/music.ogg保持既有未提交删除。
- 图形代码与资料UI隔离：不要静态import失败图形模块使整个App无法加载。允许现有Vite动态import图形入口，加载期间资料随时可用；场景/主角代码chunk阻断、WebGL初始化失败、运行上下文失效均显示中英说明和完整资料，先清理残余RAF/监听/输入，不能只有空白或旋转loading。
- 失效期间停用探索/交谈并释放旧输入；保持当前语言并展示同一完整资料与外链。恢复图形条件后刷新从英文起点重新开始，不自动重试或恢复存档；资料故障模式不能依赖失效canvas存在。
- 保持已有session唯一状态、NPC三页和语言语义；旋转/resize不重新创建session或重置对话。测试屏幕变化前后真实同一canvas/地标及非首段页，不用独立新标签刷新代替窗口变化。
- 静态构建以现有vite preview或静态服务独立端口访问实际dist，使用原ego-browser/helper；新增delivery测试可在内部启动/关闭静态服务或通过环境传入已有预览地址。必须实际运行dist首页交谈、翻页、语言切换、速览，不只检查配置字符串；服务器结束时正确关闭，不结束既有开发服务或系统进程。
- 现有HTML与public-assets测试先复现当前业务Red，不以构建异常、导入不存在测试模块作为Red；新增delivery/reference测试只针对当前可观测失败。Green阶段不弱化图像魔数/真实引用/个人事实/故障断言，不用忽略目录漏查构建输出。
- tests/browser.ts、tests/portfolio-reading.test.ts、tests/portfolio-playable.test.ts、tests/character-toggle.test.ts、portfolio/character.test.ts与character-design.test.ts冻结。完整verify之外应记录静态页测试访问的URL、构建产物检查及实际故障注入请求路径，必要chunk必须从实际网络识别，不拦截不存在文件伪造错误。
- 静态元信息统一FUBUKI_BB/工程/AI工作流/探索，无虚构雇主，不保留CyberDeck或RHYTHM_BLADE分支；移除game构建入口而非清理game目录，不为旧路由新增兼容壳。
- 仅files允许写入，不增加第三方依赖，不操作git/任务/台账或派工。检查失败时如实报告，不伪造结构化PASS。dist、测试日志/截图、临时服务器文件验证后清理；设计参考迁移目标和site-card.svg是交付物不是临时文件。
