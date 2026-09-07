---
id: T-31
title: M3 删除旧节奏游戏及孤立依赖
depends_on: [T-30]
files: [/Users/bb/Projects/0xbb.me/game/index.html, /Users/bb/Projects/0xbb.me/game/main.tsx, /Users/bb/Projects/0xbb.me/game/audioAnalysis.ts, /Users/bb/Projects/0xbb.me/game/audioAnalysis.test.ts, /Users/bb/Projects/0xbb.me/game/chart.ts, /Users/bb/Projects/0xbb.me/game/chart.test.ts, /Users/bb/Projects/0xbb.me/game/judge.ts, /Users/bb/Projects/0xbb.me/game/judge.test.ts, /Users/bb/Projects/0xbb.me/game/scoring.ts, /Users/bb/Projects/0xbb.me/game/scoring.test.ts, /Users/bb/Projects/0xbb.me/game/chiptune.ts, /Users/bb/Projects/0xbb.me/game/types.ts, /Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberGame.tsx, /Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberPlaceholder.tsx, /Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.ts, /Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.test.ts, /Users/bb/Projects/0xbb.me/constants.tsx, /Users/bb/Projects/0xbb.me/types.ts, /Users/bb/Projects/0xbb.me/hooks/useMediaQuery.ts, /Users/bb/Projects/0xbb.me/lib/scrollToAnchor.ts, /Users/bb/Projects/0xbb.me/public/music.ogg, /Users/bb/Projects/0xbb.me/package.json, /Users/bb/Projects/0xbb.me/bun.lock, /Users/bb/Projects/0xbb.me/tests/legacy-removal.test.ts]
refs: [portfolio/site-entry/AC-3, portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./tests/legacy-removal.test.ts && bun run build
status: todo
agent: ""
commit: ""
note: ""
---
## 1. 目标
在M3获授权后删除已被新体验取代的旧光剑实现和孤立依赖，不扩大到无关代码或升级平台。
## 2. 业务规则
- site-entry/C-3：系统应通过命令 bun run build 生成可静态托管的页面与资源；访客浏览主页、交谈、切换语言和打开速览不需要账号、服务端存档或独立后端应用。
- site-entry/C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### site-entry/AC-3 纯静态构建 ← C-3
- 触发: 命令 bun run build，并通过静态服务打开构建结果。
- Given: 已安装项目约定依赖，构建环境可用。
- When: 执行构建，再仅用静态服务访问主页、NPC 对话、语言切换和资料速览。
- Then: 构建退出码为 0；上述功能无需独立后端应用、登录或服务端存档即可使用。
### site-entry/AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- files 中列明所有授权路径；不存在则新建，已存在则仅为本行为修改，明确淘汰项删除。测试只由测试角色修改，生产代码只在可信 Red 后实现。
## 6. 函数清单
- 移除已列明的game、beat-saber、旧资料适配、旧锚点与设备占位相关生产功能和专属测试。
- package与锁文件仅移除失去有效消费者的motion及其专属传递依赖，其它解析版本不变。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun test ./tests/legacy-removal.test.ts && bun run build`。
- 测试授权：仅新增或修改tests/legacy-removal.test.ts，并删除明确淘汰的game/audioAnalysis.test.ts、game/chart.test.ts、game/judge.test.ts、game/scoring.test.ts、components/beat-saber/sceneAssets.test.ts；不删除其它有效测试，不改生产代码。
- 独立删除目标（仓库根相对路径）：game/index.html、game/main.tsx、game/audioAnalysis.ts、game/chart.ts、game/judge.ts、game/scoring.ts、game/chiptune.ts、game/types.ts、components/beat-saber/BeatSaberGame.tsx、components/beat-saber/BeatSaberPlaceholder.tsx、components/beat-saber/sceneAssets.ts、constants.tsx、types.ts、hooks/useMediaQuery.ts、lib/scrollToAnchor.ts、public/music.ogg；这些交付文件应不存在，不读取旧实现反推期望。
- 公开结果：依赖清单与锁解析中无人消费的motion移除，其它解析版本不变，冻结锁安装和build通过；网页 / 与 /game/ 均不能启动或下载旧光剑/音乐。music.ogg是初始删除，不恢复制造Red。
- Red针对尚存在的明确删除目标或旧游戏可运行行为；已通过的构建/入口行为不得故意破坏。新主页探索、NPC、双语、速览仍正常，发现活跃消费者先报告主agent，不用兼容层隐藏未清理代码。
