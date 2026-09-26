# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | legacy-removal | done | 2026-09-26 |
| 02 | content-and-language | done | 2026-09-26 |
| 03 | profile-ui | pending | — |
| 04 | site-shell | pending | — |
| 05 | diorama-renderer | pending | — |
| 06 | diorama-world | pending | — |
| 07 | weather-and-ambient | pending | — |
| 08 | car-and-cabin | pending | — |
| 09 | camera-and-interaction | pending | — |
| 10 | app-shell | pending | — |
| 11 | docs-and-release | pending | — |
## 当前
正在执行 `03-profile-ui.md`。
- 01 记录：主 Agent 修正 `public-assets.test.ts` 的图片引用豁免（原豁免已删除的 profile-full.png，改为豁免 spec 要求的分享图 /profile.jpg）；按 Review 意见清理 `tests/public-images.test.ts` 残留分支、补回 `tests/typography.test.ts` 标题字重断言、`bun.lock` 项目名改为 rainy-konbini-portfolio。
- 02 记录：字形覆盖已改为读取真实文案；按 Review 意见把简介与四个方向断言改为精确比对。「不写 Cookie、不改地址栏」留到 10 的端到端用例验证。

原型参考：`.bb-spec/.cache/prototype/rainy-konbini.html`（不进 git）。
## 阻塞
（无）
