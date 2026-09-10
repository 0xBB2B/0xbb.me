---
id: T-49
title: 电脑空格跳跃与前后错开的滞空姿势
depends_on: [T-48]
files: [portfolio/input.ts, portfolio/state.ts, portfolio/character.ts, portfolio/copy.ts, components/portfolio/Hud.tsx, portfolio/input.test.ts, portfolio/jump.test.ts, tests/portfolio-jump.test.ts, README.md, artifacts/game-progress.md, artifacts/release-report.md]
refs: [portfolio/player/AC-13, portfolio/player/AC-5, portfolio/player/AC-7, portfolio/responsive-layout/AC-2]
parallel: false
verify: bun run build && bun test ./portfolio/jump.test.ts ./portfolio/input.test.ts ./portfolio/character.test.ts ./tests/portfolio-jump.test.ts ./tests/portfolio-appearance.test.tsx && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "USER-091至094。电脑空格单次跳跃，两款服装均支持；空中手脚前后错开并保持，落地收拢。最新按用户要求原地顺序反转，移动起跳锁定当前摆幅方向与角度后平滑过渡，不强制换边。最终24项集中验证通过、4104断言，build/tsc通过，无窗口真实输入验证沿用迈步侧。未提交/推送/上线。"
---
## 最终行为
- 游戏画面空格起跳，只有非触屏粗指针的键盘操作可触发；不增加手机按钮，普通UI按钮和输入框保留原生空格行为。
- 支持原地、行走和Shift快跑组合；跳跃初速度5.6、重力16，最高约0.98场景单位，正常空中时间约0.7秒。
- 每次按下只触发一次；长按/自动重复不连跳，空中不二段跳，不缓存落地自动跳跃。
- 原地跳默认左腿-0.52、右腿+0.52，双臂反向；移动跳根据起跳时sin(stride)的正负选择前后侧，接近零时取下一摆动方向。锁定当时的相位幅度和快跑混合值，上升初始姿势等于刚才的行走/快跑姿势，不先合拢或突然换边。
- 空中最终姿势为腿沿行走旋转轴±0.52弧度、手臂反向±0.65弧度，符号采用锁定迈步侧；不增加左右外展角。
- 根据离地高度平滑展开，在空中保持固定前后姿势，不受走路相位影响；下落接近地面收拢，落地帧从合拢状态恢复地面步态。
- 原有步行/快跑速度、地面摆幅/起伏、相机、模型几何不变；跳跃偏移加在接地修正之后，落地清零。
- 关闭的门和道路边界仍阻挡；阅读/开门/换装/彩蛋期间不允许起跳；空中开启阅读时冻结，关闭后继续下落。
- 中英桌面提示增加Space/空格跳跃；不影响手机原操作。

## 实现与验证
- 使用现有自定义移动系统的解析竖直抛物线，不新增物理引擎或依赖。
- 初始跳跃断言先失败；独立姿势与空中停止步态循环的断言先失败，再实现。
- 状态/模型测试覆盖上升落地、最高点、二段跳拒绝、关门/终点阻挡、阅读暂停、两款服装接地、前后反向角度固定和无侧向张开。
- 无窗口真实键盘从起点跳跃/跑跳，走到灯塔换A后再跳；按住空格仅一次起跳，手机粗指针模式实际不跳，无跳跃按钮，不滚动页面。
- 最终24项测试通过（4104断言），覆盖两服装、步行/快跑/过渡速度和正负摆幅的24组起跳姿态，验证起跳前后角度连续、空中不换边；构建/类型检查通过；更早已完成正常阅读与图形失败相关回归，未用该结果冒充最终全量验收。
- 生产4173无窗口捕获原地/跑动展开、滞空、落地的6帧，已检查；观察器仅在临时测试页中读取姿态，结束后移除。
- 临时截图/日志/dist与自启4173服务清理，原3000服务保留，所有操作无窗口且不抢焦点。
