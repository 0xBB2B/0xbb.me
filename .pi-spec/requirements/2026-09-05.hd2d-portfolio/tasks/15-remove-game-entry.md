---
id: T-15
title: M3 移除旧游戏页面入口
depends_on: [T-10]
files: [/Users/bb/Projects/0xbb.me/game/index.html, /Users/bb/Projects/0xbb.me/game/main.tsx, /Users/bb/Projects/0xbb.me/game/entry-removal.test.ts]
refs: [portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./game/entry-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 授权后删除旧游戏 HTML 与 React 挂载，不让 /game/ 启动节奏光剑。
## 2. 业务规则
- C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/game/index.html`、`/Users/bb/Projects/0xbb.me/game/main.tsx`。
- 新建 `/Users/bb/Projects/0xbb.me/game/entry-removal.test.ts`。
## 6. 函数清单
删除 GamePage 与独立 React 挂载；不新增生产函数、重定向页面或替代游戏。
## 7. 协作关系
T-10 已移除构建输入，后续 T-16 才清组件；本任务不修改 vite 配置或 App。纯静态服务对未知路径可 404 或回退主页，规则只要求不能启动旧游戏，不擅自增加响应状态契约。
## 8. 验证方式
- 删除结果两个指定入口不存在；构建退出 0、dist 中无独立 game 页面，测试红灯须因入口仍存在而非工具失败。
- 用 ego-browser 请求静态构建 /game/：不出现旧游戏 UI、光剑画面或旧游戏音频/代码请求；检查主页导航与项目操作无启动入口。
- 根页仍能进入探索、交谈、切语言和速览。不要以搜索源码中的游戏名替代浏览器行为；完整产物验证由 T-24 复核。
