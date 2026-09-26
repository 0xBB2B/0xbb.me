---
name: 09-camera-and-interaction
description: 视角状态机、镜头进出车动画与转头限制、悬停点击检测、Esc 与浏览器返回、中控屏三维叠加、场景总装
---
# 镜头、交互与场景总装

## 目标
把 05～08 的模块装成一个可挂载的三维场景，实现整体视角与驾驶位视角之间的全部交互。

## 业务规则（来源：spec cabin/car-hover-hint、cabin/enter-driver-view、cabin/driver-look、cabin/exit-driver-view、profile/cabin-displays、scene/diorama-layout、scene/quality-tier）
- 视角状态有四种：`diorama`（整体视角）、`entering`（进车中）、`driver`（驾驶位视角）、`exiting`（出车中）。
  过渡状态下忽略所有点击、拖动、滚轮和按键；重复触发不叠加动画。
- 整体视角：
  - 左键拖动旋转，滚轮或双指缩放，右键或双指拖动平移；
  - 缩放 16～80 米，仰角 0.2～1.4 弧度。
- 悬停（仅整体视角、`hover: hover` 设备）：
  - 射线最先命中 `porsche` 组内物体时，canvas `cursor` 设为 `pointer`，车身描边改为暖白、更粗；
  - 离开后恢复。被遮挡不算命中。
- 进车：
  1. 触发方式：点击命中 `porsche`，或点击键盘入口按钮。
  2. 记下当前整体视角（位置、目标、距离），推入一条浏览器历史（`history.pushState`，路径不变）。
  3. 镜头移到驾驶门外观察点 → 门开到 65° → 镜头移入驾驶座眼睛位置 → 门关上，总时长 ≤ 3.5 秒，结束后进入 `driver`。
  4. 最终镜头：视口宽高比 ≥ 1 时为驾驶座视角；< 1 时前移到对准中控屏的位置，中控屏宽度 ≥ 视口宽度的 60%。
  5. 进入 `driver` 后停用整体视角的镜头操作。
- 驾驶位转头：
  - 拖动只改朝向：水平 −30°～+30°，俯仰 −15°～+15°，超出停在边界，松开保持；
  - 滚轮、捏合、右键无效；
  - 在中控屏网页内容上拖动不转头；
  - 每次进车朝向重置为初始朝向。
- 出车：
  1. 触发方式：点击门把手、按 Esc（焦点在中控屏内也生效）、浏览器返回（`popstate`）。
  2. 过程：门开 → 镜头移到门外 → 门关 → 镜头回到记下的整体视角（误差 ≤ 0.1 米），总时长 ≤ 3.5 秒。
  3. 门把手或 Esc 触发时调用 `history.back()` 撤回那条历史，其引发的 `popstate` 不再触发第二次出车；`popstate` 触发时不再额外返回。
- 门把手：悬停时 `cursor` 为 `pointer` 且变亮。
- 中控屏网页内容用 `CSS3DRenderer` 叠放在 `center-screen` 平面上，随镜头对齐；只在 `driver` 状态可见、可交互、可聚焦，其余状态 `inert` 且隐藏。
- 键盘入口按钮「进入驾驶座」/ "Take the driver's seat"：
  - 平时视觉隐藏；获得焦点时显示在左上角；
  - 回车或空格等同点车；
  - 只在 `diorama` 状态可聚焦。
- 画质：初始档按 05 的规则选；帧监视器触发降档后调用倒影关闭、像素比设为 1、雨丝减半。

## 涉及文件
- 新建：`diorama/view-state.ts`、`diorama/camera-rig.ts`、`diorama/interaction.ts`、`diorama/screen-overlay.ts`、`diorama/world.ts`
- 新建：`components/EnterCarButton.tsx`、`components/EnterCarButton.css`
- 新建：`tests/view-state.test.ts`、`tests/camera-rig.test.ts`

## 函数清单
### diorama/view-state.ts（纯函数）
| 函数名 | 职责 |
|---|---|
| `transition` | 输入当前状态与事件（`clickCar`、`enterDone`、`exit`（附来源 `handle`/`esc`/`popstate`）、`exitDone`），返回新状态与副作用指令（是否 `pushState`、是否 `history.back()`、是否忽略） |
| `acceptsInput` | 状态为 `diorama` 或 `driver` 时返回真 |

