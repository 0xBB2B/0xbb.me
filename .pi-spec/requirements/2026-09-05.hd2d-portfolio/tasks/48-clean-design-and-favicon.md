---
id: T-48
title: 清理临时设计目录并更新MC-2D图标
depends_on: [T-32, T-47]
files: [design-reference/, portfolio/models/player-voxel.ts, portfolio/models/player-voxel-black.ts, portfolio/models/player-voxel.test.ts, portfolio/character.ts, tests/portrait-asset.test.ts, tests/portfolio-avatar-models.test.ts, tests/portfolio-reading.test.ts, tests/legacy-removal.test.ts, tests/favicon.test.ts, favicon.svg, README.md, artifacts/game-progress.md, artifacts/release-report.md]
refs: [portfolio/site-entry/AC-2, portfolio/site-entry/AC-5, portfolio/player/AC-1, portfolio/player/AC-11]
parallel: false
verify: bun run build && bun test ./portfolio/models/player-voxel.test.ts ./portfolio/character.test.ts ./tests/portfolio-avatar-models.test.ts ./tests/portrait-asset.test.ts ./tests/legacy-removal.test.ts ./tests/favicon.test.ts ./public-assets.test.ts ./plugins/htmlPlugin.test.ts ./tests/portfolio-release.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-sprint.test.ts ./tests/portfolio-appearance.test.tsx && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "USER-088至090；先将此前已验收成果提交eb98e17，再整体清理design-reference。两个生产模型源码原字节迁移，当前服装/NPC模型与画像校验迁出；临时预览、图片和GLB删除。新SVG灯塔图标通过16/32px渲染和构建引用验证。86 pass、0 fail、5717断言，build/tsc通过；生产JS/CSS与画像字节未变。此轮清理与favicon尚未再次提交，不推送/发布。"
---
## 已执行
- 当前成果先独立提交为eb98e17。
- 删除整个design-reference目录：旧场景/过渡方案、角色临时预览、对比截图、参考图片、GLB导出及它们的专属检查。
- player-voxel.ts和player-voxel-black.ts仍被正式黑装主角使用，原样迁到portfolio/models/，只调整portfolio/character.ts的导入路径。
- 有效的主角几何/颜色/尺寸/接地检查迁到portfolio/models/player-voxel.test.ts；A/B模型检查迁到tests/portfolio-avatar-models.test.ts，资料人设原字节检查迁到tests/portrait-asset.test.ts。
- 清理临时页面专属导航和导出测试，不删除正常NPC对话、换装、快跑及阅读断言。历史任务的可执行verify命令更新为有效路径。
- favicon.svg重建为64×64纯SVG方块灯塔：深蓝背景、暖色灯光、青蓝海浪；无图片纹理、滤镜、外部资源、脚本或闪烁动画。
- 正式public/profile-full.png不动，OneDrive原始图片不动。public中用户未选的profile.png/profile.jpg仍不发布，本次未扩大删除到这些文件。

## 验证与范围证明
- 先建立临时目录/旧文件不存在和新主题favicon断言，原实现产生Red，再修改。
- 两个生产模型源码迁移前后SHA256一致：
  - player-voxel.ts：b39748b4d37a12c8b4a82d9cf1ba3099d7fc905edc074d85b0e451035c2fcbef
  - player-voxel-black.ts：602ebdd4a17f3a0c73f4af00916b67c6f8e89f9476c510f6ab7580a771baf1c5
- 清理前后11个生产构建文件逐字节校验，仅favicon及index.html中的图标引用变化；主程序JS、CSS、人设图及其它发布资源不变。
- 新favicon在16/32px保留塔身、暖色灯光和海面色块，16/32/64px明暗背景预览已检查；生产HTML指向新SVG且原字节一致。
- 86项相关测试通过（5717断言、12文件），含无窗口真实阅读/双语/换装/快跑检查；构建、类型检查、diff格式检查通过。
- 未新增依赖，未改玩法或场景画面，不启动ego或抢前台；临时截图/校验清单/日志/dist清理，原3000服务保留。
