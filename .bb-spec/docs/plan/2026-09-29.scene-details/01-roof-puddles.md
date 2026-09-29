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
  - 便利店屋顶和旧楼屋顶上各有 2 到 4 块位置固定、边缘清晰的椭圆形小积水，每块面积不超过 2 平方米。
  - 积水面泛着一层淡淡的水光，雨点在积水里荡开同心圆波纹；积水以外的屋顶面不出现水光和波纹。
  - 积水完整落在女儿墙以内，不压在屋顶设备（空调、水箱、天线、楼梯间等）底下。
  - 积水的位置和大小是写死的数据，不由随机数或噪声决定，所以每台设备上都一样。
  - 水光和波纹只画在两个屋顶的顶面范围内；高档和低档画质都显示。
- 雨棚不需要积水。

## 现状与根因
- `diorama/weather.ts` 的 `floorYAt` 按 `diorama/layout.ts` 的 `ROOF_ZONES` 决定雨丝和水花的落点高度。
- 旧楼那一项写的是 `y: 7.1`，但旧楼屋顶板（`street.ts` 里 `box(b, 5.6, 0.25, 9.7, …, 6.95, …)`，`box()` 的 y 参数是底面）的顶面在 7.2。
- 所以旧楼屋顶的水花生成在板子内部，被挡住了。
- 便利店屋顶那一项 `y: 4.1` 与板顶一致，但屋顶上没有积水，只有很小的水花，看起来像没有反馈。
- 地面涟漪着色器 `RIPPLE_LAYER_FRAGMENT` 用 `fract(sin(…)*43758)` 噪声决定水洼位置，而且只画波纹圈、不画水面。屋顶坐标比较大时，不同显卡的浮点误差会让水洼分布完全不同，还可能一大片或一块都没有。所以屋顶不能复用它的水洼遮罩。

## 涉及文件
- 修改：`diorama/layout.ts`
- 修改：`diorama/wet-ground.ts`
- 修改（测试，由 Test Agent 负责）：`tests/weather.test.ts`，或新增 `tests/roof-puddles.test.ts`

## 函数清单
### diorama/layout.ts
| 名称 | 职责 |
|---|---|
| `RoofPuddle`（接口） | 新增：一块椭圆积水，字段 `x`、`z`（世界坐标中心）、`rx`、`rz`（沿 x、z 的半轴，米） |
| `RoofZone`（接口） | 新增字段 `puddles: RoofPuddle[]`，空数组表示这块屋顶不画积水 |
| `ROOF_ZONES`（常量） | 按下方成品定义整体替换 |

### diorama/wet-ground.ts
| 函数名 | 职责 |
|---|---|
| `ROOF_PUDDLE_FRAGMENT`（着色器常量） | 新增。复用 `GLSL_HASH` 与现有 `ripples()` 画波纹；积水遮罩改为按 uniform 数组 `uPuddles`（每项 vec4：x、z、rx、rz，最多 4 项，`uCount` 为实际块数）计算椭圆，边缘约 3 厘米软过渡；输出为「常量水光色 `uSheen` × 遮罩 + 波纹 × 遮罩」，遮罩为 0 处输出全黑透明 |
| `roofPuddleLayer` | 修改。用单位平面按屋顶矩形缩放、放在顶面上方 0.01 处（保持现有写法），改用 `ROOF_PUDDLE_FRAGMENT`，把该屋顶的 `puddles` 写入 `uPuddles` / `uCount`，`uSheen` 为一个淡蓝色小值（如 0.06, 0.08, 0.12）；叠加混合、不写深度、关描边、一直可见 |
| `createWetGround` | 修改。对 `puddles` 非空的屋顶调用 `roofPuddleLayer`，命名规则同前（`roof-puddles-konbini`、`roof-puddles-neighbor`）；`update`、`dispose`、`setReflections` 的处理同前 |

## 成品定义
`diorama/layout.ts` 中 `ROOF_ZONES` 的最终内容（其余字段保持现值；积水已避开便利店屋顶的 3 台空调与小方箱、旧楼的水箱与天线，并留出旧楼楼梯间与晾衣架的位置）：

```ts
export const ROOF_ZONES: RoofZone[] = [
  {
    x0: -6.2, x1: 3.7, z0: -9.1, z1: -2.9, y: 4.1,
    puddles: [
      { x: -1.8, z: -4.3, rx: 0.9, rz: 0.5 },
      { x: 2.2, z: -6.6, rx: 0.7, rz: 0.45 },
      { x: -4.6, z: -3.9, rx: 0.55, rz: 0.4 },
    ],
  },
  { x0: -6.2, x1: 3.7, z0: -2.9, z1: -1.35, y: 2.72, puddles: [] },
  {
    x0: -13, x1: -7.6, z0: -13, z1: -3.5, y: 7.2,
    puddles: [
      { x: -9.4, z: -8.8, rx: 0.8, rz: 0.5 },
      { x: -11.6, z: -5.2, rx: 0.6, rz: 0.4 },
      { x: -9.0, z: -11.8, rx: 0.55, rz: 0.35 },
    ],
  },
];
```

## 协作关系
- `diorama/world.ts` 已经调用 `createWetGround`、每帧调用 `update`、切档时调用 `setReflections`、卸载时调用 `dispose`，因此不用改。
- `weather.ts` 的 `floorYAt` 继续读 `ROOF_ZONES`，改完高度后雨丝和水花会自动落到正确位置。
- 地面两层（`rippleRoad`、`rippleLot`）继续用 `RIPPLE_LAYER_FRAGMENT`，不改。
- 03 在旧楼屋顶放楼梯间和晾衣架时，要避开上面三块旧楼积水。

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
  - 积水数据（从 `diorama/layout.ts` 导入 `ROOF_ZONES`）：便利店屋顶和旧楼屋顶各有 2 到 4 块；每块 π·rx·rz ≤ 2；每块椭圆的外接矩形在对应屋顶板水平范围内缩 0.15（女儿墙厚度）之后的范围里；与屋顶设备的水平包围盒不相交（便利店：`store` 组里 4.1 以上的空调、小方箱；旧楼：`neighbor-building` 组里 y 在 7.2 以上的所有网格）。雨棚那一项没有积水。
  - 每层积水层材质的 `uniforms.uCount.value` 等于对应屋顶积水块数，`uniforms.uPuddles.value` 前 uCount 项依次等于 (x, z, rx, rz)；`uniforms.uSheen.value` 的三个分量都大于 0。
  - `createSplashes` 返回的网格几何体里，`seed` 属性落在两块屋顶板水平范围内（内缩 0.4，避开 ±0.3 的随机抖动）的水花，其 `floorY` 属性与对应板顶面相差不超过 0.03。
- [ ] 旧楼屋顶和便利店屋顶的雨滴落点与板顶面高度差都不超过 0.03
- [ ] 两层屋顶涟漪存在、范围与高度正确
- [ ] 高低两档下两层都可见
- [ ] 现有 `tests/weather.test.ts` 与 `tests/wet-ground.test.ts` 不回归
