---
name: 05-diorama-renderer
description: 三维渲染管线（卡通描边、泛光、雾）、材质与几何工具、场景布局常量与画质两档逻辑
---
# 渲染管线与画质档位

## 目标
提供后续场景模块共用的渲染器、材质工具、布局常量，以及可单测的画质选档和降档逻辑。

## 业务规则（来源：spec scene/diorama-layout、scene/quality-tier）
- 画风：
  - 卡通分层着色（4 级明暗）；
  - 实体物件带深蓝细描边，粗细 0.0018，颜色 `[0.05, 0.07, 0.15]`；
  - 蓝色指数雾，颜色 `#1a2858`，密度 0.012；
  - 背景为深蓝径向渐变；
  - 泛光强度 0.6、半径 0.6、阈值 0.97；
  - 不做色调映射。
- 自发光材质不受雾影响，远处招牌仍能触发泛光。
- 整体视角镜头的布局常量：
  - 默认镜头位置 `(33, 23, 40)`，看向 `(0, -1.4, -0.5)`，视场角 28°；
  - 缩放距离 16～80 米，仰角范围 0.2～1.4 弧度；
  - 竖屏时镜头距离按 `min(1.9, (高/宽)^0.85)` 放大。
- 画质两档：
  - 高档：开倒影，像素比取 `min(设备像素比, 2)`，雨丝基准数量；
  - 低档：关倒影，像素比 1，雨丝减半。
- 选档与降档：
  - `pointer: coarse` 成立或视口宽度 < 768 时初始低档，否则高档。
  - 高档下任一连续 5 秒窗口内，第 95 百分位帧间隔 > 33.4 毫秒即降到低档，本次访问不再升档。
  - 页面隐藏期间不计入统计。

## 涉及文件
- 新建：`diorama/layout.ts`、`diorama/renderer.ts`、`diorama/materials.ts`、`diorama/primitives.ts`、`diorama/quality.ts`
- 新建：`tests/quality.test.ts`、`tests/layout.test.ts`

## 函数清单
### diorama/layout.ts
| 名称 | 职责 |
|---|---|
| `BASE_HALF` | 底座半边长 13 米 |
| `DEFAULT_CAMERA` | 默认镜头位置、观察目标、视场角 |
| `ORBIT_LIMITS` | 缩放距离与仰角范围 |
| `CAR_CENTER` | 保时捷中心世界坐标 `(-0.85, 0.15, 1.15)` |
| `ROOF_ZONES` | 便利店屋顶、雨棚、旧楼屋顶的水平范围与高度（雨、水花用来确定落点高度） |
| `isOnLot` | 判断水平坐标是否落在高出路面 0.15 米的地块或对面人行道上 |
| `portraitDistanceScale` | 按视口宽高计算竖屏镜头距离放大系数 |

### diorama/materials.ts
| 名称 | 职责 |
|---|---|
| `setCanvasFactory` | 设定创建画布的函数，默认 `document.createElement('canvas')`；测试可注入假画布 |
| `ctex` | 用画布绘制函数生成 `CanvasTexture`（sRGB、各向异性 8，可选重复） |
| `toon` | 带缓存的 `MeshToonMaterial` 工厂（颜色、自发光强度、贴图、透明度、双面、关描边） |
| `glow` | 不受色调映射与雾影响的自发光 `MeshBasicMaterial` 工厂（颜色乘系数） |
| `noOutline` | 在材质 `userData.outlineParameters` 标记不画描边 |
| `roundRect` | 画布圆角矩形路径工具 |
| `sharedTime` | 全场景着色器共用的时间 uniform 对象（`{ value: 秒数 }`），由 09 的 `world.ts` 每帧更新 |

### diorama/primitives.ts
| 名称 | 职责 |
|---|---|
| `add`、`box`、`cyl`、`plane`、`flat`、`rod` | 按原型的底部对齐约定创建网格并加入父节点（盒、圆柱、竖平面、水平面、两点间圆杆） |

### diorama/renderer.ts
| 名称 | 职责 |
|---|---|
| `createRenderer` | 创建 `WebGLRenderer`、场景背景与雾、`PerspectiveCamera`、`OutlineEffect`、`EffectComposer`（多重采样 HalfFloat 目标 + 自定义描边渲染通道 + 泛光 + 输出通道）；返回渲染、尺寸调整、设置像素比、销毁接口；WebGL 创建失败时抛出错误 |
| `ToonPass` | 在合成器中调用 `OutlineEffect.render` 的渲染通道 |
| `disableFogOnEmissive` | 遍历场景，把所有 `MeshBasicMaterial` 的 `fog` 设为 false |

### diorama/quality.ts
| 名称 | 职责 |
|---|---|
| `initialTier` | 输入 `pointer: coarse` 结果与视口宽度，返回 `'high'` 或 `'low'` |
| `createFrameMonitor` | 记录帧间隔（跳过页面隐藏期间），在高档下检测连续 5 秒窗口的第 95 百分位，超过 33.4 毫秒时回调降档，且只回调一次 |
| `percentile95` | 计算一组间隔的第 95 百分位 |
| `TIER_SETTINGS` | 两档的像素比规则、倒影开关、雨丝比例 |

## 协作关系
- 使用 three 自带的 `OutlineEffect`、`EffectComposer`、`Pass`、`UnrealBloomPass`、`OutputPass`（`three/addons`）。
- 06、07、08 使用 `materials`、`primitives`、`layout`；09 的 `world.ts` 调用 `createRenderer`、`initialTier`、`createFrameMonitor`、`disableFogOnEmissive`。
- 原型中的对应代码：`toon`、`glow`、`noOL`、`ctex`、`add`、`box`、`cyl`、`plane`、`flat`、`rod`、`ToonPass` 以及渲染器与合成器初始化段落，按此拆分搬移。

## 验证方式
- 测试入口：`bun test tests/quality.test.ts tests/layout.test.ts`
- 测试输入：直接调用 `initialTier`、`createFrameMonitor`、`percentile95`、`portraitDistanceScale`、`isOnLot`；帧监视器用人工时间序列驱动（每帧传入时间戳与页面是否可见）。
- 预期结果：
  - `initialTier(true, 1440) === 'low'`，`initialTier(false, 767) === 'low'`，`initialTier(false, 1440) === 'high'`。
  - 注入 5 秒、每帧间隔 48 毫秒的序列，降档回调被调用 1 次；之后再注入流畅序列不再回调。
  - 注入 5 秒、每帧 16.7 毫秒的序列不回调。
  - 页面隐藏期间注入的慢帧不计入（隐藏 5 秒慢帧后可见流畅帧，不降档）。
  - `percentile95([10×95 个, 50×5 个])` 返回 ≤ 50 且 ≥ 10 的对应值（按实现约定的取法，测试用 100 个样本中 96 个 16 毫秒、4 个 60 毫秒，结果应为 16）。
  - `portraitDistanceScale(1440, 900) === 1`；`portraitDistanceScale(390, 844)` 介于 1 与 1.9 之间。
  - `isOnLot(0, 0)` 为真，`isOnLot(8, 8)`（路口路面）为假。
- [ ] 上述断言全部通过。
