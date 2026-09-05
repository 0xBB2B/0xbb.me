---
id: T-21
title: M3 移除旧资料常量与展示类型
depends_on: [T-9, T-15]
files: [/Users/bb/Projects/0xbb.me/constants.tsx, /Users/bb/Projects/0xbb.me/types.ts, /Users/bb/Projects/0xbb.me/profile-adapter-removal.test.ts]
refs: [portfolio/profile-overview/AC-2, portfolio/site-entry/AC-4]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./profile-adapter-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 删除旧首页资料适配和百分比展示类型，使新资料事实只有当前公开来源。
## 2. 业务规则
- profile-overview/C-2：系统应展示 6 项技能及其等级：AI 999、Harness Engineering 99、Context Engineering 99、Prompt Engineering 99、Go (Golang) 90、Docker / K8s 85；等级不得改写为百分比熟练度。
- site-entry/C-4：如果访客请求 /game/，系统不应呈现或启动节奏光剑游戏；站内导航、作品操作入口和页面信息均不应引导访客启动该功能。
### profile-overview/AC-2 六项技能 ← C-2
- 触发: 操作 打开资料速览的技能内容。
- Given: 资料速览可访问。
- When: 访客逐项查看技能及等级。
- Then: 展示列出的 6 项技能与对应等级，数值没有被转换为百分比或删改。
### site-entry/AC-4 无节奏光剑入口 ← C-4
- 触发: 请求 GET /game/ 并检查站内导航及全部作品操作入口。
- Given: 构建结果通过静态服务提供。
- When: 访客直接请求该地址，并检查主页上的导航、作品入口与页面信息。
- Then: 该地址不会呈现或启动节奏光剑，站内也没有启动该功能的入口。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/constants.tsx`、`/Users/bb/Projects/0xbb.me/types.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/profile-adapter-removal.test.ts`。
## 6. 函数清单
删除旧 PROJECTS、SKILLS、SOCIAL_LINKS、PROFILE 适配及旧 Project/Skill 声明；不新增兼容适配。
## 7. 协作关系
T-9、T-15 已消除原 App 与 GamePage 的旧常量消费；新界面直接使用 T-1 当前资料接口。本任务不修改 data.ts 或其它组件。
## 8. 验证方式
- 测试写入授权：M3 获授权后，仅新增或修改 `/Users/bb/Projects/0xbb.me/profile-adapter-removal.test.ts`；测试阶段不得删除生产文件或修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./profile-adapter-removal.test.ts && bun run build`。
- 公开文件交付目标：`/Users/bb/Projects/0xbb.me/constants.tsx`、`/Users/bb/Projects/0xbb.me/types.ts` 不存在；公开 Overview 输出和网页 `/` 的速览仍展示业务规则规定的六项等级、作品与联系方式，不读取旧适配实现来推断预期。
- 两个指定文件消失且构建成功；公开 Overview 静态输出的 en/zh 六等级仍为 999/99/99/99/90/85，非百分比，完整作品和社交不丢失。
- 浏览器根页速览无需解锁、技能与 NPC 事实一致；/game/ 和作品入口不启动游戏。
- 活跃消费者不应存在；若发现则报告而不扩删或增加过渡适配。
