# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | receipt-and-photo | done | 2026-09-30 |
| 02 | profile-page | done | 2026-09-30 |
| 03 | home-shell | done | 2026-09-30 |
| 04 | receipt-view | pending | — |
| 05 | story-pose-and-pause | pending | — |
| 06 | readme | pending | — |
## 当前
准备执行 `04-receipt-view.md`。
- 03 记录：Review 8/8 合规。计划外改动 2 处：StorySections.tsx 增加 `import './StorySections.css'`（该 CSS 原靠 htmlPlugin 内联，去掉内联后资料段样式会丢，04 整体删除该组件）；injectShell 读 CSS 改用外层 root（与独立页分支一致）。实现代理曾误执行 git rm --cached / stash 并自行还原，主 Agent 核对暂存区与 stash 均无残留。漏测「整体视角不可滚动」由 04 的「小票层滚动时 window.scrollY 为 0」钉住。范围外发现：tests/typography.test.ts 禁止等宽字体，与 receipt spec「正文等宽字体」冲突，待用户裁决。
- 02 记录：Review 17/18，违规 1 条（独立页不引 index.css，共享组件 CSS 暗中依赖全局 border-box，小票宽 476px、手机横向溢出），从根上改为组件样式自给自足；复审又查出手机模式下掉落旋转撑宽布局视口，`.profile-page` 加 `overflow-x: clip`。预渲染用临时 vite 服务 + ssrLoadModule（配置打包阶段无法 import 带 CSS 的组件），root/alias 取自外层配置。组件加 `assetBase`（独立页传 `../`）。测试侧修正：图标比较文件名、语言模拟改 acceptLanguage、交互前等动画结束、420px 用 offsetWidth（横屏旋转 0.6° 属设计）、删除只允许单个 sitemap 地址的旧断言。拒绝了「语言开关等动画结束才出现」的迁就测试做法。主脚本产物名由 index-*.js 变为 main-*.js（无处写死旧名）。
- 01 记录：Review 25/25 合规。按审查意见自修 impl-defect 6 处（hydration 前头像已失败时兜底「F」、重试后焦点回 ✕、日期戳只在图片加载成功后显示、行动语箭头拆开靠右以对齐预览、LanguageToggle 独立样式、删除只给测试用的 `now` 属性），复审通过。漏测的「F」兜底、重试焦点、语言开关样式补进 02 验证项；小票出现动画时长、遮罩铺满视口补进 04 验证项。压缩图 formatOptions 降到 52 才 ≤ 200KB（180KB），肉眼检查无明显压缩痕迹。public-assets.test.ts「portrait files are published」要等 02 把新图加入发布清单后才通过。
## 阻塞
（无）
