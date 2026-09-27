# 执行进度
| 序号 | Plan | 状态 | 完成时间 |
|---|---|---|---|
| 01 | legacy-removal | done | 2026-09-26 |
| 02 | content-and-language | done | 2026-09-26 |
| 03 | profile-ui | done | 2026-09-26 |
| 04 | site-shell | done | 2026-09-26 |
| 05 | diorama-renderer | done | 2026-09-26 |
| 06 | diorama-world | done | 2026-09-26 |
| 07 | weather-and-ambient | done | 2026-09-26 |
| 08 | plaque-and-copy | pending | — |
| 09 | story-sections | pending | — |
| 10 | car-exterior | pending | — |
| 11 | story-camera | pending | — |
| 12 | world-and-interaction | pending | — |
| 13 | app-shell | pending | — |
| 14 | docs-and-release | pending | — |
## 当前
需求改为「点铭牌进入资料视角的滚动叙事」（spec 提交 012f6b6），原 08–11 作废，改为 08–14。准备执行 `08-plaque-and-copy.md`。
- 01 记录：主 Agent 修正 `public-assets.test.ts` 的图片引用豁免（原豁免已删除的 profile-full.png，改为豁免 spec 要求的分享图 /profile.jpg）；按 Review 意见清理 `tests/public-images.test.ts` 残留分支、补回 `tests/typography.test.ts` 标题字重断言、`bun.lock` 项目名改为 rainy-konbini-portfolio。
- 02 记录：字形覆盖已改为读取真实文案；按 Review 意见把简介与四个方向断言改为精确比对。「不写 Cookie、不改地址栏」留到 13 的端到端用例验证。
- 03 记录：主 Agent 修正测试 helper 还原 HTML 实体、失败提示改回普通文本（去掉 dangerouslySetInnerHTML）；去掉 `<dialog>` 的 `open` 属性以保证 `showModal()` 生效；按 Review 修复 fault 模式连按 Esc / 返回手势可关闭卡片的问题（监听 `close` 事件重新 `showModal()`，preview 模式被浏览器关闭时同步 `onClose`）；卡片显式滚动样式；补强断言（无 open 属性、提示在前、名字匹配 h1）。
- 04 记录：Impl 曾为迁就旧测试改动已批准的 description，Review 判定根因为过期断言——已恢复成品原文并改写断言（engineer/AI/diorama/rainy|convenience store）、去掉旧 AC 编号；`ProfileContent.css` 改由构建插件内联（组件不再 import CSS，入口也不重复导入）；健壮性修正：内联样式紧跟 `<meta charset>`（charset 保持在前 1024 字节，原问题改动前即存在）、字符串替换改函数形式、正式构建时元信息读取失败直接报错；补测试 title/charset/样式顺序/构建失败。
- 05 记录：主 Agent 修正 layout 测试数值错误（390×844 超过 1.9 上限，改为 390×780）；按 Review 修复帧监视器（不可见或间隔 ≥ 5s 清空窗口）、toon 缓存键、renderer 完整释放（泛光/输出通道、背景、forceContextLoss、移除 canvas）、关雾后 needsUpdate、`createRenderer(container, pixelRatio)` 由调用方传入初始像素比。
- 06 记录：用户裁决——铭牌放大（最终 9.85×1.6 米，第三行 116px，字形投影 ≥10px）、打包 `@fontsource/dela-gothic-one@5.3.0` 与 `@fontsource/m-plus-rounded-1c@5.3.0`（许可证已并入 THIRD_PARTY_NOTICES）。主 Agent 修正 pedestal 尺寸断言口径；按 Review 修复：两处材质补卡通着色表、铭牌挂环境贴图、共享材质不再被关描边、删分段注释、rand/pick/acUnit 去重、字体按完整字体栈加载（含 Noto 补字）、新增 `CANVAS_TEXT` 与字符覆盖测试。
- 07 记录：按 Review 修复水花像素比可更新（`createSplashes` 返回 `{ mesh, setPixelRatio }`）、倒影缓冲尺寸至少 1、删低档叠加层无效底色；补测试：行人灯闪烁边界、雨棚/旧楼落点、低档雨丝减半、倒影开关可见性。`createWetGround` 额外提供 `dispose`（释放倒影渲染目标）。
- 已并入新 plan：原「09 必须做」各项并入 `12-world-and-interaction`；头像失败显示 F 等端到端项并入 `13-app-shell`。

原型参考：`.bb-spec/.cache/prototype/rainy-konbini.html`（不进 git）。
## 阻塞
（无）
