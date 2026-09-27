---
name: 12-world-and-interaction
description: 场景总装、渲染循环、画质降档串联、整体视角镜头操作、铭牌悬停与点击、资料视角镜头驱动
---
# 场景总装与交互

## 目标
把 05～11 的模块装成一个可挂载的三维场景：整体视角能转能缩放，铭牌能悬停能点击，资料视角下镜头听外壳传入的滚动位置。

## 业务规则（来源：spec scene/diorama-layout、scene/quality-tier、scene/ambient-motion、plaque/plaque-hint、story/enter-story-view、story/scroll-camera、story/exit-story-view）
- 整体视角：左键拖动旋转、滚轮或双指缩放、右键或双指拖动平移；距离 16～80 米，仰角 0.2～1.4 弧度；默认镜头 `DEFAULT_CAMERA`，竖屏距离按 `portraitDistanceScale` 放大。
- 铭牌悬停（仅整体视角、`hover: hover` 设备）：射线最先命中铭牌组才算，被遮挡不算；悬停时 canvas `cursor` 为 `pointer`、边框最亮；离开恢复默认光标与呼吸。
- 铭牌点击：射线最先命中铭牌；按下到松开移动超过 5 像素视为拖动不触发；只在整体视角且就绪时有效。
- 进入：记下当前镜头位置与观察目标，停用镜头操作，播放进入动画（≤ 1.5 秒），过渡中忽略所有输入；结束后通知进入完成。
- 资料视角：镜头只由外壳传入的滚动位置决定（用 `poseAtScroll`），滚轮不缩放、拖动不旋转；滚到顶（外壳判定）后恢复整体视角镜头操作，镜头即为记下的位姿。
- 通过「先看资料」进入的，记下的整体视角为默认镜头。
- 环境动效在两种视角下都不暂停。
- 画质：初始档按 `initialTier(pointer: coarse, 视口宽)`；高档像素比 `min(devicePixelRatio, 2)`、低档 1；帧监视器降档后：关地面倒影、渲染像素比 1、雨丝减半、水花像素比 1，本次访问不升档；页面隐藏期间不计入帧统计。
- 上下文丢失时通知外壳（外壳转为失败处理）。

## 涉及文件
- 新建：`diorama/world.ts`、`diorama/interaction.ts`

## 函数清单
### diorama/world.ts
| 名称 | 职责 |
|---|---|
| `mountDiorama` | 依次：`await loadCanvasFonts()`（3 秒超时后照常继续）→ 按画质档算初始像素比并 `createRenderer` → 用 RoomEnvironment 生成环境贴图 → `createTextures` → 展示台（传环境贴图）、地面、路面标线、便利店、街道、灯光、铭牌（传环境贴图）→ 雨、水花、滴水、湿地面 → `buildCar` 加入场景 → `createAmbient`（传车的双闪）→ `disableFogOnEmissive` → 创建交互与 `OrbitControls`；首帧画出后 resolve `ready`；返回 `ready`、`enterStory`、`startStoryWithoutEntering`（先看资料用）、`setScroll`、`exitToDiorama`、`setLanguage`、`onViewChange`、`onQualityChange`、`onContextLost`、`dispose` |
| `renderLoop` | 每帧：更新 `sharedTime`、环境动效、湿地面时间、铭牌呼吸（`setPlaqueGlow(plaqueGlow(t), hovered)`）、进入动画或滚动位姿、`framingOffset`、帧监视器；合成渲染 |
| `applyTier` | 按档位设置渲染像素比、倒影开关、雨丝比例、水花像素比 |
| `handleResize` | 视口宽或高为 0 时跳过；否则更新渲染器、湿地面、相机宽高比与取景偏移 |

### diorama/interaction.ts
| 名称 | 职责 |
|---|---|
| `createInteraction` | 监听 canvas 指针：`hover: hover` 下做悬停射线检测并维护 `cursor` 与悬停标记；记录按下位置，松开时移动 ≤ 5 像素且射线命中铭牌则回调点击；按 `acceptsSceneInput` 决定是否响应；返回悬停状态读取与销毁 |
| `hitsPlaque` | 用射线检测判断屏幕点最先命中的物体是否属于 `plaque` 组 |

## 协作关系
- 使用 05 `renderer`、`quality`、`layout`；06 `ground`、`store`、`street`、`lights`、`plaque`、`textures`、`fonts`；07 `weather`、`wet-ground`、`ambient`；08 `setPlaqueGlow`、`plaqueGlow`、`setPlaqueLanguage`；10 `buildCar`；11 `poseAtScroll`、`enterSequence`、`framingOffset`、`acceptsSceneInput`。
- 使用 three 自带 `OrbitControls`（`three/addons/controls/OrbitControls.js`）、`RoomEnvironment`、`PMREMGenerator`。
- 监听 `visibilitychange`：页面变隐藏时调用 `monitor.sample(performance.now(), false)`。
- 监听 canvas 的 `webglcontextlost` 并回调 `onContextLost`。
- 卸载时：停止循环、移除监听、`wetGround.dispose()`、渲染器 `dispose`、`OrbitControls.dispose`。
- 13 的 `SceneViewport` 调用 `mountDiorama` 并把滚动位置、语言传进来。

## 验证方式
- 测试入口：单元逻辑已由 11 覆盖；本 plan 行为在 13 的端到端测试中验证（生产预览 + `runBrowser`），另加 `bun test tests/world-mount.test.ts` 做装配冒烟。
- 测试输入：`tests/world-mount.test.ts` 在 `runBrowser` 打开的真实页面里导入构建产物并挂载到 1440×900 容器。
- 预期结果：
  - 挂载后 `ready` 在 20 秒内 resolve，页面中出现 1 个 canvas。
  - 挂载后场景中能找到 `porsche`、`plaque-border`；不存在驾驶舱相关物件。
  - 调用 `dispose` 后 canvas 从 DOM 移除。
  - 以下在 13 端到端确认：悬停铭牌 `cursor` 为 `pointer`、移到路面恢复；拖动 > 5 像素不进入；进入 ≤ 1.5 秒；资料视角滚轮不缩放；滚回顶部后能再次拖动旋转与滚轮缩放；上下文丢失回调触发。
- [ ] 装配冒烟通过；13 中对应端到端项通过。
