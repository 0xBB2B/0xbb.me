---
id: T-17
title: M3 移除光剑造景与音频引擎
depends_on: [T-16]
files: [/Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.ts, /Users/bb/Projects/0xbb.me/game/chiptune.ts, /Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.test.ts, /Users/bb/Projects/0xbb.me/components/beat-saber/assets-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/beat-saber/assets-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 删除失去调用者的光剑场景工厂、飞行逻辑和专属音频引擎及对应旧测试。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.ts`、`/Users/bb/Projects/0xbb.me/game/chiptune.ts`。
- 删除 `/Users/bb/Projects/0xbb.me/components/beat-saber/sceneAssets.test.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/components/beat-saber/assets-removal.test.ts`。
## 6. 函数清单
删除 sceneAssets 全部工厂与飞行函数、ChiptuneEngine；不向新世界复制其游戏玩法或声音系统。
## 7. 协作关系
T-16 已消除这些功能的生产调用者；音乐文件由 T-20 删除，不能越界修改。M1 图形使用独立 portfolio 几何，不受删除影响。
## 8. 验证方式
- 两个生产文件与指定旧测试不存在，新删除结果测试明确断言这三个路径；构建正常。
- 静态浏览器主页完整行走/交谈/速览可用，没有光剑模型、游戏音效或 BGM 请求；/game/ 不启动旧游戏。
- 检查构建模块图无本任务两个旧模块，非仅源码关键词检查；若发现新调用者，停止交主 agent 归因而不扩大删除范围。
