---
id: T-47
title: 静态场景合批与静默浏览器验证
depends_on: [T-46]
files: [portfolio/static-batches.ts, portfolio/runtime.ts, tests/portfolio-static-batches.test.ts, tests/portfolio-batch-visual.test.ts, tests/headless-browser.ts, tests/browser.ts, tests/browser-harness.test.ts, tests/character-toggle.test.ts, tests/portfolio-atmosphere.test.ts, tests/portfolio-boards.test.ts, tests/portfolio-chapters.test.ts, tests/portfolio-delivery.test.ts, tests/portfolio-dialog-horizon.test.tsx, tests/portfolio-journey.test.ts, tests/portfolio-overview-layout.test.ts, tests/portfolio-outfit-journey.test.ts, tests/portfolio-persona.test.tsx, tests/portfolio-playable.test.ts, tests/portfolio-reading.test.ts, tests/portfolio-room-performance.test.ts, tests/portfolio-room.test.ts, tests/portfolio-sprint.test.ts, tests/portfolio-ultrawide.test.ts, tests/portfolio-performance.test.ts, README.md, artifacts/performance-optimization.md, artifacts/scenery-batch-comparison.json, artifacts/release-performance.json, artifacts/game-progress.md, artifacts/release-report.md]
refs: [portfolio/graphics-runtime/AC-4, portfolio/world/AC-2, portfolio/player/AC-5]
parallel: false
verify: bun run build && bun test && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "USER-087重载后当前Chrome MCP确认无窗口；全部项目浏览器测试迁移为独立无窗口Chrome，原操作和断言保留。最终206 pass / 0 fail，9017断言、41文件，build/tsc通过；30秒三景P95 16.7ms、最大16.8ms。静态像素比较通过，不把跨浏览器差异算成优化收益。不再调用ego，不抢焦点，未提交/推送/上线。"
---
## 实现与边界
- 仅不变的场景方块按材质/颜色、阴影属性和空间区域合批，1324个方块变为32组；人物/NPC/门/流水线/特效不合批。
- 几何边界、颜色、材质、阴影和灯光不变；被动画对象共享的资源不释放，空批次几何清理。
- 三场景三视口像素比较存入scenery-batch-comparison.json；绘制降低且像素变化小于0.02%测试门槛。
- 保留全部性能尝试，包括失焦未完成旅程和超标结果。新独立Chrome同环境对照分别约10.9/10.8ms，不把早期ego50ms差异算成优化收益。
- 用户要求所有浏览器静默后台：测试不得执行open-a激活浏览器或Page.bringToFront；自启Chrome使用临时资料目录和headless，已验证HeadlessChrome与退出清理。
- chrome-devtools全局配置为--headless/--isolated；用户重载后，当前工具连接也已验证HeadlessChrome。
- 项目所有浏览器测试统一使用tests/headless-browser.ts，不调用ego应用，也不提供有窗口回退。去掉任务空间/旧导航助手依赖，以真实Chrome调试协议执行相同页面操作与断言；每次测试新建并销毁临时资料目录。
- 测试驱动本身验证HeadlessChrome、可信输入事件、真实网络事件、跨测试存储隔离及失败清理；焦点模拟可关闭，专门验证真实页面失活（blur/visibilitychange）仍能清理应用输入。
- 无窗口完整验收已通过；所有失败/前台/无窗口采样均按记录区分，不能把有窗口历史测量标为无窗口实测。
- 临时CPU采样、截图、日志、dist和自启4173清理；用户原3000和日常浏览器窗口不操作。
