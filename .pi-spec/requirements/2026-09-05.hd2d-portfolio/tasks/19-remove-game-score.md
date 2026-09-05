---
id: T-19
title: M3 移除光剑判定与计分
depends_on: [T-16]
files: [/Users/bb/Projects/0xbb.me/game/judge.ts, /Users/bb/Projects/0xbb.me/game/scoring.ts, /Users/bb/Projects/0xbb.me/game/judge.test.ts, /Users/bb/Projects/0xbb.me/game/scoring.test.ts, /Users/bb/Projects/0xbb.me/game/scoring-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./game/scoring-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 一并删除互相依赖的旧判定计分模块及其测试，消除旧游戏核心残留。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/game/judge.ts`、`/Users/bb/Projects/0xbb.me/game/scoring.ts`。
- 删除 `/Users/bb/Projects/0xbb.me/game/judge.test.ts`、`/Users/bb/Projects/0xbb.me/game/scoring.test.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/game/scoring-removal.test.ts`。
## 6. 函数清单
删除 judgeHit、findHitTarget、nextCombo、scoreFor、applyJudgement、createInitialStats、accuracy、rankFor 及相关专属声明；无替代函数。
## 7. 协作关系
T-16 移除玩法消费者；两个模块在本任务一起删除，不拆成假依赖链。新介绍体验没有战斗、计分、死亡或任务解锁。
## 8. 验证方式
- 四个指定旧文件均不存在，删除结果测试与 build 通过；构建模块图无旧判定计分模块。
- 静态浏览器移动与 NPC 操作不显示连击、判定、得分、结算或战斗 UI；/game/ 不可启动旧游戏。
- 全部新主页操作仍正常；发现活跃消费者则停止交主 agent，不扩大文件列表。
