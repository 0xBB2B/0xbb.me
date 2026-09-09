---
id: T-37
title: M2 赛博朋克工坊、项目星星、海边灯塔与随物互动
depends_on: [T-30]
files: [portfolio/scenes/workshop.ts, portfolio/scenes/gallery.ts, portfolio/scenes/town.ts, portfolio/world.ts, portfolio/runtime.ts, portfolio/journey.ts, portfolio/copy.ts, data.ts, components/portfolio/Hud.tsx, components/portfolio/Boards.tsx, components/portfolio/Boards.css, components/portfolio/WorldViewport.css, tests/portfolio-atmosphere.test.ts, tests/portfolio-boards.test.ts, tests/portfolio-journey.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-4, portfolio/world/AC-5, portfolio/npc-dialogue/AC-1, portfolio/npc-dialogue/AC-3, portfolio/npc-dialogue/AC-7, portfolio/responsive-layout/AC-1, portfolio/responsive-layout/AC-3]
parallel: false
verify: bun run build && bun test ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "2026-09-08完成USER-048视觉修订。公开模块初测3项Red：缺少霓虹双配色、仍有展馆/橱窗、缺少海边灯塔；重做后通过。最终完整verify：142 pass、0 fail、3875断言，build与tsc成功。接缝测试按浮点几何精度判断；投影浏览器测试补显式图形就绪等待并连续复跑2次通过。真实三视口检查NPC/技能/项目随物按钮、霓虹工坊、项目星星、双语详情、灯塔；静态4173实测三个项目触控打开、跨视口双语/链接保持及终点返回。清理临时截图/日志/dist/预览，保留3000；未提交或发布，等待用户视觉确认。"
---
## 目标
- 科技工坊有明显赛博朋克氛围：青蓝/玫红霓虹、叠层金属建筑、发光标牌、机柜和连接线槽。
- 第三段为无街区建筑的星夜海岸；三个项目分别是空中的立体星星，走近后出现项目名称与互动按钮。
- 最右端在海边灯塔旁收尾，能够停下及沿原路返回。
- NPC交谈按钮在头顶，技能查看按钮在终端上方，作品查看按钮在星星旁；均跟随真实镜头，不在固定屏幕区域。

## 保持不变
- 主角几何/GLB、外观、步态、接地、速度3.2与镜头缩放/缓动。
- 起点-8、迎宾x2，五项无等级技能与三个项目身份/外链，完整中英阅读和图形故障资料。
- 横向1.8单位主动互动范围、阅读暂停、关闭后新方向输入恢复、三个阅读入口互斥。
- 不新增依赖、位图、音频、后台服务；不删旧game，不提交或发布。

## 实施边界
- 用现有Three几何重做工坊与海岸，不保留展館/橱窗/廊架/城市远景并行路径。
- 城镇只截短延伸进入海岸的远山；城镇主体不改。
- 复用相同会话和详情界面，项目更换视觉载体而不新建一套阅读状态。
- 在现有渲染循环中投影按钮及技能文字，不创建额外动画循环或将位置暴露到window。
- 场景名称、介绍及本站作品文案同步两种语言。

## 验收
- `tests/portfolio-atmosphere.test.ts` 使用已有公开世界模块验证霓虹结构、三颗真实立体星星、没有展馆建筑、海面/灯塔与连续接地；真实浏览器走到NPC/技能/项目位置，验证按钮随目标移动且可点击。
- `tests/portfolio-boards.test.ts` 保持技能投影、无遮挡、阅读重开、数据与范围测试；三颗项目由星星测试覆盖。
- `tests/portfolio-journey.test.ts` 将建筑/观景平台预期改为星星/灯塔，保留三视口八次阅读、双语链接、交界各往返三次、画布/URL不变、终点返回、全程地面和鞋底检查。
- 冻结的人物、城镇、NPC阅读、故障、无位图与静态交付测试复跑。
- 实际截图检查1440×900、390×844、844×390的NPC按钮、霓虹工坊、星星及按钮、双语详情与灯塔；截图不能仅以哈希代替实看。
- 构建后在独立静态预览上复跑关键互动，清理截图/日志/dist/自启预览服务，保留现有3000开发服务。
- 测试通过不代替用户对赛博朋克氛围、星空海岸和灯塔的视觉确认。
