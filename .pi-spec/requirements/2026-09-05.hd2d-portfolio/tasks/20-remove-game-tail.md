---
id: T-20
title: M3 移除旧游戏类型与音乐
depends_on: [T-17, T-18, T-19]
files: [/Users/bb/Projects/0xbb.me/game/types.ts, /Users/bb/Projects/0xbb.me/public/music.ogg, /Users/bb/Projects/0xbb.me/game/tail-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./game/tail-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 清掉旧模块失去消费者后的类型与专属音乐，不重新引入任何音频功能。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/game/types.ts`、`/Users/bb/Projects/0xbb.me/public/music.ogg`。
- 新建 `/Users/bb/Projects/0xbb.me/game/tail-removal.test.ts`。
## 6. 函数清单
无新增函数；删除旧 Note、BeatChart、Judgement、JudgeWindow 等全部专属声明。
## 7. 协作关系
T-17～T-19 已删除类型与音乐消费者；music.ogg 在规划前已有未提交删除，主 agent 先核实归属再纳入快照，不恢复、不覆盖用户改动。新测试是删除回归，不属于旧游戏运行功能。
## 8. 验证方式
- 测试写入授权：M3 获授权后，仅新增或修改 `/Users/bb/Projects/0xbb.me/game/tail-removal.test.ts`；测试阶段不得删除或恢复生产文件，不修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./game/tail-removal.test.ts && bun run build`。
- 公开文件交付目标：`/Users/bb/Projects/0xbb.me/game/types.ts`、`/Users/bb/Projects/0xbb.me/public/music.ogg` 均不存在；检查真实静态构建与网页 `/`、`/game/`。初始事实：music.ogg 在规划前已删除，不恢复它制造 Red，主 agent 在本任务执行前确认其快照与归属。
- 两个指定文件不存在；构建成功，dist 不包含 music.ogg 或旧音频内容，类型删除不引入构建错误。
- 静态浏览器打开 / 和 /game/ 无音乐下载或播放，无旧游戏启动；探索、NPC、语言和速览可用。
- 若需要其它文件清理，报告主 agent；不以脚本扫描结果直接删未声明文件。
