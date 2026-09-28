---
name: 10-car-exterior
description: 按原型搭红色保时捷 992 实心外观（固定尾翼、双闪、车头朝主路），不开门、无内饰
---
# 保时捷外观

## 目标
场景里有一辆和原型一致的红色保时捷，停在店门前车位、车头朝主路，双闪材质与点光源交给环境动效驱动。

## 业务规则（来源：spec scene/diorama-layout、scene/ambient-motion）
- 红色保时捷 911（992 代 Carrera，加装固定尾翼），用代码几何体拼出，不加载外部模型文件。
- 停在店门前正中的车位上，车中心位于布局常量 `CAR_CENTER = (-0.85, 0.15, 1.15)`，车头朝主路（世界 +z 方向，背对便利店）。
- 外观只做车外：车身、座舱玻璃、车灯、贯穿式尾灯、尾翼、扩散器、排气、车轮；不开门、不做内饰。
- 双闪：四角琥珀色转向灯与侧转向灯共用一个双闪材质；车头、车尾各一盏琥珀色点光源（初始亮度 0）。闪烁节奏由环境动效控制（0.9 秒周期、亮灭各半），本 plan 只提供材质与光源。
- 画风：卡通分层着色、深蓝细描边；双闪材质不画描边。

## 涉及文件
- 新建：`diorama/car.ts`
- 新建：`tests/car.test.ts`

## 函数清单
### diorama/car.ts
| 名称 | 职责 |
|---|---|
| `buildCar` | 按原型「保时捷 992.1 Carrera（红色 + 固定尾翼）」整段搬移：用 `materials.ts` 的 `toon`、`glow`、`noOutline` 与 `primitives.ts` 的 `add`、`box`、`cyl` 搭出整车组（命名 `porsche`），放到 `CAR_CENTER`、车头朝 +z；创建双闪材质与前后两盏点光源；返回整车组、双闪材质、点光源数组 |

## 协作关系
- 使用 05 的 `materials`、`primitives`、`layout`（`CAR_CENTER`）。
- 07 已有的 `createAmbient` 通过 `hazard: { material, lights }` 接收本 plan 返回的双闪材质与点光源（接口不变）。
- 12 的 `world.ts` 调用 `buildCar` 并把整车组加入场景。
- 原型源码：`.bb-spec/.cache/prototype/rainy-konbini.html` 中 `hazardMat`、`hazardLights`、`function buildCar()` 段落（约第 760～880 行）。

## 验证方式
- 测试入口：`bun test tests/car.test.ts`（注入 `tests/fake-canvas.ts`，在 bun 中直接构建）
- 测试输入：新建场景，调用 `buildCar`，把返回的整车组加入场景并更新世界矩阵。
- 预期结果：
  - 场景中能按名称找到 `porsche`。
  - 整车包围盒中心与 `CAR_CENTER` 的水平距离 < 0.3 米；包围盒底部高度在 0.1～0.25 米之间（落在地块上）。
  - 车头方向为 +z：车身包围盒在 z 方向的长度大于 x 方向的宽度，且名称或位置可辨识的前保险杠 / 车头灯位置 z 大于尾灯位置 z。
  - 返回的双闪材质被至少 4 个网格使用；点光源数组长度为 2，颜色为琥珀色系、初始亮度为 0。
  - 双闪材质带不画描边标记。
  - 场景中不存在名为 `driver-door`、`cabin-interior`、`center-screen`、`steering-wheel` 的物件。
- [ ] 上述断言全部通过，全量 `bun test` 无新增失败。
