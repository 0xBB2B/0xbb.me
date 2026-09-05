---
id: T-5
title: M1 连续世界与图形运行时
depends_on: [T-2, T-3, T-4]
files: [/Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/world.test.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.test.ts]
refs: [portfolio/world/AC-3, portfolio/world/AC-4, portfolio/graphics-runtime/AC-3]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/world.test.ts ./portfolio/runtime.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
运行单城镇样板，并以既定静态场景发现支持之后不改入口的连续世界扩展。
## 2. 业务规则
- world/C-3：当主人公跨越任意两个相邻场景的交界时，系统应连续跟随其位置，并逐步改变环境表现，不切换网页、不黑屏、不出现人物瞬移或道路断口。
- world/C-4：如果主人公在交界处停留或反向行走，系统应维持连续画面并允许沿原路返回，不反复触发切屏或将主人公重置到场景入口。
- graphics-runtime/C-3：如果运行期间图形失效，系统应停止依赖图形的探索并提供资料阅读；访客刷新后图形能力和必要资源恢复正常时，可重新从起点探索。
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
### graphics-runtime/AC-3 运行失效与刷新恢复 ← C-3
- 触发: 操作 在探索期间使图形上下文失效，恢复条件后刷新。
- Given: 主人公已离开起点，随后模拟运行中的图形失效。
- When: 访客查看故障状态，再在支持图形且资源可用的条件下刷新。
- Then: 失效时仍能阅读资料；刷新后恢复可操控世界，主人公从起点开始，不尝试恢复失效前存档。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/world.ts`、`/Users/bb/Projects/0xbb.me/portfolio/runtime.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/world.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/runtime.test.ts`。
## 6. 函数清单
- world.ts：loadScenes，利用 Vite 静态模块发现取得实际场景；createWorld，组合道路、NPC、光照；updateWorld，连续更新镜头与环境。
- runtime.ts：startRuntime，初始化并运行世界与角色；resize，适配显示区域；dispose，结束循环、事件和资源；对外报告加载、就绪和故障。
## 7. 协作关系
依赖 state、character 与实际场景导出；异步发现仅匹配场景生产模块，不收集相邻测试。UI 不依赖图形加载完成才挂载。角色和场景模块加载失败均可传播至 WorldViewport；采用现有 Vite/Three.js，不新增引擎、存档或自动重试。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/portfolio/world.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/runtime.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/world.test.ts ./portfolio/runtime.test.ts`。
- 公开验证入口：`portfolio/world.ts` 的 loadScenes、createWorld、updateWorld，以及 `portfolio/runtime.ts` 的 startRuntime 和对外 resize、dispose 生命周期能力。输入道路/NPC 描述、时间、尺寸及故障，观察公开场景、运行状态和回调，不以内部实现作为预期。
- 公开世界入口以测试场景描述输入相邻道路：世界坐标和 NPC 范围正确，交界前后相机与环境连续；停留、反向各 3 次无位置重置。测试夹具不是发布场景。
- 运行入口成功、场景模块失败、角色模块失败、上下文丢失：状态分别为就绪或故障；失效停止探索，dispose 后无继续帧或旧监听，重新启动从新状态起点。
- 尺寸变化不重建探索状态；状态时间驱动人物而非独立副本；M1 场景发现仅取得 town。
- M1 浏览器实际观察跟随、阴影及图形失效后资料、刷新恢复；M2 的两个交界往返与完整 AC-3/4 在 T-14/T-26 验证，不能以测试夹具宣称三景通过。
