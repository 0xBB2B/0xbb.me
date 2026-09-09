---
id: T-39
title: M2 数据工厂房间与主动开门进出
depends_on: [T-38]
files: [App.tsx, portfolio/journey.ts, portfolio/state.ts, portfolio/scenes/room.ts, portfolio/scenes/workshop.ts, portfolio/world.ts, portfolio/runtime.ts, portfolio/copy.ts, components/portfolio/Hud.tsx, components/portfolio/WorldViewport.css, portfolio/room.test.ts, tests/portfolio-room.test.ts, tests/portfolio-atmosphere.test.ts, tests/portfolio-boards.test.ts, tests/portfolio-journey.test.ts]
refs: [portfolio/world/AC-3, portfolio/world/AC-4, portfolio/world/AC-6, portfolio/npc-dialogue/AC-7, portfolio/bilingual/AC-3, portfolio/graphics-runtime/AC-3]
parallel: false
verify: bun run build && bun test ./portfolio/room.test.ts ./tests/portfolio-room.test.ts ./tests/portfolio-atmosphere.test.ts ./tests/portfolio-boards.test.ts ./tests/portfolio-journey.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./portfolio/character.test.ts ./design-reference/character-design.test.ts ./design-reference/scene-comparison.test.ts ./design-reference/transition-comparison.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./tests/portfolio-reading.test.ts ./tests/portfolio-delivery.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "2026-09-08完成。Red：连续行走穿过关闭入口，实际到71.99而非停在20前。新增近门主动开启、0.7秒动画、双向阻挡、旧输入清除、外墙显露室内与故障取消。完整回归153 pass、0 fail、4249断言；静态4173三视口键盘/触控房间回归通过，实际开门期间WebGL丢失仍有双语速览。移除门洞遮挡板后补跑5项单元、build/tsc，并再次跑静态房间回归。未提交/发布，等待用户手感确认。"
---
## 目标
- 数据工厂成为具有外墙、顶棚、侧墙的房间，不再直接把室外道路接在开放工坊前。
- 小镇入口x20和海岸出口x44有真实门扇，关闭时在门前0.65单位阻挡；横向1.8单位内提示，E或点击主动开门。
- 开门约0.7秒，门扇旋转，近侧外墙渐隐显露室内；同一画布、坐标、镜头连续，不跳网页或黑屏。
- 开门时暂停移动，完成后须新方向输入继续走；不自动走入。两扇门本次访问内保持打开，刷新关闭，方便往返。

## 保持与边界
- 已选B＋2、五项无等级技能终端、三颗项目星星、海边灯塔和木板路尽头保持。
- 小镇主体、人物模型/步态、速度3.2、镜头缩放和缓动、资料和外链不改。
- 对话/详情/速览与开门互斥；允许开门期间切语言，禁止重入；图形故障取消开门并直接显示完整双语资料。
- 仅迁移需要穿过房门的旅程测试，实际执行开门，不跳过测试、不传送、不改速度或注入会话。
- 不新增依赖、位图、音频、账号、服务端；不进入M3、不提交/发布。

## 验收与证据
- `portfolio/room.test.ts`：关闭门阻挡、范围外无效、主动开启、动画进度和位置、双语、阅读互斥、故障取消、清除旧输入、两端开门与返回、外墙显露/门扇转角。
- `tests/portfolio-room.test.ts`：真实桌面/手机横竖屏，连续走到门前验证不能穿过，键盘E或触控开两门；旧方向不续走、室内屏幕显露、双语详情与返回，同一canvas。
- 既有五终端文本投影、无遮挡、八内容阅读、两交界各往返三次、角色接地、故障和无位图测试复跑；三套独立设计对比页仍不进入正式发布。
- 独立静态4173复跑房间测试；逐张查看关闭/开启入口、室内、出口及手机视口截图；开门时主动触发WebGL丢失，确认完整中英速览可读。
- 清理本轮截图、日志、dist和自启预览服务，保留3000开发服务及用户已有对比页。
