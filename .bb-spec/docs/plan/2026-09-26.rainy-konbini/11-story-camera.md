---
name: 11-story-camera
description: 资料视角的纯逻辑：停靠点、滚动到镜头的换算、回拉区、吸附目标、取景偏移、进入动画与视角状态机
---
# 资料视角镜头与状态逻辑

## 目标
把「滚动位置 → 镜头位置 / 文字不透明度 / 当前段」「停手后吸附到哪」「视角状态怎么迁移」全部做成纯函数，可离开浏览器单测。

## 业务规则（来源：spec story/enter-story-view、story/scroll-camera、story/exit-story-view、site/loading-shell、site/scene-failure）
- 页面布局（资料视角）：顶部回拉区高度 = 视口高度的一半；其下 3 段，每段高一个视口；第 k 段起点 = 回拉区高度 + k × 视口高度（k 从 0 起）。
- 停靠点取景：
  - 第 1 段：从右前方较低处看展示台和便利店，铭牌与店头招牌都入画；
  - 第 2 段：正对便利店门面，店头招牌完整入画；
  - 第 3 段：停车场旁，保时捷整车入画、车后是店门。
- 取景区域：宽屏（宽高比 ≥ 1）模型主体在画面右侧约 60%（第 1 停靠点铭牌中心投影横坐标 > 视口宽 40%）；竖屏模型主体在上方约 55%（第 1 停靠点铭牌中心投影纵坐标 < 视口高 55%）。
- 跟手：滚动位置在第 k、k+1 段起点之间时，镜头位置和观察目标按比例连续过渡（可缓动）；恰在段起点时与停靠点距离 < 0.05 米。
- 回拉区：滚动位置在 [0, 回拉区高度] 内时，镜头从第 1 停靠点向「进入前的整体视角」过渡，比例 = 滚入深度 / 回拉区高度；资料文字不透明度同步从 1 降到 0；滚动位置为 0 时镜头等于整体视角位姿。
- 吸附：停手后吸附到离当前位置最近的段起点；在回拉区内（>0）一律吸附到第 1 段起点。
- 进入动画：镜头从当前整体视角平滑移到第 1 停靠点，总时长 ≤ 1.5 秒。
- 视角状态 `diorama` / `entering` / `story`：
  - `diorama` + 点铭牌（且 3D 就绪）→ `entering`；
  - `entering` + 进入完成 → `story`；`entering` 期间其余输入全部忽略；
  - `story` + 滚到顶：3D 就绪 → `diorama`，未就绪或已失败 → 保持 `story`；
  - 任意状态 + 先看资料 → `story`（记下的整体视角为默认视角）；任意状态 + 三维失败 → `story` 且标记失败；
  - `diorama` 下 3D 未就绪时点铭牌无效。

## 涉及文件
- 新建：`diorama/story-camera.ts`、`diorama/view-state.ts`
- 新建：`tests/story-camera.test.ts`、`tests/view-state.test.ts`

## 函数清单
### diorama/story-camera.ts
| 名称 | 职责 |
|---|---|
| `CAMERA_STOPS` | 3 个停靠点的镜头位置与观察目标（世界坐标，宽屏基准，样稿已验证的初值）：第 1 段 位置 (12, 5.5, 36) 看向 (-1, -0.8, 4)；第 2 段 位置 (3, 5.5, 20) 看向 (-1, 2.2, -2)；第 3 段 位置 (7, 3, 12) 看向 (-1.2, 0.8, 0.6)；视场角沿用 `DEFAULT_CAMERA.fov`（28°） |
| `framingOffset` | 按视口宽高返回画面平移量（供 `camera.setViewOffset` 使用）：宽屏把主体推向右侧（样稿初值为视口宽的 −0.19 倍水平偏移）、竖屏推向上方 |
| `stopPose` | 按视口宽高返回某停靠点的最终位姿（竖屏时沿视线方向按 `portraitDistanceScale` 拉远） |
| `storyLayout` | 由视口高度返回回拉区高度与 3 段起点 |
| `poseAtScroll` | 由滚动位置、视口尺寸、进入前的整体视角位姿，返回镜头位置、观察目标、资料文字不透明度、当前段序号 |
| `snapTarget` | 由滚动位置与视口高度返回吸附目标滚动位置 |
| `enterSequence` | 由起点位姿与第 1 停靠点位姿生成进入动画（时长与按时间取位姿的采样函数） |

### diorama/view-state.ts
| 名称 | 职责 |
|---|---|
| `transition` | 输入当前状态（视角、3D 是否就绪、是否失败）与事件（`clickPlaque`、`enterDone`、`reachTop`、`readFirst`、`sceneReady`、`sceneFailed`），返回新状态；过渡中忽略的事件原样返回当前状态 |
| `acceptsSceneInput` | 仅 `diorama` 且 3D 就绪时为真（用于悬停、点击、镜头操作开关） |

## 协作关系
- 使用 05 的 `layout.ts`（`DEFAULT_CAMERA`、`portraitDistanceScale`）与 06 的 `PLAQUE_PANEL`（测试投影用）。
- 12 的 `world.ts` 每帧用 `poseAtScroll` 或进入动画采样设置镜头，并调用 `framingOffset` 设置 `setViewOffset`。
- 13 的外壳用 `storyLayout` 布置回拉区与各段、用 `snapTarget` 做吸附、用 `transition` 管理 `data-view`。

## 验证方式
- 测试入口：`bun test tests/story-camera.test.ts tests/view-state.test.ts`
- 测试输入：直接调用上述函数；投影断言用 three 的 `PerspectiveCamera`（fov 取 `DEFAULT_CAMERA.fov`，按 `framingOffset` 设置 `setViewOffset`）把 `PLAQUE_PANEL.center` 投到屏幕。
- 预期结果：
  - `storyLayout(900)`：回拉区 450，三段起点 450、1350、2250。
  - `poseAtScroll` 在三段起点的镜头与 `stopPose` 距离 < 0.05；在第 1、2 段起点正中间时到两停靠点距离都 > 0.1；不透明度在段内为 1。
  - 回拉区中点（225 / 900）：镜头到第 1 停靠点与到整体视角位姿距离都 > 0.1，不透明度严格介于 0 与 1 之间；滚动位置 0 时镜头与整体视角位姿距离 < 0.1、不透明度为 0。
  - 当前段序号：滚动位置在第 2 段起点 → 1。
  - `snapTarget`：第 1、2 段之间 60% 处 → 第 2 段起点；40% 处 → 第 1 段起点；回拉区内任意 > 0 位置 → 第 1 段起点；超过最后一段 → 第 3 段起点。
  - 1440×900：第 1 停靠点下铭牌中心投影横坐标 > 576；390×844：纵坐标 < 464.2。
  - `enterSequence` 时长 ≤ 1.5；采样 0 等于起点，采样末尾与第 1 停靠点距离 < 0.05。
  - `transition`：按业务规则逐条验证（含 `entering` 忽略 `clickPlaque` / `reachTop`、未就绪 `reachTop` 保持 `story`、失败后 `reachTop` 保持 `story`、`diorama` 未就绪 `clickPlaque` 无效、`readFirst` 与 `sceneFailed` 进入 `story`）。
  - `acceptsSceneInput` 仅在 `diorama` 且就绪时为真。
- [ ] 上述断言全部通过。
