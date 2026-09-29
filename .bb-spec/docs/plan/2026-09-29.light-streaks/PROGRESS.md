# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | wet-ground-env | done | 2026-09-29 |
| 02 | light-streaks | in-progress | — |
## 当前
正在执行 `02-light-streaks.md`：Impl（Green）阶段（Red 测试已写好）。
- 01 记录：删除旧的镜面抖动测试 tests/wet-ground.test.ts（新着色器无此模糊）。Review 后修正：环境图改半精度浮点、拍摄时背景换雾色避免立方体面接缝、拍摄前先 tick 一次环境动效让信号灯状态正确、相机抬到 y=3；湿层着色器改为纯字符串常量；补测试 uMask、湿层先于暗区绘制、captureEnvironment 隐藏恢复/背景/类型。
## 阻塞
（无）
