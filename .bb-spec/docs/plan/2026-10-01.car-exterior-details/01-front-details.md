---
name: front-details
description: 保时捷车头：进气口加大前移、格栅条、日行灯条、大灯鼓包与灯圈灯芯、盾徽、下唇
---
# 车头细节

## 目标
车头出现横贯的黑色格栅带、鼓出机盖的大灯（带灯圈和四点灯芯）、盾徽和下唇。

## 业务规则（来源：spec car-front-details、diorama-layout）
- 进气口正好 3 个（中间 1、两侧各 1），前表面前后相差不超过 1 厘米，整块露在保险杠外；两侧各宽 50 厘米、高 14 厘米（场景实际尺寸，误差 2 厘米）。从正前方看每个进气口中心，先碰到的是进气口或格栅条。
- 每个进气口里至少 2 根深灰格栅条，凸出进气口前表面不超过 1.5 厘米。
- 日行灯条 2 条，各长不少于 30 厘米，在两侧进气口高度范围的上半部，浅灰、不发光。
- 大灯灯罩 2 个，是鼓出机盖的半椭球：俯视不小于约 21×18 厘米，最高点比所在位置机盖表面高 4.5 到 6.5 厘米，连同灯芯外凸不超过 7 厘米；背面离车身外表面不超过 2 厘米。
- 每个灯罩配 1 圈深色灯圈（俯视每边比灯罩宽出 1 到 3 厘米）和 4 个灰色灯芯（在灯罩俯视范围内）。
- 盾徽 1 个：金色，左右居中，最低点高于车头车牌最高点、低于灯罩最高点，宽高不超过 5 厘米，离机盖表面不超过 1 厘米。
- 下唇 1 条：黑色，宽度不小于车身宽度的 70%，最高点不高于进气口最低点，最前端不超出进气口前表面。
- 以上都不发光，材质颜色亮度低于 0.97；车上仍只有 4 盏双闪点光源；整车俯视外廓宽 1.98 米、长 4.19 米（误差 5 厘米）。
- 其他车灯（双闪、侧转向灯、尾灯、高位刹车灯）外凸仍不超过 3 厘米。

## 涉及文件
- `diorama/car.ts`（修改）
- `tests/car.test.ts`（修改）

## 成品定义
车身自己的坐标（缩放前；车头朝 +x，y 向上，z 是车宽方向）。`black` 是 buildCar 里已有的黑色材质；`box(parent, w, h, d, mat, x, y, z)` 的 y 是底面高度。

```ts
// 进气口：两侧盒子由 box(car, 0.08, 0.12, 0.5, black, 2.22, 0.3, ±0.55) 改为
box(car, 0.08, 0.16, 0.56, black, 2.25, 0.26, sz * 0.55)            // name 'intake-side'
// 中间盒子 box(car, 0.08, 0.1, 0.5, black, 2.25, 0.3, 0) 不变，加 name 'intake-center'

const slat = toon('#3d434f');
// 格栅条 name 'intake-slat'：两侧各 3 根、中间 2 根
box(car, 0.01, 0.012, 0.5, slat, 2.293, y, sz * 0.55)                // y ∈ [0.29, 0.33, 0.37]
box(car, 0.01, 0.012, 0.44, slat, 2.293, y, 0)                       // y ∈ [0.325, 0.365]
// 日行灯条 name 'drl-strip'
box(car, 0.012, 0.016, 0.42, toon('#c4cad4'), 2.294, 0.4, sz * 0.55)

// 大灯：原来的扁球 hl（scale 0.12/0.02/0.13）换成一个组，每侧一个
// group.position = (2.085, 0.65, sz * 0.6); group.rotation.z = -0.4
//   'headlight-bezel'：SphereGeometry(1, 20, 14)，scale (0.14, 0.012, 0.15)，toon('#1b2048')
//   'headlight-lens' ：SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)，scale (0.12, 0.068, 0.13)，toon('#dfe8f5')
//   'headlight-dot' ×4：SphereGeometry(0.012, 8, 6)，scale.y = 0.5，toon('#9aa0aa')，组内位置 (±0.04, 0.052, ±0.045)

// 盾徽 name 'hood-badge'
// SphereGeometry(1, 12, 8)，scale (0.022, 0.006, 0.018)，toon('#d8b25a')，位置 (2.152, 0.627, 0)，rotation.z = -0.63

// 下唇 name 'front-lip'
box(car, 0.14, 0.03, 1.6, black, 2.14, 0.15, 0)
```

## 函数清单
### diorama/car.ts
| 函数名 | 职责 |
|---|---|
| `buildCar`（修改） | 按成品定义替换两侧进气口和大灯，新增格栅条、日行灯条、灯圈、灯芯、盾徽、下唇，并给这些网格命名 |

## 协作关系
只用 `box` / `add`（`diorama/primitives.ts`）和 `toon`（`diorama/materials.ts`）。不新增导出，不改 `CarBuild`。

## 验证方式
- 测试入口：`buildCar()`（`diorama/car`）返回的 `group`，加进场景后 `updateMatrixWorld(true)`，按世界坐标量。车头朝世界 +z，车宽方向是世界 x，停车场地面在世界 y = `CAR_CENTER[1]`。
- 网格名字与数量：`intake-side` 2、`intake-center` 1、`intake-slat` 8、`drl-strip` 2、`headlight-lens` 2、`headlight-bezel` 2、`headlight-dot` 8、`hood-badge` 1、`front-lip` 1。
- 预期结果：上面「业务规则」每一条各至少一个用例；现有用例里"前大灯灯罩外凸不超过 3 厘米"改为 7 厘米（其他车灯仍 3 厘米），灯罩的筛选改用名字 `headlight-lens`。
