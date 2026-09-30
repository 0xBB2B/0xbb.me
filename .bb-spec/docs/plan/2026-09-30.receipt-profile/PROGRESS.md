# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | receipt-and-photo | done | 2026-09-30 |
| 02 | profile-page | done | 2026-09-30 |
| 03 | home-shell | done | 2026-09-30 |
| 04 | receipt-view | done | 2026-10-01 |
| 05 | story-pose-and-pause | done | 2026-10-01 |
| 06 | readme | pending | — |
## 当前
准备执行 `06-readme.md`。
- 05 记录：Review 6/7，违规 1 条与鲁棒问题 1 条同根（暂停后仍多预约一次刷新；story 同一帧内退出会卡在 exiting 或出现双刷新链）。修为：先 pauseRendering 再 emitView；scheduleNext 用 scheduled 标志保证任何时刻最多一个已预约刷新（测试驱动的 cancelAnimationFrame 是空函数，先取消再预约的写法在测试里无效）。spec 冲突（暂停中切语言铭牌何时可见）按 language spec「同时更新」裁定：暂停期间切语言、字体加载完成、resize 都只重画一帧，已写入 story-pause spec。测试计量修正：1 秒 draw=0 改为等假时钟满 1 秒；resize 只画一帧改按画到屏幕次数计（OutlineEffect 每帧对同一相机渲染两次）。
- 04 记录：Review 15/17（2 条部分覆盖：铭牌随语言切换只有单测、资料视角内失败时小票视觉下移）。自修 impl-defect：相片焦点锁在对话框内（修复「开着相片用键盘退出后相片残留、吞 Esc」）、失败提示改为 absolute 不进文档流（小票不下移）、竖屏失败提示左对齐避开语言开关、竖屏上边距 74px（72px 时按钮与锯齿只差 5.8px）、copy.ts 类型收窄、冗余 CSS 删除。计划外：App 的 data-view 改 useLayoutEffect（useEffect 晚一帧）。退出淡出用例改为连续采样（无头 Chrome 限速下单点 150ms 不稳）。SceneViewport 的 view 属性暂未使用，留给 05。
- 插入修订（6f1b749）：用户裁决小票用随网站发布的等宽网页字体，新增依赖 @fontsource-variable/jetbrains-mono 5.3.0（npm 官方源核实最新稳定版），改 receipt / full-photo spec 与 typography 测试；Review 5/5 合规，独立页只下载 latin 子集约 40KB。
- 03 记录：Review 8/8 合规。计划外改动 2 处：StorySections.tsx 增加 `import './StorySections.css'`（该 CSS 原靠 htmlPlugin 内联，去掉内联后资料段样式会丢，04 整体删除该组件）；injectShell 读 CSS 改用外层 root（与独立页分支一致）。实现代理曾误执行 git rm --cached / stash 并自行还原，主 Agent 核对暂存区与 stash 均无残留。漏测「整体视角不可滚动」由 04 的「小票层滚动时 window.scrollY 为 0」钉住。范围外发现：tests/typography.test.ts 禁止等宽字体，与 receipt spec「正文等宽字体」冲突，待用户裁决。
- 02 记录：Review 17/18，违规 1 条（独立页不引 index.css，共享组件 CSS 暗中依赖全局 border-box，小票宽 476px、手机横向溢出），从根上改为组件样式自给自足；复审又查出手机模式下掉落旋转撑宽布局视口，`.profile-page` 加 `overflow-x: clip`。预渲染用临时 vite 服务 + ssrLoadModule（配置打包阶段无法 import 带 CSS 的组件），root/alias 取自外层配置。组件加 `assetBase`（独立页传 `../`）。测试侧修正：图标比较文件名、语言模拟改 acceptLanguage、交互前等动画结束、420px 用 offsetWidth（横屏旋转 0.6° 属设计）、删除只允许单个 sitemap 地址的旧断言。拒绝了「语言开关等动画结束才出现」的迁就测试做法。主脚本产物名由 index-*.js 变为 main-*.js（无处写死旧名）。
- 01 记录：Review 25/25 合规。按审查意见自修 impl-defect 6 处（hydration 前头像已失败时兜底「F」、重试后焦点回 ✕、日期戳只在图片加载成功后显示、行动语箭头拆开靠右以对齐预览、LanguageToggle 独立样式、删除只给测试用的 `now` 属性），复审通过。漏测的「F」兜底、重试焦点、语言开关样式补进 02 验证项；小票出现动画时长、遮罩铺满视口补进 04 验证项。压缩图 formatOptions 降到 52 才 ≤ 200KB（180KB），肉眼检查无明显压缩痕迹。public-assets.test.ts「portrait files are published」要等 02 把新图加入发布清单后才通过。
## 阻塞
（无）
