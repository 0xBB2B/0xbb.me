---
id: T-7
title: M1 操作引导与主动对话
depends_on: [T-1, T-2]
files: [/Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.test.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.test.tsx]
refs: [portfolio/npc-dialogue/AC-2, portfolio/npc-dialogue/AC-4, portfolio/npc-dialogue/AC-5]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/Hud.test.tsx ./components/portfolio/Dialogue.test.tsx
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
提供双语键盘说明、触屏移动与主动交谈，以及可翻页、提前关闭和重读的对话。
## 2. 业务规则
- C-2：当交谈提示可见且访客按 E 或点击交谈按钮时，系统应打开对应 NPC 的介绍并暂停行走，桌面与触屏均可完成阅读。
- C-4：在介绍打开期间，系统应提供翻页和关闭操作，不要求读完才能继续探索；再次与该 NPC 交谈时仍能阅读完整介绍。
- C-5：如果没有 NPC 交谈提示，系统应忽略交谈输入，不打开远处 NPC 的介绍或空白对话；对话操作不能触发战斗、任务解锁或真实 AI 问答。
### AC-2 主动开启 ← C-2
- 触发: 操作 在交谈提示出现后分别按 E 和点击交谈按钮。
- Given: 主人公在 NPC 交谈范围内，对话尚未打开。
- When: 桌面访客按 E，触屏访客点击交谈按钮。
- Then: 两种操作均打开当前 NPC 的介绍，并暂停行走，不会打开另一场景角色的对话。
### AC-4 翻页关闭与重读 ← C-4
- 触发: 操作 翻页阅读、在未读完时关闭，随后再次交谈。
- Given: 某位 NPC 的介绍已打开。
- When: 访客翻页后关闭，重新与同一 NPC 交谈并阅读全部内容。
- Then: 可以翻页、提前关闭并恢复探索；重读不因此前已经交谈而被禁止，也不要求完成任务。
### AC-5 范围外交谈 ← C-5
- 触发: 操作 在没有交谈提示的位置按 E 或尝试交谈操作。
- Given: 主人公远离所有 NPC，未打开任何对话。
- When: 访客触发交谈输入。
- Then: 不打开远处角色或空白对话，不启动 AI 请求、战斗或任务解锁，主人公仍可正常行走。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx`、`/Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.tsx`；各自内聚组件样式，不另加样式文件。
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/Hud.test.tsx`、`/Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.test.tsx`。
## 6. 函数清单
- Hud.tsx：Hud，呈现身份、场景名、语言、速览、设备说明与触屏/交谈按钮。
- Dialogue.tsx：Dialogue，呈现当前 NPC 当前语言段落、作品链接、翻页与关闭。
## 7. 协作关系
读取 T-2 状态，发送方向/交谈/翻页/语言/速览事件；使用 T-1 copy，台词由当前场景提供，不在 UI 写 NPC 事实。角色头像与图标仅 CSS/SVG；完整 skill/project 台词由 T-14 注入，不用占位内容。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/components/portfolio/Hud.test.tsx`、`/Users/bb/Projects/0xbb.me/components/portfolio/Dialogue.test.tsx`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/Hud.test.tsx ./components/portfolio/Dialogue.test.tsx`。
- 公开验证入口：`components/portfolio/Hud.tsx` 的 Hud、`components/portfolio/Dialogue.tsx` 的 Dialogue，以及共享探索状态的公开事件入口；集成网页为 `/`。通过交谈范围、语言、页码和真实输入验证按钮及介绍结果，不读取内部算法作为预期。
- 公开组件静态输出：范围内外、打开/关闭、首段/后续/末段与两语言组合；提示、文本、页码、按钮、访问与源码目标对应当前角色，无空白介绍或位图。
- 公开事件与状态入口：E 和交谈按钮产生相同当前 NPC 对话；翻页、提前关闭、再次交谈可读全量；范围外输入无效；无 AI/战斗/解锁网络行为。
- ego-browser 联调：桌面按说明使用 A/D、左右键及 E；390×844、844×390 触屏长按方向并松开/取消，点击交谈；阅读中不能行走，关闭需重新输入。
- 双语长段落可滚动且翻页、关闭、语言始终可触达，必要按钮不被长文裁掉；M1 样板通过不替代 T-25 全量内容门禁。
