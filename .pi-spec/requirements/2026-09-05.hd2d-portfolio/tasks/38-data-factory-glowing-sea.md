---
id: T-38
title: M2 接入B数据工厂与2荧光海、终端屏幕和道路尽头
depends_on: [T-37]
files: [portfolio/scenes/workshop.ts, portfolio/scenes/gallery.ts, portfolio/world.ts, portfolio/journey.ts, portfolio/copy.ts, data.ts, components/portfolio/Boards.tsx, components/portfolio/Boards.css, tests/portfolio-atmosphere.test.ts, tests/portfolio-journey.test.ts]
refs: [portfolio/world/AC-1, portfolio/world/AC-2, portfolio/world/AC-3, portfolio/world/AC-4, portfolio/world/AC-5, portfolio/npc-dialogue/AC-3, portfolio/npc-dialogue/AC-7, portfolio/responsive-layout/AC-3]
parallel: false
verify: bun run build && bun test ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./design-reference/scene-comparison.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "2026-09-08完成USER-049/050。Red验证B版警示橙/数据结构缺失和终点仍铺路到96；实现后完整verify通过：145 pass、0 fail、4008断言，build与tsc成功。静态4173的5项专项测试通过；实际触控中文终端/项目详情与灯塔尽头返回通过，三视口截图逐张检查。临时截图/日志/dist/预览服务清理，保留3000。未提交或发布，待用户视觉确认。"
---
## 目标
- 将用户从独立对比页选择的B地下数据工厂与2蓝色荧光海接入真实主页，不把预览模块或未选方案打包进主页。
- 工厂有钢架大厅、冷却罐、数据核心、维护走廊、机柜和管线，冷白/电蓝配警示橙。
- 五项技能名称与简介直接显示在背景终端玻璃屏幕内；机壳、键盘、状态灯包围屏幕，不另加悬浮卡片边框、背景和投影阴影。
- 三颗项目星星、荧光浪、潮池、木板路与暖光灯塔组成海岸；木板路到人物前方约1单位结束，之后仅为自然岸边。

## 保持不变
- 暖光小镇、主角/GLB、步态、速度3.2、相机、原起点-8、迎宾x2、旅程终点80。
- 五项无等级技能、三个项目链接、双语、速览、故障阅读与交谈/详情互斥。
- 横向1.8单位的主动互动、阅读暂停、关闭后新输入恢复，按钮随对应目标移动。
- 不新增依赖或位图，不执行M3、不发布或提交git。

## 验收
- 已存在的世界模块作为Red入口，不注入状态或故意破坏实现。
- `tests/portfolio-atmosphere.test.ts` 验证选定B版结构/颜色、三颗项目星星、荧光海/潮池/木板几何、路面在81结束、82以后的自然地面无木板、可行走范围仍保持0.035鞋底支撑。
- 实际浏览器逐一走到五台技能终端，在1440×900、390×844、844×390读取名称/简介，文字完整处于玻璃范围内，背景透明无额外卡片；原投影跟随/无遮挡/重开回归复跑。
- 三视口八个内容入口的主动阅读、双语与链接、两交界各往返三次、终点返回及同一画布/URL继续验证；只替换用户否定的霓虹标牌与无限路面预期。
- 真静态构建上实测终端中文屏幕、触控详情、项目、横竖屏和终点返回；截图实际查看，不用哈希代替。
- 收尾清理本轮临时文件与服务，保留现有3000开发服务。
