---
id: T-42
title: M2 原住民NPC世界观、参考造型与主角称谓
depends_on: [T-41]
files: [data.ts, metadata.json, portfolio/copy.ts, portfolio/scenes/greeter.ts, portfolio/scenes/town.ts, tests/portfolio-lore.test.tsx, tests/portfolio-npc-design.test.ts, tests/portfolio-reading.test.ts, tests/portfolio-journey.test.ts, artifacts/copy-research.md, artifacts/game-progress.md]
refs: [portfolio/npc-dialogue/AC-3, portfolio/npc-dialogue/AC-4, portfolio/npc-dialogue/AC-6, portfolio/profile-overview/AC-1]
parallel: false
verify: bun run build && bun test ./tests/portfolio-npc-design.test.ts ./tests/portfolio-lore.test.tsx ./tests/portfolio-content.test.ts ./tests/portfolio-dialog-horizon.test.tsx ./tests/portfolio-room-performance.test.ts ./tests/portfolio-ultrawide.test.ts ./tests/portfolio-graphics.test.ts ./tests/portfolio-ambient.test.ts ./tests/portfolio-room-layout.test.ts ./portfolio/room.test.ts ./tests/portfolio-room.test.ts ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./design-reference/scene-comparison.test.ts ./design-reference/transition-comparison.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "2026-09-09完成USER-061至063。NPC旧围裙/帽子模型建立Red后替换为参考造型；世界观与主角资料分离。完整verify为173 pass、0 fail、5360断言，build/tsc成功；静态4173实际检查三视口NPC、三页英文世界观、中文重读、速览新称谓。原主角模型/小镇建筑未改，原参考图未复制到发布目录。临时截图/日志/dist/自启预览清理，保留3000。未提交或发布，待用户确认造型。"
---
## 目标
- 主角个人资料称谓为“AI Agent开发者 / AI Agent Developer”，页面元信息同步。
- 玩家控制的主角是FUBUKI_BB；NPC是世界原住民，不自称FUBUKI_BB。
- NPC弹窗标题为“世界观 / World lore”，署名为“NPC · 迎宾者 / NPC · GREETER”。
- 三页内容分别讲“小镇与长路、门后的工厂、星海与归航”；不再包含身份与地点、全栈与系统、AI工作流履历标题或职业/城市自我介绍。
- 个人职业、地点和工程方向保留在资料速览中，技能及项目介绍不受影响。

## NPC造型
- 参考用户提供的 `/Users/bb/Library/CloudStorage/OneDrive-个人/图片/精选/Type-BB Mark VII.png`，原图未改动。
- 独立方块几何：银白短发、蓝眼、冰蓝双角、浅蓝短外套与黑短裤、不对称长袜、靴子、机械脊柱与分节尾巴、腰侧六枚翼片。
- 保留原迎宾x2/z-0.72站位与0.035脚底；不引入人物位图、SVG、外部付费生成或新依赖。
- 复用材质和方块几何，NPC无新增自动动画，不改变原主角外观、步态、操作速度、建筑布局或灯光。

## 验证
- 新角色单测检查参考特征、独立身份、方块几何、接地和无纹理，不再要求旧围裙/帽子。
- 文案单测和SSR检查三页世界观无主角履历，速览仍保留主角身份与新称谓。
- 原三视口交談、重读、分页、暂停、双语、速览、八内容旅程、故障、无位图及主角测试完整复跑。
- 实际截图检查NPC与主角可分辨；静态页面阅读三页故事并切换到中文重读、检查速览新角色。
- 清理本轮临时文件和预览服务，原用户OneDrive参考图与原有3000服务保留。
