---
id: T-43
title: M2 资料人设图、技能实践文案与章节标题对齐
depends_on: [T-42]
files: [components/portfolio/Overview.tsx, components/portfolio/Overview.css, data.ts, portfolio/copy.ts, components/portfolio/WorldViewport.css, tests/portfolio-persona.test.tsx, tests/portfolio-chapters.test.ts, tests/portfolio-content.test.ts, tests/portfolio-boards.test.ts, tests/character-toggle.test.ts, tests/portfolio-delivery.test.ts, public-assets.test.ts, design-reference/reference.test.ts, vite.config.ts, artifacts/copy-research.md, artifacts/game-progress.md, design-reference/npc-comparison.md]
refs: [portfolio/profile-overview/AC-2, portfolio/profile-overview/AC-7, portfolio/site-entry/AC-5, portfolio/site-entry/AC-6, portfolio/responsive-layout/AC-1]
parallel: false
verify: bun run build && bun test ./tests/portfolio-persona.test.tsx ./tests/portfolio-chapters.test.ts ./tests/portfolio-npc-design.test.ts ./tests/portfolio-lore.test.tsx ./tests/portfolio-content.test.ts ./tests/portfolio-dialog-horizon.test.tsx ./tests/portfolio-room-performance.test.ts ./tests/portfolio-ultrawide.test.ts ./tests/portfolio-graphics.test.ts ./tests/portfolio-ambient.test.ts ./tests/portfolio-room-layout.test.ts ./portfolio/room.test.ts ./tests/portfolio-room.test.ts ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./tests/portrait-asset.test.ts ./portfolio/character.test.ts ./portfolio/models/player-voxel.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "2026-09-09完成USER-064至066。人设图未渲染时建立Red；完整verify最终179 pass、0 fail、6478断言，build/tsc成功。修复测试把integrating误识别为rating的英文子串误报，未放宽真实评分检查。静态4173的人设加载/比例/三视口/失败阅读与章节对齐3项测试通过；原PNG哈希未改，人物/三维图形不加载图片纹理。随后收紧构建复制范围，37项产物/元数据与9项静态人设/章节/故障复验通过，build/tsc再次通过。临时截图、日志、dist和自启4173清理，保留3000。命名方案未确认，不改HD-2D标签，不提交/发布。"
---
## 行为
- 用户确认public/profile-full.png作为个人资料图，桌面左图右文，手机竖屏上图下文；尺寸1696×2528原比例，不裁切、不做圆头像。
- 图片只在速览打开后请求，异步解码并预留尺寸；失败时显示占位，简介、技能、项目和联系不受影响；不恢复弹窗语言按钮。
- 图片不进入NPC/主角纹理、背景或SEO分享图。用户已存在的profile.png/profile.jpg保留原字节但不引用也不进构建，测试以精确路径和哈希识别已有源文件，发布及网络仅放行选定full图。关闭public整体复制，构建明确发出full图和robots/site-card/sitemap，原有站点辅助文件逐字节校验。
- 五项技能改为用户的实际实践：AI Agent关联两个项目；Golang最拿手且从零设计SDK/积分商城；Docker/k8s支撑全部开发部署；海外SDK接入多国登录支付、减少成本；支付实践含多国渠道与积分商城活动/支付。
- 终端短简介与完整详情/速览表达相同事实，不虚构金额、机构名称、客户或覆盖数量；AI Agent简洁两段，其余三段。
- 第三章标题为“奔赴心中的／星辰大海。”，英文“A sea of stars. / A world ahead.”；三个章节起始位置、字号、行距一致，删除03独立偏移/缩小样式。

## 保持与验证
- 原NPC、主角、小镇地图、房门、海面、灯塔题记和交互不改；MC-2D/HD-MC命名问题等待用户确认。
- 只新增对已确认HTML人设的图片使用例外，不让任意位图、SVG内嵌位图或模型纹理通过。
- SSR断言关闭速览没有img，打开时有明确src/尺寸/alt且无语言按钮；真实浏览器验证自然像素、比例、图文排布、图片阻断后的阅读。
- 按真实行走进入三个章节，在中英及三视口记录章节标签/标题坐标和字体，18组结果一致，不用注入会话代替行走。
- 全量有效行为回归、静态构建、人设加载、故障阅读与截图检查完成；未新增依赖，原始图片不压缩、不重绘、不移动。
