---
id: T-18
title: M3 移除谱面与音频分析
depends_on: [T-16]
files: [/Users/bb/Projects/0xbb.me/game/audioAnalysis.ts, /Users/bb/Projects/0xbb.me/game/chart.ts, /Users/bb/Projects/0xbb.me/game/audioAnalysis.test.ts, /Users/bb/Projects/0xbb.me/game/chart.test.ts, /Users/bb/Projects/0xbb.me/game/analysis-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./game/analysis-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 删除光剑专属音频分析、谱面生成及两组测试，不将其作为新站基础设施。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/game/audioAnalysis.ts`、`/Users/bb/Projects/0xbb.me/game/chart.ts`。
- 删除 `/Users/bb/Projects/0xbb.me/game/audioAnalysis.test.ts`、`/Users/bb/Projects/0xbb.me/game/chart.test.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/game/analysis-removal.test.ts`。
## 6. 函数清单
删除 analyzeAudioBuffer、analyzeOnsets、createDemoChart、createOnsetChart 及文件内专属辅助声明；无新生产函数。
## 7. 协作关系
T-16 消除了音频分析与谱面的生产消费者；T-20 负责类型与音乐尾项。无新增依赖，无其它源码修改。
## 8. 验证方式
- 四个指定旧文件均消失，删除测试在文件仍存在时必须失败；build 正常且结果不包含旧分析或谱面模块。
- ego-browser 根页与 /game/ 不出现节奏游戏、谱面加载和音频分析请求；新主页行走、语言、NPC 和速览不受影响。
- 如果任一文件有新的有效消费者，报告主 agent，不偷偷删除消费者或把分析逻辑复制到新文件。
