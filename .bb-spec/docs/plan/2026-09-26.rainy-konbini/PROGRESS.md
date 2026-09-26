# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | legacy-removal | done | 2026-09-26 |
| 02 | content-and-language | done | 2026-09-26 |
| 03 | profile-ui | done | 2026-09-26 |
| 04 | site-shell | done | 2026-09-26 |
| 05 | diorama-renderer | pending | — |
| 06 | diorama-world | pending | — |
| 07 | weather-and-ambient | pending | — |
| 08 | car-and-cabin | pending | — |
| 09 | camera-and-interaction | pending | — |
| 10 | app-shell | pending | — |
| 11 | docs-and-release | pending | — |
## 当前
正在执行 `05-diorama-renderer.md`。
- 01 记录：主 Agent 修正 `public-assets.test.ts` 的图片引用豁免（原豁免已删除的 profile-full.png，改为豁免 spec 要求的分享图 /profile.jpg）；按 Review 意见清理 `tests/public-images.test.ts` 残留分支、补回 `tests/typography.test.ts` 标题字重断言、`bun.lock` 项目名改为 rainy-konbini-portfolio。
- 02 记录：字形覆盖已改为读取真实文案；按 Review 意见把简介与四个方向断言改为精确比对。「不写 Cookie、不改地址栏」留到 10 的端到端用例验证。
- 03 记录：主 Agent 修正测试 helper 还原 HTML 实体、失败提示改回普通文本（去掉 dangerouslySetInnerHTML）；去掉 `<dialog>` 的 `open` 属性以保证 `showModal()` 生效；按 Review 修复 fault 模式连按 Esc / 返回手势可关闭卡片的问题（监听 `close` 事件重新 `showModal()`，preview 模式被浏览器关闭时同步 `onClose`）；卡片显式滚动样式；补强断言（无 open 属性、提示在前、名字匹配 h1）。
- 04 记录：Impl 曾为迁就旧测试改动已批准的 description，Review 判定根因为过期断言——已恢复成品原文并改写断言（engineer/AI/diorama/rainy|convenience store）、去掉旧 AC 编号；`ProfileContent.css` 改由构建插件内联（组件不再 import CSS，入口也不重复导入）；健壮性修正：内联样式紧跟 `<meta charset>`（charset 保持在前 1024 字节，原问题改动前即存在）、字符串替换改函数形式、正式构建时元信息读取失败直接报错；补测试 title/charset/样式顺序/构建失败。
- 待办（10 端到端必须覆盖）：fault 卡片连按两次 Esc 仍打开；头像失败显示 F；中控屏父容器需给定高度使 `max-height:100%` 生效；中控屏内拖动不触发转头。

原型参考：`.bb-spec/.cache/prototype/rainy-konbini.html`（不进 git）。
## 阻塞
（无）
