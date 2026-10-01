---
name: rear-details
description: 保时捷车尾：PORSCHE 字样、车牌凹槽底板、扩散器加大、反光条、排气管内圈、发动机盖格栅；车牌去边框
---
# 车尾细节

## 目标
车尾出现 PORSCHE 字样、嵌着车牌的深红凹槽、加大的黑色扩散器和空心排气管、红色反光条、后盖格栅；车牌贴图不再有绿色边框。

## 业务规则（来源：spec car-rear-details、car-license-plate）
- 字样 1 块：黑底浅灰字「PORSCHE」，左右居中，宽不少于 40 厘米（场景实际尺寸，下同），整块在贯穿式尾灯的高度范围内，离尾灯表面不超过 1 厘米，不发光。字画在贴图上；每个字母都在字体预载文字里，预载文字没有多余的字；字体加载完成后字样贴图重画。
- 车牌凹槽底板 1 块：深红色，宽 43 厘米、高 19 厘米（误差 2 厘米），左右居中，整块在尾灯下方、排气管上方。车尾不再有黑色横条垫在车牌后面。
- 车尾车牌的正视投影在底板范围内；车牌中心和四角处背面离底板表面都不超过 3 厘米。
- 扩散器：黑色，高 18 厘米（误差 2 厘米），宽度不小于车身宽度的 70%；两根排气管中心高度在扩散器高度范围内。车尾车牌整块仍高于排气管上沿。
- 排气管内圈 2 个：各与一根排气管同心，直径小于排气管，颜色比排气管深。
- 反光条 2 条：左右对称，高度在扩散器最高点和车牌最低点之间，横向在底板外侧，偏红，不发光。
- 发动机盖格栅 9 根：黑色短条，左右对称，在后窗最后端和高位刹车灯之间，离后盖表面不超过 1 厘米。
- 车牌贴图除底色和文字外不画边框线。
- 以上都不发光，材质颜色亮度低于 0.97；车上仍只有 4 盏双闪点光源；整车俯视外廓宽 1.98 米、长 4.19 米（误差 5 厘米）。

## 涉及文件
- `diorama/car.ts`、`diorama/textures.ts`、`diorama/world.ts`（修改）
- `tests/car.test.ts`、`tests/world.test.ts`、`tests/world-mount.test.ts`（修改）

## 成品定义
```ts
// —— diorama/textures.ts ——
// drawLicensePlate：删掉画边框的那几行（roundRect + stroke），其余不变
// 新增导出 drawRearWordmark(ctx, w, h)：底色 '#101116' 铺满；字色 '#e6ebf2'；
//   fillText 正好一次，文字 'PORSCHE'，水平居中，字高约为画布高的 60%，字体 FONT_D，字间距拉开（可逐字手算 x，但 fillText 仍只调一次整串）
// SIGNAGE_TEXT 新增一项 'PORSCHE'

// —— diorama/car.ts（缩放前坐标；车尾朝 -x）——
// 字样 name 'rear-wordmark'：PlaneGeometry(0.5, 0.04)，toon('#8f9bb3', { map: ctex(800, 64, drawRearWordmark) })
//   position (-2.278, 0.698, 0)；rotation.order = 'ZYX'；rotation.set(0, -Math.PI / 2, -25 * Math.PI / 180)
// CarBuild 新增字段 wordmarkTexture: THREE.CanvasTexture，buildCar 返回

// 凹槽底板 name 'plate-recess'：代替 box(car, 0.06, 0.08, 0.6, black, -2.3, 0.5, 0)
box(car, 0.03, 0.21, 0.48, toon('#9c0d21'), -2.3, 0.415, 0)
// 车尾车牌 license-plate-rear：position.x 由 -2.345 改为 -2.33

// 扩散器 name 'rear-diffuser'：代替 box(car, 0.3, 0.14, 1.5, black, -2.12, 0.18, 0)
box(car, 0.3, 0.2, 1.56, black, -2.15, 0.18, 0)
// 排气管（已有的两个圆柱）：y 由 0.3 改为 0.28，加 name 'exhaust-tip'
// 排气管内圈 name 'exhaust-inner'：CylinderGeometry(0.042, 0.042, 0.01, 14)，toon('#101116')，
//   位置 (-2.361, 0.28, sz * 0.42)，rotation.z = Math.PI / 2，scale (1, 1, 1.5)

// 反光条 name 'rear-reflector'
box(car, 0.012, 0.022, 0.1, toon('#ff4a5a'), -2.288, 0.39, sz * 0.72)

// 发动机盖格栅 name 'engine-grille-slat' ×9：z = -0.32 + i * 0.08（i = 0..8）
box(car, 0.09, 0.01, 0.03, black, -1.72, 0.948, z).rotation.z = 0.38

// —— diorama/world.ts ——
// fontsLoaded 回调里，在 redrawCtex(car.plateTexture) 之后加 redrawCtex(car.wordmarkTexture)
```

## 函数清单
| 文件 | 函数名 | 职责 |
|---|---|---|
| `diorama/textures.ts` | `drawLicensePlate`（修改） | 去掉边框线 |
| `diorama/textures.ts` | `drawRearWordmark`（新增，导出） | 画黑底浅灰的 PORSCHE 字样 |
| `diorama/car.ts` | `buildCar`（修改） | 按成品定义新增/替换车尾部件，带出字样贴图 |
| `diorama/world.ts` | `mountDiorama`（修改） | 字体加载后重画字样贴图 |

## 协作关系
`buildCar` 用 `ctex` + `drawRearWordmark` 建字样贴图并通过 `CarBuild.wordmarkTexture` 带出；`world.ts` 用 `redrawCtex` 重画。

## 验证方式
- 测试入口：`buildCar()` 的 `group`（世界坐标，车尾朝世界 -z）；`drawLicensePlate` / `drawRearWordmark`（`diorama/textures`，传假画布上下文和宽高，读 `fillTextCalls`、`fillStyleCalls`，假画布若记录了 stroke 类调用则断言没有）；`CANVAS_TEXT`；浏览器用例里场景网格 `rear-wordmark` 的 `material.map.version`。
- 网格名字与数量：`rear-wordmark` 1、`plate-recess` 1、`rear-diffuser` 1、`exhaust-tip` 2、`exhaust-inner` 2、`rear-reflector` 2、`engine-grille-slat` 9。
- 预期结果：上面「业务规则」每一条各至少一个用例；`tests/world.test.ts` 两条字体预载用例把字样画布也算进"画出的字"；`tests/world-mount.test.ts` 字体放行用例里 `rear-wordmark` 的贴图版本号也要增加。
