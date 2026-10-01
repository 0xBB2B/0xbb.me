---
name: 05-story-pose-and-pause
description: 资料视角只用一个镜头位，小票出现后暂停渲染循环并变暗画布，退出时恢复且动画时间不跳变
---
# 资料镜头位与三维暂停

## 目标
点铭牌后镜头移到唯一的资料镜头位。到位后渲染循环停止画新帧，画布变暗、模糊，显卡几乎不干活；退出时恢复刷新，动画从停下的地方接着走。滚动驱动镜头的代码整条删掉。

## 业务规则（来源：spec enter-story-view、story-pause、ambient-motion、quality-tier）
- 资料镜头位：镜头位置 `(10, 5.5, 36)`，观察目标 `(-2, -0.8, 4)`，保持现有的取景偏移（宽屏向右、竖屏向上）；进入后镜头与它的距离 < 0.05 米。进入用时 ≤ 1.5 秒，现有进入动画约 1 秒，保持不变。
- 进入完成（`data-view="story"`、小票开始出现）时暂停：
  - 渲染循环不再画新帧，也不再预约刷新；画布保留最后一帧；
  - 雨、双闪、信号灯等所有环境动效停在当前画面，不在后台计算。
- 资料视角下画布加 `filter: brightness(.55) saturate(.8) blur(1.5px)`，约 0.6 秒过渡；整体视角下没有这个效果。
- 退出开始（`data-view="exiting"`）时恢复：
  - 0.2 秒内重新出现 draw 调用；
  - 动画时间从暂停时的数值接着走，不把暂停时长补进去（恢复后第一帧与暂停前最后一帧相差 ≤ 0.1 秒）；
  - 镜头退回动画照常播放，1.2 秒内回到进入前的位置（误差 ≤ 0.1 米）。
- 暂停期间不计入画质降档统计；恢复后，降档统计从头开始，不把暂停这段时间算成一次超长的帧间隔。
- 暂停期间窗口大小变化时：画布尺寸、镜头比例、取景偏移照常更新，并且只画一帧，不推进动画时间（改变画布尺寸会清空画面，所以要补画这一帧）。
- 帧率上限规则保持：每 N 次刷新画一帧，跳过的刷新不推进动画时间；画完一帧后才预约下一次刷新，任一帧出错后循环停下。

## 涉及文件
- 修改 `diorama/story-camera.ts`：`CAMERA_STOPS`、`stopPose`、`poseAtScroll` 换成常量 `STORY_POSE` 和函数 `storyPose`；`framingOffset`、`enterSequence` 保留。
- 删除 `diorama/story-scroll.ts`。
- 修改 `diorama/world.ts`：
  - 删掉 `scrollY`、`setScroll`、`startStoryWithoutEntering`，以及对 `storyLayout` / `poseAtScroll` 的引用；
  - 新增暂停和恢复逻辑；
  - `DioramaHandle` 去掉 `setScroll` 和 `startStoryWithoutEntering`。
- 修改 `components/SceneViewport.tsx`、`components/SceneViewport.css`：资料视角下给容器加 `scene-viewport--paused` 类。
- 测试：
  - 改写 `tests/story-camera.test.ts`：删掉停靠点 2、3 和按滚动取景的用例，保留资料镜头位与取景偏移的用例；
  - 改写 `tests/world-mount.test.ts` 里调用 `setScroll` / `startStoryWithoutEntering` 的用例，其中包括「竖屏下先看资料后退出」，这条改成「竖屏下点铭牌进入后退出」。

## 函数清单
### diorama/story-camera.ts
| 函数名 | 职责 |
|---|---|
| `STORY_POSE` | 资料镜头位常量（位置、观察目标） |
| `storyPose` | 返回 `STORY_POSE` 的一份 `Pose` 副本（`THREE.Vector3`） |
| `framingOffset`、`enterSequence` | 不变 |
### diorama/world.ts（`mountDiorama` 内部）
| 函数名 | 职责 |
|---|---|
| `animTime` | 当前动画时间 = `clock.elapsedTime` − 累计暂停时长；`loop`、进入 / 退出动画的起点都用它 |
| `pauseRendering` | 进入动画结束、状态变为 `story` 时调用：标记暂停，不再预约刷新 |
| `resumeRendering` | `exitToDiorama` 开头调用：用一次 `clock.getDelta()` 吞掉暂停时长并累加到暂停总时长；给降档统计喂一个「页面不可见」样本来清空窗口；预约下一次刷新 |
| `loop`（修改） | 暂停时直接返回，不预约；其余逻辑与帧率上限规则保持一致 |
| `updateCamera`（修改） | 删掉 `story` 分支里按滚动取景的逻辑；进入完成时摆到 `storyPose()`、取景偏移设为 1，然后调用 `pauseRendering` |
| `enterStory`（修改） | 目标位姿改为 `storyPose()` |
| `exitToDiorama`（修改） | 先 `resumeRendering`，再以 `animTime` 为起点开始退回动画 |
| `handleResize`（修改） | 暂停时更新尺寸后调用一次 `render()`，不推进时间 |
### components/SceneViewport.tsx
| 函数名 | 职责 |
|---|---|
| `SceneViewport`（修改） | `view === 'story'` 且未失败时容器加 `scene-viewport--paused`；CSS 里 `.scene-viewport--paused canvas` 设置滤镜，`.scene-viewport canvas` 的过渡加上 `filter 0.6s` |

## 协作关系
`App` 通过 `onViewChange` 拿到状态，`SceneViewport` 用 `view` 属性加类名，两者都不需要新接口。降档统计器 `createFrameMonitor` 和帧率限速器 `createFramePacer`（`diorama/quality.ts`）不用改，只改调用时机。

## 验证方式
- 测试入口：
  - `tests/fixtures/world-mount.ts` 暴露的 `window.handle`（`enterStory`、`exitToDiorama`、`onViewChange`、`scene`、`camera`）；
  - 用 `tests/world-mount.test.ts` 已有的接管 `requestAnimationFrame`、包装 WebGL draw 的写法计数；
  - `storyPose()`、`framingOffset()` 单元测试；
  - 首页浏览器测试检查画布的 CSS。
- 测试输入：点铭牌或调用 `enterStory()`，等到 `story`；停留 1 秒、5 秒、10 秒；期间改变视口尺寸；再调用 `exitToDiorama()`。
- 预期结果：
  - [ ] `storyPose()` 位置为 `(10, 5.5, 36)`、目标为 `(-2, -0.8, 4)`；进入后镜头与之距离 < 0.05 米；`entering` 到 `story` ≤ 1.5 秒。
  - [ ] 进入 `story` 后连续 1 秒内 draw 调用为 0，且没有刷新回调在执行渲染循环。
  - [ ] 暂停时改变视口尺寸：只出现一帧的 draw 调用，场景里 `uTime` 不变。
  - [ ] `exitToDiorama()` 后 0.2 秒内出现 draw 调用；停留 5 秒后退出，恢复后第一帧的 `uTime` 与暂停前相差 ≤ 0.1 秒。
  - [ ] 退出后 `data-view` 依次为 `exiting`、`diorama`，≤ 1.2 秒，镜头与进入前位置距离 ≤ 0.1 米。
  - [ ] 在 `story` 停留 10 秒再退出（期间用假时钟制造慢帧），`data-quality` 不变。
  - [ ] 首页：资料视角下 `#scene` 带 `scene-viewport--paused`，画布计算样式的 `filter` 含 `brightness` 与 `blur`；整体视角下 `filter` 为 `none`。
  - [ ] 帧率上限与「渲染出错后停止」的已有用例保持通过。
