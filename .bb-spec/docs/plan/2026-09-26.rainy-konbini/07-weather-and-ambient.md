---
name: 07-weather-and-ambient
description: 雨、水花、屋檐滴水、湿地面倒影与水洼波纹，以及双闪、信号灯、自动门、招牌闪烁等环境动效
---
# 天气与环境动效

## 目标
雨夜的全部动态效果，节奏由可单测的纯函数决定。

## 业务规则（来源：spec scene/ambient-motion、scene/quality-tier）
- 雨与地面：
  - 雨丝只在底座正上方（`|x|, |z| < 12.9`）生成，落到屋顶、雨棚、地块、路面即消失；离镜头越远越淡。
  - 屋檐滴水：雨棚前沿（z = −1.42，高 2.58）的水滴依次挂住、下落，落地前消失。
  - 水洼：边缘清晰、零散分布；水洼内倒影接近镜面，底下标线隐约可见；水洼内有同心圆波纹，水洼外没有波纹。
  - 落地水花短暂出现后消失；水洼外的湿路面上，灯光倒影拉成竖直光带。
- 节奏：
  - 招牌每隔 4～9 秒随机闪烁一次，每次持续 0.25～0.6 秒。
  - 自动门每隔 6～11 秒打开，保持 2.6 秒后关上。
  - 双闪周期 0.9 秒，亮、灭各 0.45 秒；亮时点光源照亮地面。
  - 车辆信号灯 20 秒一周期：绿 0～8 秒、黄 8～10 秒、红 10～20 秒。
  - 行人灯与之联动，变红前绿灯闪烁 1～2 秒。
  - 电视光忽明忽暗；旗子轻微摆动。
- 系统「减少动态效果」设置不改变任何动效。
- 画质低档时：
  - 关闭地面真实倒影（倒影网格隐藏），保留受光照的湿地面；
  - 雨丝数量减半（缩小绘制范围）；
  - 水洼波纹仍要保留，所以低档下要在不采样倒影贴图的叠加层里画波纹。

## 涉及文件
- 新建：`diorama/rhythm.ts`、`diorama/weather.ts`、`diorama/wet-ground.ts`、`diorama/ambient.ts`
- 新建：`tests/rhythm.test.ts`、`tests/weather.test.ts`

## 函数清单
### diorama/rhythm.ts（纯函数，无 three 依赖）
| 函数名 | 职责 |
|---|---|
| `hazardOn` | 输入秒数，返回双闪是否点亮（`t mod 0.9 < 0.45`） |
| `signalPhase` | 输入秒数，返回车辆信号灯 `'green' / 'yellow' / 'red'` |
| `pedestrianPhase` | 输入秒数，返回主路与小路两处行人灯的 `'go' / 'blink' / 'stop'` 状态 |
| `nextDoorDelay` | 输入 0～1 随机数，返回下次开门间隔（6～11 秒） |
| `DOOR_OPEN_SECONDS` | 2.6 |
| `nextFlicker` | 输入两个 0～1 随机数，返回下次闪烁的等待时间（4～9 秒）与持续时间（0.25～0.6 秒） |

### diorama/weather.ts
| 函数名 | 职责 |
|---|---|
| `rainSeeds` | 输入数量与随机函数，返回每根雨丝的水平坐标、相位与落点高度（查 `ROOF_ZONES`、`isOnLot`）；坐标全部在底座范围内 |
| `createRain` | 用着色器线段绘制雨丝（按镜头距离淡出），返回网格与设置可见数量的接口 |
| `createSplashes` | 用点精灵绘制落地水花 |
| `createDrips` | 实例化水滴，返回按时间更新的函数 |

### diorama/wet-ground.ts
| 函数名 | 职责 |
|---|---|
| `createWetGround` | 创建路面层与地块层两个 `Reflector`（半分辨率、预乘混合），着色器实现水洼遮罩、镜面倒影、湿地面竖向光带与波纹；同时创建不采样倒影的波纹叠加层（低档时显示）；返回设置倒影开关、更新时间、调整尺寸的接口 |
| `WET_SHADER` | 倒影着色器定义（沿用原型） |

### diorama/ambient.ts
| 函数名 | 职责 |
|---|---|
| `createAmbient` | 接收 06 返回的门扇、招牌材质、信号灯、行人灯、电视光、旗子引用，以及 08 的双闪材质与点光源；返回每帧调用的 `tick`，内部用 `rhythm.ts` 决定状态 |

## 协作关系
- 使用 05 的 `layout`、`materials`；由 09 的 `world.ts` 组装并在每帧调用 `tick`、倒影时间更新。
- 画质切换时 `world.ts` 调用 `createWetGround` 返回的倒影开关与 `createRain` 的数量接口。
- 原型对应段落：「湿地面」「屋檐滴水」「雨」「雨点落地溅起的小水花」「动画」。

## 验证方式
- 测试入口：`bun test tests/rhythm.test.ts tests/weather.test.ts`
- 测试输入：直接调用纯函数；`rainSeeds` 用固定种子随机函数生成 5000 根。
- 预期结果：
  - `hazardOn(0.1)` 为真，`hazardOn(0.5)` 为假，`hazardOn(0.95)` 为真。
  - `signalPhase(3)` 为 `'green'`，`signalPhase(9)` 为 `'yellow'`，`signalPhase(15)` 为 `'red'`，`signalPhase(23)` 为 `'green'`。
  - 行人灯在车辆红灯期间某处为 `'go'`，在该处变红前 1～2 秒内为 `'blink'`。
  - `nextDoorDelay(0) === 6`，`nextDoorDelay(1) === 11`；`DOOR_OPEN_SECONDS === 2.6`。
  - `nextFlicker(0, 0)` 等待 4 秒、持续 0.25 秒；`nextFlicker(1, 1)` 等待 9 秒、持续 0.6 秒。
  - `rainSeeds` 返回的全部坐标满足 `|x| < 12.9` 且 `|z| < 12.9`；落在便利店屋顶范围内的雨丝落点高度等于屋顶高度。
- [ ] 上述断言全部通过。
- [ ] 画面效果（水洼、倒影、低档波纹保留）在 10 的端到端截图检查中确认。
