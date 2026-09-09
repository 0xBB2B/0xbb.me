---
id: T-44
title: MC-2D命名、灯塔界面、流星、快跑和角色换装
depends_on: [T-43]
files: [App.tsx, data.ts, portfolio/state.ts, portfolio/input.ts, portfolio/character.ts, portfolio/runtime.ts, portfolio/copy.ts, portfolio/avatar-models.ts, portfolio/appearance-effect.ts, portfolio/scenes/town.ts, portfolio/scenes/ambient.ts, components/portfolio/Hud.tsx, components/portfolio/Overview.css, components/portfolio/WorldViewport.css, portfolio/input.test.ts, portfolio/character.test.ts, tests/portfolio-branding.test.tsx, tests/portfolio-overview-layout.test.ts, tests/portfolio-sprint.test.ts, tests/portfolio-appearance.test.tsx, tests/portfolio-reading.test.ts, tests/portfolio-npc-design.test.ts, tests/portfolio-ambient.test.ts, design-reference/npc-lineup-models.ts, design-reference/npc-lineup-models.test.ts, design-reference/npc-lineup.html, design-reference/npc-lineup.css, design-reference/npc-lineup.ts, design-reference/npc-lineup-front.png, design-reference/npc-lineup-quarter.png, design-reference/npc-lineup.md, artifacts/game-progress.md, portfolio/scenes/greeter.ts, design-reference/npc-variants.ts, design-reference/npc-variants.test.ts, design-reference/npc-comparison.ts, design-reference/npc-comparison.css, design-reference/npc-comparison.html, design-reference/npc-comparison.md, design-reference/npc-variant-a.glb, design-reference/npc-variant-b.glb]
refs: [portfolio/player/AC-11, portfolio/player/AC-12, portfolio/npc-dialogue/AC-6, portfolio/world/AC-11, portfolio/profile-overview/AC-2, portfolio/responsive-layout/AC-1]
parallel: false
verify: bun run build && ./node_modules/.bin/tsc --noEmit && bun test ./portfolio/input.test.ts ./portfolio/character.test.ts ./portfolio/room.test.ts ./tests/portfolio-branding.test.tsx ./tests/portfolio-ambient.test.ts ./tests/portfolio-content.test.ts ./tests/portfolio-overview-layout.test.ts ./tests/portfolio-sprint.test.ts ./tests/portfolio-appearance.test.tsx ./tests/portfolio-persona.test.tsx ./tests/portfolio-reading.test.ts ./tests/portfolio-npc-design.test.ts ./design-reference/npc-lineup-models.test.ts ./plugins/htmlPlugin.test.ts ./public-assets.test.ts ./design-reference/reference.test.ts ./tests/portfolio-delivery.test.ts
status: done
agent: ""
commit: ""
note: "USER-067至079。最终99 pass、0 fail、3366断言；构建/类型检查通过。真实三视口切换黑装/A、灯塔同时显隐、Shift输入、读取/故障回归通过；流星与跑步连续帧已检查。未提交/发布。"
---
## 最终行为
- 正式风格名MC-2D：章节角标、画布可访问名称、中英本站介绍和当前规范一致。
- 资料速览技能最多三列，760px及以下两列、480px及以下一列；五项顺序和文字不改。
- 到灯塔后左上章节标题继续显示。寄语横屏在塔右、竖屏在塔左，避让标题并保留返回。
- 流星改为细亮头部和柔边、尾端衰减的细长拖尾；方向一致、间隔/速度/倾角随周期变化，有淡出余光；共享几何，无图片纹理或额外全屏后处理。
- Shift+方向键速度5.6单位/秒，普通步行3.2不变；快跑摆臂0.78、腿0.72弧度，普通为0.22/0.28，接地校正不变。按用户最终要求，相位增量为每移动单位2.6，摆动比初版快跑慢约19%；平滑过渡，暂停/失焦清输入，手机不加速。
- 正式NPC采用B金发/挂脖黑上衣/浅外套/百褶裙，原迎宾位置与世界观交谈不变。
- 主角仅黑装和A银发黑长裙；C模型及选择分支删除。换装按钮和灯塔寄语共用最后1.2单位范围，不另设更靠后的终点标记；离开同时隐藏，造型继续保留。
- 按钮不显示右侧名字；可访问描述告知当前造型。0.65秒局部光点/光环聚拢散开，中央阶段换装，暂停移动并禁止重入；只保留一个主角模型，旧资源释放。减少动态下只有光环渐隐；图形故障可取消换装并读取完整资料。

## 原NPC删除范围
- portfolio/scenes/greeter.ts
- design-reference/npc-variants.ts、npc-variants.test.ts
- design-reference/npc-comparison.ts、npc-comparison.css、npc-comparison.html、npc-comparison.md
- design-reference/npc-variant-a.glb、npc-variant-b.glb
上述模型和入口直接依赖已移除的原NPC；用户原始参考图片不删除、不移动、不覆盖。

## 设计交付
- npc-lineup.html是非发布的可旋转造型页，最终只显示黑装主角、A主角与B迎宾者，正面/斜侧面对比图已重新生成，图片没有C或原浅蓝NPC。
- A参考：OneDrive精选/人设2-大-Pixel.png。
- B参考：OneDrive精选/00029-1649505505-1024.png。该参考裁剪未展示完整鞋履，站姿/鞋子是明确标注的设计补全。
- 模型均为BoxGeometry，无参考图片贴图；正式素材在portfolio/avatar-models.ts共享，预览不复制模型实现。

## 证据与限制
- 名称、每行最多三卡、灯塔标题先有真实失败断言，再修复。
- 99项最终相关回归含静态构建、三视口故障阅读、输入/门/边界、两款角色接地、六次真实换装及双语灯塔排版。
- 修正一条仍要求旧NPC尾巴/双角的过时断言；开门等待改为等待真实完成状态，不用固定1秒猜测。
- 跑步最终实测完整摆动周期约417–450ms，最大摆臂0.780/腿0.720；没有改变移动速度。
- 真实换装回到黑装后几何计数与切换前相同（2067）；位置始终70.5，场景确认B且无原NPC。减少动态时粒子关闭、主角不缩放。
- 流星连续采样从亮度0.9经过0.768/0.126到0，位置沿同一斜线推进，没有宽三角扇面。
- 当前构建仍有既有大包提醒；未进行M3发布或手机真机性能认证，无新依赖/音频/付费生成。
- 本轮使用director/gameplay/UI/graphics/QA技能与game-feel、technical-art、shader-cookbook参考，浏览器使用ego。测试截图/日志/dist清理，原3000服务保留。