### diorama/camera-rig.ts
| 函数名 | 职责 |
|---|---|
| `createCameraRig` | 创建并配置 `OrbitControls`（阻尼、距离、仰角限制，竖屏距离放大）；返回启停控制、记录/恢复整体视角、播放进车与出车序列、应用转头的接口 |
| `enterSequence` | 生成进车的分段关键帧（镜头到门外 1.2 秒、开门 0.6 秒、入座 1.0 秒、关门 0.5 秒），按宽高比选择最终镜头 |
| `exitSequence` | 生成出车的分段关键帧（开门 0.5 秒、出门 0.9 秒、关门 0.4 秒、回整体视角 1.4 秒） |
| `sequenceDuration` | 计算序列总时长 |
| `clampLook` | 把水平角限制在 ±30°、俯仰角限制在 ±15° |
| `driverPose` | 按视口宽高比返回驾驶位最终镜头（宽屏为眼睛位置，竖屏为对准中控屏位置）与初始朝向 |

### diorama/interaction.ts
| 函数名 | 职责 |
|---|---|
| `createInteraction` | 监听 canvas 指针与键盘、`popstate`；用射线检测 `porsche` 与 `door-handle`；按 `view-state` 分派进出车、转头拖动；维护 `cursor` 与车身描边高亮、门把手高亮 |
| `setCarHighlight` | 修改 `porsche` 组内材质的描边参数（颜色、粗细）为高亮或普通 |

### diorama/screen-overlay.ts
| 函数名 | 职责 |
|---|---|
| `createScreenOverlay` | 创建 `CSS3DRenderer` 图层（覆盖在 canvas 上、默认不接收指针），把传入的 DOM 元素包进 `CSS3DObject` 对齐到 `center-screen` 平面，并按屏幕物理尺寸缩放；提供每帧渲染与尺寸调整 |

### diorama/world.ts
| 函数名 | 职责 |
|---|---|
| `mountDiorama` | 先调用 06 的 `loadCanvasFonts()` 等待画布字体加载（超时 3 秒后照常继续），再在容器中依次创建渲染器、展示台与场景、天气、湿地面、车与内饰、灯光、环境动效、镜头、交互、中控屏图层；返回 `ready`（首帧画出后 resolve）、`enterCar`、`setLanguage`、`onViewChange`、`onQualityChange`、`onContextLost`、`screenElement`、`dispose` |
| `renderLoop` | 每帧更新 `sharedTime`、环境动效、倒影时间、镜头序列、帧监视器，合成渲染并渲染中控屏图层 |

### components/EnterCarButton.tsx
| 函数名 | 职责 |
|---|---|
| `EnterCarButton` | 视觉隐藏（聚焦时显示在左上角）的原生 `<button>`，文字随语言；`disabled` 或 `tabIndex=-1` 由上层按状态控制；点击调用进车 |

## 协作关系
- 依赖 05（渲染与画质）、06（场景与 `setPlaqueLanguage`）、07（天气、湿地面、环境动效）、08（车、内饰、`CAR_ANCHORS`、`setDoorAngle`、`setHandleHighlight`）。
- 使用 three 自带的 `OrbitControls`、`CSS3DRenderer`、`CSS3DObject`。
- 10 的 `SceneViewport` 调用 `mountDiorama`，把 03 的 `CenterScreen` 通过 React portal 渲染进 `screenElement`，订阅 `onViewChange` 与 `onQualityChange` 写入 `<html>` 的 `data-view`、`data-quality`。

## 验证方式
- 测试入口：`bun test tests/view-state.test.ts tests/camera-rig.test.ts`（纯函数）；交互端到端在 10 覆盖。
- 测试输入：直接调用 `transition`、`acceptsInput`、`enterSequence`、`exitSequence`、`sequenceDuration`、`clampLook`、`driverPose`。
- 预期结果：
  - `diorama` + `clickCar` → `entering`，指令含 `pushState`；`entering` + 任意输入事件 → 被忽略；`entering` + `enterDone` → `driver`。
  - `driver` + `exit(handle)` 或 `exit(esc)` → `exiting`，指令含 `history.back()`；`driver` + `exit(popstate)` → `exiting`，不含 `history.back()`。
  - `exiting` + `exit(popstate)`（由自身 `history.back()` 引起）→ 保持 `exiting`、不重复。
  - `exiting` + `exitDone` → `diorama`。
  - `acceptsInput` 仅在 `diorama`、`driver` 为真。
  - `sequenceDuration(enterSequence(16/9))` ≤ 3.5；`sequenceDuration(exitSequence())` ≤ 3.5。
  - `clampLook(50°, 40°)` → `(30°, 15°)`；`clampLook(−50°, −40°)` → `(−30°, −15°)`。
  - `driverPose(390/844)` 的镜头位置比 `driverPose(1440/900)` 更靠近中控屏中心。
- [ ] 上述断言全部通过。
