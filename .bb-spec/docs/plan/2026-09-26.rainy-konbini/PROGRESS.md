# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | legacy-removal | done | 2026-09-26 |
| 02 | content-and-language | pending | — |
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
正在执行 `02-content-and-language.md`。
- 01 记录：主 Agent 修正 `public-assets.test.ts` 的图片引用豁免（原豁免已删除的 profile-full.png，改为豁免 spec 要求的分享图 /profile.jpg）；按 Review 意见清理 `tests/public-images.test.ts` 残留分支、补回 `tests/typography.test.ts` 标题字重断言、`bun.lock` 项目名改为 rainy-konbini-portfolio。
- 待办（02 处理）：`tests/typography.test.ts` 字形覆盖改为读取 data.ts/copy.ts 真实文案。

原型参考：`.bb-spec/.cache/prototype/rainy-konbini.html`（不进 git）。
## 阻塞
（无）
