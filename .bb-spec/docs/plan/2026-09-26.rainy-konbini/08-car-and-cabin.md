---
name: 08-car-and-cabin
description: 保时捷外观（双闪、固定尾翼、前铰链驾驶门）与驾驶位内饰、仪表盘名字、中控屏与门把手锚点
---
# 保时捷与驾驶位内饰

## 目标
车能从外面看（和原型一致），驾驶门能开关，坐进驾驶位能看到方向盘、仪表盘、中控屏、门内侧和座椅轮廓，并为中控屏网页内容和门把手交互提供锚点。

## 业务规则（来源：spec scene/diorama-layout、cabin/enter-driver-view、cabin/exit-driver-view、profile/cabin-displays、scene/ambient-motion）
- 外观：
  - 红色保时捷 911（992 代 Carrera，加装固定尾翼），代码几何体拼出，不加载外部模型；
  - 停在 `CAR_CENTER`，车头朝主路（世界 +z 方向）；
  - 贯穿式尾灯；四角琥珀色转向灯与侧转向灯共用一个双闪材质；车头、车尾各一盏琥珀色点光源（亮度由 07 控制）。
- 左舵车：驾驶门在车身左侧（车头朝 +z 时为世界 +x 一侧）。驾驶门以前端为铰链，开门角度 0～65°可设置。
- 驾驶位内饰只做驾驶位能看到的部分：
  - 方向盘；
  - 仪表盘（方向盘后，画布贴图显示 `FUBUKI_BB`）；
  - 中控屏（驾驶位右前方，深色边框 + 屏幕平面）；
  - 仪表台与 A 柱、车顶内衬；
  - 驾驶门内侧饰板与门把手；
  - 驾驶座靠背与坐垫轮廓。
  副驾与后排只放简单的深色块面，驾驶位转头 ±30° 范围内看不到空洞。
- 车身外壳是单面材质，从车内看不到外壳内侧，所以内饰必须自带内衬面（车顶、门内侧、仪表台）。车窗位置留空，能看到车外的雨和街道。
- 门把手平时带微弱暖白光；悬停时变亮（亮度切换由 09 调用）。
- 关键物件名称：`porsche`（整车组）、`driver-door`（门铰链组）、`door-handle`、`center-screen`、`instrument-cluster`、`steering-wheel`、`driver-seat`。

## 涉及文件
- 新建：`diorama/car.ts`、`diorama/cabin.ts`
- 新建：`tests/car.test.ts`

## 函数清单
### diorama/car.ts
| 函数名 | 职责 |
|---|---|
| `buildCar` | 按原型的挤出车身、座舱、侧窗、前挡与后窗、头灯、尾灯、固定尾翼、扩散器、排气、后视镜、车轮搭建外观；把左侧车门区域拆为单独的门板网格，挂在以前端为原点的 `driver-door` 组下；返回整车组、双闪材质、双闪点光源、门铰链组 |
| `setDoorAngle` | 把驾驶门绕铰链竖轴旋转到指定角度（0～65°，超出按边界截断），门向车外打开 |
| `CAR_ANCHORS` | 车身局部坐标下的锚点：驾驶门外侧观察点、驾驶座眼睛位置与正前方朝向、中控屏中心与朝向、窄屏时对准中控屏的镜头位置 |

### diorama/cabin.ts
| 函数名 | 职责 |
|---|---|
| `buildCabin` | 在整车组内搭建驾驶位内饰（方向盘、仪表盘、中控屏边框与屏幕平面、仪表台、A 柱、车顶内衬、门内侧饰板、门把手、座椅轮廓、副驾和后排的深色块面）；返回中控屏平面、门把手网格、仪表盘贴图 |
| `drawCluster` | 在仪表盘画布上绘制名字 `FUBUKI_BB` 与两圈表盘刻度 |
| `setHandleHighlight` | 切换门把手发光强度（平时 / 悬停） |

## 协作关系
- 使用 05 的 `materials`、`primitives`、`layout`（`CAR_CENTER`）。
- 07 的 `createAmbient` 使用 `buildCar` 返回的双闪材质与点光源。
- 09 的镜头组件使用 `CAR_ANCHORS` 与 `setDoorAngle`；交互组件对 `porsche` 组做悬停与点击检测，对 `door-handle` 做把手检测并调用 `setHandleHighlight`；中控屏覆盖层按 `center-screen` 平面的世界矩阵对齐。
- 原型对应段落：「保时捷 992.1 Carrera（红色 + 固定尾翼）」整段；内饰为新增。

## 验证方式
- 测试入口：`bun test tests/car.test.ts`（注入 06 的 `tests/fake-canvas.ts`，在 bun 中直接构建）
- 测试输入：新建场景，调用 `buildCar` 与 `buildCabin`，把整车放到 `CAR_CENTER`。
- 预期结果：
  - 能按名称找到 `porsche`、`driver-door`、`door-handle`、`center-screen`、`instrument-cluster`、`steering-wheel`、`driver-seat`。
  - 整车包围盒中心与 `CAR_CENTER` 的水平距离 < 0.3 米；车头方向为 +z（前保险杠位置的 z 大于车尾 z）。
  - 驾驶门在车身 +x 一侧；`setDoorAngle(65°)` 后门板后缘向 +x 方向移出（世界 x 增大）；`setDoorAngle(90°)` 结果与 65° 相同。
  - 驾驶座眼睛锚点在整车包围盒内、高度在 0.9～1.3 米之间；中控屏中心位于眼睛锚点的右前方（相对车头方向）。
  - 对假画布调用 `drawCluster` 记录到 `fillText('FUBUKI_BB', …)`。
- [ ] 上述断言全部通过。
- [ ] 1440×900 驾驶位视角下方向盘、仪表盘、中控屏同时完整入画，在 10 的端到端测试中确认。
