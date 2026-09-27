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
| 08 | plaque-and-copy | done | 2026-09-27 |
| 09 | story-sections | done | 2026-09-27 |
| 10 | car-exterior | done | 2026-09-27 |
| 11 | story-camera | done | 2026-09-27 |
| 12 | world-and-interaction | done | 2026-09-27 |
| 13 | app-shell | done | 2026-09-27 |
| 14 | docs-and-release | pending | — |
## 当前
需求改为「点铭牌进入资料视角的滚动叙事」（spec 提交 012f6b6），原 08–11 作废，改为 08–14。准备执行 `14-docs-and-release.md`。
- 01 记录：主 Agent 修正 `public-assets.test.ts` 的图片引用豁免（原豁免已删除的 profile-full.png，改为豁免 spec 要求的分享图 /profile.jpg）；按 Review 意见清理 `tests/public-images.test.ts` 残留分支、补回 `tests/typography.test.ts` 标题字重断言、`bun.lock` 项目名改为 rainy-konbini-portfolio。
- 02 记录：字形覆盖已改为读取真实文案；按 Review 意见把简介与四个方向断言改为精确比对。「不写 Cookie、不改地址栏」留到 13 的端到端用例验证。
- 03 记录：主 Agent 修正测试 helper 还原 HTML 实体、失败提示改回普通文本（去掉 dangerouslySetInnerHTML）；去掉 `<dialog>` 的 `open` 属性以保证 `showModal()` 生效；按 Review 修复 fault 模式连按 Esc / 返回手势可关闭卡片的问题（监听 `close` 事件重新 `showModal()`，preview 模式被浏览器关闭时同步 `onClose`）；卡片显式滚动样式；补强断言（无 open 属性、提示在前、名字匹配 h1）。
- 04 记录：Impl 曾为迁就旧测试改动已批准的 description，Review 判定根因为过期断言——已恢复成品原文并改写断言（engineer/AI/diorama/rainy|convenience store）、去掉旧 AC 编号；`ProfileContent.css` 改由构建插件内联（组件不再 import CSS，入口也不重复导入）；健壮性修正：内联样式紧跟 `<meta charset>`（charset 保持在前 1024 字节，原问题改动前即存在）、字符串替换改函数形式、正式构建时元信息读取失败直接报错；补测试 title/charset/样式顺序/构建失败。
- 05 记录：主 Agent 修正 layout 测试数值错误（390×844 超过 1.9 上限，改为 390×780）；按 Review 修复帧监视器（不可见或间隔 ≥ 5s 清空窗口）、toon 缓存键、renderer 完整释放（泛光/输出通道、背景、forceContextLoss、移除 canvas）、关雾后 needsUpdate、`createRenderer(container, pixelRatio)` 由调用方传入初始像素比。
- 06 记录：用户裁决——铭牌放大（最终 9.85×1.6 米，第三行 116px，字形投影 ≥10px）、打包 `@fontsource/dela-gothic-one@5.3.0` 与 `@fontsource/m-plus-rounded-1c@5.3.0`（许可证已并入 THIRD_PARTY_NOTICES）。主 Agent 修正 pedestal 尺寸断言口径；按 Review 修复：两处材质补卡通着色表、铭牌挂环境贴图、共享材质不再被关描边、删分段注释、rand/pick/acUnit 去重、字体按完整字体栈加载（含 Noto 补字）、新增 `CANVAS_TEXT` 与字符覆盖测试。
- 07 记录：按 Review 修复水花像素比可更新（`createSplashes` 返回 `{ mesh, setPixelRatio }`）、倒影缓冲尺寸至少 1、删低档叠加层无效底色；补测试：行人灯闪烁边界、雨棚/旧楼落点、低档雨丝减半、倒影开关可见性。`createWetGround` 额外提供 `dispose`（释放倒影渲染目标）。
- 已并入新 plan：原「09 必须做」各项并入 `12-world-and-interaction`；头像失败显示 F 等端到端项并入 `13-app-shell`。
- 08 记录：Review 合规 10/10；主 Agent 按 Review 修正 `setPlaqueGlow` 改收 `Plaque` 直接改 `borderMaterial`（去掉按名查找与空值防御，保持 plan 的返回值用法）、改掉过期测试名「plaque hint」、文案改按键断言并检查小标签顺序、合并测试导入。遗留：全量里 `tests/profile-ui.test.tsx` 的 4 个 ProfileCard 用例因 `closeCard` 删除而失败，09 删除该组件与测试后消除。
- 待办（12 必须做）：补「减少动态效果开启时铭牌边框亮度仍随时间变化」的用例。
- 10 记录：Review 合规 6/6；主 Agent 按 Review 补测试（车头日行灯在 +z、贯穿尾灯与尾翼在 -z、车身为卡通材质，已用反转车头验证能抓错）、测试改为静态导入、删未用 import、车尾转向灯改回原型高度 0.69（与贯穿尾灯对齐）。
- 09 记录：Impl 指出 3 处测试缺陷，主 Agent 核实后修正（顺序断言从上次命中位置后查找——「AI 工作流」也出现在简介里；静态文本解码 `&#x27;`；内联样式断言改用真实模板）并改为静态导入。Review 合规 10/12，主 Agent 自修：正方形视口改走宽屏（竖屏改 `aspect-ratio < 1`）；竖屏去掉 `max-height:45vh; overflow:hidden` 裁切，改紧凑排版并给 SCROLL 提示留底部空间；通用 `p` 规则不再覆盖小标签与提示；段 ref 回调用 `useMemo` 固定；段与文字框自带 `box-sizing: border-box`。补测试：进度点高亮类名、简介只有一段。浏览器实测 375×667（含失败提示）文字 382–611px、所在地完整；800×800 为左栏排版。
- 待办（13 必须做）：端到端加 375×667 + 失败提示时所在地完整可见、800×800 走左栏排版；`sectionRef` 回调里只存元素不 setState，且须在激活（非 hidden）后再测段位置；`index.css` 重写时保留 `box-sizing: border-box`。
- 11 记录：Review 合规 6/8，主 Agent 自修：第 3 停靠点改为 (2.5,3,14)→(-0.2,1,-1)，让店门与整车同时入画；第 1 停靠点改为 (10,5.5,36)→(-2,-0.8,4)，修竖屏铭牌左侧被裁；回拉区改为线性比例（spec 未允许缓动）；`enterSequence` 复制起终点避免调用方改写起点。补测试：三个停靠点在 1440×900 与 390×844 下主体包围盒完整入画、回拉区 25%/50%/75% 线性、竖屏 1.9 倍拉远、非适用事件保持原状态、测试改静态导入。竖屏第 1 停靠点左右余量约 10px，12 实景截图再确认。
- 12 记录：用户裁决——竖屏时默认镜头距离与缩放上下限都乘以竖屏放大系数（已改 spec `scene/diorama-layout` 与 plan 12）。Review 发现并按 TDD 修复：进入前清 OrbitControls 阻尼余量（退出漂移 1.09 米→≤0.1）、进入完成时滚动位置设为第 1 段起点（防闪回）、离开整体视角复位悬停与光标、只认主指针左键且多指取消点击、竖屏距离上下限同比放大且与「先看资料」默认位姿一致、挂载中途失败清理、上下文丢失停循环、射线对象复用、初始低档不统计降档、`View` 类型与输入判定复用 view-state。句柄增加 `scene`、`camera` 供冒烟测试观测（已记入 plan 12）。主 Agent 删除 `renderer.ts` 里按原点缩放相机的旧竖屏逻辑（改由 world 以观察目标为锚点计算）。浏览器目测 1440×900 第 1、3 停靠点与 390×844 第 1 停靠点取景正常。
- 待办（13 必须做）：外壳收到上下文丢失后按 scene-failure 隐藏 canvas（world 已停循环）；`startStoryWithoutEntering` 不回调视图变化，外壳自行设 `data-view`。
- 13 记录：端到端 29 + 失败 4 个用例全部通过（无窗口 Chrome 有硬件 WebGL）。主 Agent 核实并修正测试缺陷：视图追踪脚本在文档元素出现前抛错、`!!` 转布尔、进度点避开正中取整歧义、链接检查前滚入视口、读屏名字应为「查看资料」、失败用例显式设英文、就绪判定加 `aria-busy`、点「先看资料」前等 React 挂载。实现修复（含 Review 两轮）：加载页淡出定时器被 effect 清理导致永不移除；reachTop 副作用移出 state updater；滚动监听改用 ref 保存回调；背景改深蓝径向渐变（并去掉盖住它的 `#root` 背景）；「先看资料」时语言在场景就绪前切换，铭牌跟上；就绪后点「先看资料」同步场景；「先看资料」后停在 0 时场景就绪即退回整体视角；上下文丢失后清空句柄；`aria-busy` 与加载页同步；键盘按钮失效时失焦；`data-view` 始终发布；标题程序聚焦不显示焦点框。
- 范围外修复（性能/鲁棒，已列简报）：新建 `diorama/story-scroll.ts`，把 `storyLayout`、`snapTarget` 从 `story-camera.ts` 移入并新增 `scrollProgress`，首屏入口脚本不再含 three（422KB→209KB，并加测试）；`StorySections.css` 段高改为 `var(--story-vh)`，与 `innerHeight` 计算一致。

原型参考：`.bb-spec/.cache/prototype/rainy-konbini.html`（不进 git）。
## 阻塞
（无）
