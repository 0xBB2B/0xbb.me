---
name: 11-docs-and-release
description: 重写 README，补发布检查测试（外部资源、测试钩子、旧文案）与 1440×900 帧率测试
---
# 文档与发布检查

## 目标
README 描述新站点，发布前有自动测试把关构建产物的干净程度和帧率。

## 业务规则（来源：spec site/static-profile-html、scene/quality-tier、scene/diorama-layout）
- 构建产物 `dist/index.html` 不引用外部域名的脚本或样式表；不出现 "playable"、"walk"、"lighthouse"、「灯塔」。
- 构建产物（HTML 与 JS）不残留测试钩子：`PLAYABLE_TOWN_RESULT`、`__mc2d`、`__test`。
- 帧率标准：
  - 条件：1440×900 视口、生产构建、桌面 Chrome，整体视角持续旋转 30 秒；
  - 要求：95% 的帧间隔 ≤ 33.4 毫秒，且期间 `data-quality` 保持 `high`。
- 整体视角下画面除铭牌外没有可见的文字界面元素。可见元素的判定：矩形宽高 > 0、不透明、不在 `inert` 或 `hidden` 子树内。

## 涉及文件
- 重写：`README.md`
- 新建：`tests/release.test.ts`、`tests/performance.test.ts`

## 成品定义
### README.md 结构（exec 按此结构写中文正文，章节标题原样）
```markdown
# FUBUKI_BB · 雨夜便利店个人主页

[0xbb.me](https://0xbb.me) 的个人主页源码：一个放在展示台上的雨夜日式便利店街角微缩模型。店门口停着打双闪的红色保时捷，点它就能坐进驾驶座，在中控屏上看个人资料。

## 体验与操作
（表格：拖动旋转 / 滚轮或双指缩放 / 右键或双指平移 / 点击红色跑车进入驾驶座 / Tab 聚焦「进入驾驶座」按钮后回车 / 驾驶位拖动转头（左右 30°、上下 15°）/ 点门把手、Esc 或浏览器返回退出 / 中控屏 EN·中 切换语言）

## 画面与动效
（列表：雨只下在底座上方、水洼倒影与波纹、落地水花、屋檐滴水、招牌闪烁、自动门、双闪、信号灯 20 秒周期；电脑高画质、手机或帧率不足时自动关闭地面倒影）

## 没有 3D 时
（加载页「先看资料」、三种失败时自动打开简介卡片）

## 本地开发
（bun install --frozen-lockfile / bun run dev / bun run build / bun test；浏览器测试使用本机 Chrome 无窗口实例，可用 PORTFOLIO_CHROME_PATH 指定）

## 部署
（推送 main 后 GitHub Actions 构建 dist 并发布到 GitHub Pages）

## 许可
（代码与第三方声明见 THIRD_PARTY_NOTICES.txt）
```

## 函数清单
### tests/release.test.ts
| 用例 | 职责 |
|---|---|
| README 描述新站点 | `README.md` 含「雨夜便利店」「驾驶座」「中控屏」「先看资料」，不含 `MC-2D`、`灯塔`、`Shift`、`切换服装` |
| 产物无外部资源 | `dist/index.html` 中 `<script src>`、`<link rel="stylesheet" href>` 全部为相对路径 |
| 产物无测试钩子 | `dist/**/*.{html,js}` 不含 `PLAYABLE_TOWN_RESULT`、`__mc2d`、`__test` |
| 产物无旧文案 | `dist/index.html` 不含 `playable`、`walk`、`lighthouse`、`灯塔`（不区分大小写） |
| 整体视角无额外界面 | 用 `runBrowser` 打开生产预览，就绪后统计可见且含文字的 DOM 元素，结果为空（canvas、`inert`/`hidden` 子树、聚焦前的键盘入口按钮除外） |

### tests/performance.test.ts
| 用例 | 职责 |
|---|---|
| 1440×900 旋转 30 秒帧率 | 启动生产预览，等待 `data-view="diorama"`；在页面内用 `requestAnimationFrame` 记录帧时间戳（测试脚本注入，不依赖产物钩子）；用 CDP 鼠标左键持续水平拖动 30 秒；断言 95% 帧间隔 ≤ 33.4 毫秒且 `data-quality` 全程为 `high`；若无窗口 Chrome 无 GPU 导致失败，如实失败，不跳过、不放宽 |

## 协作关系
- 复用 `tests/browser.ts` 的 `runBrowser`、`tests/headless-browser.ts`；预览端口避开其他测试（使用 4201、4203）。
- 依赖 10 完成的完整页面与构建产物。

## 验证方式
- 测试入口：`bun run build && bun test tests/release.test.ts tests/performance.test.ts`
- 测试输入：`README.md`、`dist/` 产物、生产预览页面。
- 预期结果：两个测试文件全部通过；全量 `bun test` 通过。
- [ ] `tests/release.test.ts` 全部通过。
- [ ] `tests/performance.test.ts` 通过（或因环境无 GPU 如实失败并在 PROGRESS 阻塞项记录）。
- [ ] 全量 `bun test` 无失败。
