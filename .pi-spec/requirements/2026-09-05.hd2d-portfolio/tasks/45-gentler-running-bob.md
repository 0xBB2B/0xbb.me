---
id: T-45
title: 快跑身体起伏更轻更慢
depends_on: [T-44]
files: [portfolio/character.ts, portfolio/character.test.ts, artifacts/game-progress.md]
refs: [portfolio/player/AC-2, portfolio/player/AC-12]
parallel: false
verify: bun test ./portfolio/character.test.ts ./tests/portfolio-appearance.test.tsx ./portfolio/input.test.ts ./tests/portfolio-sprint.test.ts && ./node_modules/.bin/tsc --noEmit && bun run build
status: done
agent: ""
commit: ""
note: "USER-080；16 pass、0 fail、3361断言，build/tsc通过；黑装/A真实快跑连续帧和高度实测通过，临时截图/dist清理，原3000服务保持。未提交/发布。"
---
## 范围
只调整快跑身体上下起伏；不改5.6/3.2移动速度、手脚摆幅和相位速度、普通步行、NPC、地图、镜头、换装与界面。

## 实现
- 起伏由整身落脚纠偏改为每完整摆臂周期一次余弦缓升缓降，总范围0.025单位。
- 双腿增加位于髋部的支撑层，承担脚底所需的竖直补偿，避免脚悬空/穿地或髋关节脱开；不移动髋部连接点，不改摆动角度。
- 每帧复位支撑缩放，避免累积形变；待机/暂停立即回到普通接地姿态，步行沿用原有高度轨迹。
- 黑装/A共用该处理，无新几何、材质、贴图或依赖。

## 验证
- Red：原快跑黑装高度范围约0.088，超过0.025限制；新增断言先失败。
- 两款各129个相位采样：单周期起伏、幅度、左右腿接地、手臂/腿角度不变；支撑补偿比例保持0.9–1.2以内。
- 普通步行五个相位的原高度数值逐一匹配，两款均未改变。
- 16项相关回归通过（3361断言），包括三视口真实Shift操作、门和边界、黑装/A换装及灯塔阅读。
- 真实浏览器运行帧：黑装起伏0.02497、A起伏0.02493；最大摆臂约0.779，支撑最大约1.100/1.165。12帧截图已检查，没有断肢或悬空。
- 只读临时观察器已移除；截图目录/tmp/0xbb-run-bob/及dist清理，测试浏览器关闭，原3000服务不关。
