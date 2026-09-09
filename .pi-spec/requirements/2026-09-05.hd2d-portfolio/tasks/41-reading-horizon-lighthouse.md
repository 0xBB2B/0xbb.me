---
id: T-41
title: M2 主页语言入口、星海分层、门墙接合与灯塔题记和文案
depends_on: [T-40]
files: [data.ts, portfolio/copy.ts, portfolio/state.ts, portfolio/runtime.ts, portfolio/scenes/sea-surface.ts, portfolio/scenes/gallery.ts, portfolio/scenes/exterior.ts, portfolio/scenes/room.ts, components/portfolio/Hud.tsx, components/portfolio/BoardDetails.tsx, components/portfolio/BoardDetails.css, components/portfolio/Dialogue.tsx, components/portfolio/Dialogue.css, components/portfolio/Overview.tsx, components/portfolio/Overview.css, components/portfolio/WorldViewport.css, tests/portfolio-content.test.ts, tests/portfolio-dialog-horizon.test.tsx, tests/character-toggle.test.ts, tests/portfolio-reading.test.ts, tests/portfolio-boards.test.ts, tests/portfolio-room.test.ts, tests/portfolio-journey.test.ts, tests/portfolio-delivery.test.ts, artifacts/copy-research.md]
refs: [portfolio/bilingual/AC-2, portfolio/bilingual/AC-3, portfolio/bilingual/AC-4, portfolio/world/AC-10, portfolio/world/AC-11, portfolio/profile-overview/AC-2, portfolio/profile-overview/AC-3, portfolio/npc-dialogue/AC-4]
parallel: false
verify: bun run build && bun test ./tests/portfolio-content.test.ts ./tests/portfolio-dialog-horizon.test.tsx ./tests/portfolio-room-performance.test.ts ./tests/portfolio-ultrawide.test.ts ./tests/portfolio-graphics.test.ts ./tests/portfolio-ambient.test.ts ./tests/portfolio-room-layout.test.ts ./portfolio/room.test.ts ./tests/portfolio-room.test.ts ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./design-reference/scene-comparison.test.ts ./design-reference/transition-comparison.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "本轮合并USER-057至060。初始3项Red为弹窗语言按钮、光晕投影低于实际水面远端、墙角射线无墙体。最终完整验证170 pass/0 fail/4682断言；题记再向左微调避让人物，补跑内容/弹窗测试、类型和构建及静态截图。实际中英长文、无语言按钮弹窗、灯塔附近题记的三视口与返程收起通过。新文案来源见artifacts/copy-research.md，不虚构个人事实。未提交或发布，待用户确认。"
---
## 行为
- EN/中只在没有弹窗的主页显示；介绍、详情、速览和故障资料打开时，页面上没有语言按钮。关闭后选择语言再打开，NPC重读从首段开始。
- 故障资料仍自动打开且完整可读；允许关闭回到主页，故障说明/速览入口仍在，可以选语言再开，不要求恢复图形。
- 水面远端明确收束，项目完整光晕位于海平线上方；地面不延伸到水面远端后形成色带。近岸相位向岸边推进，波纹其他细节不反向。
- 外墙完整覆盖房屋宽度，两端墙角柱与侧墙接合，外侧近门不透明化成一条透景缝，门仍在垂直屏幕的侧墙门洞内。
- 距终点1.2单位内出现灯塔旁题记，以世界位置投影、柔底色和衬线文字融入背景；不在左上角、不弹窗，离开范围后收起。
- 中英个人简介、场景介绍、三页迎宾、五技能和三项目扩写；每项技能/项目完整说明至少三段。终端只放可读短简介，详情与速览展示同一完整文字。

## 依据与保持
- 官方来源：Go/Docker/Kubernetes/OpenAI Agents文档、Steamworks API概览、Stripe幂等与webhook文档、两个项目官方README；本站介绍依据当前代码功能。
- 技术说明用领域设计原则，不添加雇主、客户数、交易成绩或评级；来源记录在artifacts/copy-research.md。
- 项目与联系URL、数据身份、无等级技能、人物、小镇地图、房间/星星交互、首次预热与终点位置保持。
- 只迁移被用户取消的“弹窗内换语言”测试步骤，改成关闭→主页选择→重开；原阅读、翻页、暂停、范围、链接和故障断言保留。

## 验证
- tests/portfolio-dialog-horizon.test.tsx：三个阅读面板无语言按钮，真实三视口打开时整个页面无语言控件；关后主页恢复；星体光晕与水面真实投影、背后地面与墙角覆盖。
- tests/portfolio-content.test.ts：完整多段中英文字、无技能评级、题记范围与返程、浪向相位。
- 长文CSS滚动区域与固定关闭/翻页操作实看；静态运行到终点，六种语言/视口组合题记可见、无弹窗、返程收起。
- 清理本轮截图/日志/测量JSON/dist与自启4173，保留原3000、用户图片、之前已存在的改动，不发布或提交。
