---
name: 01-roof-puddles
description: 修正旧楼屋顶的雨滴落点高度，并给便利店屋顶和旧楼屋顶各加一层一直可见的积水涟漪
---
# 屋顶积水与屋顶水花

## 目标
两个屋顶上都能看到雨滴的反馈：水花落在屋顶表面上，屋顶上散布几块小积水，积水里有同心圆涟漪，高低两档画质都显示。

## 业务规则（来源：spec scene/ambient-motion）
- 雨丝落到屋顶、雨棚、地面等表面即消失。落在屋顶范围内的雨丝和水花，落点高度等于该屋顶顶面高度，误差不超过 3 厘米。
- 落地水花：雨点落到地面或屋顶处短暂出现一个小水花，随即消失。屋顶上的水花出现在屋顶表面上方，不被屋顶板挡住。
- 屋顶积水：
  - 便利店屋顶和旧楼屋顶上各散布几块边缘清晰的小积水，雨点在积水里荡开同心圆波纹。
  - 积水以外的屋顶面不出现波纹。
  - 波纹只画在两个屋顶的顶面范围内。
  - 高档和低档画质都显示。
- 雨棚不需要积水。

## 现状与根因
- `diorama/weather.ts` 的 `floorYAt` 按 `diorama/layout.ts` 的 `ROOF_ZONES` 决定雨丝和水花的落点高度。
- 旧楼那一项写的是 `y: 7.1`，但旧楼屋顶板（`street.ts` 里 `box(b, 5.6, 0.25, 9.7, …, 6.95, …)`，`box()` 的 y 参数是底面）的顶面在 7.2。
- 所以旧楼屋顶的水花生成在板子内部，被挡住了。
- 便利店屋顶那一项 `y: 4.1` 与板顶一致，但屋顶上没有积水，只有很小的水花，看起来像没有反馈。

## 涉及文件
- 修改：`diorama/layout.ts`
- 修改：`diorama/wet-ground.ts`
- 修改（测试，由 Test Agent 负责）：`tests/weather.test.ts`，或新增 `tests/roof-puddles.test.ts`

## 函数清单
### diorama/layout.ts
| 名称 | 职责 |
|---|---|
| `RoofZone`（接口） | 新增布尔字段 `puddles`，表示这块屋顶上要不要画积水 |
| `ROOF_ZONES`（常量） | 旧楼一项 `y` 改为 7.2；便利店屋顶、旧楼屋顶的 `puddles` 为 true，雨棚为 false |

### diorama/wet-ground.ts
| 函数名 | 职责 |
|---|---|
| `roofPuddleLayer` | 新增。按一块屋顶矩形生成涟漪层网格：大小等于矩形，水平放在屋顶顶面上方 0.01 处，复用现有 `RIPPLE_LAYER_VERTEX` / `RIPPLE_LAYER_FRAGMENT` 着色器，`uMask` 取 0，材质关描边，叠加混合，不写深度，一直可见 |
| `createWetGround` | 修改。对 `ROOF_ZONES` 里 `puddles` 为 true 的每一项调用 `roofPuddleLayer` 并加入场景，便利店屋顶那层命名 `roof-puddles-konbini`，旧楼那层命名 `roof-puddles-neighbor`；`update` 同步这两层的 `uTime`；`dispose` 释放它们的几何体与材质；`setReflections` 不改变它们的可见性 |

## 协作关系
- `diorama/world.ts` 已经调用 `createWetGround`、每帧调用 `update`、切档时调用 `setReflections`、卸载时调用 `dispose`，因此不用改。
- `weather.ts` 的 `floorYAt` 继续读 `ROOF_ZONES`，改完高度后雨丝和水花会自动落到正确位置。
- 涟漪着色器的水洼分布由世界坐标噪声决定。屋顶面积小，如果实测某个屋顶上一块积水都没有，可以给 `roofPuddleLayer` 的材质加一个控制积水阈值的 uniform，把它调低，但不改地面层的效果。

## 验证方式
- 测试入口：
  - `bun test`。
  - 用 `tests/world.test.ts` 的组装方式（fake canvas，调用 `buildStore`、`buildStreet` 等）得到场景。
  - 从 `diorama/weather.ts` 调用公开函数 `rainSeeds`。
  - 从 `diorama/wet-ground.ts` 调用公开函数 `createWetGround`，传入场景、宽、高、像素比。
- 测试输入：
  - 在场景里定位两块屋顶板：
    - 便利店屋顶板是 `store` 组里 BoxGeometry 参数为 9.9×0.3×6.4 的网格。
    - 旧楼屋顶板是 `neighbor-building` 组里 BoxGeometry 参数为 5.6×0.25×9.7 的网格。
  - 用 `new THREE.Box3().setFromObject(mesh)` 取两块板的顶面高度。
- 预期结果：
  - 落在两块屋顶板水平范围内的 `rainSeeds` 雨滴，其 `floorY` 与该板顶面高度相差不超过 0.03。
  - `createWetGround` 之后，场景中有 `roof-puddles-konbini` 和 `roof-puddles-neighbor` 两个对象。
    - 水平包围盒分别落在对应屋顶板的水平范围内（允许 0.05 误差）。
    - 高度在对应板顶面上方 0 到 0.03 之间。
  - 依次调用 `setReflections(false)`、`setReflections(true)`，每次调用后这两层的 `visible` 都为 true。
  - 调用 `update(t)` 后，这两层材质的 `uTime` 等于 t。
  - 调用 `dispose()` 后，这两层已从场景移除。
- [ ] 旧楼屋顶和便利店屋顶的雨滴落点与板顶面高度差都不超过 0.03
- [ ] 两层屋顶涟漪存在、范围与高度正确
- [ ] 高低两档下两层都可见
- [ ] 现有 `tests/weather.test.ts` 与 `tests/wet-ground.test.ts` 不回归
