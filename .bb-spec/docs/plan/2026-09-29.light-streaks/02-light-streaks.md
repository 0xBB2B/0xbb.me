---
name: 02-light-streaks
description: 灯光光带：按相机与灯的镜像点算落点，路面层与停车场层各一条，信号灯光带颜色每帧跟随
---
# 灯光光带

## 目标
店铺灯、路灯、立式招牌、信号灯在湿地面上拉出竖直光带，任何视角都在正确位置，俯视淡、压低时强。

## 业务规则（来源：spec scene/wet-reflection）
- 光带来源三组：
  - 店铺：店头招牌、正面玻璃窗、侧面玻璃窗、喫茶店门面、喫茶店灯箱、两台自动贩卖机。
  - 路灯与立式招牌：3 盏路灯、OxBB MART 立式招牌。
  - 信号灯与行人灯：光带颜色等于该灯此刻亮着的颜色，灯灭时光带亮度为 0。
- 光带落点：把灯按所在地面层高度做镜像，相机与镜像点连线和该层地面的交点，误差 ≤ 1 厘米；光带从落点沿地面朝相机方向拉长。
- 光带中心亮度 = 灯颜色 × F(θ) × 3，F(θ) = 0.04 + 0.96 × (1 − cos θ)^5。
- 每个灯在路面层（y≈0.012）和停车场层（y≈0.166）各一条光带；路面层只画在马路区域，停车场层只画在停车场和人行道区域（区域判断与湿地面一致：停车场/人行道为 `(x<5&&z<5)||z>11||(x>11&&z<5)`）；超出底座（|x|、|z| > 13）不画。
- 光带在水洼内亮度为水洼外的 2 倍。
- 物体下方暗区绘制在光带之后。
- 高低档画质下光带相同；静止镜头下除信号灯变化外不闪。

## 涉及文件
- 新建：`diorama/light-streaks.ts`
- 修改：`diorama/street.ts`（`Lamp` 加 `mesh`）、`diorama/world.ts`（创建与每帧更新）、`diorama/wet-ground.ts`（导出水洼噪声 GLSL 常量供复用，如尚未导出）
- 新建（测试，由 Test Agent 负责）：`tests/light-streaks.test.ts`

## 成品定义
`diorama/light-streaks.ts` 中的店铺、路灯与立式招牌光源（世界坐标；颜色为线性空间近似值）：

```ts
export const STORE_STREAK_SOURCES: StreakSource[] = [
  { name: 'fascia', position: [-1.25, 3.22, -2.66], width: 9.9, color: '#fff6e8' },
  { name: 'store-front-glass', position: [-1.25, 1.43, -3.04], width: 9.3, color: '#fff1d8' },
  { name: 'store-side-glass', position: [3.51, 1.63, -5.4], width: 3.6, color: '#fff1d8' },
  { name: 'kissa-front', position: [-10.6, 1.35, -3.49], width: 3.2, color: '#ffe0a0' },
  { name: 'kissa-lightbox', position: [-10.85, 0.45, -3.1], width: 0.45, color: '#fff4dc' },
  { name: 'vending-1', position: [4.33, 1.1, -8.42], width: 0.9, color: '#f2f4f7' },
  { name: 'vending-2', position: [4.33, 1.1, -7.48], width: 0.9, color: '#ffd6dc' },
  { name: 'street-lamp-1', position: [-8.8, 5.12, 4.95], width: 0.5, color: '#d6e6ff' },
  { name: 'street-lamp-2', position: [11.15, 5.12, -5.5], width: 0.5, color: '#d6e6ff' },
  { name: 'street-lamp-3', position: [-2.5, 5.12, 10.95], width: 0.5, color: '#d6e6ff' },
  { name: 'pylon', position: [-6.4, 5.05, 2.9], width: 1.5, color: '#e8fff9' },
];
```

## 函数清单
### diorama/light-streaks.ts
| 名称 | 职责 |
|---|---|
| `StreakSource`（类型，导出） | name、position、width、color；信号灯来源另带一个每帧取颜色的函数 |
| `streakAnchor`（导出） | 纯函数：输入相机位置、灯位置、地面高度，返回相机与镜像点连线和该平面的交点 |
| `STORE_STREAK_SOURCES`（导出） | 见成品定义 |
| `signalStreakSources`（导出） | 从 `street.vehicleSignals`、`street.pedestrianSignals` 的每个 Lamp 取 `mesh` 世界位置、宽约 0.25，颜色函数：灯亮（颜色亮度高于 base 亮度）时返回 base，否则返回黑色 |
| `createLightStreaks`（导出） | 为路面层、停车场层各建一个网格（`light-streaks-road`、`light-streaks-lot`），每个光源一个四边形；顶点属性含灯位置、宽度、颜色、角点；顶点着色器用 `cameraPosition` 按 `streakAnchor` 同算法求落点，沿地面朝相机方向拉长，长度 = clamp(灯离地高度 × 1.5 ÷ max(cosθ, 0.2), 0.5, 8)；片元：颜色 × F × 3 × 横向高斯 × 纵向衰减，水洼内 ×2，按层遮罩与底座范围 discard；叠加混合、深度测试开、不写深度、关描边、renderOrder 2；返回 `{ update, dispose }`，`update` 把带颜色函数的光源颜色写回颜色属性并标记更新 |
### diorama/street.ts
| `Lamp` | 增加 `mesh` 字段（灯面网格），`signalHead`、`pedHead` 返回时填入 |
### diorama/world.ts
| 初始化与循环 | 创建光带（店铺来源 + 信号灯来源），每帧在 ambient 更新灯之后调用 `update`，卸载时 `dispose` |

## 协作关系
- 依赖 01：湿层的水洼噪声 GLSL 与区域判断共用。
- `ambient.ts` 的 `setLamp` 不改；光带只读取灯的材质颜色。
- 暗区 renderOrder 3 盖住光带。

## 验证方式
- 测试入口：`bun test`；从 `diorama/light-streaks.ts` 导入 `streakAnchor`、`STORE_STREAK_SOURCES`、`signalStreakSources`、`createLightStreaks`；场景组装沿用 `tests/world.test.ts` 的方式，`buildStreet` 的返回值提供信号灯。
- 预期：
  - 3 组（相机、灯、地面高度）输入下，`streakAnchor` 与手算交点误差 ≤ 0.01。
  - `STORE_STREAK_SOURCES` 有 11 项，名字与成品定义一致。
  - `createLightStreaks(scene, sources)` 后场景中有 `light-streaks-road`、`light-streaks-lot` 两个网格，每个的四边形数等于光源数（11 + 所有信号灯与行人灯的灯数）。
  - 把某个信号灯材质颜色设为 base×2.4（亮）后调用 `update()`，该光源顶点颜色等于 base；设为 base×0.1（灭）后为 0。
  - 两个网格材质：叠加混合、`depthWrite` 为 false、`depthTest` 为 true、renderOrder 为 2（小于暗区 3），关描边。
- [ ] 全量 `bun test`、`tsc` 通过；1440×900 旋转 30 秒帧率用例通过
- [ ] 截图：默认、压低、俯视、先拖动再滚轮后，光带都在；信号灯变色后光带跟着变
