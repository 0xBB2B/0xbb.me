---
id: T-40
title: M2 侧门与视图隔离、首次切换及后两章光影细化
depends_on: [T-39]
files: [portfolio/journey.ts, portfolio/world.ts, portfolio/runtime.ts, portfolio/instances.ts, portfolio/scenes/room.ts, portfolio/scenes/workshop.ts, portfolio/scenes/gallery.ts, portfolio/scenes/ambient.ts, portfolio/scenes/exterior.ts, portfolio/scenes/sea-surface.ts, components/portfolio/WorldViewport.tsx, components/portfolio/WorldViewport.css, index.css, portfolio/room.test.ts, tests/portfolio-room.test.ts, tests/portfolio-room-layout.test.ts, tests/portfolio-room-performance.test.ts, tests/portfolio-ultrawide.test.ts, tests/portfolio-graphics.test.ts, tests/portfolio-ambient.test.ts, tests/portfolio-atmosphere.test.ts, artifacts/game-progress.md, artifacts/final-evidence.md]
refs: [portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-5, portfolio/world/AC-6, portfolio/world/AC-7, portfolio/world/AC-8, portfolio/world/AC-9]
parallel: false
verify: bun run build && bun test ./tests/portfolio-room-performance.test.ts ./tests/portfolio-ultrawide.test.ts ./tests/portfolio-graphics.test.ts ./tests/portfolio-ambient.test.ts ./tests/portfolio-room-layout.test.ts ./portfolio/room.test.ts ./tests/portfolio-room.test.ts ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./tests/portrait-asset.test.ts ./portfolio/character.test.ts ./portfolio/models/player-voxel.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "实现和技术验证完成，后两章视觉仍待用户确认。最终完整verify为163 pass、0 fail、4524断言；静态房间/首次切换/超宽屏复验3项通过。首出门3秒采样最大帧间隔由1033.4ms降至50.6ms；不宣称60FPS。初版异步预编译在React销毁时产生isReady错误，改为可取消的分阶段预绘制后冻结回归全过。室内/海岸非暂停帧序列、三视口/超宽屏已实看；资源预算和skill检查器缺依赖限制详见artifacts/final-evidence.md。未提交或发布。"
---
## 目标与保持
- 合并USER-052至056连续反馈，第一章小镇和人物不重做，作为画面质量参照。
- 门放左右侧墙、垂直屏幕；约2.6宽上卷门收在门框内，路线在门口收窄但连续贯通房间。
- 真正跨门才切换室内/室外；仅打开门不提前露出另一侧。保留双语、终端、项目星星、阅读暂停和返回。
- 最后星星x61到终点从19减至9.5单位，终点70.5、木板尽头71.5，灯塔前移。
- 首次卡顿先实测，再于加载阶段按真实可见场景准备GPU程序与首次绘制；加载期资料可读，销毁/刷新能中断预热。

## 画面与工程
- 外部改为砖石基座、结构柱、拱窗和三段坡屋顶的厂房；补齐屋外地面，不再在海边暴露竖直空缺色块。
- 海面使用连续程序化波纹、月光/灯塔反光、近岸荧光、远处雾化；不接收建筑巨大矩形阴影。
- 项目用小星核和空间渐隐光芒，删除扁平五角徽章/同心圆；名称和链接不改。
- 室内低矮流水线含运动物料、滚轮、巡检臂；海岸间歇流星、旋转光束和反光，支持减少动态。
- 超宽视野居中限制2.4:1，普通三视口不改变缩放；3440×1440、5120×1440实测。
- 重复砖块、栏杆、键帽、机柜槽位和传送带批量绘制；保留需要定位/交互的独立模型节点。
- 使用已安装Three.js production skills及图形参考；RoomEnvironment/PMREM来自现有three依赖，仅运行时生成环境光，不引入图片素材、依赖或付费生成。

## 验收证据
- 新Red：门面方向为屏幕正面、缺少室内地板、开门前能见内部；后续验证卷帘全过程不横扫、门槛支撑、严格场景隔离。
- first-door性能测试通过真实行走采集两次3秒序列，不剔除慢帧，局部最长帧小于250ms；非M3的30秒性能验收。
- 浏览器真实开两门、八内容阅读、双语、图形故障、尺寸变化、回程、灯塔终点；未传送或更改移动速度。
- 最终完整命令与静态测试通过；原人物和阅读测试没有删减以躲避失败。
- 实看1440×900、390×844、844×390、5120×1440画面，以及36秒流水线、33.2秒灯塔/海面动态序列。
- 标准canvas inspector缺少@playwright/test，未擅自安装；用ego-browser和DevTools只读诊断补足实操/资源证据，不伪造标准像素指标或AAA评级。
- 仅保留文字交付记录，临时截图、日志、dist和自启4173预览清理；保留原3000服务、用户已有对比页及用户截图。
