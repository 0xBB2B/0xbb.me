---
id: T-14
title: M2 科技工坊与星夜展街
depends_on: [T-1, T-3, T-5]
files: [/Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.test.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/npc-dialogue/AC-3]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/scenes/workshop.test.ts ./portfolio/scenes/gallery.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在用户确认 M1 视觉与手感并另行授权后，扩成三场景连续旅程和完整技能/作品 NPC 介绍。
## 2. 业务规则
- world/C-1：系统应按从左到右的顺序展示黄昏城镇、科技工坊、星夜展街，共 3 个场景；各场景至少有 1 位 NPC，分别承担背景、技能、作品介绍。
- world/C-2：系统应展示 HD-2D 世界，其中像素人物位于立体布景中，道路、前景和远景具有可见纵深，场景物体具有明暗面与落地阴影；黄昏城镇以暖光为主，科技工坊具有蓝色科技细节，星夜展街呈现夜色展览环境。
- npc-dialogue/C-3：系统应通过迎宾者介绍 FUBUKI_BB 的全栈工程、系统架构与 AI 工作流背景，通过工坊导师介绍 AI、Harness Engineering、Context Engineering、Prompt Engineering、Go、Docker / K8s 共 6 项技能，通过策展人介绍 0xbb.me、bb-spec、pi-subagent-cluster 共 3 个作品并提供相应作品与源码入口。
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
### npc-dialogue/AC-3 三段介绍覆盖 ← C-3
- 触发: 操作 与三个场景的 NPC 分别交谈并阅读全部段落。
- Given: 三个场景与 NPC 均可访问。
- When: 访客阅读迎宾者、工坊导师与策展人的完整介绍并检查作品入口。
- Then: 分别覆盖 FUBUKI_BB 的背景、列出的 6 项技能和 3 个作品；作品与源码入口分别对应所介绍项目，不出现未经确认的个人履历。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.ts`、`/Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.test.ts`。
## 6. 函数清单
- workshop.ts：createWorkshop，蓝色设备立体工坊、导师位置与六项技能中英段落。
- gallery.ts：createGallery，星夜展览立体环境、策展人位置与三个作品中英段落和链接。
## 7. 协作关系
复用 getProfile 与程序化几何，遵循 town 已建立的场景契约，由 world 静态发现，不修改已有生产文件或制造新的入口。若既定接口不足，返回主 agent，不跨任务偷改。无新增依赖或位图。
## 8. 验证方式
- 测试写入授权：仅在 M2 获授权后新增或修改 `/Users/bb/Projects/0xbb.me/portfolio/scenes/workshop.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/scenes/gallery.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/scenes/workshop.test.ts ./portfolio/scenes/gallery.test.ts && bun run build`。
- 公开验证入口：`portfolio/scenes/workshop.ts` 的 createWorkshop、`portfolio/scenes/gallery.ts` 的 createGallery 及实际三场景网页 `/`；技能、项目与链接预期来自已确认的公开资料，不从布景实现猜测预期。
- 公开场景构造入口：两段真实道路与相应 NPC，主题/排序分别为工坊技能、展街作品；材质、阴影及前中远景程序化，无位图；必要构造错误应传播。
- 公开中英台词输出：六项技能名称与 getProfile 相同；三个项目分别具有访问与源码链接、ONLINE 和准确介绍，无新增履历。
- build 后 ego-browser 从城镇走到终点、逐一阅读三 NPC；检查三个视觉主题、明暗面与落地阴影、可反向返回和两个交界连续性。两个交界各停留并往返 3 次，不跳网页/黑屏/瞬移/断路。
- 三场景任意 NPC 范围内才提示，远处 E 不开错角色；中英文后续段落可翻页、提前关闭和重读。
- 不借 M1 已完成跳过全旅程验收；无许可证据的外部图形/代码不得引入，性能专项改动须先测量定位再由主 agent 处理。
