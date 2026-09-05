---
id: T-4
title: M1 黄昏城镇与迎宾者
depends_on: [T-1, T-3]
files: [/Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.test.ts]
refs: [portfolio/world/AC-2, portfolio/npc-dialogue/AC-1, portfolio/npc-dialogue/AC-3]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/scenes/town.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
交付一个有纵深、暖光和迎宾者的实际城镇片段，作为 M1 唯一场景。
## 2. 业务规则
- world/C-2：系统应展示 HD-2D 世界，其中像素人物位于立体布景中，道路、前景和远景具有可见纵深，场景物体具有明暗面与落地阴影；黄昏城镇以暖光为主，科技工坊具有蓝色科技细节，星夜展街呈现夜色展览环境。
- npc-dialogue/C-1：当主人公进入 NPC 交谈范围时，系统应显示该 NPC 的交谈提示；离开范围时撤去提示，单纯靠近不得自动打开对话。
- npc-dialogue/C-3：系统应通过迎宾者介绍 FUBUKI_BB 的全栈工程、系统架构与 AI 工作流背景，通过工坊导师介绍 AI、Harness Engineering、Context Engineering、Prompt Engineering、Go、Docker / K8s 共 6 项技能，通过策展人介绍 0xbb.me、bb-spec、pi-subagent-cluster 共 3 个作品并提供相应作品与源码入口。
### world/AC-2 立体布景与场景辨识 ← C-2
- 触发: 操作 在三个场景分别行走、停下并观察画面。
- Given: 三个场景均可访问，图形加载成功。
- When: 访客在每处观察主人公、道路、近处道具和远景。
- Then: 可见清晰像素人物、立体物体明暗面与落地阴影、前中后景层次；三个场景分别可辨认暖光城镇、蓝色设备工坊和星夜展览环境，而非单张平面背景加滤镜。
### npc-dialogue/AC-1 交谈提示不强制弹出 ← C-1
- 触发: 操作 靠近一位 NPC，停留后不交谈并走开。
- Given: 主人公尚在该 NPC 交谈范围外。
- When: 访客走近、停留，再离开。
- Then: 范围内显示提示但不自动弹出介绍，离开后提示消失。
### npc-dialogue/AC-3 三段介绍覆盖 ← C-3
- 触发: 操作 与三个场景的 NPC 分别交谈并阅读全部段落。
- Given: 三个场景与 NPC 均可访问。
- When: 访客阅读迎宾者、工坊导师与策展人的完整介绍并检查作品入口。
- Then: 分别覆盖 FUBUKI_BB 的背景、列出的 6 项技能和 3 个作品；作品与源码入口分别对应所介绍项目，不出现未经确认的个人履历。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts`：几何布景、场景范围、迎宾者位置与双语段落。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/scenes/town.test.ts`。
## 6. 函数清单
- town.ts：createTown，提供可渲染城镇、道路与 NPC；公开场景描述和双语台词。
## 7. 协作关系
依赖 T-1 事实与 T-3 几何，输出给 world 的静态场景发现。场景只有城镇，不实现 workshop/gallery 空模块；不引用 world 形成循环。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/portfolio/scenes/town.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/scenes/town.test.ts`。
- 公开验证入口：`portfolio/scenes/town.ts` 的 createTown 及其场景描述、双语介绍输出；集成后的网页入口为 `/`。预期为黄昏城镇、连通道路和迎宾者，不要求或预制另外两个场景。
- 公开场景构造入口：得到正长度连通道路、分离的前中远景和暖色照明信息、迎宾者与至少两个可切换的中英介绍段落，资料与 getProfile 一致。
- 无纹理或位图卡片；不存在城镇以外提前制作的场景内容。必要构造失败向调用方报错，不吞错为空白世界。
- ego-browser 在组装主页中接近、停留、离开迎宾者：提示出现/消失、无自动对话；分别阅读中英背景，不虚构经历。
- 录制城镇明暗面、落地阴影与层次交用户确认。world/AC-2、npc-dialogue/AC-3 本任务仅覆盖城镇部分，T-14 负责三场景最终覆盖。
