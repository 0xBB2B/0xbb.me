---
id: T-2
title: M1 探索状态与输入
depends_on: []
files: [/Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/input.ts, /Users/bb/Projects/0xbb.me/portfolio/state.test.ts, /Users/bb/Projects/0xbb.me/portfolio/input.test.ts]
refs: [portfolio/player/AC-3, portfolio/player/AC-5, portfolio/player/AC-7]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/state.test.ts ./portfolio/input.test.ts
status: doing
step: test
agent: wf_f2ebbd965458
commit: ""
note: ""
---
## 1. 目标
提供可通过公开接口验证的探索、阅读和双语状态及键盘/触屏输入释放，不引入渲染或存档。
## 2. 业务规则
- C-3：当桌面访客持续按住 A、D、左方向键或右方向键时，系统应分别向左、向右、向左或向右移动主人公，并允许停下或回头，不要求跳跃才能走完全程。
- C-5：如果方向输入结束、触屏操作被取消或窗口失去焦点，系统应停止行走；恢复焦点时不得因失焦前的输入继续移动，必须重新操作。
- C-7：如果访客在道路起点向左或在终点向右持续操作，系统应将主人公限制在道路可行走范围内，不使其离开场景或落出道路。
### AC-3 四种键盘输入 ← C-3
- 触发: 操作 分别按住 A、D、左方向键、右方向键后松开。
- Given: 桌面访客位于道路中段，未打开对话或速览。
- When: 访客逐一执行四种方向输入，并沿道路走完全程。
- Then: 移动方向依次为左、右、左、右，可以回头，完成探索不需要跳跃或战斗。
### AC-5 输入中断不粘连 ← C-5
- 触发: 操作 行走时松开按键、取消触屏操作或切换窗口后返回。
- Given: 主人公正在行走，未到道路边界。
- When: 分别结束键盘输入、取消触屏操作、在按住方向时切换窗口并在外部松手后返回。
- Then: 每种情况下行走均停止；重新聚焦页面时人物不自行移动，重新输入方向后才恢复行走。
### AC-7 道路两端边界 ← C-7
- 触发: 操作 在道路起点持续向左，在终点持续向右。
- Given: 主人公分别到达道路两端。
- When: 访客持续输入越界方向，再输入返回道路的方向。
- Then: 主人公不会走出世界或掉落，反向输入可以正常返回道路。
关联行为必须在本文件所有者内完成：初始英文与起点；语言只改文字，不改位置、面板或段落；范围内主动交谈、范围外忽略 E；对话翻页/关闭/重读；速览与对话打开均暂停并释放方向，关闭后要求新输入；触屏松开、取消与失焦均清除方向。场景位置与台词由消费者提供，不预制后续场景。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/state.ts`、`/Users/bb/Projects/0xbb.me/portfolio/input.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/state.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/input.test.ts`。
## 6. 函数清单
- state.ts：createPortfolioState，创建英文起点状态；updatePortfolio，推进移动、交谈、翻页、速览及语言事件；subscribe，供 UI 读取变化。
- input.ts：bindInput，映射键盘/指针及中断事件并返回解绑能力；releaseInput，结束已有输入。
## 7. 协作关系
按已批准职责使用简单公开状态接口，不引入状态库；runtime 推进时间和道路/NPC 数据，Hud/Dialogue/Overview 发送用户意图。UI 与运行时不得另设独立探索状态。后续集成验证可读接口但不得改本任务文件。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/portfolio/state.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/input.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/state.test.ts ./portfolio/input.test.ts`。
- 公开验证入口：`portfolio/state.ts` 的 createPortfolioState、updatePortfolio、subscribe，以及 `portfolio/input.ts` 的 bindInput、releaseInput；只根据业务规则与下列事件输入核对公开位置、朝向、阅读、语言及订阅结果，不断言内部实现算法。
- 公开状态入口：给定中段和时间推进，分别输入 A/D/ArrowLeft/ArrowRight 的按下和释放，位置方向为左/右/左/右；释放后多次推进不再移动。
- 公开输入绑定入口：事件目标派发 keyup、pointerup、pointercancel、blur、失去指针捕获与不可见事件；恢复焦点不续走，新方向输入可走；解绑后无事件影响。
- 两端持续输入不越界，反向输入正常返回；道路长度以当前实际场景为准，M1 不制造未来道路。
- 输入开启阅读、翻页、关闭、切语言和重新交谈：阅读期间及刚关闭位置不变；非首段双语切换保持主题；范围外 E 无对话；重复读取不锁定。
- 新建状态始终英文起点；不读写持久化存档。浏览器真实中断、触屏与完整旅程还须由 M1 集成及 T-26 验证。
