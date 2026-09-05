---
id: T-16
title: M3 移除光剑组件与设备占位
depends_on: [T-15]
files: [/Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberGame.tsx, /Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberPlaceholder.tsx, /Users/bb/Projects/0xbb.me/components/beat-saber/ui-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/beat-saber/ui-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 删除旧光剑渲染/交互主组件和要求桌面游玩的占位组件。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberGame.tsx`、`/Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberPlaceholder.tsx`。
- 新建 `/Users/bb/Projects/0xbb.me/components/beat-saber/ui-removal.test.ts`。
## 6. 函数清单
删除 BeatSaberGame、BeatSaberPlaceholder、PixelCube 及本文件内部游戏实现；无替代生产函数。
## 7. 协作关系
唯一挂载入口由 T-15 删除，本任务不得把旧场景/音频函数搬到新 portfolio。新 UI 已由 T-6/T-7/T-9 交付。
## 8. 验证方式
- 测试写入授权：M3 获授权后，仅新增或修改 `/Users/bb/Projects/0xbb.me/components/beat-saber/ui-removal.test.ts`；测试阶段不得删除生产文件或修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./components/beat-saber/ui-removal.test.ts && bun run build`。
- 公开文件交付目标：`/Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberGame.tsx` 与 `/Users/bb/Projects/0xbb.me/components/beat-saber/BeatSaberPlaceholder.tsx` 均应不存在；浏览器通过 `/`、`/game/` 检查游戏和设备占位已移除，不以实现关键词作为页面证据。
- 两个指定组件消失且 build 成功；测试先对其存在报业务红灯，删除后通过。
- 静态浏览器 / 与 /game/ 均不呈现旧组件及桌面专用游戏占位，不下载光剑主组件，不播放旧音频。
- 在触屏视口进入新主页能移动及交谈，不因删除旧占位阻断探索；构建中无旧光剑 UI 产物。最终完整复核由 T-24 执行。
