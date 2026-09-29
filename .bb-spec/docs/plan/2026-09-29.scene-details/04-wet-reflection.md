---
name: 04-wet-reflection
description: 湿地面倒影按视角变强弱、只映亮处光带、物体下方暗区；低档保留低清共用倒影，去掉只画波纹的叠加层
---
# 湿地面倒影真实感与低档倒影

## 目标
倒影随镜头连续变强变弱，不再"要么满地、要么全无"；物体正下方没有倒影；高低两档都有倒影。

## 业务规则（来源：spec scene/wet-reflection、scene/quality-tier）
- 反射比例 F(θ) = 0.04 + 0.96 × (1 − cos θ)^5，θ 为视线与地面法线（竖直向上）的夹角。F(10°) ≈ 0.04，F(65°) ≈ 0.10，F(80°) ≈ 0.41。
- 水洼以外的湿路面：倒影强度 = 倒影颜色 × F(θ) × g(L)。L 是倒影亮度（0 到 1）；L ≤ 0.35 时 g = 0，L 从 0.35 到 1 时 g 平滑单调增大到 3。倒影只沿竖直方向模糊成光带，水平方向不做随机偏移。
- 水洼内：清晰镜面，底下标线隐约可见；倒影比例取 max(F(θ), 0.25)。
- 保时捷、两台自动贩卖机、垃圾分类桶、每辆自行车正下方各有一块边缘柔和的暗区：中心在物体底面投影内，离地不超过 3 厘米，绘制在地面倒影之后，中心不透明度 ≥ 0.9，边缘渐变到 0。
- 静止镜头下倒影不随时间闪动，不出现规则的重影条纹或摩尔纹。
- 画质档位：
  - 高档：倒影贴图宽高各为渲染尺寸的 1/2，路面、停车场各渲染一次倒影（每帧额外渲染场景 2 次）。
  - 低档：倒影贴图宽高各为渲染尺寸的 1/4，路面、停车场共用一次倒影渲染（每帧额外 1 次）。
  - 两档都显示倒影；降档后倒影仍可见。

## 现状与根因
- 倒影时有时无（用户已确认画质档位为 high，不是降档）：地面是两面真实镜子（`diorama/wet-ground.ts` 的 `wetMirror`，three 的 `Reflector`）。倒影落点完全由视角决定，招牌这类大亮块在镜头高时映到店铺背后被挡住，镜头一低就整块滑到停车场上。
- 倒影太夸张：`WET_SHADER` 里湿路面强度是常数（`refl*.38*uK`），不随视角变化；水洼以外还叠了水平和竖直的噪声扰动（`(vnoise…-.5)*.006*(1.-pud)`）和很大的竖向拉伸，满地都是波浪竖纹。
- 车底有倒影：镜子会把车身整个映出来，车子正下方没有任何遮挡。
- 低档：`world.ts` 的 `applyTier` 调用 `wetGround.setReflections(false)`，隐藏镜子，改显示只画波纹的叠加层（`rippleLayer` 的 `rippleRoad` / `rippleLot`）。

## 涉及文件
- 修改：`diorama/wet-ground.ts`、`diorama/quality.ts`、`diorama/world.ts`
- 修改：`diorama/car.ts`、`diorama/store.ts`、`diorama/street.ts`（加暗区）
- 修改（测试，由 Test Agent 负责）：`tests/quality.test.ts`、`tests/weather.test.ts`，新增 `tests/wet-reflection.test.ts`

## 函数清单
### diorama/wet-ground.ts
| 名称 | 职责 |
|---|---|
| `fresnel`（导出） | 新增。输入 cos θ，返回 F(θ) |
| `streakGain`（导出） | 新增。输入亮度 L，返回 g(L)：`3 × smoothstep(0.35, 1, L)` |
| `WET_SHADER` | 修改。片元着色器用内置 `cameraPosition` 与世界坐标 `vW` 算 cos θ；与 `fresnel`、`streakGain` 使用同一组常数（从 JS 常量拼进 GLSL 字符串，避免两处写死）；水洼外 = 倒影 × F × g(亮度)，只做竖直方向模糊，去掉水平噪声偏移；水洼内 = 镜面 × max(F, 0.25) + 原有波纹 |
| `rippleLayer` / `RIPPLE_LAYER_FRAGMENT`（地面用法） | 删除地面两层叠加层 `rippleRoad`、`rippleLot`（两档都有镜子后不再需要）；`RIPPLES_GLSL` 与屋顶积水层保留 |
| `createWetGround` | 修改。返回值中的 `setReflections` 改为 `setReflection`，参数为画质档位的倒影设置（scale、shared）。`shared` 为 true 时：停车场镜子不再自己渲染，其材质的 `tDiffuse` 与 `textureMatrix` 改用路面镜子的；为 false 时各自渲染。`resize` 按当前 scale 设置渲染目标尺寸（`max(1, round(w × pr × scale))`）。`update`、`dispose` 同步去掉已删的叠加层 |

