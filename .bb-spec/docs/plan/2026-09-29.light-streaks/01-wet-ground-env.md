---
name: 01-wet-ground-env
description: 去掉地面实时镜面，湿地面改用普通着色器，水洼里按反射方向取加载时拍一次的环境图
---
# 湿地面去掉实时镜面，水洼改用环境图

## 目标
地面不再每帧从下方重拍场景；水洼里的倒影来自加载时拍一次的环境图，任何角度都稳定。

## 业务规则（来源：spec scene/wet-reflection、scene/quality-tier）
- 场景中没有任何每帧重新渲染场景的镜面物体；环境图只在加载时拍一次。
- 反射比例 F(θ) = 0.04 + 0.96 × (1 − cos θ)^5，θ 为视线与地面法线的夹角；F(10°) ≤ 0.05，F(80°) ≥ 0.40，单调增。
- 水洼内：环境图倒影比例取 max(F(θ), 0.25)；水洼里保留同心圆波纹。
- 水洼外的湿地面只保留很淡的湿润底色（光带由另一份 plan 负责）。
- 地面分路面层（马路，y≈0.012）和停车场层（停车场与人行道，y≈0.166），各一块湿层，停车场层只画在停车场和人行道区域。
- 物体下方暗区不变：绘制在光带和水洼倒影之后。
- 高档和低档画质下，地面倒影相关物体和材质完全相同；画质档位只影响渲染分辨率和雨丝数量。
- 静止镜头下不闪，无规则条纹。

## 现状
- `diorama/wet-ground.ts`：`WET_SHADER` + `wetMirror()`（three 的 Reflector），路面镜子 y 0.012，停车场镜子 y 0.166（uMask=1 时只画 `(x<5&&z<5)||z>11||(x>11&&z<5)` 区域），`setReflection({scale, shared})`，`fresnel`、`streakGain`、`contactShadow`、`roofPuddleLayer`（屋顶积水，保留）。
- `diorama/quality.ts` 的 `TIER_SETTINGS` 含 `reflection`；`diorama/world.ts` 的 `applyTier` 调 `setReflection`，resize 时调 `wetGround.resize`。
- 实测问题：Reflector 在拖动、滚轮后倒影贴图内容丢失，根因未定位，故整体去掉。

## 涉及文件
- 修改：`diorama/wet-ground.ts`、`diorama/quality.ts`、`diorama/world.ts`
- 修改（测试，由 Test Agent 负责）：`tests/wet-reflection.test.ts`、`tests/quality.test.ts`、`tests/roof-puddles.test.ts`、`tests/wet-ground.test.ts`

## 函数清单
### diorama/wet-ground.ts
| 名称 | 职责 |
|---|---|
| `WET_GROUND_SHADER`（替换 `WET_SHADER`） | 普通 ShaderMaterial：保留水洼噪声遮罩、水洼内波纹与 uMask 区域判断；水洼内按 `reflect(视线, 法线)` 从 `envMap`（samplerCube）取色 × max(F, 0.25)；水洼外只输出很淡的湿润底色；F 的常量与 `fresnel` 共用 |
| `groundWetLayer` | 新增（替换 `wetMirror`）：按尺寸、高度、uMask 建一块水平平面，材质用 `WET_GROUND_SHADER`，叠加或预乘混合、不写深度、关描边、renderOrder 2 |
| `captureEnvironment`（导出） | 新增：用 `THREE.CubeCamera`（128 边长的 `WebGLCubeRenderTarget`）在 (0, 1.5, 2) 拍一次场景，拍摄期间隐藏传入的需排除物体（雨丝、水花、地面湿层），返回立方体贴图 |
| `createWetGround` | 改为 `createWetGround(scene, envMap)`：建路面、停车场两块湿层与屋顶积水层，返回 `{ update, dispose }`；删除 `setReflection`、`resize`、共用逻辑 |
| `wetMirror`、`streakGain`、Reflector 导入、`glsl` 中只为镜面服务的部分 | 删除（`streakGain` 由下一份 plan 的光带公式取代） |
### diorama/quality.ts
| `TierSettings`/`TIER_SETTINGS` | 删除 `reflection` 字段 |
### diorama/world.ts
| `applyTier` | 不再处理倒影 |
| `mountDiorama` 内初始化 | 场景搭好后调用一次 `captureEnvironment`，把结果传给 `createWetGround`；resize 不再调倒影 resize；卸载时释放环境图 |

## 协作关系
- 暗区 `contactShadow` 保持 renderOrder 3。
- 屋顶积水层不变。
- 下一份 plan（光带）会与湿层共用水洼噪声代码，把噪声 GLSL 保持为可复用的字符串常量。

## 验证方式
- 测试入口：`bun test`；从 `diorama/wet-ground.ts` 导入 `fresnel`、`createWetGround`、`captureEnvironment`；从 `diorama/quality.ts` 导入 `TIER_SETTINGS`。
- 预期：
  - `createWetGround(scene, envMap)` 后场景中没有 `isReflector` 为 true 的物体；新增物体只有两块地面湿层（名 `wet-ground-road`、`wet-ground-lot`）与两层屋顶积水层。
  - 两块湿层材质的 `uniforms.envMap.value` 就是传入的 envMap；路面层 y≈0.012、停车场层 y≈0.166。
  - `TIER_SETTINGS.high`、`TIER_SETTINGS.low` 都没有 `reflection` 字段，其余字段不变。
  - `fresnel` 数值用例不变；暗区用例不回归。
  - `dispose()` 后上述物体从场景移除。
- [ ] 全量 `bun test`、`tsc` 通过
