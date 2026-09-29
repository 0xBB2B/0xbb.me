# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | roof-puddles | done | 2026-09-29 |
| 02 | neighbor-walls-and-kissa | pending | — |
| 03 | neighbor-balcony-and-roof | pending | — |
## 当前
准备执行 `02-neighbor-walls-and-kissa.md`。
- 01 记录：第一轮 Review 判定屋顶积水违规：复用地面噪声遮罩，只画波纹不画水面，积水数量和大小随显卡变化。用户选择「手动摆积水 + 水光」，已改 spec ambient-motion 验收并原地修订 plan 01（积水改为写死的椭圆数据，另写屋顶积水着色器）。另修正一条过时用例：weather.test.ts 的地面涟漪层筛选排除屋顶层。第二轮 Review 合规 9/9；主 Agent 按简洁性意见把屋顶层改为单位平面缩放；按 Review 清理测试里过时的兜底类型。未补「积水外不画水光和波纹」的着色器断言（只能比对着色器源码字符串，太脆），以截图 roof-puddles-v2 人眼确认。
## 阻塞
（无）