### diorama/quality.ts
| 名称 | 职责 |
|---|---|
| `TierSettings` / `TIER_SETTINGS` | `reflections: boolean` 改为 `reflection: { scale: number; shared: boolean }`：高档 `{ scale: 0.5, shared: false }`，低档 `{ scale: 0.25, shared: true }` |

### diorama/world.ts
| 名称 | 职责 |
|---|---|
| `applyTier` | 改为调用 `wetGround.setReflection(settings.reflection)` |

### 暗区
| 名称 | 所在文件 | 职责 |
|---|---|---|
| `contactShadow`（导出） | `diorama/wet-ground.ts` | 新增。在给定父节点下放一块水平的暗区平面：名称 `contact-shadow`，宽深按物体底面略放大，MeshBasicMaterial 黑色、透明、`alphaMap` 为中心不透明向外渐变到 0 的径向贴图（全局共用一张 DataTexture 或画布贴图）、不写深度、关描边、`renderOrder` 大于地面镜子（镜子为 2） |
| `buildCar` | `diorama/car.ts` | 车组下加一块暗区（车底投影范围，高度为车所在地面 + 0.015） |
| `vending` / 垃圾桶循环 | `diorama/store.ts` | 每台贩卖机、垃圾桶那一排各加一块暗区 |
| `bike` | `diorama/street.ts` | 每辆自行车加一块暗区 |

## 协作关系
- 停车场镜子共用路面倒影时，两者高度相差约 0.15 米，倒影会有轻微错位，低档可以接受。
- `Reflector` 的 `onBeforeRender` 负责渲染倒影；共用模式下把停车场镜子的 `onBeforeRender` 换成空函数即可，切回高档时恢复。
- 暗区贴图是纯数据贴图，不写文字，不影响 `SIGNAGE_TEXT`。
- 本 plan 在 03 之后执行（共改 `street.ts`）。

## 验证方式
- 测试入口：`bun test`。从 `diorama/wet-ground.ts` 导入 `fresnel`、`streakGain`、`createWetGround`；从 `diorama/quality.ts` 导入 `TIER_SETTINGS`；场景组装沿用 `tests/world.test.ts` 的方式，另外调用 `buildCar()`（`diorama/car.ts`）把车加入场景。
- 预期结果：
  - `fresnel(cos 10°) ≤ 0.05`，`fresnel(cos 80°) ≥ 0.40`，θ 在 10° 到 80° 间单调增大。
  - `streakGain(0.3) = 0`，`streakGain(0.35) = 0`，`streakGain(1) = 3`，0.35 到 1 之间单调增大。
  - `TIER_SETTINGS.high.reflection` 为 `{ scale: 0.5, shared: false }`，`low` 为 `{ scale: 0.25, shared: true }`。
  - `createWetGround(scene, 800, 600, 1)` 后：
    - `setReflection({ scale: 0.25, shared: true })` 后两面镜子都可见，停车场镜子材质的 `uniforms.tDiffuse.value` 与路面镜子的相同，渲染目标宽高为 200×150。
    - `setReflection({ scale: 0.5, shared: false })` 后两者不同，各为 400×300。
    - 场景中不再有只画波纹的地面叠加层；屋顶积水层仍在。
  - 组装场景后：保时捷、两台自动贩卖机、垃圾桶那一排、3 辆自行车下方各能找到名为 `contact-shadow` 的网格；每块中心的水平位置在对应物体包围盒的水平范围内；高度在物体底部到其上方 0.03 之间；材质为 MeshBasicMaterial、`transparent` 为 true、有 `alphaMap`、`renderOrder` > 2。
- [ ] 以上断言通过；全量 `bun test`、`tsc` 通过
- [ ] 1440×900 生产构建下旋转 30 秒的帧率用例仍然通过
- [ ] 截图：默认视角、压低视角、俯视三张，倒影强弱连续变化，车底为暗区；低档截图有倒影
